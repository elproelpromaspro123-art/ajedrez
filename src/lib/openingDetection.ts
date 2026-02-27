export interface OpeningBookEntry {
    name: string;
    moves: string[];
}

function normalizeSanForBookMove(move: string): string {
    return String(move || "")
        .trim()
        .replace(/[!?]+/g, "")
        .replace(/[+#]+$/g, "")
        .replace(/\s+/g, "");
}

function normalizeMoveLine(moves: string[]): string[] {
    return Array.isArray(moves)
        ? moves.map((move) => normalizeSanForBookMove(move))
        : [];
}

export function detectOpeningFromBook(book: OpeningBookEntry[], history: string[]): string | null {
    const sorted = book.slice().sort((a, b) => b.moves.length - a.moves.length);
    const normalizedHistory = normalizeMoveLine(history);

    for (const opening of sorted) {
        const normalizedMoves = normalizeMoveLine(opening.moves);
        if (normalizedMoves.length > normalizedHistory.length) {
            continue;
        }

        let match = true;
        for (let i = 0; i < normalizedMoves.length; i += 1) {
            if (normalizedMoves[i] !== normalizedHistory[i]) {
                match = false;
                break;
            }
        }

        if (match) {
            return opening.name;
        }
    }

    return null;
}

export function detectOpeningBestPrefix(book: OpeningBookEntry[], history: string[]): string | null {
    const normalizedHistory = normalizeMoveLine(history);
    let best: { name: string; len: number } | null = null;

    for (const opening of book) {
        const normalizedMoves = normalizeMoveLine(opening.moves);
        const max = Math.min(normalizedMoves.length, normalizedHistory.length);
        let matched = 0;

        while (matched < max && normalizedMoves[matched] === normalizedHistory[matched]) {
            matched += 1;
        }

        if (!best || matched > best.len) {
            best = { name: opening.name, len: matched };
        }
    }

    if (!best || best.len < 2) {
        return null;
    }

    return best.name;
}
