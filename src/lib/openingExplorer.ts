import { Chess } from "chess.js";

export const EXPLORER_DEFAULT_FEN = "startpos";
export const EXPLORER_DEFAULT_MOVES = 16;
export const EXPLORER_MIN_MOVES = 1;
export const EXPLORER_MAX_MOVES = 24;
export const EXPLORER_DEFAULT_SPEEDS = ["rapid", "blitz", "classical"] as const;
export const EXPLORER_ALLOWED_SPEEDS = [
    "ultrabullet",
    "bullet",
    "blitz",
    "rapid",
    "classical",
    "correspondence"
] as const;
export const EXPLORER_DEFAULT_RATINGS = ["1600", "1800", "2000"] as const;
export const EXPLORER_ALLOWED_RATINGS = [
    "1000",
    "1200",
    "1400",
    "1600",
    "1800",
    "2000",
    "2200",
    "2500"
] as const;

export interface TimedCacheEntry<T> {
    at: number;
    payload: T;
}

interface CacheOptions {
    ttlMs: number;
    maxEntries: number;
    now?: number;
}

function normalizeCsvToken(token: string): string {
    return token.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitizeCsvAllowList(
    raw: unknown,
    allowList: readonly string[],
    fallback: readonly string[],
    maxRawLength: number
): string[] | null {
    if (raw == null || raw === "") {
        return Array.from(fallback);
    }

    const text = String(raw).trim();
    if (!text) {
        return Array.from(fallback);
    }
    if (text.length > maxRawLength) {
        return null;
    }

    const allowed = new Set(allowList.map((item) => item.toLowerCase()));
    const unique: string[] = [];
    const seen = new Set<string>();

    for (const part of text.split(",")) {
        const token = normalizeCsvToken(part);
        if (!token || seen.has(token) || !allowed.has(token)) {
            continue;
        }
        unique.push(token);
        seen.add(token);
        if (unique.length >= 6) {
            break;
        }
    }

    if (unique.length === 0) {
        return Array.from(fallback);
    }

    return unique;
}

export function sanitizeExplorerFen(raw: unknown): string | null {
    if (raw == null || raw === "") {
        return EXPLORER_DEFAULT_FEN;
    }

    const fen = String(raw).trim().replace(/\s+/g, " ");
    if (!fen) {
        return EXPLORER_DEFAULT_FEN;
    }
    if (fen.length > 200) {
        return null;
    }
    if (fen.toLowerCase() === EXPLORER_DEFAULT_FEN) {
        return EXPLORER_DEFAULT_FEN;
    }

    try {
        new Chess(fen);
        return fen;
    } catch {
        return null;
    }
}

export function parseExplorerMoves(raw: unknown): number | null {
    if (raw == null || raw === "") {
        return EXPLORER_DEFAULT_MOVES;
    }

    const value = Number.parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(value) || value < EXPLORER_MIN_MOVES || value > EXPLORER_MAX_MOVES) {
        return null;
    }

    return value;
}

export function sanitizeExplorerSpeeds(raw: unknown): string[] | null {
    return sanitizeCsvAllowList(
        raw,
        EXPLORER_ALLOWED_SPEEDS,
        EXPLORER_DEFAULT_SPEEDS,
        120
    );
}

export function sanitizeExplorerRatings(raw: unknown): string[] | null {
    return sanitizeCsvAllowList(
        raw,
        EXPLORER_ALLOWED_RATINGS,
        EXPLORER_DEFAULT_RATINGS,
        96
    );
}

export function buildExplorerCacheKey(
    fen: string,
    moves: number,
    speeds: readonly string[],
    ratings: readonly string[]
): string {
    return `${fen}|${moves}|${speeds.join(",")}|${ratings.join(",")}`;
}

function pruneTimedCache<T>(
    cache: Map<string, TimedCacheEntry<T>>,
    ttlMs: number,
    now: number
): void {
    for (const [key, entry] of cache) {
        if (now - entry.at > ttlMs) {
            cache.delete(key);
        }
    }
}

export function getFreshTimedCacheValue<T>(
    cache: Map<string, TimedCacheEntry<T>>,
    key: string,
    ttlMs: number,
    now = Date.now()
): T | null {
    const entry = cache.get(key);
    if (!entry) {
        return null;
    }

    if (now - entry.at > ttlMs) {
        cache.delete(key);
        return null;
    }

    return entry.payload;
}

export function setTimedCacheValue<T>(
    cache: Map<string, TimedCacheEntry<T>>,
    key: string,
    payload: T,
    options: CacheOptions
): void {
    const now = options.now ?? Date.now();
    pruneTimedCache(cache, options.ttlMs, now);

    if (cache.has(key)) {
        cache.delete(key);
    }

    while (cache.size >= options.maxEntries) {
        const oldestKey = cache.keys().next().value;
        if (!oldestKey) {
            break;
        }
        cache.delete(oldestKey);
    }

    cache.set(key, {
        at: now,
        payload
    });
}
