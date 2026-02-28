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

function buildQueryTokenGroups(rawQuery) {
    const normalized = normalizeSearchText(rawQuery);
    if (!normalized) {
        return {
            full: "",
            groups: []
        };
    }

    const tokens = normalized.split(" ").filter(Boolean).slice(0, 8);
    const groups = tokens.map((token) => {
        const candidates = new Set([token]);
        const alias = self.EXPLORER_QUERY_ALIASES[token];
        if (alias) {
            const aliasNorm = normalizeSearchText(alias);
            if (aliasNorm) {
                candidates.add(aliasNorm);
                aliasNorm.split(" ").forEach((part) => {
                    if (part) {
                        candidates.add(part);
                    }
                });
            }
        }
        if (token === "defensa") {
            candidates.add("defense");
            candidates.add("defence");
        }
        if (token === "defense" || token === "defence") {
            candidates.add("defensa");
            candidates.add("defense");
            candidates.add("defence");
        }
        return Array.from(candidates).filter(Boolean);
    });

    return {
        full: normalized,
        groups
    };
}

function matchesExplorerQuery(haystack, matcher) {
    if (!matcher || !matcher.full) {
        return true;
    }
    if (haystack.includes(matcher.full)) {
        return true;
    }
    if (!Array.isArray(matcher.groups) || matcher.groups.length === 0) {
        return true;
    }
    return matcher.groups.every((group) => {
        if (!Array.isArray(group) || group.length === 0) {
            return true;
        }
        return group.some((needle) => haystack.includes(needle));
    });
}

function matchesPopularityTier(popularity, tier) {
    const value = Number(popularity || 0);
    const normalizedTier = String(tier || "all").toLowerCase();
    if (normalizedTier === "high") {
        return value >= 14;
    }
    if (normalizedTier === "medium") {
        return value >= 6 && value < 14;
    }
    if (normalizedTier === "low") {
        return value < 6;
    }
    return true;
}

function matchesSuccessTier(success, tier) {
    const value = Number(success || 0);
    const normalizedTier = String(tier || "all").toLowerCase();
    if (normalizedTier === "favorable") {
        return value >= 56;
    }
    if (normalizedTier === "balanced") {
        return value >= 45 && value < 56;
    }
    if (normalizedTier === "risky") {
        return value < 45;
    }
    return true;
}

self.onmessage = function onWorkerMessage(event) {
    const data = event.data || {};
    const id = data.id;
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const filters = data.filters || {};

    const minPopularity = Number(filters.minPopularity || 0);
    const minSuccess = Number(filters.minSuccess || 0);
    const popularityTier = String(filters.frequencyTier || "all").toLowerCase();
    const successTier = String(filters.resultTier || "all").toLowerCase();
    const queryMatcher = buildQueryTokenGroups(filters.query || "");

    const filtered = rows
        .filter((row) => {
            if (!row) return false;
            if (Number(row.popularity || 0) < minPopularity) return false;
            if (Number(row.success || 0) < minSuccess) return false;
            if (!matchesPopularityTier(row.popularity, popularityTier)) return false;
            if (!matchesSuccessTier(row.success, successTier)) return false;

            const haystack = normalizeSearchText(`${row.eco || ""} ${row.name || ""} ${row.line || ""}`);
            return matchesExplorerQuery(haystack, queryMatcher);
        })
        .sort((a, b) => {
            if (Number(b.popularity || 0) !== Number(a.popularity || 0)) {
                return Number(b.popularity || 0) - Number(a.popularity || 0);
            }
            return Number(b.success || 0) - Number(a.success || 0);
        });

    self.postMessage({ id, result: filtered });
};
