export interface OpeningBookEntry {
    name: string;
    moves: string[];
}

export function detectOpeningFromBook(book: OpeningBookEntry[], history: string[]): string | null {
    const sorted = book.slice().sort((a, b) => b.moves.length - a.moves.length);

    for (const opening of sorted) {
        if (opening.moves.length > history.length) {
            continue;
        }

        let match = true;
        for (let i = 0; i < opening.moves.length; i += 1) {
            if (opening.moves[i] !== history[i]) {
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
    let best: { name: string; len: number } | null = null;

    for (const opening of book) {
        const max = Math.min(opening.moves.length, history.length);
        let matched = 0;

        while (matched < max && opening.moves[matched] === history[matched]) {
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
