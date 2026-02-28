(function registerServiceWorker(global) {
    if (!global || !("serviceWorker" in global.navigator)) {
        return;
    }

    global.navigator.serviceWorker.register("/static/sw.js").catch(() => {
        // Ignore SW registration errors to keep app boot resilient.
    });
})(typeof window !== "undefined" ? window : globalThis);
