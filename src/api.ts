import { Request, Router } from "express";
import { Chess } from "chess.js";
import pgnParser from "pgn-parser";

import analyse from "./lib/analysis";
import { parseStructuredAIResponse } from "./lib/aiActions";
import { getDatabaseMeta, mergeScopedData, readScopedData } from "./lib/databaseStore";
import {
    buildExplorerCacheKey,
    getFreshTimedCacheValue,
    parseExplorerMoves,
    sanitizeExplorerFen,
    sanitizeExplorerRatings,
    sanitizeExplorerSpeeds,
    setTimedCacheValue,
    TimedCacheEntry
} from "./lib/openingExplorer";
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

interface ProfileStoreSyncBody {
    progress?: unknown;
    lessons?: unknown;
    profile?: unknown;
}

const OPENING_EXPLORER_ENDPOINT = "https://explorer.lichess.ovh/lichess";
const EXPLORER_CACHE_TTL_MS = 1000 * 60 * 30;
const EXPLORER_CACHE_MAX_ENTRIES = 500;
const OPENING_EXPLORER_TIMEOUT_MS = 9000;
const MAX_PGN_LENGTH = 120_000;
const explorerCache = new Map<string, TimedCacheEntry<unknown>>();
const AI_PROVIDER_TIMEOUT_MS = 9000;
const AI_RATE_WINDOW_MS = 10000;
const AI_RATE_MAX_REQUESTS = 1;
const PROFILE_SYNC_MAX_BYTES = 850_000;
const PROFILE_PROGRESS_GAMES_MAX = 400;
const PROFILE_PROGRESS_ACTIVITIES_MAX = 1200;
const PROFILE_LESSON_KEYS_MAX = 250;
const aiRateLimiter = new Map<string, number[]>();

// Prune stale rate-limiter entries every 60 seconds
const aiLimiterPruneTimer = setInterval(() => {
    const now = Date.now();
    for (const [clientId, timestamps] of aiRateLimiter) {
        const active = timestamps.filter((t) => now - t < AI_RATE_WINDOW_MS);
        if (active.length === 0) {
            aiRateLimiter.delete(clientId);
        } else {
            aiRateLimiter.set(clientId, active);
        }
    }
}, 60_000);
aiLimiterPruneTimer.unref?.();

function isNonEmptyString(value: unknown): value is string {
    return typeof value == "string" && value.trim().length > 0;
}

function clampText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return value.slice(0, maxLength);
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

function normalizeProgressPatch(value: unknown): Record<string, unknown> | null {
    const source = asObject(value);
    if (!source) {
        return null;
    }

    const normalized: Record<string, unknown> = { ...source };

    if (Array.isArray(source.games)) {
        normalized.games = source.games.slice(-PROFILE_PROGRESS_GAMES_MAX);
    }
    if (Array.isArray(source.activities)) {
        normalized.activities = source.activities.slice(-PROFILE_PROGRESS_ACTIVITIES_MAX);
    }

    return normalized;
}

function normalizeLessonsPatch(value: unknown): Record<string, unknown> | null {
    const source = asObject(value);
    if (!source) {
        return null;
    }

    const normalized: Record<string, unknown> = { ...source };
    const progressByLesson = asObject(source.progressByLesson);

    if (progressByLesson) {
        const compact = Object.fromEntries(
            Object.entries(progressByLesson)
                .slice(0, PROFILE_LESSON_KEYS_MAX)
                .map(([key, lessonProgress]) => [clampText(String(key), 80), lessonProgress])
        );
        normalized.progressByLesson = compact;
    }

    return normalized;
}

function normalizeProfilePatch(value: unknown): Record<string, unknown> | null {
    const source = asObject(value);
    if (!source) {
        return null;
    }

    const normalized: Record<string, unknown> = { ...source };
    if (isNonEmptyString(source.syncedAt)) {
        normalized.syncedAt = clampText(source.syncedAt, 40);
    }

    return normalized;
}

function isJsonPayloadSizeSafe(value: unknown, maxBytes: number): boolean {
    try {
        return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
    } catch {
        return false;
    }
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

router.get("/profile-store", (_req, res) => {
    try {
        const data = readScopedData();
        return res.json({
            namespace: getDatabaseMeta().namespace,
            data
        });
    } catch (err) {
        console.error("Profile store read failed:", err);
        return res.status(500).json({ message: "Failed to read profile store." });
    }
});

router.post("/profile-store/sync", (req, res) => {
    const payload: ProfileStoreSyncBody = req.body || {};
    const patch: Record<string, unknown> = {};

    const progress = normalizeProgressPatch(payload.progress);
    const lessons = normalizeLessonsPatch(payload.lessons);
    const profile = normalizeProfilePatch(payload.profile);

    if (progress) {
        patch.progress = progress;
    }
    if (lessons) {
        patch.lessons = lessons;
    }
    if (profile) {
        patch.profile = profile;
    }

    if (Object.keys(patch).length === 0) {
        return res.status(400).json({ message: "Invalid sync payload." });
    }
    if (!isJsonPayloadSizeSafe(patch, PROFILE_SYNC_MAX_BYTES)) {
        return res.status(413).json({ message: "Sync payload too large." });
    }

    try {
        const data = mergeScopedData(patch);
        return res.json({
            ok: true,
            namespace: getDatabaseMeta().namespace,
            data
        });
    } catch (err) {
        console.error("Profile store sync failed:", err);
        return res.status(500).json({ message: "Failed to sync profile store." });
    }
});

router.post("/parse", async (req, res) => {

    let { pgn }: ParseRequestBody = req.body || {};
    
    if (!isNonEmptyString(pgn)) {
        return res.status(400).json({ message: "Enter a PGN to analyse." });
    }

    pgn = pgn.trim();
    if (pgn.length > MAX_PGN_LENGTH) {
        return res.status(413).json({ message: "PGN too large." });
    }

    // Accept PGNs that do not explicitly include a result marker.
    if (!/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(pgn)) {
        pgn += " *";
    }

    // Try chess.js loadPgn first (handles annotations, NAGs, comments, etc.)
    const board = new Chess();
    let moves: { from: string; to: string; san: string; promotion?: string }[];

    try {
        board.loadPgn(pgn);
        moves = board.history({ verbose: true });
    } catch {
        // Fall back to pgn-parser for backwards compatibility
        let parsedPGN;
        try {
            [ parsedPGN ] = pgnParser.parse(pgn);

            if (!parsedPGN) {
                return res.status(400).json({ message: "Enter a PGN to analyse." });
            }
        } catch {
            return res.status(400).json({ message: "Invalid PGN format." });
        }

        const fallbackBoard = new Chess();
        moves = [];

        for (const pgnMove of parsedPGN.moves) {
            const moveSAN = pgnMove.move;
            if (!isNonEmptyString(moveSAN)) {
                return res.status(400).json({ message: "PGN contains invalid moves." });
            }

            let virtualBoardMove;
            try {
                virtualBoardMove = fallbackBoard.move(moveSAN);
            } catch {
                return res.status(400).json({ message: "PGN contains illegal moves." });
            }

            if (!virtualBoardMove) {
                return res.status(400).json({ message: "PGN contains illegal moves." });
            }

            moves.push(virtualBoardMove);
        }
    }

    // Replay moves to build positions array
    const replay = new Chess();
    const positions: Position[] = [{ fen: replay.fen() }];

    for (const move of moves) {
        replay.move(move.san);
        const moveUCI = `${move.from}${move.to}${move.promotion || ""}`;

        positions.push({
            fen: replay.fen(),
            move: {
                san: move.san,
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
    const fen = sanitizeExplorerFen(req.query.fen);
    if (!fen) {
        return res.status(400).json({ message: "Invalid FEN." });
    }

    const movesNum = parseExplorerMoves(req.query.moves);
    if (movesNum == null) {
        return res.status(400).json({ message: "Invalid moves parameter." });
    }

    const speeds = sanitizeExplorerSpeeds(req.query.speeds);
    if (!speeds) {
        return res.status(400).json({ message: "Invalid speeds parameter." });
    }

    const ratings = sanitizeExplorerRatings(req.query.ratings);
    if (!ratings) {
        return res.status(400).json({ message: "Invalid ratings parameter." });
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

        setTimedCacheValue(explorerCache, cacheKey, safePayload, {
            ttlMs: EXPLORER_CACHE_TTL_MS,
            maxEntries: EXPLORER_CACHE_MAX_ENTRIES
        });

        return res.json(safePayload);
    } catch (err) {
        if (err instanceof Error && err.name == "AbortError") {
            return res.status(502).json({ message: `Opening explorer timeout (${OPENING_EXPLORER_TIMEOUT_MS}ms).` });
        }

        const message = err instanceof Error ? err.message : "Opening explorer request failed.";
        return res.status(502).json({ message });
    } finally {
        clearTimeout(timeout);
    }
});

router.post("/report", async (req, res) => {

    const { positions }: ReportRequestBody = req.body || {};

    if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ message: "Missing parameters." });
    }

    if (positions.length > 600) {
        return res.status(400).json({ message: "Too many positions (max 600)." });
    }

    // Validate minimal schema for each position
    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        if (!pos || typeof pos.fen !== "string" || pos.fen.trim().length === 0) {
            return res.status(400).json({ message: `Position ${i} has invalid or missing FEN.` });
        }
        if (i > 0) {
            if (!pos.move || typeof pos.move.uci !== "string" || pos.move.uci.trim().length === 0) {
                return res.status(400).json({ message: `Position ${i} has invalid or missing move.` });
            }
            if (!Array.isArray(pos.topLines)) {
                return res.status(400).json({ message: `Position ${i} has missing topLines.` });
            }
        }
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
