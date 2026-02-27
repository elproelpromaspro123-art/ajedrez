import fs from "fs";
import path from "path";

const NAMESPACE = "freechess_lab_v1";
const DEFAULT_DB_FILE = path.resolve("data", "database.json");
const MAX_MERGE_DEPTH = 20;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

interface DatabasePaths {
    source: string;
    candidatePath: string;
    activePath: string;
}

let cachedPaths: DatabasePaths | null = null;
let memoryFallbackRoot: Record<string, unknown> = {};
let storageMode: "file" | "memory_fallback" = "file";

function hasConfiguredDataBaseEnv(): boolean {
    return Boolean(String(process.env.DATA_BASE || "").trim());
}

function shouldAllowMemoryFallback(): boolean {
    return !hasConfiguredDataBaseEnv();
}

function parseDatabaseCandidatePath(): { source: string; candidatePath: string } {
    const raw = String(process.env.DATA_BASE || "").trim();
    if (!raw) {
        return {
            source: "default",
            candidatePath: DEFAULT_DB_FILE
        };
    }

    if (/^file:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw);
            const pathname = decodeURIComponent(parsed.pathname || "");
            const normalized = path.resolve(process.platform === "win32" ? pathname.replace(/^\//, "") : pathname);
            return {
                source: "env_file_url",
                candidatePath: normalized
            };
        } catch {
            return {
                source: "invalid_env_file_url",
                candidatePath: DEFAULT_DB_FILE
            };
        }
    }

    if (/^[a-zA-Z]+:\/\//.test(raw)) {
        return {
            source: "unsupported_remote_url",
            candidatePath: raw
        };
    }

    try {
        return {
            source: "env_path",
            candidatePath: path.isAbsolute(raw) ? raw : path.resolve(raw)
        };
    } catch {
        return {
            source: "invalid_env_path",
            candidatePath: DEFAULT_DB_FILE
        };
    }
}

function ensureJsonSafePath(candidatePath: string): string {
    const ext = path.extname(candidatePath).toLowerCase();
    if (ext !== ".json") {
        return `${candidatePath}.freechess.json`;
    }

    if (!fs.existsSync(candidatePath)) {
        return candidatePath;
    }

    try {
        const raw = fs.readFileSync(candidatePath, "utf8");
        const parsed = JSON.parse(raw);
        const validRoot = parsed && typeof parsed === "object" && !Array.isArray(parsed);
        if (validRoot) {
            return candidatePath;
        }
    } catch {
        // Ignore parse errors and fall back to sidecar.
    }

    const base = candidatePath.slice(0, -".json".length);
    return `${base}.freechess.json`;
}

function getPaths(): DatabasePaths {
    if (cachedPaths) {
        return cachedPaths;
    }

    const base = parseDatabaseCandidatePath();
    if (base.source === "unsupported_remote_url") {
        throw new Error("DATA_BASE must be a local file path or file:// URL. Remote URLs are not supported.");
    }
    if (base.source === "invalid_env_file_url" || base.source === "invalid_env_path") {
        throw new Error("DATA_BASE has an invalid value. Use a valid local file path or file:// URL.");
    }
    cachedPaths = {
        source: base.source,
        candidatePath: base.candidatePath,
        activePath: ensureJsonSafePath(base.candidatePath)
    };
    return cachedPaths;
}

function ensureParentFolder(filePath: string): void {
    const folder = path.dirname(filePath);
    fs.mkdirSync(folder, { recursive: true });
}

function cloneRoot(root: Record<string, unknown>): Record<string, unknown> {
    try {
        return JSON.parse(JSON.stringify(root)) as Record<string, unknown>;
    } catch {
        return { ...root };
    }
}

function readRootObject(): Record<string, unknown> {
    const paths = getPaths();
    if (storageMode === "memory_fallback") {
        if (!shouldAllowMemoryFallback()) {
            throw new Error(`Database storage is in memory fallback mode, but DATA_BASE requires persistent writes (${paths.activePath}).`);
        }
        return cloneRoot(memoryFallbackRoot);
    }

    if (!fs.existsSync(paths.activePath)) {
        if (Object.keys(memoryFallbackRoot).length > 0) {
            return cloneRoot(memoryFallbackRoot);
        }
        return {};
    }

    try {
        const raw = fs.readFileSync(paths.activePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            memoryFallbackRoot = cloneRoot(parsed as Record<string, unknown>);
            return parsed as Record<string, unknown>;
        }
        return {};
    } catch {
        if (!shouldAllowMemoryFallback()) {
            throw new Error(`Failed to read DATA_BASE JSON at ${paths.activePath}.`);
        }
        if (Object.keys(memoryFallbackRoot).length > 0) {
            return cloneRoot(memoryFallbackRoot);
        }
        return {};
    }
}

function writeRootObject(root: Record<string, unknown>): void {
    const safeRoot = cloneRoot(root);
    memoryFallbackRoot = safeRoot;

    if (storageMode === "memory_fallback") {
        if (!shouldAllowMemoryFallback()) {
            const paths = getPaths();
            throw new Error(`Cannot write DATA_BASE in memory fallback mode (${paths.activePath}).`);
        }
        return;
    }

    const paths = getPaths();
    const tempPath = `${paths.activePath}.tmp`;

    try {
        ensureParentFolder(paths.activePath);
        fs.writeFileSync(tempPath, JSON.stringify(safeRoot, null, 2), "utf8");
        fs.renameSync(tempPath, paths.activePath);
    } catch {
        try {
            if (fs.existsSync(tempPath)) {
                fs.rmSync(tempPath, { force: true });
            }
        } catch {
            // ignore temp cleanup failures
        }

        if (!shouldAllowMemoryFallback()) {
            throw new Error(`Failed to persist DATA_BASE file at ${paths.activePath}.`);
        }

        storageMode = "memory_fallback";
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeObject(value: unknown, depth = 0): Record<string, unknown> {
    if (!isPlainObject(value) || depth > MAX_MERGE_DEPTH) {
        return {};
    }

    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
        if (UNSAFE_KEYS.has(key)) {
            continue;
        }

        if (isPlainObject(nested)) {
            output[key] = sanitizeObject(nested, depth + 1);
        } else {
            output[key] = nested;
        }
    }

    return output;
}

function asObject(value: unknown): Record<string, unknown> {
    return sanitizeObject(value);
}

function deepMerge(
    base: Record<string, unknown>,
    patch: Record<string, unknown>,
    depth = 0
): Record<string, unknown> {
    if (depth > MAX_MERGE_DEPTH) {
        return sanitizeObject(base);
    }

    const safeBase = sanitizeObject(base, depth);
    const safePatch = sanitizeObject(patch, depth);
    const output: Record<string, unknown> = { ...safeBase };

    Object.entries(safePatch).forEach(([key, value]) => {
        if (isPlainObject(value)) {
            output[key] = deepMerge(asObject(output[key]), value, depth + 1);
            return;
        }

        output[key] = value;
    });

    return output;
}

export function readScopedData(): Record<string, unknown> {
    const root = readRootObject();
    return asObject(root[NAMESPACE]);
}

export function replaceScopedData(nextData: Record<string, unknown>): Record<string, unknown> {
    const root = readRootObject();
    root[NAMESPACE] = asObject(nextData);
    writeRootObject(root);
    return asObject(root[NAMESPACE]);
}

export function mergeScopedData(patch: Record<string, unknown>): Record<string, unknown> {
    const root = readRootObject();
    const current = asObject(root[NAMESPACE]);
    const merged = deepMerge(current, asObject(patch));
    root[NAMESPACE] = merged;
    writeRootObject(root);
    return merged;
}

export function getDatabaseMeta() {
    const paths = getPaths();
    return {
        namespace: NAMESPACE,
        source: paths.source,
        candidatePath: paths.candidatePath,
        activePath: paths.activePath,
        mode: storageMode
    };
}
