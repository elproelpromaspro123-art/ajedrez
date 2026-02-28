(function initEngineModule(global) {
    const Chess = global.Chess;

    const ENGINE_PRIMARY = "/static/scripts/stockfish-18-standard-worker.js";
    const ENGINE_FALLBACK = "/static/scripts/stockfish-nnue-16.js";
    const MAX_ENGINE_MATE_PLY = 99;
    const MAX_ENGINE_CP = 3500;
    const ENGINE_EVAL_CACHE = new Map();
    const CACHE_TTL_MS = 2200;
    let engineAssetWarm = false;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
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
        if (moduleWorker) {
            return new Worker(enginePath, { type: "module" });
        }
        return new Worker(enginePath);
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
        } catch {
            try {
                const value = await runStockfishInternal(options, ENGINE_FALLBACK);
                ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
                return value;
            } catch {
                const emergencyOptions = {
                    ...options,
                    multipv: 1,
                    movetime: clamp(Number(options.movetime || 900), 350, 1400),
                    depth: clamp(Number(options.depth || 10), 8, 14),
                    timeoutMs: 30000
                };
                const value = await runStockfishInternal(emergencyOptions, ENGINE_FALLBACK);
                ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
                return value;
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
        clearEvalCache
    };
})(window);
