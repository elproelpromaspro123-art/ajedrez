import fs from "fs";
import path from "path";
import { Pool, PoolConfig } from "pg";

const NAMESPACE = "freechess_lab_v1";
const DEFAULT_DB_FILE = path.resolve("data", "database.json");
const POSTGRES_TABLE = "freechess_store";
const MAX_MERGE_DEPTH = 20;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

interface DatabaseEnvConfig {
    envName: "DATA_BASE2" | "DATA_BASE" | "default";
    rawValue: string;
}

interface FileBackendConfig {
    kind: "file";
    envName: DatabaseEnvConfig["envName"];
    source: string;
    candidatePath: string;
    activePath: string;
}

interface PostgresBackendConfig {
    kind: "postgres";
    envName: DatabaseEnvConfig["envName"];
    source: string;
    connectionString: string;
}

type BackendConfig = FileBackendConfig | PostgresBackendConfig;
type StorageMode = "file" | "memory_fallback" | "postgres";

let cachedConfig: BackendConfig | null = null;
let memoryFallbackRoot: Record<string, unknown> = {};
let storageMode: StorageMode = "file";
let postgresPool: Pool | null = null;
let postgresReadyPromise: Promise<void> | null = null;

function resolveDatabaseEnvConfig(): DatabaseEnvConfig {
    const dataBase2 = String(process.env.DATA_BASE2 || "").trim();
    if (dataBase2) {
        return {
            envName: "DATA_BASE2",
            rawValue: dataBase2
        };
    }

    const dataBase = String(process.env.DATA_BASE || "").trim();
    if (dataBase) {
        return {
            envName: "DATA_BASE",
            rawValue: dataBase
        };
    }

    return {
        envName: "default",
        rawValue: ""
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

function parseFileUrlToPath(rawUrl: string): string | null {
    try {
        const parsed = new URL(rawUrl);
        const pathname = decodeURIComponent(parsed.pathname || "");
        if (!pathname) {
            return null;
        }

        if (process.platform === "win32") {
            return path.resolve(pathname.replace(/^\//, ""));
        }

        return path.resolve(pathname);
    } catch {
        return null;
    }
}

function parseBackendConfig(): BackendConfig {
    const envConfig = resolveDatabaseEnvConfig();
    if (!envConfig.rawValue) {
        return {
            kind: "file",
            envName: envConfig.envName,
            source: "default",
            candidatePath: DEFAULT_DB_FILE,
            activePath: ensureJsonSafePath(DEFAULT_DB_FILE)
        };
    }

    const raw = envConfig.rawValue;

    if (/^postgres(ql)?:\/\//i.test(raw)) {
        return {
            kind: "postgres",
            envName: envConfig.envName,
            source: "env_postgres_url",
            connectionString: raw
        };
    }

    if (/^file:\/\//i.test(raw)) {
        const resolved = parseFileUrlToPath(raw);
        if (resolved) {
            return {
                kind: "file",
                envName: envConfig.envName,
                source: "env_file_url",
                candidatePath: resolved,
                activePath: ensureJsonSafePath(resolved)
            };
        }

        return {
            kind: "file",
            envName: envConfig.envName,
            source: "invalid_env_file_url_fallback",
            candidatePath: DEFAULT_DB_FILE,
            activePath: ensureJsonSafePath(DEFAULT_DB_FILE)
        };
    }

    if (/^[a-zA-Z]+:\/\//.test(raw)) {
        return {
            kind: "file",
            envName: envConfig.envName,
            source: "unsupported_remote_url_fallback",
            candidatePath: path.resolve("data", "database.remote-fallback.json"),
            activePath: ensureJsonSafePath(path.resolve("data", "database.remote-fallback.json"))
        };
    }

    try {
        const candidatePath = path.isAbsolute(raw) ? raw : path.resolve(raw);
        return {
            kind: "file",
            envName: envConfig.envName,
            source: "env_path",
            candidatePath,
            activePath: ensureJsonSafePath(candidatePath)
        };
    } catch {
        return {
            kind: "file",
            envName: envConfig.envName,
            source: "invalid_env_path_fallback",
            candidatePath: DEFAULT_DB_FILE,
            activePath: ensureJsonSafePath(DEFAULT_DB_FILE)
        };
    }
}

function getBackendConfig(): BackendConfig {
    if (cachedConfig) {
        return cachedConfig;
    }

    cachedConfig = parseBackendConfig();
    return cachedConfig;
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

function shouldAllowMemoryFallback(config: FileBackendConfig): boolean {
    if (config.source === "env_path" || config.source === "env_file_url") {
        return false;
    }

    return true;
}

function readRootObjectFromFile(config: FileBackendConfig): Record<string, unknown> {
    storageMode = storageMode === "memory_fallback" ? "memory_fallback" : "file";

    if (storageMode === "memory_fallback") {
        if (!shouldAllowMemoryFallback(config)) {
            throw new Error(`Database storage is in memory fallback mode, but ${config.envName} requires persistent writes (${config.activePath}).`);
        }
        return cloneRoot(memoryFallbackRoot);
    }

    if (!fs.existsSync(config.activePath)) {
        if (Object.keys(memoryFallbackRoot).length > 0) {
            return cloneRoot(memoryFallbackRoot);
        }
        return {};
    }

    try {
        const raw = fs.readFileSync(config.activePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            memoryFallbackRoot = cloneRoot(parsed as Record<string, unknown>);
            return parsed as Record<string, unknown>;
        }
        return {};
    } catch {
        if (!shouldAllowMemoryFallback(config)) {
            throw new Error(`Failed to read ${config.envName} JSON at ${config.activePath}.`);
        }
        if (Object.keys(memoryFallbackRoot).length > 0) {
            return cloneRoot(memoryFallbackRoot);
        }
        return {};
    }
}

function writeRootObjectToFile(config: FileBackendConfig, root: Record<string, unknown>): void {
    const safeRoot = cloneRoot(root);
    memoryFallbackRoot = safeRoot;

    if (storageMode === "memory_fallback") {
        if (!shouldAllowMemoryFallback(config)) {
            throw new Error(`Cannot write ${config.envName} in memory fallback mode (${config.activePath}).`);
        }
        return;
    }

    const tempPath = `${config.activePath}.tmp`;

    try {
        ensureParentFolder(config.activePath);
        fs.writeFileSync(tempPath, JSON.stringify(safeRoot, null, 2), "utf8");
        fs.renameSync(tempPath, config.activePath);
        storageMode = "file";
    } catch {
        try {
            if (fs.existsSync(tempPath)) {
                fs.rmSync(tempPath, { force: true });
            }
        } catch {
            // ignore temp cleanup failures
        }

        if (!shouldAllowMemoryFallback(config)) {
            throw new Error(`Failed to persist ${config.envName} file at ${config.activePath}.`);
        }

        storageMode = "memory_fallback";
    }
}

function isLocalHost(host: string): boolean {
    const normalized = String(host || "").toLowerCase();
    return normalized === "localhost"
        || normalized === "127.0.0.1"
        || normalized === "::1"
        || normalized === "0.0.0.0";
}

function shouldUsePostgresTls(connectionString: string): boolean {
    try {
        const parsed = new URL(connectionString);
        const sslMode = String(parsed.searchParams.get("sslmode") || "").toLowerCase();
        if (sslMode === "disable") {
            return false;
        }
        return !isLocalHost(parsed.hostname);
    } catch {
        return true;
    }
}

function getPostgresPool(config: PostgresBackendConfig): Pool {
    if (postgresPool) {
        return postgresPool;
    }

    const poolConfig: PoolConfig = {
        connectionString: config.connectionString,
        max: 3,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000
    };

    if (shouldUsePostgresTls(config.connectionString)) {
        poolConfig.ssl = {
            rejectUnauthorized: false
        };
    }

    postgresPool = new Pool(poolConfig);
    return postgresPool;
}

async function ensurePostgresStoreReady(config: PostgresBackendConfig): Promise<void> {
    if (postgresReadyPromise) {
        return postgresReadyPromise;
    }

    postgresReadyPromise = (async () => {
        const pool = getPostgresPool(config);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${POSTGRES_TABLE} (
                namespace TEXT PRIMARY KEY,
                payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
    })();

    try {
        await postgresReadyPromise;
    } catch (err) {
        postgresReadyPromise = null;
        throw err;
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

function redactConnectionString(connectionString: string): string {
    try {
        const parsed = new URL(connectionString);
        if (parsed.password) {
            parsed.password = "***";
        }
        if (parsed.username) {
            parsed.username = "***";
        }
        return parsed.toString();
    } catch {
        return "postgres://***";
    }
}

export async function readScopedData(): Promise<Record<string, unknown>> {
    const config = getBackendConfig();

    if (config.kind === "postgres") {
        storageMode = "postgres";
        await ensurePostgresStoreReady(config);
        const pool = getPostgresPool(config);
        const response = await pool.query(
            `SELECT payload FROM ${POSTGRES_TABLE} WHERE namespace = $1 LIMIT 1`,
            [NAMESPACE]
        );
        const payload = response.rows[0]?.payload;
        return asObject(payload);
    }

    const root = readRootObjectFromFile(config);
    return asObject(root[NAMESPACE]);
}

export async function replaceScopedData(nextData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = getBackendConfig();
    const safeNext = asObject(nextData);

    if (config.kind === "postgres") {
        storageMode = "postgres";
        await ensurePostgresStoreReady(config);
        const pool = getPostgresPool(config);
        await pool.query(
            `
            INSERT INTO ${POSTGRES_TABLE} (namespace, payload, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (namespace)
            DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
            `,
            [NAMESPACE, JSON.stringify(safeNext)]
        );
        return safeNext;
    }

    const root = readRootObjectFromFile(config);
    root[NAMESPACE] = safeNext;
    writeRootObjectToFile(config, root);
    return asObject(root[NAMESPACE]);
}

export async function mergeScopedData(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const current = await readScopedData();
    const merged = deepMerge(current, asObject(patch));
    return replaceScopedData(merged);
}

export function getDatabaseMeta() {
    const config = getBackendConfig();

    if (config.kind === "postgres") {
        return {
            namespace: NAMESPACE,
            source: config.source,
            candidatePath: redactConnectionString(config.connectionString),
            activePath: `${POSTGRES_TABLE}:${NAMESPACE}`,
            mode: "postgres",
            backend: "postgres",
            envName: config.envName
        };
    }

    return {
        namespace: NAMESPACE,
        source: config.source,
        candidatePath: config.candidatePath,
        activePath: config.activePath,
        mode: storageMode,
        backend: "file",
        envName: config.envName
    };
}
