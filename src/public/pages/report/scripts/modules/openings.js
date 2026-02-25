(function initOpeningsModule(global) {
    const CATALOG_CACHE_KEY = "ajedrez_openings_catalog_cache_v2";
    const EXPLORER_CACHE_KEY = "ajedrez_opening_explorer_cache_v2";
    const CATALOG_TTL_MS = 1000 * 60 * 60 * 24 * 7;
    const EXPLORER_TTL_MS = 1000 * 60 * 60 * 24;
    const EXPLORER_STALE_TTL_MS = EXPLORER_TTL_MS * 3;
    const EXPLORER_MAX_CACHE_ENTRIES = 480;
    const EXPLORER_FETCH_TIMEOUT_MS = 9000;
    const FILTER_WORKER_TIMEOUT_MS = 2200;
    const EXPLORER_DEFAULT_SPEEDS = ["rapid", "blitz", "classical"];
    const EXPLORER_DEFAULT_RATINGS = ["1600", "1800", "2000"];
    const EXPLORER_ALLOWED_SPEEDS = new Set([
        "ultrabullet",
        "bullet",
        "blitz",
        "rapid",
        "classical",
        "correspondence"
    ]);
    const EXPLORER_ALLOWED_RATINGS = new Set([
        "1000",
        "1200",
        "1400",
        "1600",
        "1800",
        "2000",
        "2200",
        "2500"
    ]);
    const storage = global.ReportModules && global.ReportModules.storage
        ? global.ReportModules.storage
        : null;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function readJson(key, fallbackValue) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallbackValue;
            return JSON.parse(raw);
        } catch {
            return fallbackValue;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore quota/storage errors
        }
    }

    function normalizeFenPlacement(fen) {
        if (!fen || typeof fen !== "string") return "";
        return fen.trim().split(" ")[0] || "";
    }

    function normalizeOpeningName(name) {
        return String(name || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizeCsvToken(token) {
        return String(token || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    }

    function sanitizeCsvList(raw, allowList, fallback) {
        if (raw == null || raw === "") {
            return fallback.slice();
        }

        const text = String(raw).trim();
        if (!text) {
            return fallback.slice();
        }
        if (text.length > 120) {
            return fallback.slice();
        }

        const unique = [];
        const seen = new Set();
        text.split(",").forEach((part) => {
            const token = normalizeCsvToken(part);
            if (!token || seen.has(token) || !allowList.has(token)) {
                return;
            }
            unique.push(token);
            seen.add(token);
        });

        if (unique.length === 0) {
            return fallback.slice();
        }

        return unique.slice(0, 6);
    }

    function normalizeExplorerOptions(options) {
        const rawFen = options && typeof options.fen === "string" && options.fen.trim()
            ? options.fen.trim()
            : "startpos";
        const fen = rawFen.length > 200 ? "startpos" : rawFen;

        const rawMoves = Number.parseInt(String(options && options.moves ? options.moves : 16), 10);
        const moves = Number.isFinite(rawMoves) ? clamp(rawMoves, 1, 24) : 16;

        const speeds = sanitizeCsvList(
            options ? options.speeds : null,
            EXPLORER_ALLOWED_SPEEDS,
            EXPLORER_DEFAULT_SPEEDS
        );
        const ratings = sanitizeCsvList(
            options ? options.ratings : null,
            EXPLORER_ALLOWED_RATINGS,
            EXPLORER_DEFAULT_RATINGS
        );

        return {
            fen,
            moves,
            speeds,
            ratings
        };
    }

    function getCachedCatalog() {
        const payload = storage && storage.read
            ? storage.read("caches.openingsCatalog", null)
            : readJson(CATALOG_CACHE_KEY, null);
        if (!payload || !Array.isArray(payload.openings) || typeof payload.savedAt !== "number") {
            return null;
        }
        if (Date.now() - payload.savedAt > CATALOG_TTL_MS) {
            return null;
        }
        return payload.openings;
    }

    function cacheCatalog(openings) {
        if (!Array.isArray(openings)) return;
        const payload = {
            savedAt: Date.now(),
            openings
        };

        if (storage && storage.write) {
            storage.write("caches.openingsCatalog", payload);
            return;
        }

        writeJson(CATALOG_CACHE_KEY, payload);
    }

    async function fetchCatalog(forceRefresh) {
        if (!forceRefresh) {
            const cached = getCachedCatalog();
            if (cached) {
                return { openings: cached, source: "localStorage" };
            }
        }

        const response = await fetch("/api/openings");
        if (!response.ok) {
            throw new Error(`Catalog request failed (${response.status}).`);
        }

        const payload = await response.json();
        const openings = payload && Array.isArray(payload.openings) ? payload.openings : [];
        cacheCatalog(openings);

        return { openings, source: "api" };
    }

    function pruneExplorerEntries(entries) {
        const now = Date.now();
        const next = {};

        Object.entries(entries || {}).forEach(([key, value]) => {
            if (!value || typeof value !== "object") {
                return;
            }
            const savedAt = Number(value.savedAt || 0);
            if (!Number.isFinite(savedAt) || savedAt <= 0) {
                return;
            }
            if (now - savedAt > EXPLORER_STALE_TTL_MS) {
                return;
            }
            next[key] = {
                savedAt,
                payload: value.payload
            };
        });

        const keysByRecency = Object.keys(next).sort((a, b) => next[b].savedAt - next[a].savedAt);
        const trimmed = {};
        keysByRecency.slice(0, EXPLORER_MAX_CACHE_ENTRIES).forEach((key) => {
            trimmed[key] = next[key];
        });

        return trimmed;
    }

    function getExplorerCacheMap() {
        const payload = storage && storage.read
            ? { entries: storage.read("caches.openingExplorer.entries", {}) }
            : readJson(EXPLORER_CACHE_KEY, { entries: {} });
        if (!payload || typeof payload !== "object" || typeof payload.entries !== "object") {
            return {};
        }
        return pruneExplorerEntries(payload.entries);
    }

    function setExplorerCacheMap(entries) {
        const safeEntries = pruneExplorerEntries(entries);

        if (storage && storage.write) {
            storage.write("caches.openingExplorer.entries", safeEntries);
            return;
        }

        writeJson(EXPLORER_CACHE_KEY, { entries: safeEntries });
    }

    function buildExplorerCacheKey(fen, extra) {
        return `${normalizeFenPlacement(fen)}|${extra || ""}`;
    }

    async function fetchExplorerPosition(options) {
        const normalized = normalizeExplorerOptions(options || {});
        const speedsText = normalized.speeds.join(",");
        const ratingsText = normalized.ratings.join(",");
        const cacheKey = buildExplorerCacheKey(
            normalized.fen,
            `${normalized.moves}|${speedsText}|${ratingsText}`
        );
        const entries = getExplorerCacheMap();
        const cached = entries[cacheKey];

        if (cached && Date.now() - cached.savedAt <= EXPLORER_TTL_MS) {
            return { payload: cached.payload, source: "localStorage" };
        }

        const query = new URLSearchParams({
            fen: normalized.fen,
            moves: String(normalized.moves),
            speeds: speedsText,
            ratings: ratingsText
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), EXPLORER_FETCH_TIMEOUT_MS);
        try {
            const response = await fetch(`/api/opening-explorer?${query.toString()}`, {
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`Explorer request failed (${response.status}).`);
            }

            const payload = await response.json();
            entries[cacheKey] = { savedAt: Date.now(), payload };
            setExplorerCacheMap(entries);
            return { payload, source: "api" };
        } catch (error) {
            if (cached && cached.payload) {
                return { payload: cached.payload, source: "stale-cache" };
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function computeSuccessRate(stats, color) {
        const white = Number(stats.white || 0);
        const black = Number(stats.black || 0);
        const draws = Number(stats.draws || 0);
        const total = white + black + draws;
        if (total <= 0) return 0;

        if (color === "black") {
            return (black / total) * 100;
        }
        if (color === "both") {
            return (Math.max(white, black) / total) * 100;
        }
        return (white / total) * 100;
    }

    function ecoBucketFromName(name) {
        const text = normalizeOpeningName(name);
        if (!text) return "A00";
        if (text.includes("india") || text.includes("indian") || text.includes("king's indian")) return "E00";
        if (text.includes("dama") || text.includes("queen") || text.includes("slav") || text.includes("grunfeld") || text.includes("gruenfeld")) return "D00";
        if (text.includes("sicil") || text.includes("frances") || text.includes("caro") || text.includes("pirc") || text.includes("moderna") || text.includes("defensa")) return "B00";
        if (text.includes("espanola") || text.includes("italiana") || text.includes("ruy") || text.includes("escocesa") || text.includes("petrov")) return "C00";
        return "A00";
    }

    function filterTreeRowsSync(rows, filters) {
        const sourceRows = Array.isArray(rows) ? rows : [];
        const safeFilters = filters && typeof filters === "object" ? filters : {};
        const minPopularity = Number(safeFilters.minPopularity || 0);
        const minSuccess = Number(safeFilters.minSuccess || 0);
        const query = String(safeFilters.query || "").toLowerCase().trim();

        return sourceRows
            .filter((row) => {
                if (!row) return false;
                if (Number(row.popularity || 0) < minPopularity) return false;
                if (Number(row.success || 0) < minSuccess) return false;
                if (!query) return true;

                const haystack = `${row.eco || ""} ${row.name || ""} ${row.line || ""}`.toLowerCase();
                return haystack.includes(query);
            })
            .sort((a, b) => {
                if (Number(b.popularity || 0) !== Number(a.popularity || 0)) {
                    return Number(b.popularity || 0) - Number(a.popularity || 0);
                }
                return Number(b.success || 0) - Number(a.success || 0);
            });
    }

    let filterWorker = null;
    let workerCallId = 0;
    const pendingCalls = new Map();

    function flushPendingCallsWithSyncFallback() {
        pendingCalls.forEach((pending, id) => {
            clearTimeout(pending.timeoutId);
            pendingCalls.delete(id);
            pending.resolve(filterTreeRowsSync(pending.rows, pending.filters));
        });
    }

    function ensureFilterWorker() {
        if (filterWorker || typeof Worker === "undefined") {
            return filterWorker;
        }

        try {
            filterWorker = new Worker("/static/pages/report/scripts/modules/openings-worker.js");
        } catch {
            filterWorker = null;
            return null;
        }

        filterWorker.onmessage = (event) => {
            const data = event.data || {};
            const pending = pendingCalls.get(data.id);
            if (!pending) return;

            clearTimeout(pending.timeoutId);
            pendingCalls.delete(data.id);

            if (Array.isArray(data.result)) {
                pending.resolve(data.result);
            } else {
                pending.resolve(filterTreeRowsSync(pending.rows, pending.filters));
            }
        };

        filterWorker.onerror = () => {
            flushPendingCallsWithSyncFallback();
            filterWorker = null;
        };

        return filterWorker;
    }

    function filterTreeRows(rows, filters) {
        const worker = ensureFilterWorker();
        if (!worker) {
            return Promise.resolve(filterTreeRowsSync(rows, filters));
        }

        return new Promise((resolve) => {
            workerCallId += 1;
            const id = workerCallId;
            const timeoutId = setTimeout(() => {
                const pending = pendingCalls.get(id);
                if (!pending) {
                    return;
                }
                pendingCalls.delete(id);
                resolve(filterTreeRowsSync(rows, filters));
            }, FILTER_WORKER_TIMEOUT_MS);

            pendingCalls.set(id, {
                resolve,
                rows,
                filters,
                timeoutId
            });

            try {
                worker.postMessage({ id, rows, filters });
            } catch {
                clearTimeout(timeoutId);
                pendingCalls.delete(id);
                resolve(filterTreeRowsSync(rows, filters));
            }
        });
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.openings = {
        normalizeFenPlacement,
        normalizeOpeningName,
        fetchCatalog,
        fetchExplorerPosition,
        computeSuccessRate,
        ecoBucketFromName,
        filterTreeRows
    };
})(window);
