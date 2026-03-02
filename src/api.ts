import { Request, Response as ExpressResponse, Router } from "express";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { Chess } from "chess.js";
import pgnParser from "pgn-parser";
import { promisify } from "util";

import analyse from "./lib/analysis";
import { parseStructuredAIResponse } from "./lib/aiActions";
import { checkAndUpdateRateLimitBucket, getDatabaseMeta, readScopedData, replaceScopedData } from "./lib/databaseStore";
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
import { registerAuthProfileRoutes } from "./api/routes/authProfileRoutes";
import { registerGameRoutes } from "./api/routes/gameRoutes";
import { Position } from "./lib/types/Position";
import openings from "./resources/openings.json";

const router = Router();
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const scryptAsync = promisify(scrypt);

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
const AUTH_LOGIN_RATE_WINDOW_MS = 60_000;
const AUTH_LOGIN_RATE_MAX_ATTEMPTS = 8;
const AUTH_REGISTER_RATE_WINDOW_MS = 60_000;
const AUTH_REGISTER_RATE_MAX_ATTEMPTS = 4;
const PARSE_RATE_WINDOW_MS = 10_000;
const PARSE_RATE_MAX_REQUESTS = 6;
const REPORT_RATE_WINDOW_MS = 15_000;
const REPORT_RATE_MAX_REQUESTS = 4;
const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 120;
const RATE_LIMIT_CLIENT_BUCKET_MAX = 2000;
const fallbackAiRateLimiter = new Map<string, number[]>();
const fallbackLoginRateLimiter = new Map<string, number[]>();
const fallbackRegisterRateLimiter = new Map<string, number[]>();
const fallbackParseRateLimiter = new Map<string, number[]>();
const fallbackReportRateLimiter = new Map<string, number[]>();

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

function sanitizeInlineText(value: unknown, maxLength: number): string {
    if (!isNonEmptyString(value)) {
        return "";
    }

    return value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, maxLength);
}

function sanitizeOpeningMeta(value: unknown): { eco: string; name: string } | null {
    const openingObj = asObject(value);
    if (!openingObj) {
        return null;
    }

    const eco = sanitizeInlineText(openingObj.eco, 12);
    const name = sanitizeInlineText(openingObj.name, 120);
    if (!eco && !name) {
        return null;
    }

    return { eco, name };
}

function isValidUciMove(value: unknown): boolean {
    if (!isNonEmptyString(value)) {
        return false;
    }
    return /^[a-h][1-8][a-h][1-8][nbrq]?$/i.test(value.trim());
}

function isValidEngineEvaluation(value: unknown): boolean {
    const evaluation = asObject(value);
    if (!evaluation) {
        return false;
    }
    const type = evaluation.type;
    const numericValue = Number(evaluation.value);
    if ((type !== "cp" && type !== "mate") || !Number.isFinite(numericValue)) {
        return false;
    }
    return true;
}

function isValidEngineLine(value: unknown): boolean {
    const line = asObject(value);
    if (!line) {
        return false;
    }

    const id = Number(line.id);
    const depth = Number(line.depth);
    const moveUCI = typeof line.moveUCI === "string" ? line.moveUCI.trim() : "";
    const moveUciLooksValid = moveUCI === "" || isValidUciMove(moveUCI);
    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(depth) || depth < 0 || !moveUciLooksValid) {
        return false;
    }

    return isValidEngineEvaluation(line.evaluation);
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

function hasTrustedRequestOrigin(req: Request): boolean {
    const secFetchSite = String(req.headers["sec-fetch-site"] || "").trim().toLowerCase();
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site" && secFetchSite !== "none") {
        return false;
    }

    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
    if (!host) return true;

    const originRaw = String(req.headers.origin || "").trim().toLowerCase();
    if (originRaw) {
        try {
            const originHost = new URL(originRaw).host.toLowerCase();
            return originHost === host;
        } catch {
            return false;
        }
    }

    const refererRaw = String(req.headers.referer || "").trim().toLowerCase();
    if (refererRaw) {
        try {
            const refererHost = new URL(refererRaw).host.toLowerCase();
            return refererHost === host;
        } catch {
            return false;
        }
    }

    return true;
}

function enforceCsrfOrigin(req: Request, res: ExpressResponse): boolean {
    if (hasTrustedRequestOrigin(req)) {
        return true;
    }
    res.status(403).json({ message: "CSRF validation failed (origin mismatch)." });
    return false;
}

function checkRateLimitInMemory(
    limiter: Map<string, number[]>,
    clientId: string,
    windowMs: number,
    maxRequests: number
) {
    const now = Date.now();
    const history = limiter.get(clientId) || [];
    const active = history.filter((timestamp) => now - timestamp < windowMs);

    if (active.length >= maxRequests) {
        const retryAfterMs = Math.max(1, windowMs - (now - active[0]));
        limiter.set(clientId, active);
        return { limited: true, retryAfterMs };
    }

    active.push(now);
    limiter.set(clientId, active);
    return { limited: false, retryAfterMs: 0 };
}

function sanitizeRateHistory(
    value: unknown,
    now: number,
    windowMs: number
): number[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((timestamp) => Number(timestamp))
        .filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < windowMs)
        .sort((left, right) => left - right);
}

async function checkPersistentRateLimit(
    scope: "ai" | "login" | "register" | "parse" | "report",
    fallbackLimiter: Map<string, number[]>,
    clientId: string,
    windowMs: number,
    maxRequests: number
) {
    try {
        const distributed = await checkAndUpdateRateLimitBucket(scope, clientId, windowMs, maxRequests);
        if (distributed.supported) {
            return {
                limited: distributed.limited,
                retryAfterMs: distributed.retryAfterMs
            };
        }
    } catch (err) {
        console.error(`Distributed rate limiter failed for ${scope}:`, err);
    }

    const now = Date.now();
    try {
        const scopedData = await readScopedData();
        const rootRateLimits = asObject(scopedData.rateLimits) || {};
        const scopeRateLimits = asObject(rootRateLimits[scope]) || {};
        const active = sanitizeRateHistory(scopeRateLimits[clientId], now, windowMs);

        if (active.length >= maxRequests) {
            const retryAfterMs = Math.max(1, windowMs - (now - active[0]));
            scopeRateLimits[clientId] = active;
            await replaceScopedData({
                ...scopedData,
                rateLimits: {
                    ...rootRateLimits,
                    [scope]: scopeRateLimits
                }
            });
            return { limited: true, retryAfterMs };
        }

        active.push(now);
        scopeRateLimits[clientId] = active;

        const keys = Object.keys(scopeRateLimits);
        if (keys.length > RATE_LIMIT_CLIENT_BUCKET_MAX) {
            keys.slice(0, keys.length - RATE_LIMIT_CLIENT_BUCKET_MAX).forEach((key) => {
                delete scopeRateLimits[key];
            });
        }

        await replaceScopedData({
            ...scopedData,
            rateLimits: {
                ...rootRateLimits,
                [scope]: scopeRateLimits
            }
        });

        return { limited: false, retryAfterMs: 0 };
    } catch (err) {
        console.error(`Persistent rate limiter fallback for ${scope}:`, err);
    }

    return checkRateLimitInMemory(fallbackLimiter, clientId, windowMs, maxRequests);
}

function checkAIRateLimit(clientId: string) {
    return checkPersistentRateLimit("ai", fallbackAiRateLimiter, clientId, AI_RATE_WINDOW_MS, AI_RATE_MAX_REQUESTS);
}

function checkLoginRateLimit(clientId: string) {
    return checkPersistentRateLimit(
        "login",
        fallbackLoginRateLimiter,
        clientId,
        AUTH_LOGIN_RATE_WINDOW_MS,
        AUTH_LOGIN_RATE_MAX_ATTEMPTS
    );
}

function checkRegisterRateLimit(clientId: string) {
    return checkPersistentRateLimit(
        "register",
        fallbackRegisterRateLimiter,
        clientId,
        AUTH_REGISTER_RATE_WINDOW_MS,
        AUTH_REGISTER_RATE_MAX_ATTEMPTS
    );
}

function checkParseRateLimit(clientId: string) {
    return checkPersistentRateLimit(
        "parse",
        fallbackParseRateLimiter,
        clientId,
        PARSE_RATE_WINDOW_MS,
        PARSE_RATE_MAX_REQUESTS
    );
}

function checkReportRateLimit(clientId: string) {
    return checkPersistentRateLimit(
        "report",
        fallbackReportRateLimiter,
        clientId,
        REPORT_RATE_WINDOW_MS,
        REPORT_RATE_MAX_REQUESTS
    );
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

async function hashPassword(password: string, saltHex?: string) {
    const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
    const hash = await scryptAsync(password, salt, 64) as Buffer;
    return {
        saltHex: salt.toString("hex"),
        hashHex: hash.toString("hex")
    };
}

async function verifyPassword(password: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
    try {
        const candidate = await hashPassword(password, saltHex);
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
        try {
            parsed[key] = decodeURIComponent(value);
        } catch {
            // Ignore malformed cookie encoding.
        }
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

async function readAuthState(): Promise<{ scopedData: Record<string, unknown>; auth: AuthRootState }> {
    const scopedData = await readScopedData();
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

async function persistAuthState(scopedData: Record<string, unknown>, auth: AuthRootState) {
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

function resolveDataBaseErrorMessage(err: unknown, fallback: string): string {
    const message = err instanceof Error ? err.message : "";
    if (/DATA_BASE2|DATA_BASE|database|postgres/i.test(message)) {
        return "No se pudo acceder a DATA_BASE2/DATA_BASE. Verifica la variable y permisos de escritura.";
    }
    return fallback;
}

function isDataBaseError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : "";
    return /DATA_BASE2|DATA_BASE|database|postgres/i.test(message);
}

async function resolveAuthContext(req: Request): Promise<{
    scopedData: Record<string, unknown>;
    auth: AuthRootState;
    token: string;
    userKey: string;
    user: UserRecord;
} | null> {
    const token = getAuthCookieToken(req);
    if (!token) {
        return null;
    }

    const { scopedData, auth } = await readAuthState();
    pruneSessions(auth);
    const session = auth.sessions[token];
    if (!session) {
        return null;
    }

    const user = auth.users[session.userKey];
    if (!user) {
        delete auth.sessions[token];
        await persistAuthState(scopedData, auth);
        return null;
    }

    const expiresAtMs = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        delete auth.sessions[token];
        await persistAuthState(scopedData, auth);
        return null;
    }

    const updatedMs = Date.parse(session.updatedAt);
    if (!Number.isFinite(updatedMs) || Date.now() - updatedMs > 1000 * 60 * 5) {
        auth.sessions[token] = {
            ...session,
            updatedAt: new Date().toISOString()
        };
        await persistAuthState(scopedData, auth);
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

const randomToken = () => randomBytes(32).toString("hex");

async function parsePgnToPositions(pgn: string): Promise<Position[]> {
    const board = new Chess();
    let moves: { from: string; to: string; san: string; promotion?: string }[];

    try {
        const loadResult = board.loadPgn(pgn) as unknown;
        if (loadResult === false) {
            throw new Error("Formato PGN invalido.");
        }
        moves = board.history({ verbose: true });
    } catch {
        let parsedPGN;
        try {
            [parsedPGN] = pgnParser.parse(pgn);
            if (!parsedPGN) {
                throw new Error("Introduce un PGN para analizar.");
            }
        } catch {
            throw new Error("Formato PGN invalido.");
        }

        const fallbackBoard = new Chess();
        moves = [];

        for (const pgnMove of parsedPGN.moves) {
            const moveSAN = pgnMove.move;
            if (!isNonEmptyString(moveSAN)) {
                throw new Error("El PGN contiene jugadas invalidas.");
            }

            let virtualBoardMove;
            try {
                virtualBoardMove = fallbackBoard.move(moveSAN);
            } catch {
                throw new Error("El PGN contiene jugadas ilegales.");
            }

            if (!virtualBoardMove) {
                throw new Error("El PGN contiene jugadas ilegales.");
            }

            moves.push(virtualBoardMove);
        }
    }

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

    return positions;
}

registerAuthProfileRoutes(router, {
    enforceCsrfOrigin,
    getClientIdentifier,
    checkRegisterRateLimit,
    checkLoginRateLimit,
    parseAuthCredentials,
    USERNAME_MIN,
    USERNAME_MAX,
    PASSWORD_MIN,
    PASSWORD_MAX,
    readAuthState,
    pruneSessions,
    usernameToKey,
    hashPassword,
    randomToken,
    buildSessionRecord,
    persistAuthState,
    setAuthCookie,
    resolveDataBaseErrorMessage,
    verifyPassword,
    getAuthCookieToken,
    clearAuthCookie,
    resolveAuthContext,
    isDataBaseError,
    unauthorized,
    getDatabaseMeta,
    asObject,
    normalizeProgressPatch,
    normalizeLessonsPatch,
    normalizeProfilePatch,
    isJsonPayloadSizeSafe,
    PROFILE_SYNC_MAX_BYTES,
    mergeObjectDeep
});

registerGameRoutes(router, {
    getClientIdentifier,
    checkParseRateLimit,
    checkReportRateLimit,
    checkAIRateLimit,
    MAX_PGN_LENGTH,
    isNonEmptyString,
    parsePgnToPositions,
    openingsCatalog: openings as OpeningCatalogEntry[],
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
    ChessCtor: Chess,
    clampText,
    requestGroqChatCompletion,
    parseStructuredAIResponse
});
export default router;
