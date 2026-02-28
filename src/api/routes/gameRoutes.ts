import { Router } from "express";

export interface GameRouteDeps {
    getClientIdentifier: (req: any) => string;
    checkParseRateLimit: (clientId: string) => Promise<{ limited: boolean; retryAfterMs: number }>;
    checkReportRateLimit: (clientId: string) => Promise<{ limited: boolean; retryAfterMs: number }>;
    checkAIRateLimit: (clientId: string) => Promise<{ limited: boolean; retryAfterMs: number }>;
    MAX_PGN_LENGTH: number;
    isNonEmptyString: (value: unknown) => value is string;
    parsePgnToPositions: (pgn: string) => Promise<any[]>;
    openingsCatalog: Array<{ name?: string; fen?: string }>;
    sanitizeExplorerFen: (value: unknown) => string | null;
    parseExplorerMoves: (value: unknown) => number | null;
    sanitizeExplorerSpeeds: (value: unknown) => string[] | null;
    sanitizeExplorerRatings: (value: unknown) => string[] | null;
    buildExplorerCacheKey: (...args: any[]) => string;
    getFreshTimedCacheValue: (cache: Map<string, any>, key: string, ttlMs: number) => any;
    explorerCache: Map<string, any>;
    EXPLORER_CACHE_TTL_MS: number;
    OPENING_EXPLORER_TIMEOUT_MS: number;
    OPENING_EXPLORER_ENDPOINT: string;
    getExplorerFallbackPayload: (cacheKey: string, fen: string) => Record<string, unknown>;
    sanitizeOpeningMeta: (value: unknown) => { eco: string; name: string } | null;
    isValidUciMove: (value: unknown) => boolean;
    sanitizeInlineText: (value: unknown, maxLength: number) => string;
    setTimedCacheValue: (cache: Map<string, any>, key: string, payload: unknown, opts: { ttlMs: number; maxEntries: number }) => void;
    EXPLORER_CACHE_MAX_ENTRIES: number;
    OPENING_EXPLORER_DEGRADED_MESSAGE: string;
    isValidEngineLine: (value: unknown) => boolean;
    analyse: (positions: any[]) => Promise<any>;
    ChessCtor: new (fen?: string) => any;
    clampText: (value: string, maxLength: number) => string;
    requestGroqChatCompletion: (systemPrompt: string, question: string) => Promise<string>;
    parseStructuredAIResponse: (content: string) => { text: string; actions: any[] };
}

export function registerGameRoutes(router: Router, deps: GameRouteDeps) {
    const {
        getClientIdentifier,
        checkParseRateLimit,
        checkReportRateLimit,
        checkAIRateLimit,
        MAX_PGN_LENGTH,
        isNonEmptyString,
        parsePgnToPositions,
        openingsCatalog,
        sanitizeExplorerFen,
        parseExplorerMoves,
        sanitizeExplorerSpeeds,
        sanitizeExplorerRatings,
        buildExplorerCacheKey,
        getFreshTimedCacheValue,
        explorerCache,
        EXPLORER_CACHE_TTL_MS,
        OPENING_EXPLORER_TIMEOUT_MS,
        OPENING_EXPLORER_ENDPOINT,
        getExplorerFallbackPayload,
        sanitizeOpeningMeta,
        isValidUciMove,
        sanitizeInlineText,
        setTimedCacheValue,
        EXPLORER_CACHE_MAX_ENTRIES,
        OPENING_EXPLORER_DEGRADED_MESSAGE,
        isValidEngineLine,
        analyse,
        ChessCtor,
        clampText,
        requestGroqChatCompletion,
        parseStructuredAIResponse
    } = deps;

    router.post("/parse", async (req, res) => {
        const clientId = getClientIdentifier(req);
        const parseLimit = await checkParseRateLimit(clientId);
        if (parseLimit.limited) {
            res.setHeader("Retry-After", String(Math.ceil(parseLimit.retryAfterMs / 1000)));
            return res.status(429).json({
                message: "Demasiadas solicitudes de parseo PGN. Espera unos segundos.",
                retryAfterMs: parseLimit.retryAfterMs
            });
        }

        let { pgn } = req.body || {};
        if (!isNonEmptyString(pgn)) {
            return res.status(400).json({ message: "Introduce un PGN para analizar." });
        }

        pgn = pgn.trim();
        if (pgn.length > MAX_PGN_LENGTH) {
            return res.status(413).json({ message: "El PGN es demasiado grande." });
        }

        if (!/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(pgn)) {
            pgn += " *";
        }

        try {
            const positions = await parsePgnToPositions(pgn);
            return res.json({ positions });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Formato PGN invalido.";
            const normalized = /ilegales/i.test(message)
                ? "El PGN contiene jugadas ilegales."
                : /invalidas/i.test(message)
                    ? "El PGN contiene jugadas invalidas."
                    : /introduce/i.test(message)
                        ? "Introduce un PGN para analizar."
                        : "Formato PGN invalido.";
            return res.status(400).json({ message: normalized });
        }
    });

    router.get("/openings", async (_req, res) => {
        try {
            const payload = openingsCatalog
                .filter((entry) => isNonEmptyString(entry.name) && isNonEmptyString(entry.fen) && entry.name!.trim() !== "Starting Position")
                .map((entry) => ({
                    name: entry.name!.trim(),
                    fen: entry.fen!.trim()
                }));

            return res.json({
                count: payload.length,
                openings: payload
            });
        } catch (err) {
            console.error("Openings catalog request failed:", err);
            return res.status(500).json({ message: "No se pudo cargar el catalogo de aperturas." });
        }
    });

    router.get("/opening-explorer", async (req, res) => {
        const fen = sanitizeExplorerFen(req.query.fen);
        if (!fen) {
            return res.status(400).json({ message: "FEN invalido." });
        }

        const movesNum = parseExplorerMoves(req.query.moves);
        if (movesNum == null) {
            return res.status(400).json({ message: "Parametro de jugadas invalido." });
        }

        const speeds = sanitizeExplorerSpeeds(req.query.speeds);
        if (!speeds) {
            return res.status(400).json({ message: "Parametro de velocidades invalido." });
        }

        const ratings = sanitizeExplorerRatings(req.query.ratings);
        if (!ratings) {
            return res.status(400).json({ message: "Parametro de ratings invalido." });
        }

        const cacheKey = buildExplorerCacheKey(fen, movesNum, speeds, ratings);
        const cached = getFreshTimedCacheValue(explorerCache, cacheKey, EXPLORER_CACHE_TTL_MS);
        if (cached) {
            return res.json(cached);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OPENING_EXPLORER_TIMEOUT_MS);

        try {
            const query = new URLSearchParams({
                variant: "standard",
                fen,
                moves: String(movesNum),
                speeds: speeds.join(","),
                ratings: ratings.join(",")
            });

            const response = await fetch(`${OPENING_EXPLORER_ENDPOINT}?${query.toString()}`, {
                signal: controller.signal
            });

            const rawPayload = await response.text();
            let payload: Record<string, unknown> = {};
            try {
                payload = JSON.parse(rawPayload) as Record<string, unknown>;
            } catch {}

            if (!response.ok) {
                const fallbackPayload = getExplorerFallbackPayload(cacheKey, fen);
                return res.json({
                    ...fallbackPayload,
                    degraded: true,
                    message: (payload as any)?.error || `Opening explorer provider error (${response.status}).`
                });
            }

            const safePayload = {
                fen,
                white: Number((payload as any)?.white || 0),
                draws: Number((payload as any)?.draws || 0),
                black: Number((payload as any)?.black || 0),
                opening: sanitizeOpeningMeta((payload as any)?.opening),
                moves: Array.isArray((payload as any)?.moves)
                    ? (payload as any).moves.slice(0, 18).map((move: any) => ({
                        uci: isValidUciMove(move?.uci) ? String(move.uci).trim().toLowerCase() : "",
                        san: sanitizeInlineText(move?.san, 24),
                        white: Number(move?.white || 0),
                        draws: Number(move?.draws || 0),
                        black: Number(move?.black || 0),
                        averageRating: Number(move?.averageRating || 0),
                        opening: sanitizeOpeningMeta(move?.opening)
                    }))
                    : []
            };

            setTimedCacheValue(explorerCache, cacheKey, safePayload, {
                ttlMs: EXPLORER_CACHE_TTL_MS,
                maxEntries: EXPLORER_CACHE_MAX_ENTRIES
            });

            return res.json(safePayload);
        } catch (err) {
            const fallbackPayload = getExplorerFallbackPayload(cacheKey, fen);
            if (err instanceof Error && err.name === "AbortError") {
                return res.json({
                    ...fallbackPayload,
                    degraded: true,
                    message: `Opening explorer timeout (${OPENING_EXPLORER_TIMEOUT_MS}ms).`
                });
            }

            const message = err instanceof Error ? err.message : "Opening explorer request failed.";
            return res.json({
                ...fallbackPayload,
                degraded: true,
                message: message || OPENING_EXPLORER_DEGRADED_MESSAGE
            });
        } finally {
            clearTimeout(timeout);
        }
    });

    router.post("/report", async (req, res) => {
        const clientId = getClientIdentifier(req);
        const reportLimit = await checkReportRateLimit(clientId);
        if (reportLimit.limited) {
            res.setHeader("Retry-After", String(Math.ceil(reportLimit.retryAfterMs / 1000)));
            return res.status(429).json({
                message: "Demasiadas solicitudes de reporte. Espera unos segundos.",
                retryAfterMs: reportLimit.retryAfterMs
            });
        }

        const { positions } = req.body || {};

        if (!Array.isArray(positions) || positions.length === 0) {
            return res.status(400).json({ message: "Faltan parametros." });
        }

        if (positions.length > 600) {
            return res.status(400).json({ message: "Demasiadas posiciones (max 600)." });
        }

        for (let i = 0; i < positions.length; i += 1) {
            const pos = positions[i] as any;
            if (!pos || typeof pos.fen !== "string" || pos.fen.trim().length === 0) {
                return res.status(400).json({ message: `Posicion ${i} tiene FEN invalido o faltante.` });
            }

            try {
                new ChessCtor(pos.fen.trim());
            } catch {
                return res.status(400).json({ message: `Posicion ${i} tiene un FEN invalido.` });
            }

            if (!Array.isArray(pos.topLines) || pos.topLines.length === 0) {
                return res.status(400).json({ message: `Posicion ${i} no tiene topLines validas.` });
            }

            const hasInvalidTopLine = pos.topLines.some((line: unknown) => !isValidEngineLine(line));
            if (hasInvalidTopLine) {
                return res.status(400).json({ message: `Posicion ${i} contiene lineas de motor invalidas.` });
            }

            if (i > 0) {
                if (!pos.move || !isNonEmptyString(pos.move.san) || !isValidUciMove(pos.move.uci)) {
                    return res.status(400).json({ message: `Posicion ${i} tiene jugada invalida o faltante.` });
                }
            }
        }

        try {
            const results = await analyse(positions);
            return res.json({ results });
        } catch (err) {
            console.error("Report generation failed:", err);
            return res.status(500).json({ message: "No se pudo generar el reporte." });
        }
    });

    router.post("/ai-chat", async (req, res) => {
        const { question, systemPrompt, structured } = req.body || {};

        if (!isNonEmptyString(question)) {
            return res.status(400).json({ message: "La pregunta es requerida." });
        }

        const clientId = getClientIdentifier(req);
        const limit = await checkAIRateLimit(clientId);
        if (limit.limited) {
            res.setHeader("Retry-After", String(Math.ceil(limit.retryAfterMs / 1000)));
            return res.status(429).json({
                message: "Limite de solicitudes de IA excedido. Espera unos segundos antes de reintentar.",
                retryAfterMs: limit.retryAfterMs
            });
        }

        const safeQuestion = clampText(question.trim(), 1600);
        const safeSystemPrompt = isNonEmptyString(systemPrompt)
            ? clampText(systemPrompt.trim(), 4500)
            : "You are a concise chess assistant.";

        try {
            const content = await requestGroqChatCompletion(safeSystemPrompt, safeQuestion);

            if (structured) {
                const parsed = parseStructuredAIResponse(content);
                return res.json({
                    content: parsed.text || content,
                    actions: parsed.actions
                });
            }

            return res.json({ content });
        } catch (err) {
            if (err instanceof Error && err.message === "GROQ_API_KEY_MISSING") {
                return res.status(503).json({ message: "El asistente IA no esta configurado en el servidor." });
            }

            console.error("AI chat request failed:", err);

            if (structured) {
                return res.json({
                    content: "No pude completar la solicitud de IA ahora. Te muestro fallback limpio sin acciones ejecutables.",
                    actions: []
                });
            }

            return res.status(502).json({ message: "No se pudo obtener respuesta del asistente IA." });
        }
    });
}
