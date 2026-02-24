(function initOpeningsModule(global) {
    const CATALOG_CACHE_KEY = "ajedrez_openings_catalog_cache_v2";
    const EXPLORER_CACHE_KEY = "ajedrez_opening_explorer_cache_v2";
    const CATALOG_TTL_MS = 1000 * 60 * 60 * 24 * 7;
    const EXPLORER_TTL_MS = 1000 * 60 * 60 * 24;
    const storage = global.ReportModules && global.ReportModules.storage
        ? global.ReportModules.storage
        : null;

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

    function getExplorerCacheMap() {
        const payload = storage && storage.read
            ? { entries: storage.read("caches.openingExplorer.entries", {}) }
            : readJson(EXPLORER_CACHE_KEY, { entries: {} });
        if (!payload || typeof payload !== "object" || typeof payload.entries !== "object") {
            return {};
        }
        return payload.entries;
    }

    function setExplorerCacheMap(entries) {
        if (storage && storage.write) {
            storage.write("caches.openingExplorer.entries", entries);
            return;
        }

        writeJson(EXPLORER_CACHE_KEY, { entries });
    }

    function buildExplorerCacheKey(fen, extra) {
        return `${normalizeFenPlacement(fen)}|${extra || ""}`;
    }

    async function fetchExplorerPosition(options) {
        const fen = options && options.fen ? options.fen : "startpos";
        const moves = options && options.moves ? options.moves : 16;
        const speeds = options && options.speeds ? options.speeds : "rapid,blitz,classical";
        const ratings = options && options.ratings ? options.ratings : "1600,1800,2000";

        const cacheKey = buildExplorerCacheKey(fen, `${moves}|${speeds}|${ratings}`);
        const entries = getExplorerCacheMap();
        const cached = entries[cacheKey];

        if (cached && Date.now() - cached.savedAt <= EXPLORER_TTL_MS) {
            return { payload: cached.payload, source: "localStorage" };
        }

        const query = new URLSearchParams({ fen, moves: String(moves), speeds, ratings });
        const response = await fetch(`/api/opening-explorer?${query.toString()}`);
        if (!response.ok) {
            throw new Error(`Explorer request failed (${response.status}).`);
        }

        const payload = await response.json();
        entries[cacheKey] = { savedAt: Date.now(), payload };
        setExplorerCacheMap(entries);

        return { payload, source: "api" };
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

    let filterWorker = null;
    let workerCallId = 0;
    const pendingCalls = new Map();

    function ensureFilterWorker() {
        if (filterWorker || typeof Worker === "undefined") {
            return filterWorker;
        }

        filterWorker = new Worker("/static/pages/report/scripts/modules/openings-worker.js");
        filterWorker.onmessage = (event) => {
            const data = event.data || {};
            const pending = pendingCalls.get(data.id);
            if (!pending) return;
            pendingCalls.delete(data.id);
            pending.resolve(data.result || []);
        };

        filterWorker.onerror = () => {
            pendingCalls.forEach((pending) => pending.reject(new Error("openings worker failed")));
            pendingCalls.clear();
            filterWorker = null;
        };

        return filterWorker;
    }

    function filterTreeRows(rows, filters) {
        const worker = ensureFilterWorker();
        if (!worker) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            workerCallId += 1;
            const id = workerCallId;
            pendingCalls.set(id, { resolve, reject });
            worker.postMessage({ id, rows, filters });
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
