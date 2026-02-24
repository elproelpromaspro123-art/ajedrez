(function initStorageModule(global) {
    const ROOT_KEY = "ajedrez_app_storage";
    const CURRENT_VERSION = 3;

    const DEFAULT_DATA = {
        preferences: {},
        progress: { games: [], activities: [] },
        ai: { log: [], chatHistory: [] },
        caches: { openingsCatalog: null, openingExplorer: { entries: {} } },
        session: { snapshot: null },
        metrics: { entries: [] }
    };

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function readRawStore() {
        try {
            const raw = localStorage.getItem(ROOT_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function writeRawStore(store) {
        try {
            localStorage.setItem(ROOT_KEY, JSON.stringify(store));
        } catch {
            // ignore quota/storage failures
        }
    }

    function readPath(obj, path, fallbackValue) {
        if (!path) {
            return obj;
        }

        const steps = String(path).split(".").filter(Boolean);
        let cursor = obj;
        for (const step of steps) {
            if (!cursor || typeof cursor !== "object" || !(step in cursor)) {
                return fallbackValue;
            }
            cursor = cursor[step];
        }
        return cursor;
    }

    function writePath(obj, path, value) {
        const steps = String(path).split(".").filter(Boolean);
        if (steps.length === 0) {
            return;
        }

        let cursor = obj;
        for (let i = 0; i < steps.length - 1; i += 1) {
            const step = steps[i];
            if (!cursor[step] || typeof cursor[step] !== "object") {
                cursor[step] = {};
            }
            cursor = cursor[step];
        }

        cursor[steps[steps.length - 1]] = value;
    }

    function ensureLegacyImport(baseData) {
        const data = Object.assign(clone(DEFAULT_DATA), baseData || {});

        const legacyBoardTheme = localStorage.getItem("ajedrez_ui_pref_board_theme");
        const legacyPieceTheme = localStorage.getItem("ajedrez_ui_pref_piece_theme");
        if (legacyBoardTheme && data.preferences.board_theme == null) {
            try {
                data.preferences.board_theme = JSON.parse(legacyBoardTheme);
            } catch {}
        }
        if (legacyPieceTheme && data.preferences.piece_theme == null) {
            try {
                data.preferences.piece_theme = JSON.parse(legacyPieceTheme);
            } catch {}
        }

        const legacyProgress = localStorage.getItem("ajedrez_progress_v1");
        if (legacyProgress && (!Array.isArray(data.progress.games) || data.progress.games.length === 0)) {
            try {
                const parsed = JSON.parse(legacyProgress);
                data.progress.games = Array.isArray(parsed.games) ? parsed.games : [];
                data.progress.activities = Array.isArray(parsed.activities) ? parsed.activities : [];
            } catch {}
        }

        const legacyAiLog = localStorage.getItem("ajedrez_ai_action_log_v1");
        if (legacyAiLog && (!Array.isArray(data.ai.log) || data.ai.log.length === 0)) {
            try {
                const parsed = JSON.parse(legacyAiLog);
                data.ai.log = Array.isArray(parsed) ? parsed : [];
            } catch {}
        }

        const legacyCatalog = localStorage.getItem("ajedrez_openings_catalog_cache_v2");
        if (legacyCatalog && !data.caches.openingsCatalog) {
            try {
                data.caches.openingsCatalog = JSON.parse(legacyCatalog);
            } catch {}
        }

        const legacyExplorer = localStorage.getItem("ajedrez_opening_explorer_cache_v2");
        if (legacyExplorer && (!data.caches.openingExplorer || !data.caches.openingExplorer.entries)) {
            try {
                data.caches.openingExplorer = JSON.parse(legacyExplorer);
            } catch {}
        }

        return data;
    }

    function migrateV1toV2(data) {
        const migrated = ensureLegacyImport(data);
        if (!migrated.metrics || typeof migrated.metrics !== "object") {
            migrated.metrics = { entries: [] };
        }
        return migrated;
    }

    function migrateV2toV3(data) {
        const migrated = Object.assign(clone(DEFAULT_DATA), data || {});
        if (!Array.isArray(readPath(migrated, "metrics.entries", []))) {
            writePath(migrated, "metrics.entries", []);
        }
        if (!Array.isArray(readPath(migrated, "ai.chatHistory", []))) {
            writePath(migrated, "ai.chatHistory", []);
        }
        return migrated;
    }

    function migrateToCurrent(store) {
        let version = Number(store && store.version) || 1;
        let data = Object.assign(clone(DEFAULT_DATA), store && store.data ? store.data : {});

        if (version < 2) {
            data = migrateV1toV2(data);
            version = 2;
        }
        if (version < 3) {
            data = migrateV2toV3(data);
            version = 3;
        }

        data = ensureLegacyImport(data);

        return {
            version: CURRENT_VERSION,
            data
        };
    }

    function migrateIfNeeded() {
        const raw = readRawStore();
        if (!raw || typeof raw !== "object") {
            const migrated = migrateToCurrent({
                version: 1,
                data: clone(DEFAULT_DATA)
            });
            writeRawStore(migrated);
            return migrated;
        }

        if (!raw.data || typeof raw.data !== "object" || raw.version !== CURRENT_VERSION) {
            const migrated = migrateToCurrent(raw);
            writeRawStore(migrated);
            return migrated;
        }

        return raw;
    }

    function getStore() {
        return migrateIfNeeded();
    }

    function setStore(store) {
        writeRawStore(store);
    }

    function read(path, fallbackValue) {
        const store = getStore();
        return readPath(store.data, path, fallbackValue);
    }

    function write(path, value) {
        const store = getStore();
        writePath(store.data, path, value);
        setStore(store);
        return value;
    }

    function mutate(mutator) {
        const store = getStore();
        mutator(store.data);
        setStore(store);
        return store.data;
    }

    function pushList(path, entry, maxItems) {
        const store = getStore();
        const current = readPath(store.data, path, []);
        const next = Array.isArray(current) ? current.slice() : [];
        next.push(entry);
        if (maxItems && next.length > maxItems) {
            next.splice(0, next.length - maxItems);
        }
        writePath(store.data, path, next);
        setStore(store);
        return next;
    }

    function removeLegacyKeys() {
        [
            "ajedrez_ui_pref_board_theme",
            "ajedrez_ui_pref_piece_theme",
            "ajedrez_progress_v1",
            "ajedrez_ai_action_log_v1",
            "ajedrez_openings_catalog_cache_v2",
            "ajedrez_opening_explorer_cache_v2"
        ].forEach((key) => {
            try {
                localStorage.removeItem(key);
            } catch {}
        });
    }

    migrateIfNeeded();

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.storage = {
        ROOT_KEY,
        CURRENT_VERSION,
        getStore,
        setStore,
        read,
        write,
        mutate,
        pushList,
        removeLegacyKeys
    };
})(window);
