import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import analyse from "../lib/analysis";
import { parseStructuredAIResponse } from "../lib/aiActions";
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
    console.log("Running opening detection + AI action parsing unit tests...");

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

    console.log("Opening detection + AI action parsing unit tests passed.");
}

main();
