import express, { ErrorRequestHandler } from "express";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import apiRouter from "./api";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

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
        "frame-src 'none'"
    ].join("; "));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use("/static",
    express.static(path.resolve("src/public"), {
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

app.get("/", async (req, res) => {
    res.sendFile(path.resolve("src/public/pages/report/index.html"));
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

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}.`);
    });
}

export default app;
