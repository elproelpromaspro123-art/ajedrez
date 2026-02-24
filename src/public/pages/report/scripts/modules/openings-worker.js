self.onmessage = function onWorkerMessage(event) {
    const data = event.data || {};
    const id = data.id;
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const filters = data.filters || {};

    const minPopularity = Number(filters.minPopularity || 0);
    const minSuccess = Number(filters.minSuccess || 0);
    const query = String(filters.query || "").toLowerCase().trim();

    const filtered = rows
        .filter((row) => {
            if (!row) return false;
            if (Number(row.popularity || 0) < minPopularity) return false;
            if (Number(row.success || 0) < minSuccess) return false;
            if (!query) return true;

            const haystack = `${row.eco || ""} ${row.name || ""} ${row.line || ""}`.toLowerCase();
            return haystack.includes(query);
        })
        .sort((a, b) => {
            if (Number(b.popularity || 0) !== Number(a.popularity || 0)) {
                return Number(b.popularity || 0) - Number(a.popularity || 0);
            }
            return Number(b.success || 0) - Number(a.success || 0);
        });

    self.postMessage({ id, result: filtered });
};
