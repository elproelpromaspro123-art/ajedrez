import { Request, Router } from "express";
import { Chess } from "chess.js";
import pgnParser from "pgn-parser";

import analyse from "./lib/analysis";
import { parseStructuredAIResponse } from "./lib/aiActions";
import { Position } from "./lib/types/Position";
import { AIChatRequestBody, ParseRequestBody, ReportRequestBody } from "./lib/types/RequestBody";
import openings from "./resources/openings.json";

const router = Router();
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqChatCompletionResponse {
    choices?: Array<{
        message?: {
            content?: string
        }
    }>,
    error?: {
        message?: string
    }
}

interface OpeningCatalogEntry {
    name?: string;
    fen?: string;
}

interface ExplorerCacheEntry {
    at: number;
    payload: unknown;
}

const OPENING_EXPLORER_ENDPOINT = "https://explorer.lichess.ovh/lichess";
const EXPLORER_CACHE_TTL_MS = 1000 * 60 * 30;
const explorerCache = new Map<string, ExplorerCacheEntry>();
const AI_PROVIDER_TIMEOUT_MS = 9000;
const AI_RATE_WINDOW_MS = 10000;
const AI_RATE_MAX_REQUESTS = 1;
const aiRateLimiter = new Map<string, number[]>();

function isNonEmptyString(value: unknown): value is string {
    return typeof value == "string" && value.trim().length > 0;
}

function clampText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return value.slice(0, maxLength);
}

function getClientIdentifier(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded == "string" && forwarded.length > 0) {
        const first = forwarded.split(",")[0];
        if (first && first.trim().length > 0) {
            return first.trim();
        }
    }

    if (Array.isArray(forwarded) && forwarded[0]) {
        return String(forwarded[0]);
    }

    return String(req.ip || "unknown");
}

function checkAIRateLimit(clientId: string) {
    const now = Date.now();
    const history = aiRateLimiter.get(clientId) || [];
    const active = history.filter((timestamp) => now - timestamp < AI_RATE_WINDOW_MS);

    if (active.length >= AI_RATE_MAX_REQUESTS) {
        const retryAfterMs = Math.max(1, AI_RATE_WINDOW_MS - (now - active[0]));
        aiRateLimiter.set(clientId, active);
        return {
            limited: true,
            retryAfterMs
        };
    }

    active.push(now);
    aiRateLimiter.set(clientId, active);

    return {
        limited: false,
        retryAfterMs: 0
    };
}

async function requestGroqChatCompletion(systemPrompt: string, question: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY_MISSING");
    }

    const model = process.env.GROQ_MODEL || "groq/compound";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_PROVIDER_TIMEOUT_MS);

    let response: Response;
    let rawPayload = "";

    try {
        response = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: question }
                ],
                temperature: 0.3,
                max_completion_tokens: 800,
                top_p: 0.9
            }),
            signal: controller.signal
        });

        rawPayload = await response.text();
    } catch (err) {
        if (err instanceof Error && err.name == "AbortError") {
            throw new Error(`AI provider timeout (${AI_PROVIDER_TIMEOUT_MS}ms).`);
        }

        throw err;
    } finally {
        clearTimeout(timeout);
    }

    let payload: GroqChatCompletionResponse = {};
    try {
        payload = JSON.parse(rawPayload) as GroqChatCompletionResponse;
    } catch {}

    if (!response.ok) {
        const providerMessage = payload.error?.message;
        throw new Error(providerMessage || `AI provider request failed (${response.status}).`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!isNonEmptyString(content)) {
        throw new Error("AI provider returned an empty response.");
    }

    return content.trim();
}

router.post("/parse", async (req, res) => {

    let { pgn }: ParseRequestBody = req.body || {};
    
    if (!isNonEmptyString(pgn)) {
        return res.status(400).json({ message: "Enter a PGN to analyse." });
    }

    pgn = pgn.trim();

    // Accept PGNs that do not explicitly include a result marker.
    if (!/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(pgn)) {
        pgn += " *";
    }

    // Parse PGN into object
    let parsedPGN;
    try {
        [ parsedPGN ] = pgnParser.parse(pgn);

        if (!parsedPGN) {
            return res.status(400).json({ message: "Enter a PGN to analyse." });
        }
    } catch {
        return res.status(400).json({ message: "Invalid PGN format." });
    }

    // Create a virtual board
    const board = new Chess();
    const positions: Position[] = [];

    positions.push({ fen: board.fen() });

    // Add each move to the board; log FEN and SAN
    for (const pgnMove of parsedPGN.moves) {
        const moveSAN = pgnMove.move;
        if (!isNonEmptyString(moveSAN)) {
            return res.status(400).json({ message: "PGN contains invalid moves." });
        }

        let virtualBoardMove;
        try {
            virtualBoardMove = board.move(moveSAN);
        } catch {
            return res.status(400).json({ message: "PGN contains illegal moves." });
        }

        if (!virtualBoardMove) {
            return res.status(400).json({ message: "PGN contains illegal moves." });
        }

        const moveUCI = `${virtualBoardMove.from}${virtualBoardMove.to}${virtualBoardMove.promotion || ""}`;

        positions.push({
            fen: board.fen(),
            move: {
                san: moveSAN,
                uci: moveUCI
            }
        });
    }

    res.json({ positions });

});

router.get("/openings", async (_req, res) => {
    try {
        const payload = (openings as OpeningCatalogEntry[])
            .filter((entry) => isNonEmptyString(entry.name) && isNonEmptyString(entry.fen))
            .map((entry) => ({
                name: entry.name!.trim(),
                fen: entry.fen!.trim()
            }));

        res.json({
            count: payload.length,
            openings: payload
        });
    } catch (err) {
        console.error("Openings catalog request failed:", err);
        res.status(500).json({ message: "Failed to load openings catalog." });
    }
});

router.get("/opening-explorer", async (req, res) => {
    const fen = isNonEmptyString(req.query.fen) ? req.query.fen.trim() : "startpos";
    const moves = isNonEmptyString(req.query.moves) ? req.query.moves.trim() : "16";
    const speeds = isNonEmptyString(req.query.speeds) ? req.query.speeds.trim() : "rapid,blitz,classical";
    const ratings = isNonEmptyString(req.query.ratings) ? req.query.ratings.trim() : "1600,1800,2000";

    const cacheKey = `${fen}|${moves}|${speeds}|${ratings}`;
    const cached = explorerCache.get(cacheKey);
    if (cached && Date.now() - cached.at <= EXPLORER_CACHE_TTL_MS) {
        return res.json(cached.payload);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
        const query = new URLSearchParams({
            variant: "standard",
            fen,
            moves,
            speeds,
            ratings
        });

        const response = await fetch(`${OPENING_EXPLORER_ENDPOINT}?${query.toString()}`, {
            signal: controller.signal
        });

        const payload = await response.json();
        if (!response.ok) {
            return res.status(502).json({
                message: payload?.error || `Opening explorer provider error (${response.status}).`
            });
        }

        const safePayload = {
            fen,
            white: Number(payload?.white || 0),
            draws: Number(payload?.draws || 0),
            black: Number(payload?.black || 0),
            opening: payload?.opening || null,
            moves: Array.isArray(payload?.moves)
                ? payload.moves.slice(0, 18).map((move: any) => ({
                    uci: isNonEmptyString(move?.uci) ? move.uci : "",
                    san: isNonEmptyString(move?.san) ? move.san : "",
                    white: Number(move?.white || 0),
                    draws: Number(move?.draws || 0),
                    black: Number(move?.black || 0),
                    averageRating: Number(move?.averageRating || 0),
                    opening: move?.opening || null
                }))
                : []
        };

        explorerCache.set(cacheKey, {
            at: Date.now(),
            payload: safePayload
        });

        return res.json(safePayload);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Opening explorer request failed.";
        return res.status(502).json({ message });
    } finally {
        clearTimeout(timeout);
    }
});

router.post("/report", async (req, res) => {

    const { positions }: ReportRequestBody = req.body || {};

    if (!Array.isArray(positions) || positions.length == 0) {
        return res.status(400).json({ message: "Missing parameters." });
    }

    // Generate report
    let results;
    try {
        results = await analyse(positions);
    } catch (err) {
        console.error("Report generation failed:", err);
        return res.status(500).json({ message: "Failed to generate report." });
    }

    res.json({ results });

});

router.post("/ai-chat", async (req, res) => {

    const { question, systemPrompt, structured }: AIChatRequestBody = req.body || {};

    if (!isNonEmptyString(question)) {
        return res.status(400).json({ message: "Question is required." });
    }

    const clientId = getClientIdentifier(req);
    const limit = checkAIRateLimit(clientId);
    if (limit.limited) {
        res.setHeader("Retry-After", String(Math.ceil(limit.retryAfterMs / 1000)));
        return res.status(429).json({
            message: "Rate limit exceeded for AI chat. Wait a few seconds before trying again.",
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
        if (err instanceof Error && err.message == "GROQ_API_KEY_MISSING") {
            return res.status(503).json({ message: "AI assistant is not configured on the server." });
        }

        console.error("AI chat request failed:", err);

        if (structured) {
            return res.json({
                content: "No pude completar la solicitud de IA ahora. Te muestro fallback limpio sin acciones ejecutables.",
                actions: []
            });
        }

        return res.status(502).json({ message: "Failed to get a response from AI assistant." });
    }

});

export default router;
