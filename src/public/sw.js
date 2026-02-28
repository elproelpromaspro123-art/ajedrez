const CACHE_NAME = "ajedrez-lab-v2";

const APP_SHELL = [
    "/",
    "/static/pages/404.html",
    "/static/manifest.json",
    "/static/media/icon-192.png",
    "/static/media/icon-512.png",
    "/static/media/og-cover-1200x630.png",
    "/static/scripts/stockfish.js",
    "/static/media/favicon-freechess.ico"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(event.request).catch(
                () =>
                    new Response(JSON.stringify({ message: "Sin conexion." }), {
                        status: 503,
                        headers: { "Content-Type": "application/json" }
                    })
            )
        );
        return;
    }

    event.respondWith(
        caches
            .match(event.request, { ignoreSearch: true })
            .then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (!response || response.status !== 200 || response.type === "opaque") {
                        return response;
                    }
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                });
            })
            .catch(() => caches.match("/", { ignoreSearch: true }))
    );
});
