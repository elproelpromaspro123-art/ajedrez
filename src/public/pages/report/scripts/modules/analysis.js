(function initAnalysisModule(global) {
    const PROGRESS_KEY = "ajedrez_progress_v1";

    const SCORE_MAP = {
        brilliant: 1,
        great: 1,
        best: 1,
        excellent: 0.9,
        good: 0.65,
        book: 1,
        forced: 1,
        inaccuracy: 0.4,
        mistake: 0.2,
        blunder: 0
    };

    function loadProgress() {
        try {
            const raw = localStorage.getItem(PROGRESS_KEY);
            if (!raw) return { games: [], activities: [] };
            const parsed = JSON.parse(raw);
            const games = Array.isArray(parsed.games) ? parsed.games : [];
            const activities = Array.isArray(parsed.activities) ? parsed.activities : [];
            return { games, activities };
        } catch {
            return { games: [], activities: [] };
        }
    }

    function saveProgress(progress) {
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify({
                games: Array.isArray(progress.games) ? progress.games.slice(-400) : [],
                activities: Array.isArray(progress.activities) ? progress.activities.slice(-1200) : []
            }));
        } catch {
            // ignore storage failures
        }
    }

    function computePlayerAccuracy(moveClassifications, playerColor) {
        const isWhite = playerColor === "white";
        const entries = Object.entries(moveClassifications || {});

        let total = 0;
        let score = 0;
        for (const [indexText, cls] of entries) {
            const ply = Number(indexText);
            if (!Number.isFinite(ply)) continue;

            const playerMoved = isWhite ? (ply % 2 === 0) : (ply % 2 === 1);
            if (!playerMoved) continue;

            const value = SCORE_MAP[cls] ?? 0.5;
            score += value;
            total += 1;
        }

        if (total === 0) return 0;
        return (score / total) * 100;
    }

    function startOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = (day + 6) % 7;
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - diff);
        return d;
    }

    function weekLabel(date) {
        const d = startOfWeek(date);
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${d.getFullYear()}-${month}-${day}`;
    }

    function computeStudyStreak(activities) {
        if (!Array.isArray(activities) || activities.length === 0) return 0;

        const daySet = new Set(activities.map((a) => String(a.at || "").slice(0, 10)).filter(Boolean));
        let streak = 0;
        const cursor = new Date();
        cursor.setHours(0, 0, 0, 0);

        while (true) {
            const day = cursor.toISOString().slice(0, 10);
            if (!daySet.has(day)) break;
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        }

        return streak;
    }

    function summarize(progress) {
        const games = Array.isArray(progress.games) ? progress.games : [];
        const activities = Array.isArray(progress.activities) ? progress.activities : [];

        const weeklyMap = new Map();
        const openingMap = new Map();
        const errorsMap = new Map([["inaccuracy", 0], ["mistake", 0], ["blunder", 0]]);

        games.forEach((game) => {
            if (!game) return;

            const label = weekLabel(game.at || new Date().toISOString());
            const bucket = weeklyMap.get(label) || { total: 0, count: 0 };
            bucket.total += Number(game.accuracy || 0);
            bucket.count += 1;
            weeklyMap.set(label, bucket);

            const opening = String(game.opening || "Sin apertura detectada");
            openingMap.set(opening, (openingMap.get(opening) || 0) + 1);

            const errors = game.errors || {};
            errorsMap.set("inaccuracy", (errorsMap.get("inaccuracy") || 0) + Number(errors.inaccuracy || 0));
            errorsMap.set("mistake", (errorsMap.get("mistake") || 0) + Number(errors.mistake || 0));
            errorsMap.set("blunder", (errorsMap.get("blunder") || 0) + Number(errors.blunder || 0));
        });

        const weekly = Array.from(weeklyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-8)
            .map(([label, bucket]) => ({
                label,
                accuracy: bucket.count > 0 ? bucket.total / bucket.count : 0
            }));

        const topOpenings = Array.from(openingMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const commonErrors = Array.from(errorsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({ type, count }));

        return {
            gamesCount: games.length,
            studyStreakDays: computeStudyStreak(activities),
            weekly,
            topOpenings,
            commonErrors
        };
    }

    function registerActivity(type, payload) {
        const progress = loadProgress();
        progress.activities.push({
            at: new Date().toISOString(),
            type: String(type || "activity"),
            payload: payload || null
        });
        saveProgress(progress);
        return summarize(progress);
    }

    function registerFinishedGame(gameSummary) {
        const progress = loadProgress();
        progress.games.push({
            ...gameSummary,
            at: new Date().toISOString()
        });
        progress.activities.push({
            at: new Date().toISOString(),
            type: "game",
            payload: {
                opening: gameSummary.opening || "",
                result: gameSummary.result || ""
            }
        });
        saveProgress(progress);
        return summarize(progress);
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.analysis = {
        SCORE_MAP,
        loadProgress,
        saveProgress,
        computePlayerAccuracy,
        summarize,
        registerActivity,
        registerFinishedGame
    };
})(window);
