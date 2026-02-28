(function initEngineModule(global) {
    const Chess = global.Chess;

    const ENGINE_PRIMARY = "/static/scripts/stockfish.js";
    // Use non-WASM fallback to avoid CSP + WebAssembly instantiate errors.
    const ENGINE_FALLBACK = "/static/scripts/stockfish.js";
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
        return {
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.slice(4) || undefined
        };
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

        let evaluation;

        const cpMatch = message.match(/\bscore cp (-?\d+)/);
        const mateMatch = message.match(/\bscore mate (-?\d+)/);

        if (cpMatch) {
            let value = parseInt(cpMatch[1], 10);
            if (fen.includes(" b ")) {
                value *= -1;
            }
            evaluation = { type: "cp", value };
        } else if (mateMatch) {
            let value = parseInt(mateMatch[1], 10);
            if (fen.includes(" b ")) {
                value *= -1;
            }
            evaluation = { type: "mate", value };
        } else {
            return null;
        }

        return { id, depth, moveUCI: moveMatch[1], evaluation };
    }

    function eloToSkill(elo) {
        return clamp(Math.round((elo - 400) / 120), 0, 20);
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
                worker = new Worker(enginePath);
            } catch (error) {
                reject(error);
                return;
            }

            timeoutId = setTimeout(() => {
                const partialLines = Array.from(linesById.values()).sort((a, b) => a.id - b.id);
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

                    if (!resolved) {
                        resolved = true;
                        cleanup();

                        resolve({
                            bestMove,
                            lines: Array.from(linesById.values()).sort((a, b) => a.id - b.id)
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
        const parsed = parseUciMove(uciMove);
        if (!parsed) {
            return uciMove;
        }

        try {
            const game = new Chess(fen);
            const move = game.move(parsed);
            return move ? move.san : uciMove;
        } catch {
            return uciMove;
        }
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
