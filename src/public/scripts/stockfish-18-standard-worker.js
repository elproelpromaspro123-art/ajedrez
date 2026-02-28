import Sf18Web from "./stockfish-18-standard.js";

let engine = null;
let initPromise = null;
const pendingCommands = [];

function reportEngineError(prefix, error) {
    const text = error && error.message ? error.message : String(error || "unknown error");
    postMessage(`info string ${prefix}: ${text}`);
}

function flushPending() {
    if (!engine || typeof engine.uci !== "function" || pendingCommands.length === 0) {
        return;
    }
    while (pendingCommands.length > 0) {
        const command = pendingCommands.shift();
        try {
            engine.uci(command);
        } catch (error) {
            reportEngineError("stockfish18 command failed", error);
        }
    }
}

function ensureEngineReady() {
    if (engine) {
        return Promise.resolve(engine);
    }
    if (initPromise) {
        return initPromise;
    }

    initPromise = Sf18Web({
        listen: (line) => {
            postMessage(String(line || ""));
        },
        onError: (line) => {
            postMessage(`info string ${String(line || "")}`);
        }
    }).then((instance) => {
        engine = instance;
        flushPending();
        return engine;
    }).catch((error) => {
        reportEngineError("stockfish18 init failed", error);
        throw error;
    });

    return initPromise;
}

self.onmessage = (event) => {
    const command = String(event && event.data ? event.data : "").trim();
    if (!command) {
        return;
    }

    if (engine && typeof engine.uci === "function") {
        try {
            engine.uci(command);
        } catch (error) {
            reportEngineError("stockfish18 command failed", error);
        }
        return;
    }

    pendingCommands.push(command);
    ensureEngineReady().catch(() => {
        // Error already reported through info string.
    });
};

ensureEngineReady().catch(() => {
    // Error already reported through info string.
});
