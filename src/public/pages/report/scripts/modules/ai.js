(function initAiModule(global) {
    const ACTION_WHITELIST = new Set([
        "hint", "undo", "new_game", "analyze", "study", "flip", "open_study", "load_line"
    ]);
    const LOG_KEY = "ajedrez_ai_action_log_v1";
    const storage = global.ReportModules && global.ReportModules.storage
        ? global.ReportModules.storage
        : null;

    function parseJsonLoose(raw) {
        const text = String(raw || "").trim();
        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch {
            const fenced = text.match(/```json\s*([\s\S]*?)```/i);
            if (!fenced || !fenced[1]) return null;
            try {
                return JSON.parse(fenced[1]);
            } catch {
                return null;
            }
        }
    }

    function sanitizeActions(actions) {
        if (!Array.isArray(actions)) return [];

        return actions
            .map((action) => {
                if (!action || typeof action !== "object") return null;
                const type = String(action.type || "").trim().toLowerCase();
                if (!ACTION_WHITELIST.has(type)) return null;

                const safe = {
                    type,
                    label: String(action.label || "").trim().slice(0, 60),
                    argument: String(action.argument || "").trim().slice(0, 120)
                };

                return safe;
            })
            .filter(Boolean);
    }

    function parseStructuredResponse(raw) {
        const parsed = parseJsonLoose(raw);
        if (!parsed || typeof parsed !== "object") {
            return {
                text: String(raw || "").trim(),
                actions: []
            };
        }

        const text = String(parsed.text || parsed.message || "").trim();
        const actions = sanitizeActions(parsed.actions);

        return {
            text,
            actions
        };
    }

    function readActionLog() {
        if (storage && storage.read) {
            const entries = storage.read("ai.log", []);
            return Array.isArray(entries) ? entries : [];
        }

        try {
            const raw = localStorage.getItem(LOG_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function writeActionLog(entries) {
        if (storage && storage.write) {
            storage.write("ai.log", Array.isArray(entries) ? entries.slice(-500) : []);
            return;
        }

        try {
            localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-500)));
        } catch {
            // ignore storage failures
        }
    }

    function logAction(action, status, meta) {
        const log = readActionLog();
        log.push({
            at: new Date().toISOString(),
            actionType: String(action && action.type || "unknown"),
            argument: String(action && action.argument || ""),
            status: String(status || "unknown"),
            meta: meta || null
        });
        writeActionLog(log);
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.ai = {
        ACTION_WHITELIST,
        sanitizeActions,
        parseStructuredResponse,
        readActionLog,
        logAction
    };
})(window);
