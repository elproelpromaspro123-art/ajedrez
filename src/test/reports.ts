import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import analyse from "../lib/analysis";
import { parseStructuredAIResponse } from "../lib/aiActions";
import {
    buildExplorerCacheKey,
    getFreshTimedCacheValue,
    parseExplorerMoves,
    sanitizeExplorerFen,
    sanitizeExplorerRatings,
    sanitizeExplorerSpeeds,
    setTimedCacheValue,
    TimedCacheEntry
} from "../lib/openingExplorer";
import { detectOpeningBestPrefix, detectOpeningFromBook, OpeningBookEntry } from "../lib/openingDetection";
import { EvaluatedPosition } from "../lib/types/Position";
import Report from "../lib/types/Report";
import evaluations from "./evaluations.json";

const reports: Report[] = [];

async function main() {

    console.log("Running report generation test...");

    let before = Date.now();

    if (!existsSync("src/test/reports")) {
        mkdirSync("src/test/reports");
    }

    if (existsSync("src/test/reports/failed.json")) {
        rmSync("src/test/reports/failed.json");
    }

    let gameIndex = 0;
    for (let game of evaluations) {
        gameIndex++;
        try {
            let report = await analyse(game as EvaluatedPosition[]);

            reports.push(report);
            writeFileSync(`src/test/reports/report${gameIndex}.json`, JSON.stringify({
                players: {
                    white: {
                        username: "White Player",
                        rating: "0"
                    },
                    black: {
                        username: "Black Player",
                        rating: "0"
                    }
                },
                results: report
            }));

            console.log(`Generated report from game ${gameIndex}...`);
        } catch (err) {
            console.log(`Report generation from game ${gameIndex} failed.`);
            console.log(`Failed evaluations written to failed${gameIndex}.json`);
            console.log(err);

            writeFileSync(`src/test/reports/failed${gameIndex}.json`, JSON.stringify(game));
        }
    }

    let elapsedTime = ((Date.now() - before) / 1000).toFixed(2);
    console.log(`Report generation test completed successfully. (${elapsedTime}s)`);

    runFrontendLogicUnitTests();

}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function runFrontendLogicUnitTests() {
    console.log("Running opening detection + AI action parsing + explorer sanitization unit tests...");

    const book: OpeningBookEntry[] = [
        { name: "Apertura Italiana", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
        { name: "Defensa Siciliana", moves: ["e4", "c5"] },
        { name: "Ruy Lopez", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] }
    ];

    const exact = detectOpeningFromBook(book, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]);
    assert(exact === "Apertura Italiana", "detectOpeningFromBook should match exact best line.");

    const prefix = detectOpeningBestPrefix(book, ["e4", "c5", "Nf3", "d6"]);
    assert(prefix === "Defensa Siciliana", "detectOpeningBestPrefix should match the best available prefix.");

    const parsed = parseStructuredAIResponse(JSON.stringify({
        text: "Juega activo en el centro.",
        actions: [
            { type: "hint", label: "Pedir pista" },
            { type: "study", argument: "Defensa Siciliana" },
            { type: "drop_database", argument: "x" }
        ]
    }));

    assert(parsed.text.includes("centro"), "AI parser should keep structured text.");
    assert(parsed.actions.length === 2, "AI parser should keep only whitelisted actions.");
    assert(parsed.actions[0].type === "hint", "First action should be hint.");
    assert(parsed.actions[1].type === "study", "Second action should be study.");

    assert(sanitizeExplorerFen(undefined) === "startpos", "Explorer FEN should default to startpos.");
    assert(sanitizeExplorerFen("invalid-fen") === null, "Invalid FEN must be rejected.");
    assert(sanitizeExplorerFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") !== null, "Valid FEN must be accepted.");

    assert(parseExplorerMoves("16") === 16, "Explorer moves should parse valid values.");
    assert(parseExplorerMoves("0") === null, "Explorer moves should reject out of range values.");
    assert(parseExplorerMoves(undefined) === 16, "Explorer moves should fallback to default.");

    const safeSpeeds = sanitizeExplorerSpeeds("rapid,blitz,invalid,speed");
    assert(Array.isArray(safeSpeeds) && safeSpeeds.join(",") === "rapid,blitz", "Explorer speeds should keep only allowlisted values.");
    const fallbackSpeeds = sanitizeExplorerSpeeds("invalid");
    assert(Array.isArray(fallbackSpeeds) && fallbackSpeeds.join(",") === "rapid,blitz,classical", "Explorer speeds should fallback when none are valid.");

    const safeRatings = sanitizeExplorerRatings("1600,2000,9000");
    assert(Array.isArray(safeRatings) && safeRatings.join(",") === "1600,2000", "Explorer ratings should keep only allowlisted values.");
    const fallbackRatings = sanitizeExplorerRatings("9999");
    assert(Array.isArray(fallbackRatings) && fallbackRatings.join(",") === "1600,1800,2000", "Explorer ratings should fallback when none are valid.");

    const cache = new Map<string, TimedCacheEntry<{ score: number }>>();
    const cacheKey = buildExplorerCacheKey(
        "startpos",
        16,
        ["rapid", "blitz"],
        ["1600", "1800"]
    );
    setTimedCacheValue(cache, cacheKey, { score: 1 }, {
        ttlMs: 1000,
        maxEntries: 2,
        now: 10
    });
    const fresh = getFreshTimedCacheValue(cache, cacheKey, 1000, 20);
    assert(Boolean(fresh && fresh.score === 1), "Explorer cache should return fresh values.");

    setTimedCacheValue(cache, "k2", { score: 2 }, {
        ttlMs: 1000,
        maxEntries: 2,
        now: 30
    });
    setTimedCacheValue(cache, "k3", { score: 3 }, {
        ttlMs: 1000,
        maxEntries: 2,
        now: 40
    });
    assert(!cache.has(cacheKey), "Explorer cache should evict the oldest key when over capacity.");

    const expired = getFreshTimedCacheValue(cache, "k2", 5, 100);
    assert(expired === null, "Explorer cache should drop expired entries.");

    console.log("Opening detection + AI action parsing + explorer sanitization unit tests passed.");
}

main();
