(function initUiModule(global) {
    const STORAGE_PREFIX = "ajedrez_ui_pref_";
    const storage = global.ReportModules && global.ReportModules.storage
        ? global.ReportModules.storage
        : null;

    function isTypingTarget(target) {
        if (!target) return false;
        const tag = String(target.tagName || "").toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
    }

    function loadPreference(key, fallbackValue) {
        if (storage && storage.read) {
            return storage.read(`preferences.${key}`, fallbackValue);
        }

        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + key);
            if (raw === null) return fallbackValue;
            return JSON.parse(raw);
        } catch {
            return fallbackValue;
        }
    }

    function savePreference(key, value) {
        if (storage && storage.write) {
            storage.write(`preferences.${key}`, value);
            return;
        }

        try {
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        } catch {
            // ignore storage failures
        }
    }

    function applyBoardTheme(theme) {
        const safeTheme = theme || "classic";
        document.body.dataset.boardTheme = safeTheme;
        savePreference("board_theme", safeTheme);
    }

    function applyPieceTheme(theme) {
        const safeTheme = theme || "default";
        document.body.dataset.pieceTheme = safeTheme;
        savePreference("piece_theme", safeTheme);
    }

    function applyStoredThemes() {
        applyBoardTheme(loadPreference("board_theme", "classic"));
        applyPieceTheme(loadPreference("piece_theme", "default"));
    }

    function registerKeyboardShortcuts(handlers) {
        document.addEventListener("keydown", (event) => {
            if (!handlers || typeof handlers !== "object") return;
            if (isTypingTarget(event.target)) return;

            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            const handler = handlers[key];
            if (!handler) return;

            event.preventDefault();
            try {
                handler(event);
            } catch {
                // ignore shortcut failures
            }
        });
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.ui = {
        isTypingTarget,
        loadPreference,
        savePreference,
        applyBoardTheme,
        applyPieceTheme,
        applyStoredThemes,
        registerKeyboardShortcuts
    };
})(window);
