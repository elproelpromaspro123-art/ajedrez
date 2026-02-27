import { writeFileSync, mkdirSync, existsSync, rmSync, mkdtempSync } from "fs";
import path from "path";
import { tmpdir } from "os";
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
import app from "../index";

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
    await runApiIntegrationTests();

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
        { name: "Ruy Lopez", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] },
        { name: "Apertura Saragossa", moves: ["c3"] }
    ];

    const exact = detectOpeningFromBook(book, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]);
    assert(exact === "Apertura Italiana", "detectOpeningFromBook should match exact best line.");

    const prefix = detectOpeningBestPrefix(book, ["e4", "c5", "Nf3", "d6"]);
    assert(prefix === "Defensa Siciliana", "detectOpeningBestPrefix should match the best available prefix.");

    const annotationAware = detectOpeningFromBook(book, ["e4", "e5", "Nf3", "Nc6", "Bb5+", "a6"]);
    assert(annotationAware === "Ruy Lopez", "detectOpeningFromBook should normalize SAN checks/annotations.");

    const fallbackOneMove = detectOpeningFromBook(book, ["c3", "e5", "d4"]);
    assert(fallbackOneMove === "Apertura Saragossa", "detectOpeningFromBook should allow single-move fallback openings.");

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
    assert(safeSpeeds === null, "Explorer speeds should reject payloads with unknown tokens.");
    const fallbackSpeeds = sanitizeExplorerSpeeds("invalid");
    assert(fallbackSpeeds === null, "Explorer speeds should reject fully invalid payloads.");
    const defaultSpeeds = sanitizeExplorerSpeeds(undefined);
    assert(Array.isArray(defaultSpeeds) && defaultSpeeds.join(",") === "rapid,blitz,classical", "Explorer speeds should fallback only when omitted.");

    const safeRatings = sanitizeExplorerRatings("1600,2000,9000");
    assert(safeRatings === null, "Explorer ratings should reject payloads with unknown tokens.");
    const fallbackRatings = sanitizeExplorerRatings("9999");
    assert(fallbackRatings === null, "Explorer ratings should reject fully invalid payloads.");
    const defaultRatings = sanitizeExplorerRatings(undefined);
    assert(Array.isArray(defaultRatings) && defaultRatings.join(",") === "1600,1800,2000", "Explorer ratings should fallback only when omitted.");

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

async function runApiIntegrationTests() {
    console.log("Running API integration smoke tests...");

    const previousDatabaseEnv = process.env.DATA_BASE;
    const tempFolder = mkdtempSync(path.join(tmpdir(), "freechess-api-test-"));
    const tempDatabasePath = path.join(tempFolder, "database.json");
    process.env.DATA_BASE = tempDatabasePath;

    const server = app.listen(0);

    try {
        await new Promise<void>((resolve, reject) => {
            server.once("error", reject);
            server.once("listening", resolve);
        });

        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("Could not resolve API test server address.");
        }
        const baseUrl = `http://127.0.0.1:${address.port}`;
        let authCookie = "";

        const captureAuthCookie = (response: Response) => {
            const anyHeaders = response.headers as unknown as { getSetCookie?: () => string[] };
            const setCookies = typeof anyHeaders.getSetCookie === "function"
                ? anyHeaders.getSetCookie()
                : [];
            if (Array.isArray(setCookies) && setCookies[0]) {
                authCookie = String(setCookies[0]).split(";")[0];
                return;
            }

            const fallback = response.headers.get("set-cookie");
            if (fallback) {
                authCookie = String(fallback).split(";")[0];
            }
        };

        const withAuthHeaders = (base: Record<string, string> = {}) => {
            if (!authCookie) {
                return base;
            }
            return {
                ...base,
                Cookie: authCookie
            };
        };

        let response = await fetch(`${baseUrl}/healthz`);
        assert(response.status === 200, "Health endpoint should return 200.");

        response = await fetch(`${baseUrl}/api/parse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: "{\"pgn\":"
        });
        assert(response.status === 400, "Invalid JSON body should return 400.");

        response = await fetch(`${baseUrl}/api/parse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pgn: "1. e9"
            })
        });
        assert(response.status === 400, "Invalid PGN should return 400.");

        response = await fetch(`${baseUrl}/api/parse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pgn: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0"
            })
        });
        assert(response.status === 200, "Valid PGN should return 200.");
        const parsePayload = await response.json() as { positions?: unknown[] };
        assert(Array.isArray(parsePayload.positions) && parsePayload.positions.length >= 2, "Parse endpoint should return positions.");

        const oversizedPgn = "1. e4 e5 ".repeat(20_000);
        response = await fetch(`${baseUrl}/api/parse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pgn: oversizedPgn
            })
        });
        assert(response.status === 413, "Oversized PGN should return 413.");

        response = await fetch(`${baseUrl}/api/opening-explorer?fen=not-a-fen`);
        assert(response.status === 400, "Invalid explorer FEN should return 400.");

        response = await fetch(`${baseUrl}/api/opening-explorer?moves=999`);
        assert(response.status === 400, "Invalid explorer moves should return 400.");

        response = await fetch(`${baseUrl}/api/opening-explorer?speeds=rapid,unknown`);
        assert(response.status === 400, "Invalid explorer speeds should return 400.");

        response = await fetch(`${baseUrl}/api/opening-explorer?ratings=1600,9999`);
        assert(response.status === 400, "Invalid explorer ratings should return 400.");

        response = await fetch(`${baseUrl}/api/profile-store`);
        assert(response.status === 401, "Profile store read should require authentication.");

        response = await fetch(`${baseUrl}/api/profile-store/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                progress: {
                    games: [{ at: "2026-02-25T00:00:00.000Z", accuracy: 88.5 }]
                }
            })
        });
        assert(response.status === 401, "Profile store sync should require authentication.");

        response = await fetch(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: "test_user",
                password: "segura123"
            })
        });
        assert(response.status === 201, "Auth register should return 201.");
        captureAuthCookie(response);
        const registerPayload = await response.json() as { warning?: string };
        assert(Boolean(registerPayload.warning), "Auth register should include no-recovery warning.");
        assert(Boolean(authCookie), "Auth register should return session cookie.");

        response = await fetch(`${baseUrl}/api/auth/session`, {
            headers: withAuthHeaders()
        });
        assert(response.status === 200, "Auth session should return 200.");
        const sessionPayload = await response.json() as { authenticated?: boolean };
        assert(sessionPayload.authenticated === true, "Auth session should report authenticated.");

        response = await fetch(`${baseUrl}/api/profile-store/sync`, {
            method: "POST",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({})
        });
        assert(response.status === 400, "Empty profile sync payload should return 400.");

        response = await fetch(`${baseUrl}/api/profile-store/sync`, {
            method: "POST",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                profile: {
                    note: "x".repeat(860_000)
                }
            })
        });
        assert(response.status === 413, "Oversized profile sync payload should return 413.");

        response = await fetch(`${baseUrl}/api/profile-store/sync`, {
            method: "POST",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                progress: {
                    games: [{ at: "2026-02-25T00:00:00.000Z", accuracy: 88.5 }]
                },
                lessons: {
                    progressByLesson: { opening_principles: { score: 3 } }
                }
            })
        });
        assert(response.status === 200, "Valid profile sync payload should return 200.");

        response = await fetch(`${baseUrl}/api/profile-store`, {
            headers: withAuthHeaders()
        });
        assert(response.status === 200, "Profile store read should return 200.");
        const storePayload = await response.json() as { data?: Record<string, unknown> };
        assert(Boolean(storePayload.data && typeof storePayload.data === "object"), "Profile store response should include data object.");
        const progress = storePayload.data?.progress as { games?: unknown[] } | undefined;
        assert(Boolean(progress && Array.isArray(progress.games) && progress.games.length === 1), "Profile store should persist synced games.");

        response = await fetch(`${baseUrl}/api/auth/logout`, {
            method: "POST",
            headers: withAuthHeaders()
        });
        assert(response.status === 200, "Auth logout should return 200.");
        authCookie = "";

        console.log("API integration smoke tests passed.");
    } finally {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });

        if (typeof previousDatabaseEnv === "string") {
            process.env.DATA_BASE = previousDatabaseEnv;
        } else {
            delete process.env.DATA_BASE;
        }

        rmSync(tempFolder, { recursive: true, force: true });
    }
}

main();
