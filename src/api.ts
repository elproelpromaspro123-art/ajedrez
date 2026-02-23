import { Router } from "express";
import { Chess } from "chess.js";
import pgnParser from "pgn-parser";

import analyse from "./lib/analysis";
import { Position } from "./lib/types/Position";
import { AIChatRequestBody, ParseRequestBody, ReportRequestBody } from "./lib/types/RequestBody";

const router = Router();
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqChatCompletionResponse {
    choices?: Array<{
        message?: {
            content?: string
        }
    }>,
    error?: {
        message?: string
    }
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value == "string" && value.trim().length > 0;
}

function clampText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return value.slice(0, maxLength);
}

async function requestGroqChatCompletion(systemPrompt: string, question: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY_MISSING");
    }

    const model = process.env.GROQ_MODEL || "groq/compound";

    const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question }
            ],
            temperature: 0.3,
            max_completion_tokens: 800,
            top_p: 0.9
        })
    });

    const rawPayload = await response.text();

    let payload: GroqChatCompletionResponse = {};
    try {
        payload = JSON.parse(rawPayload) as GroqChatCompletionResponse;
    } catch {}

    if (!response.ok) {
        const providerMessage = payload.error?.message;
        throw new Error(providerMessage || `AI provider request failed (${response.status}).`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!isNonEmptyString(content)) {
        throw new Error("AI provider returned an empty response.");
    }

    return content.trim();
}

router.post("/parse", async (req, res) => {

    let { pgn }: ParseRequestBody = req.body || {};
    
    if (!isNonEmptyString(pgn)) {
        return res.status(400).json({ message: "Enter a PGN to analyse." });
    }

    pgn = pgn.trim();

    // Accept PGNs that do not explicitly include a result marker.
    if (!/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(pgn)) {
        pgn += " *";
    }

    // Parse PGN into object
    let parsedPGN;
    try {
        [ parsedPGN ] = pgnParser.parse(pgn);

        if (!parsedPGN) {
            return res.status(400).json({ message: "Enter a PGN to analyse." });
        }
    } catch {
        return res.status(400).json({ message: "Invalid PGN format." });
    }

    // Create a virtual board
    const board = new Chess();
    const positions: Position[] = [];

    positions.push({ fen: board.fen() });

    // Add each move to the board; log FEN and SAN
    for (const pgnMove of parsedPGN.moves) {
        const moveSAN = pgnMove.move;
        if (!isNonEmptyString(moveSAN)) {
            return res.status(400).json({ message: "PGN contains invalid moves." });
        }

        let virtualBoardMove;
        try {
            virtualBoardMove = board.move(moveSAN);
        } catch {
            return res.status(400).json({ message: "PGN contains illegal moves." });
        }

        if (!virtualBoardMove) {
            return res.status(400).json({ message: "PGN contains illegal moves." });
        }

        const moveUCI = `${virtualBoardMove.from}${virtualBoardMove.to}${virtualBoardMove.promotion || ""}`;

        positions.push({
            fen: board.fen(),
            move: {
                san: moveSAN,
                uci: moveUCI
            }
        });
    }

    res.json({ positions });

});

router.post("/report", async (req, res) => {

    const { positions }: ReportRequestBody = req.body || {};

    if (!Array.isArray(positions) || positions.length == 0) {
        return res.status(400).json({ message: "Missing parameters." });
    }

    // Generate report
    let results;
    try {
        results = await analyse(positions);
    } catch (err) {
        console.error("Report generation failed:", err);
        return res.status(500).json({ message: "Failed to generate report." });
    }

    res.json({ results });

});

router.post("/ai-chat", async (req, res) => {

    const { question, systemPrompt }: AIChatRequestBody = req.body || {};

    if (!isNonEmptyString(question)) {
        return res.status(400).json({ message: "Question is required." });
    }

    const safeQuestion = clampText(question.trim(), 1600);
    const safeSystemPrompt = isNonEmptyString(systemPrompt)
        ? clampText(systemPrompt.trim(), 4500)
        : "You are a concise chess assistant.";

    try {
        const content = await requestGroqChatCompletion(safeSystemPrompt, safeQuestion);
        return res.json({ content });
    } catch (err) {
        if (err instanceof Error && err.message == "GROQ_API_KEY_MISSING") {
            return res.status(503).json({ message: "AI assistant is not configured on the server." });
        }

        console.error("AI chat request failed:", err);
        return res.status(502).json({ message: "Failed to get a response from AI assistant." });
    }

});

export default router;
