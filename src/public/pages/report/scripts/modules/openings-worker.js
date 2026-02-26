self.EXPLORER_QUERY_ALIASES = {
    siciliana: "sicilian",
    francesa: "french",
    italiana: "italian",
    espanola: "ruy lopez",
    escocesa: "scotch",
    escandinava: "scandinavian",
    inglesa: "english",
    dama: "queen",
    rey: "king",
    india: "indian",
    defensa: "defense",
    gambito: "gambit",
    peon: "pawn",
    caballo: "knight",
    alfil: "bishop"
};

function normalizeSearchText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildQueryNeedles(rawQuery) {
    const normalized = normalizeSearchText(rawQuery);
    if (!normalized) return [];

    const needles = new Set([normalized]);
    Object.entries(self.EXPLORER_QUERY_ALIASES).forEach(([from, to]) => {
        const fromNorm = normalizeSearchText(from);
        if (!fromNorm || !normalized.includes(fromNorm)) {
            return;
        }
        needles.add(normalizeSearchText(normalized.replace(fromNorm, to)));
    });

    return Array.from(needles);
}

self.onmessage = function onWorkerMessage(event) {
    const data = event.data || {};
    const id = data.id;
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const filters = data.filters || {};

    const minPopularity = Number(filters.minPopularity || 0);
    const minSuccess = Number(filters.minSuccess || 0);
    const queryNeedles = buildQueryNeedles(filters.query || "");

    const filtered = rows
        .filter((row) => {
            if (!row) return false;
            if (Number(row.popularity || 0) < minPopularity) return false;
            if (Number(row.success || 0) < minSuccess) return false;
            if (queryNeedles.length === 0) return true;

            const haystack = normalizeSearchText(`${row.eco || ""} ${row.name || ""} ${row.line || ""}`);
            return queryNeedles.some((needle) => haystack.includes(needle));
        })
        .sort((a, b) => {
            if (Number(b.popularity || 0) !== Number(a.popularity || 0)) {
                return Number(b.popularity || 0) - Number(a.popularity || 0);
            }
            return Number(b.success || 0) - Number(a.success || 0);
        });

    self.postMessage({ id, result: filtered });
};
