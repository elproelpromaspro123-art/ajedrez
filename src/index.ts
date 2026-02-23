import express from "express";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import apiRouter from "./api";

const app = express();

app.use(express.json());

app.use("/static",
    express.static(path.resolve("src/public"), {
        etag: false,
        maxAge: 0,
        setHeaders: (res) => {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
        }
    })
);

app.use("/api", apiRouter);

app.get("/", async (req, res) => {
    res.sendFile(path.resolve("src/public/pages/report/index.html"));
});

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}.`);
    });
}

export default app;
