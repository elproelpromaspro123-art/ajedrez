import fs from "fs";
import path from "path";

const NAMESPACE = "freechess_lab_v1";
const DEFAULT_DB_FILE = path.resolve("data", "database.json");

interface DatabasePaths {
    source: string;
    candidatePath: string;
    activePath: string;
}

let cachedPaths: DatabasePaths | null = null;

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
                source: "env_file_url_fallback",
                candidatePath: DEFAULT_DB_FILE
            };
        }
    }

    if (/^[a-zA-Z]+:\/\//.test(raw)) {
        return {
            source: "unsupported_remote_url",
            candidatePath: path.resolve("data", "database.remote-fallback.json")
        };
    }

    return {
        source: "env_path",
        candidatePath: path.isAbsolute(raw) ? raw : path.resolve(raw)
    };
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

function readRootObject(): Record<string, unknown> {
    const paths = getPaths();
    if (!fs.existsSync(paths.activePath)) {
        return {};
    }

    try {
        const raw = fs.readFileSync(paths.activePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
        return {};
    } catch {
        return {};
    }
}

function writeRootObject(root: Record<string, unknown>): void {
    const paths = getPaths();
    ensureParentFolder(paths.activePath);
    const tempPath = `${paths.activePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(root, null, 2), "utf8");
    fs.renameSync(tempPath, paths.activePath);
}

function asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = { ...base };
    Object.entries(patch).forEach(([key, value]) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            output[key] = deepMerge(asObject(output[key]), asObject(value));
        } else {
            output[key] = value;
        }
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
        activePath: paths.activePath
    };
}

