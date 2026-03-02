(function initEngineModule(global) {
    const Chess = global.Chess;

    const ENGINE_PRIMARY = "/static/scripts/stockfish-18-standard-worker.js";
    const ENGINE_FALLBACK = "/static/scripts/stockfish-nnue-16.js";
    const MAX_ENGINE_MATE_PLY = 99;
    const MAX_ENGINE_CP = 3500;
    const ENGINE_EVAL_CACHE = new Map();
    const CACHE_TTL_MS = 2200;
    let engineAssetWarm = false;
    const tinyWasmProbe = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    const engineRuntime = {
        wasmChecked: false,
        wasmAllowed: true,
        cspBlocked: false,
        reason: "",
        warned: false
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function errorText(errorOrMessage) {
        if (typeof errorOrMessage === "string") {
            return errorOrMessage;
        }
        if (errorOrMessage && typeof errorOrMessage.message === "string") {
            return errorOrMessage.message;
        }
        try {
            return String(errorOrMessage || "");
        } catch {
            return "";
        }
    }

    function isCspWasmBlockError(errorOrMessage) {
        const text = errorText(errorOrMessage).toLowerCase();
        if (!text) return false;
        return (
            text.includes("content security policy")
            || text.includes("unsafe-eval")
            || text.includes("wasm streaming compile failed")
            || text.includes("failed to asynchronously prepare wasm")
        );
    }

    function markCspBlocked(reason) {
        engineRuntime.cspBlocked = true;
        engineRuntime.wasmAllowed = false;
        engineRuntime.reason = errorText(reason) || "WASM bloqueado por CSP";
    }

    async function ensureWasmAllowed() {
        if (engineRuntime.wasmChecked) {
            return engineRuntime.wasmAllowed;
        }
        engineRuntime.wasmChecked = true;

        // Some CSP policies block eval before we even get to wasm worker init.
        // Probe once and fail fast to avoid noisy repeated console errors.
        try {
            // eslint-disable-next-line no-new-func
            new Function("return 1")();
        } catch (error) {
            if (isCspWasmBlockError(error)) {
                markCspBlocked(error);
                return false;
            }
        }

        if (typeof WebAssembly !== "object" || typeof WebAssembly.compile !== "function") {
            engineRuntime.wasmAllowed = false;
            engineRuntime.reason = "WebAssembly no disponible";
            return false;
        }

        try {
            await WebAssembly.compile(tinyWasmProbe);
            engineRuntime.wasmAllowed = true;
            return true;
        } catch (error) {
            if (isCspWasmBlockError(error)) {
                markCspBlocked(error);
                return false;
            }
            engineRuntime.wasmAllowed = true;
            return true;
        }
    }

    function safeIsCheckmate(game) {
        if (!game) return false;
        if (typeof game.isCheckmate === "function") return game.isCheckmate();
        if (typeof game.in_checkmate === "function") return game.in_checkmate();
        return false;
    }

    function safeIsDraw(game) {
        if (!game) return false;
        if (typeof game.isDraw === "function" && game.isDraw()) return true;
        if (typeof game.isStalemate === "function" && game.isStalemate()) return true;
        if (typeof game.isThreefoldRepetition === "function" && game.isThreefoldRepetition()) return true;
        if (typeof game.isInsufficientMaterial === "function" && game.isInsufficientMaterial()) return true;
        if (typeof game.in_draw === "function" && game.in_draw()) return true;
        return false;
    }

    function pieceValue(pieceType) {
        switch (pieceType) {
        case "p": return 100;
        case "n": return 320;
        case "b": return 330;
        case "r": return 500;
        case "q": return 900;
        default: return 0;
        }
    }

    function materialEvalCp(game) {
        const board = game && typeof game.board === "function" ? game.board() : null;
        if (!Array.isArray(board)) {
            return 0;
        }

        let white = 0;
        let black = 0;
        for (let r = 0; r < board.length; r += 1) {
            const row = board[r];
            if (!Array.isArray(row)) continue;
            for (let c = 0; c < row.length; c += 1) {
                const piece = row[c];
                if (!piece || !piece.type || !piece.color) continue;
                const value = pieceValue(piece.type);
                if (piece.color === "w") white += value;
                else black += value;
            }
        }
        return white - black;
    }

    function fenWithTurn(fen, turn) {
        const fields = String(fen || "").trim().split(/\s+/);
        if (fields.length < 2) {
            return "";
        }
        fields[1] = turn === "b" ? "b" : "w";
        if (fields.length > 3) {
            fields[3] = "-";
        }
        return fields.join(" ");
    }

    function mobilityEvalCp(game) {
        try {
            const fen = game.fen();
            const whiteGame = new Chess(fenWithTurn(fen, "w"));
            const blackGame = new Chess(fenWithTurn(fen, "b"));
            const whiteMoves = whiteGame.moves().length;
            const blackMoves = blackGame.moves().length;
            return (whiteMoves - blackMoves) * 2;
        } catch {
            return 0;
        }
    }

    function evaluatePositionCp(game) {
        if (safeIsCheckmate(game)) {
            // If it's checkmate and side-to-move is white, white is mated (very bad for white).
            return game.turn() === "w" ? -MAX_ENGINE_CP : MAX_ENGINE_CP;
        }
        if (safeIsDraw(game)) {
            return 0;
        }

        const material = materialEvalCp(game);
        const mobility = mobilityEvalCp(game);
        return clamp(Math.trunc(material + mobility), -MAX_ENGINE_CP, MAX_ENGINE_CP);
    }

    function evalToNumeric(evalObj) {
        if (!evalObj) return 0;
        if (evalObj.type === "mate") {
            const mate = clamp(Number(evalObj.value || 0), -MAX_ENGINE_MATE_PLY, MAX_ENGINE_MATE_PLY);
            if (mate > 0) return MAX_ENGINE_CP + (MAX_ENGINE_MATE_PLY - mate);
            if (mate < 0) return -MAX_ENGINE_CP - (MAX_ENGINE_MATE_PLY - Math.abs(mate));
            return 0;
        }
        return clamp(Number(evalObj.value || 0), -MAX_ENGINE_CP, MAX_ENGINE_CP);
    }

    function evaluationFromCp(cp) {
        return sanitizeEngineEvaluation({ type: "cp", value: clamp(Math.trunc(cp), -MAX_ENGINE_CP, MAX_ENGINE_CP) });
    }

    function evaluateFallback(options) {
        const fen = String(options && options.fen ? options.fen : "");
        const requestedPv = clamp(parseInt(options && options.multipv, 10) || 1, 1, 5);
        const depth = clamp(parseInt(options && options.depth, 10) || 10, 1, 99);

        let game;
        try {
            game = new Chess(fen);
        } catch {
            return {
                bestMove: "",
                lines: []
            };
        }

        const legalMoves = game.moves({ verbose: true });
        if (!Array.isArray(legalMoves) || legalMoves.length === 0) {
            const terminalEval = safeIsCheckmate(game)
                ? sanitizeEngineEvaluation({ type: "mate", value: game.turn() === "w" ? -1 : 1 })
                : evaluationFromCp(0);
            return {
                bestMove: "",
                lines: [{
                    id: 1,
                    depth,
                    moveUCI: "",
                    moveSAN: "",
                    evaluation: terminalEval
                }]
            };
        }

        const rootTurn = game.turn();
        const rootIsWhite = rootTurn === "w";

        const scored = legalMoves.map((candidate) => {
            let evalObj = null;
            try {
                const after = new Chess(fen);
                const applied = after.move({
                    from: candidate.from,
                    to: candidate.to,
                    promotion: candidate.promotion || undefined
                });
                if (!applied) {
                    return null;
                }

                if (safeIsCheckmate(after)) {
                    // If black to move and checkmated after white move -> white mates.
                    evalObj = sanitizeEngineEvaluation({ type: "mate", value: after.turn() === "b" ? 1 : -1 });
                } else if (safeIsDraw(after)) {
                    evalObj = evaluationFromCp(0);
                } else {
                    // One-reply minimax to avoid random-looking choices when WASM is blocked.
                    const replies = after.moves({ verbose: true });
                    if (!replies.length) {
                        evalObj = evaluationFromCp(evaluatePositionCp(after));
                    } else {
                        let bestReplyCp = rootIsWhite ? Infinity : -Infinity;
                        for (let i = 0; i < replies.length; i += 1) {
                            const reply = replies[i];
                            const replyGame = new Chess(after.fen());
                            const appliedReply = replyGame.move({
                                from: reply.from,
                                to: reply.to,
                                promotion: reply.promotion || undefined
                            });
                            if (!appliedReply) {
                                continue;
                            }
                            const cp = evaluatePositionCp(replyGame);
                            if (rootIsWhite) {
                                if (cp < bestReplyCp) bestReplyCp = cp;
                            } else if (cp > bestReplyCp) {
                                bestReplyCp = cp;
                            }
                        }
                        if (!Number.isFinite(bestReplyCp)) {
                            bestReplyCp = evaluatePositionCp(after);
                        }
                        evalObj = evaluationFromCp(bestReplyCp);
                    }
                }
            } catch {
                evalObj = null;
            }

            if (!evalObj) {
                return null;
            }

            return {
                moveUCI: `${candidate.from}${candidate.to}${candidate.promotion || ""}`,
                moveSAN: candidate.san || "",
                evaluation: evalObj,
                depth
            };
        }).filter(Boolean);

        if (scored.length === 0) {
            return {
                bestMove: "",
                lines: []
            };
        }

        scored.sort((a, b) => {
            const aScore = evalToNumeric(a.evaluation);
            const bScore = evalToNumeric(b.evaluation);
            return rootIsWhite ? (bScore - aScore) : (aScore - bScore);
        });

        const lines = scored.slice(0, requestedPv).map((entry, index) => ({
            id: index + 1,
            depth: entry.depth,
            moveUCI: entry.moveUCI,
            moveSAN: entry.moveSAN,
            evaluation: entry.evaluation
        }));

        return {
            bestMove: lines[0] ? lines[0].moveUCI : "",
            lines
        };
    }

    function maybeWarnEngineFallback() {
        if (engineRuntime.warned || !engineRuntime.cspBlocked) {
            return;
        }
        engineRuntime.warned = true;
        try {
            console.warn("[engine] WASM bloqueado por CSP. Se activa fallback JS para mantener respuesta del motor.");
        } catch {
            // no-op
        }
    }

    function parseUciMove(uci) {
        if (!uci || !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(uci)) {
            return null;
        }

        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.slice(4) || undefined;
        const fromRank = parseInt(from[1], 10);
        const toRank = parseInt(to[1], 10);
        if (promotion && !((fromRank === 7 && toRank === 8) || (fromRank === 2 && toRank === 1))) {
            return null;
        }

        return {
            from,
            to,
            promotion
        };
    }

    function sanitizeEngineEvaluation(evaluation) {
        if (!evaluation || typeof evaluation !== "object") {
            return null;
        }

        const type = String(evaluation.type || "").toLowerCase();
        if (type === "mate") {
            const raw = Number(evaluation.value);
            if (!Number.isFinite(raw)) {
                return null;
            }
            return {
                type: "mate",
                value: clamp(Math.trunc(raw), -MAX_ENGINE_MATE_PLY, MAX_ENGINE_MATE_PLY)
            };
        }

        const raw = Number(evaluation.value);
        if (!Number.isFinite(raw)) {
            return null;
        }

        return {
            type: "cp",
            value: clamp(Math.trunc(raw), -MAX_ENGINE_CP, MAX_ENGINE_CP)
        };
    }

    function normalizeUciMoveForFen(fen, uciMove) {
        const parsed = parseUciMove(uciMove);
        if (!parsed) {
            return null;
        }

        try {
            const game = new Chess(fen);
            const move = game.move(parsed);
            if (!move) {
                return null;
            }
            const promotion = move.promotion || undefined;
            return {
                from: move.from,
                to: move.to,
                promotion,
                uci: `${move.from}${move.to}${promotion || ""}`,
                san: move.san
            };
        } catch {
            return null;
        }
    }

    function normalizeEngineLinesForFen(fen, lines) {
        const source = Array.isArray(lines) ? lines : [];
        if (source.length === 0) {
            return [];
        }

        const byId = new Map();
        source.forEach((line) => {
            if (!line || typeof line !== "object") {
                return;
            }

            const normalizedMove = normalizeUciMoveForFen(fen, line.moveUCI || line.bestMove || "");
            const evaluation = sanitizeEngineEvaluation(line.evaluation);
            if (!normalizedMove || !evaluation) {
                return;
            }

            const id = clamp(parseInt(line.id || "1", 10) || 1, 1, 8);
            const depth = clamp(parseInt(line.depth || "0", 10) || 0, 0, 99);
            const normalizedLine = {
                id,
                depth,
                moveUCI: normalizedMove.uci,
                moveSAN: normalizedMove.san,
                evaluation
            };

            const existing = byId.get(id);
            if (!existing || normalizedLine.depth >= existing.depth) {
                byId.set(id, normalizedLine);
            }
        });

        return Array.from(byId.values()).sort((a, b) => a.id - b.id);
    }

    function parseInfoLine(message, fen) {
        if (!message.startsWith("info depth")) {
            return null;
        }

        const depthMatch = message.match(/\bdepth (\d+)/);
        const idMatch = message.match(/\bmultipv (\d+)/);
        const moveMatch = message.match(/\bpv ([a-h][1-8][a-h][1-8][nbrq]?)/);

        if (!depthMatch || !moveMatch) {
            return null;
        }

        const id = parseInt(idMatch ? idMatch[1] : "1", 10);
        const depth = parseInt(depthMatch[1], 10);

        const cpMatch = message.match(/\bscore cp (-?\d+)/);
        const mateMatch = message.match(/\bscore mate (-?\d+)/);
        let evaluation = null;

        if (cpMatch) {
            let value = parseInt(cpMatch[1], 10);
            if (fen.includes(" b ")) {
                value *= -1;
            }
            evaluation = sanitizeEngineEvaluation({ type: "cp", value });
        } else if (mateMatch) {
            let value = parseInt(mateMatch[1], 10);
            if (fen.includes(" b ")) {
                value *= -1;
            }
            evaluation = sanitizeEngineEvaluation({ type: "mate", value });
        }

        if (!evaluation) {
            return null;
        }

        return { id, depth, moveUCI: moveMatch[1], evaluation };
    }

    function eloToSkill(elo) {
        return clamp(Math.round((elo - 400) / 120), 0, 20);
    }

    function getEngineThreads() {
        if (typeof navigator === "undefined") {
            return 2;
        }
        const hw = Number(navigator.hardwareConcurrency || 2);
        if (!Number.isFinite(hw) || hw <= 1) {
            return 1;
        }
        return clamp(Math.floor(hw / 2), 1, 4);
    }

    function getEngineHashMb() {
        if (typeof navigator === "undefined") {
            return 96;
        }
        const memory = Number(navigator.deviceMemory || 4);
        if (!Number.isFinite(memory)) {
            return 96;
        }
        if (memory >= 12) return 192;
        if (memory >= 8) return 160;
        if (memory >= 4) return 128;
        return 64;
    }

    function createStockfishWorker(enginePath) {
        const normalizedPath = String(enginePath || "").toLowerCase();
        const moduleWorker = normalizedPath.includes("stockfish-18-standard-worker.js");
        try {
            if (moduleWorker) {
                return new Worker(enginePath, { type: "module" });
            }
            return new Worker(enginePath);
        } catch (error) {
            if (isCspWasmBlockError(error)) {
                markCspBlocked(error);
            }
            throw error;
        }
    }

    function runStockfishInternal(options, enginePath) {
        const {
            fen,
            depth,
            multipv,
            movetime,
            elo,
            timeoutMs = 60000
        } = options;

        return new Promise((resolve, reject) => {
            let worker;
            let timeoutId;
            let started = false;
            const linesById = new Map();
            let resolved = false;

            const cleanup = () => {
                clearTimeout(timeoutId);
                if (worker) {
                    worker.terminate();
                }
            };

            try {
                worker = createStockfishWorker(enginePath);
            } catch (error) {
                reject(error);
                return;
            }

            timeoutId = setTimeout(() => {
                const partialLines = normalizeEngineLinesForFen(
                    fen,
                    Array.from(linesById.values()).sort((a, b) => a.id - b.id)
                );
                if (!resolved && partialLines.length > 0) {
                    resolved = true;
                    cleanup();
                    resolve({
                        bestMove: partialLines[0].moveUCI || "",
                        lines: partialLines
                    });
                    return;
                }
                cleanup();
                reject(new Error("El motor tardo demasiado en responder."));
            }, timeoutMs);

            worker.onmessage = (event) => {
                const message = String(event.data || "");
                if (isCspWasmBlockError(message)) {
                    markCspBlocked(message);
                    cleanup();
                    reject(new Error("WASM bloqueado por CSP"));
                    return;
                }

                if (message === "uciok") {
                    worker.postMessage("setoption name Threads value " + getEngineThreads());
                    worker.postMessage("setoption name Hash value " + getEngineHashMb());
                    worker.postMessage("setoption name UCI_AnalyseMode value true");
                    worker.postMessage("setoption name Move Overhead value 20");
                    worker.postMessage("setoption name Minimum Thinking Time value 15");
                    worker.postMessage("setoption name Ponder value false");
                    worker.postMessage("setoption name Use NNUE value true");
                    worker.postMessage("setoption name MultiPV value " + Math.max(1, multipv || 1));

                    if (elo) {
                        const boundedElo = clamp(elo, 400, 2800);
                        worker.postMessage("setoption name UCI_LimitStrength value true");
                        worker.postMessage("setoption name UCI_Elo value " + boundedElo);
                        worker.postMessage("setoption name Skill Level value " + eloToSkill(boundedElo));
                    } else {
                        worker.postMessage("setoption name UCI_LimitStrength value false");
                    }

                    worker.postMessage("isready");
                    return;
                }

                if (message === "readyok" && !started) {
                    started = true;
                    worker.postMessage("ucinewgame");
                    worker.postMessage("position fen " + fen);

                    if (movetime) {
                        worker.postMessage("go movetime " + movetime);
                    } else {
                        worker.postMessage("go depth " + depth);
                    }
                    return;
                }

                const parsed = parseInfoLine(message, fen);
                if (parsed) {
                    const existing = linesById.get(parsed.id);
                    if (!existing || parsed.depth >= existing.depth) {
                        linesById.set(parsed.id, parsed);
                    }
                }

                if (message.startsWith("bestmove")) {
                    const bestMove = message.split(" ")[1] || "";
                    const normalizedLines = normalizeEngineLinesForFen(
                        fen,
                        Array.from(linesById.values()).sort((a, b) => a.id - b.id)
                    );
                    const normalizedBest = normalizeUciMoveForFen(fen, bestMove);

                    if (!resolved) {
                        resolved = true;
                        cleanup();

                        resolve({
                            bestMove: normalizedBest ? normalizedBest.uci : (normalizedLines[0] ? normalizedLines[0].moveUCI : ""),
                            lines: normalizedLines
                        });
                    }
                }
            };

            worker.onerror = (error) => {
                if (isCspWasmBlockError(error)) {
                    markCspBlocked(error);
                }
                cleanup();
                reject(error);
            };

            worker.postMessage("uci");
        });
    }

    function buildEvalCacheKey(options) {
        return [
            options.fen || "",
            options.depth || "",
            options.multipv || "",
            options.movetime || "",
            options.elo || ""
        ].join("|");
    }

    async function warmEngineAsset() {
        if (engineAssetWarm) {
            return;
        }
        engineAssetWarm = true;
        await Promise.allSettled([
            fetch(ENGINE_PRIMARY, { cache: "force-cache" }),
            fetch(ENGINE_FALLBACK, { cache: "force-cache" })
        ]);
    }

    async function evaluateWithStockfish(options) {
        const cacheKey = buildEvalCacheKey(options);
        const cached = ENGINE_EVAL_CACHE.get(cacheKey);
        if (cached && (Date.now() - cached.at) < CACHE_TTL_MS) {
            return cached.value;
        }

        const wasmAllowed = await ensureWasmAllowed();
        if (!wasmAllowed) {
            const fallback = evaluateFallback(options);
            ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value: fallback });
            maybeWarnEngineFallback();
            return fallback;
        }

        // Prune cache if too large
        if (ENGINE_EVAL_CACHE.size > 200) {
            const now = Date.now();
            for (const [key, entry] of ENGINE_EVAL_CACHE) {
                if (now - entry.at > CACHE_TTL_MS * 10) {
                    ENGINE_EVAL_CACHE.delete(key);
                }
            }
        }

        await warmEngineAsset();

        try {
            const value = await runStockfishInternal(options, ENGINE_PRIMARY);
            ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
            return value;
        } catch (primaryError) {
            if (isCspWasmBlockError(primaryError) || engineRuntime.cspBlocked) {
                markCspBlocked(primaryError);
                const fallback = evaluateFallback(options);
                ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value: fallback });
                maybeWarnEngineFallback();
                return fallback;
            }
            try {
                const value = await runStockfishInternal(options, ENGINE_FALLBACK);
                ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
                return value;
            } catch (fallbackError) {
                if (isCspWasmBlockError(fallbackError) || engineRuntime.cspBlocked) {
                    markCspBlocked(fallbackError);
                    const fallback = evaluateFallback(options);
                    ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value: fallback });
                    maybeWarnEngineFallback();
                    return fallback;
                }
                const emergencyOptions = {
                    ...options,
                    multipv: 1,
                    movetime: clamp(Number(options.movetime || 900), 350, 1400),
                    depth: clamp(Number(options.depth || 10), 8, 14),
                    timeoutMs: 30000
                };
                try {
                    const value = await runStockfishInternal(emergencyOptions, ENGINE_FALLBACK);
                    ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
                    return value;
                } catch (finalError) {
                    if (isCspWasmBlockError(finalError)) {
                        markCspBlocked(finalError);
                    }
                    const fallback = evaluateFallback(options);
                    ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value: fallback });
                    maybeWarnEngineFallback();
                    return fallback;
                }
            }
        }
    }

    function uciToSanFromFen(fen, uciMove) {
        const normalized = normalizeUciMoveForFen(fen, uciMove);
        return normalized ? normalized.san : String(uciMove || "");
    }

    function clearEvalCache() {
        ENGINE_EVAL_CACHE.clear();
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.engine = {
        parseInfoLine,
        parseUciMove,
        runStockfishInternal,
        evaluateWithStockfish,
        uciToSanFromFen,
        warmEngineAsset,
        clearEvalCache,
        getRuntimeStatus: () => ({ ...engineRuntime })
    };
})(window);
