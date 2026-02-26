import { Request, Response as ExpressResponse, Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Chess } from "chess.js";
import pgnParser from "pgn-parser";

import analyse from "./lib/analysis";
import { parseStructuredAIResponse } from "./lib/aiActions";
import { getDatabaseMeta, readScopedData, replaceScopedData } from "./lib/databaseStore";
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

interface AuthBody {
    username?: unknown;
    password?: unknown;
}

interface UserRecord {
    username: string;
    passwordSalt: string;
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
    store: Record<string, unknown>;
}

interface SessionRecord {
    userKey: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    ip: string;
    userAgent: string;
}

interface AuthRootState {
    users: Record<string, UserRecord>;
    sessions: Record<string, SessionRecord>;
}

const OPENING_EXPLORER_ENDPOINT = "https://explorer.lichess.ovh/lichess";
const EXPLORER_CACHE_TTL_MS = 1000 * 60 * 30;
const EXPLORER_CACHE_MAX_ENTRIES = 500;
const OPENING_EXPLORER_TIMEOUT_MS = 9000;
const OPENING_EXPLORER_DEGRADED_MESSAGE = "Opening explorer data is temporarily unavailable. Using fallback.";
const MAX_PGN_LENGTH = 120_000;
const explorerCache = new Map<string, TimedCacheEntry<unknown>>();
const AI_PROVIDER_TIMEOUT_MS = 9000;
const AI_RATE_WINDOW_MS = 10000;
const AI_RATE_MAX_REQUESTS = 1;
const PROFILE_SYNC_MAX_BYTES = 850_000;
const PROFILE_PROGRESS_GAMES_MAX = 400;
const PROFILE_PROGRESS_ACTIVITIES_MAX = 1200;
const PROFILE_LESSON_KEYS_MAX = 250;
const AUTH_COOKIE_NAME = "freechess_auth";
const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const AUTH_SESSION_MAX = 5000;
const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 120;
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

function buildEmptyOpeningExplorerPayload(fen: string) {
    return {
        fen,
        white: 0,
        draws: 0,
        black: 0,
        opening: null,
        moves: []
    };
}

function getExplorerFallbackPayload(cacheKey: string, fen: string) {
    const cached = explorerCache.get(cacheKey);
    if (cached && cached.payload && typeof cached.payload === "object") {
        return cached.payload as Record<string, unknown>;
    }

    return buildEmptyOpeningExplorerPayload(fen) as Record<string, unknown>;
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

function normalizeUsername(value: unknown): string | null {
    if (!isNonEmptyString(value)) {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
        return null;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return null;
    }

    return trimmed;
}

function normalizePassword(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const password = value.trim();
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
        return null;
    }
    return password;
}

function usernameToKey(username: string): string {
    return username.trim().toLowerCase();
}

function hashPassword(password: string, saltHex?: string) {
    const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    return {
        saltHex: salt.toString("hex"),
        hashHex: hash.toString("hex")
    };
}

function verifyPassword(password: string, saltHex: string, expectedHashHex: string): boolean {
    try {
        const candidate = hashPassword(password, saltHex);
        const expected = Buffer.from(expectedHashHex, "hex");
        const actual = Buffer.from(candidate.hashHex, "hex");
        if (expected.length !== actual.length) {
            return false;
        }
        return timingSafeEqual(expected, actual);
    } catch {
        return false;
    }
}

function parseCookies(req: Request): Record<string, string> {
    const cookieHeader = req.headers.cookie;
    if (!isNonEmptyString(cookieHeader)) {
        return {};
    }

    const parsed: Record<string, string> = {};
    const chunks = cookieHeader.split(";");
    chunks.forEach((entry) => {
        const idx = entry.indexOf("=");
        if (idx <= 0) {
            return;
        }
        const key = entry.slice(0, idx).trim();
        const value = entry.slice(idx + 1).trim();
        if (!key) {
            return;
        }
        parsed[key] = decodeURIComponent(value);
    });
    return parsed;
}

function getAuthCookieToken(req: Request): string | null {
    const cookies = parseCookies(req);
    const token = cookies[AUTH_COOKIE_NAME];
    return isNonEmptyString(token) ? token : null;
}

function shouldUseSecureCookie(req: Request): boolean {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = typeof forwardedProto === "string"
        ? forwardedProto.split(",")[0]?.trim().toLowerCase()
        : (Array.isArray(forwardedProto) && forwardedProto[0]
            ? String(forwardedProto[0]).trim().toLowerCase()
            : "");

    if (proto === "https") {
        return true;
    }

    return Boolean(req.secure);
}

function setAuthCookie(req: Request, res: ExpressResponse, token: string, expiresAtMs: number) {
    const safeExpiresAtMs = Number.isFinite(expiresAtMs)
        ? expiresAtMs
        : Date.now() + AUTH_SESSION_TTL_MS;
    const maxAgeSec = Math.max(1, Math.floor((safeExpiresAtMs - Date.now()) / 1000));
    const secureFlag = shouldUseSecureCookie(req) ? "; Secure" : "";
    res.setHeader(
        "Set-Cookie",
        `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secureFlag}`
    );
}

function clearAuthCookie(req: Request, res: ExpressResponse) {
    const secureFlag = shouldUseSecureCookie(req) ? "; Secure" : "";
    res.setHeader(
        "Set-Cookie",
        `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
    );
}

function readAuthState(): { scopedData: Record<string, unknown>; auth: AuthRootState } {
    const scopedData = readScopedData();
    const accounts = asObject(scopedData.accounts) || {};
    const usersRaw = asObject(accounts.users) || {};
    const sessionsRaw = asObject(accounts.sessions) || {};

    const users: Record<string, UserRecord> = {};
    Object.entries(usersRaw).forEach(([userKey, value]) => {
        const userObj = asObject(value);
        if (!userObj) {
            return;
        }
        const username = normalizeUsername(userObj.username);
        const passwordSalt = isNonEmptyString(userObj.passwordSalt) ? userObj.passwordSalt.trim() : "";
        const passwordHash = isNonEmptyString(userObj.passwordHash) ? userObj.passwordHash.trim() : "";
        if (!username || !passwordSalt || !passwordHash) {
            return;
        }

        users[userKey] = {
            username,
            passwordSalt,
            passwordHash,
            createdAt: isNonEmptyString(userObj.createdAt) ? userObj.createdAt : new Date().toISOString(),
            updatedAt: isNonEmptyString(userObj.updatedAt) ? userObj.updatedAt : new Date().toISOString(),
            store: asObject(userObj.store) || {}
        };
    });

    const sessions: Record<string, SessionRecord> = {};
    Object.entries(sessionsRaw).forEach(([token, value]) => {
        const sessionObj = asObject(value);
        if (!sessionObj) {
            return;
        }
        const userKey = isNonEmptyString(sessionObj.userKey) ? sessionObj.userKey.trim() : "";
        if (!userKey) {
            return;
        }
        sessions[token] = {
            userKey,
            createdAt: isNonEmptyString(sessionObj.createdAt) ? sessionObj.createdAt : new Date().toISOString(),
            updatedAt: isNonEmptyString(sessionObj.updatedAt) ? sessionObj.updatedAt : new Date().toISOString(),
            expiresAt: isNonEmptyString(sessionObj.expiresAt) ? sessionObj.expiresAt : new Date(0).toISOString(),
            ip: isNonEmptyString(sessionObj.ip) ? sessionObj.ip : "",
            userAgent: isNonEmptyString(sessionObj.userAgent) ? clampText(sessionObj.userAgent, 240) : ""
        };
    });

    return {
        scopedData,
        auth: { users, sessions }
    };
}

function persistAuthState(scopedData: Record<string, unknown>, auth: AuthRootState) {
    const currentAccounts = asObject(scopedData.accounts) || {};
    const nextAccounts = {
        ...currentAccounts,
        users: auth.users,
        sessions: auth.sessions
    };

    return replaceScopedData({
        ...scopedData,
        accounts: nextAccounts
    });
}

function pruneSessions(auth: AuthRootState) {
    const now = Date.now();
    Object.entries(auth.sessions).forEach(([token, session]) => {
        const userExists = Boolean(auth.users[session.userKey]);
        const expiresAtMs = Date.parse(session.expiresAt);
        if (!userExists || !Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
            delete auth.sessions[token];
        }
    });

    const sessionEntries = Object.entries(auth.sessions);
    if (sessionEntries.length <= AUTH_SESSION_MAX) {
        return;
    }

    sessionEntries
        .sort((a, b) => {
            const left = Date.parse(a[1].updatedAt || a[1].createdAt || "");
            const right = Date.parse(b[1].updatedAt || b[1].createdAt || "");
            return left - right;
        })
        .slice(0, sessionEntries.length - AUTH_SESSION_MAX)
        .forEach(([token]) => {
            delete auth.sessions[token];
        });
}

function parseAuthCredentials(payload: unknown): { username: string; password: string } | null {
    const body = asObject(payload) as AuthBody | null;
    if (!body) {
        return null;
    }
    const username = normalizeUsername(body.username);
    const password = normalizePassword(body.password);
    if (!username || !password) {
        return null;
    }
    return { username, password };
}

function mergeObjectDeep(baseValue: unknown, patchValue: unknown, depth = 0): unknown {
    if (depth > 20) {
        return asObject(baseValue) || {};
    }

    const baseObj = asObject(baseValue);
    const patchObj = asObject(patchValue);
    if (!baseObj && !patchObj) {
        return patchValue;
    }
    if (!patchObj) {
        return baseObj || {};
    }

    const merged: Record<string, unknown> = { ...(baseObj || {}) };
    Object.entries(patchObj).forEach(([key, value]) => {
        const nestedPatch = asObject(value);
        if (nestedPatch) {
            merged[key] = mergeObjectDeep(merged[key], nestedPatch, depth + 1);
            return;
        }
        merged[key] = value;
    });
    return merged;
}

function buildSessionRecord(req: Request, userKey: string): SessionRecord {
    const now = new Date();
    return {
        userKey,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS).toISOString(),
        ip: clampText(getClientIdentifier(req), 120),
        userAgent: clampText(String(req.headers["user-agent"] || ""), 240)
    };
}

function unauthorized(res: ExpressResponse, message = "Debes iniciar sesion para acceder al perfil en la base de datos.") {
    return res.status(401).json({
        authenticated: false,
        message
    });
}

function resolveAuthContext(req: Request): {
    scopedData: Record<string, unknown>;
    auth: AuthRootState;
    token: string;
    userKey: string;
    user: UserRecord;
} | null {
    const token = getAuthCookieToken(req);
    if (!token) {
        return null;
    }

    const { scopedData, auth } = readAuthState();
    pruneSessions(auth);
    const session = auth.sessions[token];
    if (!session) {
        return null;
    }

    const user = auth.users[session.userKey];
    if (!user) {
        delete auth.sessions[token];
        persistAuthState(scopedData, auth);
        return null;
    }

    const expiresAtMs = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        delete auth.sessions[token];
        persistAuthState(scopedData, auth);
        return null;
    }

    const updatedMs = Date.parse(session.updatedAt);
    if (!Number.isFinite(updatedMs) || Date.now() - updatedMs > 1000 * 60 * 5) {
        auth.sessions[token] = {
            ...session,
            updatedAt: new Date().toISOString()
        };
        persistAuthState(scopedData, auth);
    }

    return {
        scopedData,
        auth,
        token,
        userKey: session.userKey,
        user
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

router.post("/auth/register", (req, res) => {
    const credentials = parseAuthCredentials(req.body);
    if (!credentials) {
        return res.status(400).json({
            message: `Usuario/contraseña invalidos. Usuario: ${USERNAME_MIN}-${USERNAME_MAX} caracteres [A-Za-z0-9_], contraseña: ${PASSWORD_MIN}-${PASSWORD_MAX} caracteres.`
        });
    }

    try {
        const { scopedData, auth } = readAuthState();
        pruneSessions(auth);

        const userKey = usernameToKey(credentials.username);
        if (auth.users[userKey]) {
            return res.status(409).json({ message: "Ese usuario ya existe." });
        }

        const nowIso = new Date().toISOString();
        const hashed = hashPassword(credentials.password);
        auth.users[userKey] = {
            username: credentials.username,
            passwordSalt: hashed.saltHex,
            passwordHash: hashed.hashHex,
            createdAt: nowIso,
            updatedAt: nowIso,
            store: {}
        };

        const token = randomBytes(32).toString("hex");
        const session = buildSessionRecord(req, userKey);
        auth.sessions[token] = session;
        pruneSessions(auth);

        persistAuthState(scopedData, auth);
        setAuthCookie(req, res, token, Date.parse(session.expiresAt));

        return res.status(201).json({
            ok: true,
            authenticated: true,
            user: {
                username: auth.users[userKey].username
            },
            warning: "No hay recuperacion de contraseña. Guardala en un lugar seguro."
        });
    } catch (err) {
        console.error("Auth register failed:", err);
        return res.status(500).json({ message: "No se pudo crear la cuenta." });
    }
});

router.post("/auth/login", (req, res) => {
    const credentials = parseAuthCredentials(req.body);
    if (!credentials) {
        return res.status(400).json({ message: "Credenciales invalidas." });
    }

    try {
        const { scopedData, auth } = readAuthState();
        pruneSessions(auth);

        const userKey = usernameToKey(credentials.username);
        const user = auth.users[userKey];
        if (!user || !verifyPassword(credentials.password, user.passwordSalt, user.passwordHash)) {
            return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
        }

        const token = randomBytes(32).toString("hex");
        const session = buildSessionRecord(req, userKey);
        auth.sessions[token] = session;
        pruneSessions(auth);
        persistAuthState(scopedData, auth);
        setAuthCookie(req, res, token, Date.parse(session.expiresAt));

        return res.json({
            ok: true,
            authenticated: true,
            user: {
                username: user.username
            }
        });
    } catch (err) {
        console.error("Auth login failed:", err);
        return res.status(500).json({ message: "No se pudo iniciar sesion." });
    }
});

router.post("/auth/logout", (req, res) => {
    const token = getAuthCookieToken(req);

    try {
        if (token) {
            const { scopedData, auth } = readAuthState();
            if (auth.sessions[token]) {
                delete auth.sessions[token];
                pruneSessions(auth);
                persistAuthState(scopedData, auth);
            }
        }
    } catch (err) {
        console.error("Auth logout failed:", err);
    }

    clearAuthCookie(req, res);
    return res.json({
        ok: true,
        authenticated: false
    });
});

router.get("/auth/session", (req, res) => {
    try {
        const ctx = resolveAuthContext(req);
        if (!ctx) {
            return res.json({
                authenticated: false
            });
        }

        return res.json({
            authenticated: true,
            user: {
                username: ctx.user.username
            }
        });
    } catch (err) {
        console.error("Auth session check failed:", err);
        return res.status(500).json({
            authenticated: false,
            message: "No se pudo validar la sesion."
        });
    }
});

router.get("/profile-store", (req, res) => {
    try {
        const ctx = resolveAuthContext(req);
        if (!ctx) {
            clearAuthCookie(req, res);
            return unauthorized(res);
        }

        return res.json({
            namespace: getDatabaseMeta().namespace,
            user: {
                username: ctx.user.username
            },
            data: asObject(ctx.user.store) || {}
        });
    } catch (err) {
        console.error("Profile store read failed:", err);
        return res.status(500).json({
            message: "No se pudo leer el perfil en base de datos."
        });
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
        const ctx = resolveAuthContext(req);
        if (!ctx) {
            clearAuthCookie(req, res);
            return unauthorized(res);
        }

        const currentStore = asObject(ctx.user.store) || {};
        const mergedStore = mergeObjectDeep(currentStore, patch);
        const updatedUser: UserRecord = {
            ...ctx.user,
            updatedAt: new Date().toISOString(),
            store: asObject(mergedStore) || {}
        };
        ctx.auth.users[ctx.userKey] = updatedUser;
        pruneSessions(ctx.auth);
        persistAuthState(ctx.scopedData, ctx.auth);

        return res.json({
            ok: true,
            namespace: getDatabaseMeta().namespace,
            user: {
                username: updatedUser.username
            },
            data: updatedUser.store
        });
    } catch (err) {
        console.error("Profile store sync failed:", err);
        return res.status(500).json({
            message: "No se pudo sincronizar el perfil en base de datos."
        });
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
            const fallbackPayload = getExplorerFallbackPayload(cacheKey, fen);
            return res.json({
                ...fallbackPayload,
                degraded: true,
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
        const fallbackPayload = getExplorerFallbackPayload(cacheKey, fen);
        if (err instanceof Error && err.name == "AbortError") {
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
