export const AI_ACTION_WHITELIST = [
    "hint",
    "undo",
    "new_game",
    "analyze",
    "study",
    "flip",
    "open_study",
    "load_line"
] as const;

export type AIActionType = typeof AI_ACTION_WHITELIST[number];

export interface AIAction {
    type: AIActionType;
    label?: string;
    argument?: string;
}

export interface ParsedAIStructuredResponse {
    text: string;
    actions: AIAction[];
}

function parseJsonLoose(raw: string): unknown {
    const text = String(raw || "").trim();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        const fenced = text.match(/```json\s*([\s\S]*?)```/i);
        if (!fenced || !fenced[1]) {
            return null;
        }

        try {
            return JSON.parse(fenced[1]);
        } catch {
            return null;
        }
    }
}

function isActionType(value: string): value is AIActionType {
    return (AI_ACTION_WHITELIST as readonly string[]).includes(value);
}

export function sanitizeAIActions(actions: unknown): AIAction[] {
    if (!Array.isArray(actions)) {
        return [];
    }

    const safe: AIAction[] = [];

    for (const action of actions) {
        if (!action || typeof action !== "object") {
            continue;
        }

        const type = String((action as any).type || "").trim().toLowerCase();
        if (!isActionType(type)) {
            continue;
        }

        safe.push({
            type,
            label: String((action as any).label || "").trim().slice(0, 60),
            argument: String((action as any).argument || "").trim().slice(0, 120)
        });
    }

    return safe;
}

export function parseStructuredAIResponse(raw: string): ParsedAIStructuredResponse {
    const parsed = parseJsonLoose(raw);
    if (!parsed || typeof parsed !== "object") {
        return {
            text: String(raw || "").trim(),
            actions: []
        };
    }

    const parsedObj = parsed as Record<string, unknown>;
    const text = String(parsedObj.text || parsedObj.message || "").trim();

    return {
        text,
        actions: sanitizeAIActions(parsedObj.actions)
    };
}
