import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { transform } from "esbuild";

const projectRoot = process.cwd();
const srcPublicDir = path.resolve(projectRoot, "src/public");
const distPublicDir = path.resolve(projectRoot, "dist/public");
const reportHtmlPath = path.join(distPublicDir, "pages/report/index.html");

function asPosixPath(value) {
    return value.split(path.sep).join("/");
}

async function copyStaticTree() {
    await fs.rm(distPublicDir, { recursive: true, force: true });
    await fs.cp(srcPublicDir, distPublicDir, { recursive: true });
}

function extractAssetUrls(html) {
    const urls = new Set();
    const regex = /<(script|link)\b[^>]+(?:src|href)="([^"]+)"/g;
    let match = regex.exec(html);
    while (match) {
        const url = match[2];
        if (/^\/static\//.test(url) && /\.(js|css)$/.test(url)) {
            urls.add(url);
        }
        match = regex.exec(html);
    }
    return Array.from(urls);
}

function buildHashedFileName(filePath, hash) {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    return `${base}.${hash}${ext}`;
}

function buildStaticUrl(relativePath) {
    const posixPath = asPosixPath(relativePath);
    return `/static/${posixPath}`;
}

async function minifyAsset(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const raw = await fs.readFile(filePath, "utf8");

    if (ext !== ".js" && ext !== ".css") {
        return raw;
    }

    try {
        const result = await transform(raw, {
            loader: ext === ".js" ? "js" : "css",
            minify: true,
            target: "es2018"
        });
        return result.code;
    } catch {
        return raw;
    }
}

async function fingerprintAndMinify(html) {
    const assetUrls = extractAssetUrls(html);
    const replacements = new Map();

    for (const url of assetUrls) {
        const relativePath = url.replace(/^\/static\//, "");
        const absolutePath = path.join(distPublicDir, relativePath);
        const minified = await minifyAsset(absolutePath);
        const hash = createHash("sha256").update(minified).digest("hex").slice(0, 10);

        const hashedFileName = buildHashedFileName(absolutePath, hash);
        const relativeDir = path.dirname(relativePath);
        const hashedRelativePath = relativeDir === "."
            ? hashedFileName
            : asPosixPath(path.join(relativeDir, hashedFileName));

        const hashedAbsolutePath = path.join(distPublicDir, hashedRelativePath);
        await fs.writeFile(hashedAbsolutePath, minified, "utf8");
        replacements.set(url, buildStaticUrl(hashedRelativePath));
    }

    let nextHtml = html;
    for (const [from, to] of replacements) {
        nextHtml = nextHtml.split(from).join(to);
    }

    return nextHtml;
}

async function run() {
    await copyStaticTree();

    const html = await fs.readFile(reportHtmlPath, "utf8");
    const fingerprintedHtml = await fingerprintAndMinify(html);
    await fs.writeFile(reportHtmlPath, fingerprintedHtml, "utf8");
}

run().catch((err) => {
    console.error("Static build failed:", err);
    process.exitCode = 1;
});
