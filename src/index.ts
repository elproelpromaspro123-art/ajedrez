import express, { ErrorRequestHandler } from "express";
import fs from "fs";
import path from "path";
import compression from "compression";
import dotenv from "dotenv";
dotenv.config();

import apiRouter from "./api";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(compression());

const distPublicDir = path.resolve("dist/public");
const srcPublicDir = path.resolve("src/public");
const publicDir = fs.existsSync(distPublicDir) ? distPublicDir : srcPublicDir;
const reportIndexPath = path.join(publicDir, "pages/report/index.html");
const notFoundPagePath = path.join(publicDir, "pages/404.html");

let cachedIndexTemplate: string | null = null;

function resolvePublicOrigin(req: express.Request): string {
    const configuredOrigin = String(process.env.PUBLIC_BASE_URL || "").trim();
    if (configuredOrigin) {
        return configuredOrigin.replace(/\/+$/, "");
    }

    const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
        .split(",")[0]
        .trim();
    const protocol = forwardedProto || req.protocol || "https";
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    return host ? `${protocol}://${host}` : `${protocol}://localhost:${process.env.PORT || "3000"}`;
}

function getIndexTemplate(): string {
    if (cachedIndexTemplate != null) {
        return cachedIndexTemplate;
    }

    cachedIndexTemplate = fs.readFileSync(reportIndexPath, "utf8");
    return cachedIndexTemplate;
}

function renderIndexHtml(req: express.Request): string {
    const origin = resolvePublicOrigin(req);
    return getIndexTemplate()
        .replace(/__OG_URL__/g, `${origin}/`)
        .replace(/__OG_IMAGE__/g, `${origin}/static/media/og-cover-1200x630.png`);
}

app.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", [
        "default-src 'self'",
        "script-src 'self' blob: 'wasm-unsafe-eval' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self' https://api.groq.com https://explorer.lichess.ovh",
        "media-src 'self'",
        "worker-src 'self' blob:",
        "frame-src 'none'",
        "manifest-src 'self'"
    ].join("; "));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use("/static",
    express.static(publicDir, {
        etag: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith(".html")) {
                res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
                res.setHeader("Pragma", "no-cache");
                res.setHeader("Expires", "0");
            } else {
                res.setHeader("Cache-Control", "public, max-age=86400");
            }
        }
    })
);

app.use("/api", apiRouter);
app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found." });
});

app.get("/", async (req, res) => {
    res.status(200).type("html").send(renderIndexHtml(req));
});

app.get("/healthz", (_req, res) => {
    res.json({
        ok: true,
        uptimeSeconds: Math.floor(process.uptime()),
        now: new Date().toISOString()
    });
});

const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({ message: "Invalid JSON body." });
    }
    return next(err);
};

app.use(jsonErrorHandler);

app.use((_req, res) => {
    if (fs.existsSync(notFoundPagePath)) {
        res.status(404).sendFile(notFoundPagePath);
        return;
    }

    res.status(404).type("html").send("<!doctype html><html><body><h1>404</h1><p>Ruta no encontrada.</p></body></html>");
});

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}.`);
    });
}

export default app;
