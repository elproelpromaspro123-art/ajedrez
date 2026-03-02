(function initCoachReviewModule(global) {
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

    var CLASSIFICATION_TYPES = [
        "brilliant", "great", "best", "excellent", "good",
        "book", "forced", "inaccuracy", "mistake", "blunder"
    ];

    var MATERIAL_THRESHOLD = 6;
    var OPENING_PLY_LIMIT = 20;
    var ENDGAME_PLY_FALLBACK = 56;
    var EVAL_SWING_THRESHOLD = 150;
    var KEY_MOMENTS_LIMIT = 10;

    // ── Comment templates (Spanish) ─────────────────────────────────

    var COMMENT_TEMPLATES = {
        brilliant: [
            "🤩 ¡Jugada brillante con {san}! Una idea que ni el motor veía fácilmente. ¡Nivel de gran maestro!",
            "💎 ¡{san} es una auténtica joya! Encontraste un recurso táctico espectacular. ¡Impresionante!",
            "🌟 ¡Brillante! {san} demuestra una visión táctica increíble. {eval} ¡Sigue así, campeón!",
            "🔥 ¡{san} es pura magia sobre el tablero! Un golpe táctico que deja sin palabras. {eval}"
        ],
        great: [
            "👏 ¡Gran jugada con {san}! Encontraste la segunda mejor opción y mantuviste la ventaja. {eval}",
            "💪 ¡{san} es una jugada excelente! Demuestras buen ojo táctico. {eval}",
            "✨ ¡Muy bien jugado! {san} es una decisión fuerte que mejora tu posición. {eval}",
            "🎯 ¡{san} da en el clavo! Una jugada que muestra madurez posicional. {eval}"
        ],
        best: [
            "✅ ¡Perfecto! {san} es la mejor jugada en esta posición. {eval}",
            "🎯 ¡{san} es exactamente lo que había que jugar! Decisión impecable. {eval}",
            "💯 ¡La mejor! {san} demuestra un cálculo preciso. {eval}",
            "🏆 ¡{san} es la jugada del motor! Encontraste la respuesta óptima. {eval}"
        ],
        excellent: [
            "👍 ¡Excelente elección con {san}! Muy cerca de la perfección. {eval}",
            "⭐ ¡{san} es una jugada de alta calidad! Tu técnica es sólida. {eval}",
            "🌟 ¡Muy buena! {san} mantiene tu posición en óptimas condiciones. {eval}",
            "💪 ¡{san} demuestra gran comprensión posicional! Sigue con esa precisión. {eval}"
        ],
        good: [
            "👍 {san} es una jugada sólida. No es la mejor, pero mantiene bien la posición. {eval}",
            "🙂 ¡Bien jugado! {san} es razonable aunque había opciones un poco mejores. {eval}",
            "✔️ {san} está bien. Busca siempre considerar alternativas más activas. {eval}",
            "👌 {san} cumple su función. Intenta buscar jugadas más ambiciosas cuando puedas. {eval}"
        ],
        book: [
            "📖 {san} es teoría de apertura. ¡Vas por buen camino con tu preparación!",
            "📚 ¡Jugada de libro! {san} sigue la teoría establecida. ¡Buen conocimiento teórico!",
            "🎓 {san} es la jugada teórica aquí. Tu repertorio de aperturas se ve sólido.",
            "📖 ¡Perfecto! {san} es parte de la teoría conocida. ¡Dominas esta apertura!"
        ],
        forced: [
            "🔒 {san} era la única jugada razonable aquí. ¡Bien visto!",
            "⚡ No había mucho que pensar: {san} era obligada. ¡La encontraste rápido!",
            "🔒 Jugada forzada con {san}. A veces lo mejor es lo evidente. {eval}",
            "⚡ {san} era la respuesta natural. En posiciones forzadas, la clave es no perder tiempo."
        ],
        inaccuracy: [
            "⚠️ {san} es una imprecisión. {eval} Busca considerar amenazas del rival antes de jugar.",
            "🤔 {san} no es la mejor aquí. {eval} Intenta calcular un poco más profundo la próxima vez.",
            "⚠️ Cuidado con {san}. {eval} Había opciones más precisas. ¡Revisa las alternativas!",
            "📝 {san} pierde un poco de ventaja. {eval} Consejo: evalúa las jugadas candidatas antes de decidir."
        ],
        mistake: [
            "❌ {san} es un error. {eval} No te preocupes, estos momentos son los que más enseñan.",
            "😬 ¡Uy! {san} complica las cosas. {eval} Recuerda verificar las amenazas del rival.",
            "❌ {san} no era la indicada. {eval} Consejo: antes de jugar, pregúntate ¿qué quiere mi rival?",
            "📉 {san} deteriora la posición. {eval} Usa estos errores como combustible para mejorar. ¡Ánimo!"
        ],
        blunder: [
            "🚨 ¡{san} es un error grave! {eval} Tranquilo, hasta los grandes maestros cometen errores así.",
            "💥 ¡Cuidado! {san} cambia completamente la evaluación. {eval} Respira y calcula antes de mover.",
            "🚨 {san} es un tropiezo fuerte. {eval} Consejo clave: revisa siempre las capturas y jaques del rival.",
            "⛔ {san} pierde material o posición decisiva. {eval} ¡No te rindas! Cada error es una lección valiosa."
        ]
    };

    var SUMMARY_TEMPLATES = {
        win_high: [
            "🏆 ¡Victoria espectacular! Jugaste con una precisión del {accuracy}%. {keyCount} momentos clave definieron la partida. ¡Felicidades, sigue así! 🎉",
            "🌟 ¡Gran victoria! Con {accuracy}% de precisión demostraste un nivel impresionante. ¡Cada partida te hace más fuerte! 💪",
            "🔥 ¡Dominaste la partida! {accuracy}% de precisión y {keyCount} jugadas destacadas. ¡Eres imparable! 🚀"
        ],
        win_mid: [
            "✅ ¡Buena victoria! Tu precisión fue del {accuracy}%. Hubo {keyCount} momentos importantes. ¡Sigue trabajando para pulir los detalles! 📈",
            "👏 ¡Ganaste! {accuracy}% de precisión. Hay margen de mejora pero lo importante es la victoria. ¡A seguir! 🎯",
            "💪 ¡Victoria merecida! Precisión del {accuracy}%. Revisa los {keyCount} momentos clave para aprender aún más."
        ],
        win_low: [
            "✅ Ganaste, ¡pero ojo! Tu precisión fue del {accuracy}%. Revisa los {keyCount} momentos clave para entender dónde mejorar. 📚",
            "🤝 ¡Victoria! Pero con {accuracy}% de precisión hay bastante que pulir. ¡Los errores son oportunidades de aprendizaje! 💡",
            "👍 Conseguiste la victoria con {accuracy}% de precisión. Enfócate en los errores y serás mucho más fuerte. ¡Vamos! 🚀"
        ],
        loss_high: [
            "😤 Perdiste, pero jugaste muy bien con un {accuracy}% de precisión. A veces el ajedrez es cruel. ¡No bajes la guardia! 💪",
            "🥈 Derrota dolorosa con {accuracy}% de precisión. Jugaste a gran nivel. Revisa los {keyCount} momentos clave y volverás más fuerte. 🔥",
            "💎 A pesar de la derrota, tu {accuracy}% de precisión es notable. ¡El nivel está ahí, solo necesitas consistencia! ⭐"
        ],
        loss_mid: [
            "📊 Derrota con {accuracy}% de precisión. Hubo {keyCount} momentos que cambiaron el rumbo. ¡Analízalos y mejorarás mucho! 📖",
            "🤔 Perdiste con {accuracy}% de precisión. Hay potencial pero también errores que corregir. ¡Cada partida es una clase! 🎓",
            "📝 Resultado adverso con {accuracy}% de precisión. Concéntrate en los {keyCount} momentos decisivos para tu próxima partida. 💡"
        ],
        loss_low: [
            "📉 Derrota dura con {accuracy}% de precisión. No te desanimes: identifica los {keyCount} momentos clave y trabájalos. ¡Mejorarás! 🌱",
            "💪 Perdiste con {accuracy}% de precisión, pero ¡ánimo! Cada error que corrijas te acerca a la victoria. ¡No te rindas! 🔥",
            "📚 Partida difícil con {accuracy}% de precisión. Usa esta derrota como motivación. Revisa, aprende y vuelve más fuerte. 🚀"
        ],
        draw_high: [
            "🤝 ¡Tablas sólidas! Con {accuracy}% de precisión demostraste gran nivel. ¡Muy bien defendido! ⭐",
            "🏅 Empate con {accuracy}% de precisión. ¡Partida de alta calidad! Busca esos pequeños detalles para convertir en victoria. 🎯",
            "⚖️ Tablas con {accuracy}% de precisión. ¡Jugaste con mucha solidez! {keyCount} momentos clave para analizar. 📖"
        ],
        draw_low: [
            "🤝 Tablas con {accuracy}% de precisión. Hubo oportunidades perdidas en los {keyCount} momentos clave. ¡Revísalos! 📝",
            "⚖️ Empate con {accuracy}% de precisión. Hay margen para mejorar. ¡Analiza los momentos decisivos! 💡",
            "📊 Tablas con {accuracy}% de precisión. Trabaja en los {keyCount} puntos de inflexión y ganarás estas partidas. 🚀"
        ]
    };

    // ── Helpers ──────────────────────────────────────────────────────

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function isPlayerPly(ply, playerColor) {
        var isWhite = playerColor === "white";
        return isWhite ? (ply % 2 === 0) : (ply % 2 === 1);
    }

    function countPiecesFromFen(fen) {
        if (!fen) return 16;
        var placement = String(fen).split(" ")[0] || "";
        var count = 0;
        for (var i = 0; i < placement.length; i++) {
            var ch = placement[i];
            if (ch === "r" || ch === "R" ||
                ch === "n" || ch === "N" ||
                ch === "b" || ch === "B" ||
                ch === "q" || ch === "Q") {
                count++;
            }
        }
        return count;
    }

    // ── Phase detection ─────────────────────────────────────────────

    function detectPhaseForPly(ply, positions) {
        if (ply <= OPENING_PLY_LIMIT) {
            var pos = positions[ply];
            if (pos && pos.classification === "book") return "opening";
            var prevBook = true;
            for (var k = 0; k <= ply; k++) {
                if (positions[k] && positions[k].classification === "book") continue;
                if (k <= ply) { prevBook = false; break; }
            }
            if (prevBook) return "opening";
        }

        var pos = positions[ply];
        var fen = pos ? (pos.fen || pos.after || "") : "";
        var pieceCount = countPiecesFromFen(fen);
        if (pieceCount <= MATERIAL_THRESHOLD || ply > ENDGAME_PLY_FALLBACK) return "endgame";

        return "middlegame";
    }

    // ── Phase ratings ───────────────────────────────────────────────

    function computePhaseRatings(positions, classifications, playerColor) {
        var phases = { opening: [], middlegame: [], endgame: [] };

        for (var ply = 0; ply < positions.length; ply++) {
            if (!isPlayerPly(ply, playerColor)) continue;
            var cls = classifications[ply];
            if (cls === undefined || cls === null) continue;
            var score = SCORE_MAP[cls] !== undefined ? SCORE_MAP[cls] : 0.5;
            var phase = detectPhaseForPly(ply, positions);
            phases[phase].push(score);
        }

        var result = {};
        var phaseNames = ["opening", "middlegame", "endgame"];
        for (var i = 0; i < phaseNames.length; i++) {
            var name = phaseNames[i];
            var arr = phases[name];
            if (arr.length === 0) {
                result[name] = { score: 0, moves: 0 };
            } else {
                var sum = 0;
                for (var j = 0; j < arr.length; j++) sum += arr[j];
                result[name] = {
                    score: Math.round((sum / arr.length) * 100),
                    moves: arr.length
                };
            }
        }
        return result;
    }

    // ── Phase icon ──────────────────────────────────────────────────

    function getPhaseIcon(score) {
        if (score > 80) return "✅";
        if (score > 65) return "⭐";
        if (score > 50) return "👍";
        if (score > 35) return "⚠️";
        return "❌";
    }

    // ── Key moments ─────────────────────────────────────────────────

    function detectKeyMoments(positions, classifications) {
        var moments = [];

        for (var ply = 0; ply < positions.length; ply++) {
            var cls = classifications[ply];
            var importance = 0;
            var reason = "";

            if (cls === "brilliant" || cls === "great") {
                importance += 3;
                reason = cls === "brilliant" ? "Jugada brillante" : "Gran jugada";
            }
            if (cls === "blunder") {
                importance += 3;
                reason = reason ? reason + " / Error grave" : "Error grave";
            }
            if (cls === "mistake") {
                importance += 2;
                reason = reason ? reason + " / Error" : "Error";
            }
            if (cls === "inaccuracy") {
                importance += 1;
                reason = reason ? reason + " / Imprecisión" : "Imprecisión";
            }

            var pos = positions[ply] || {};
            var prevPos = ply > 0 ? (positions[ply - 1] || {}) : {};
            var evalNow = pos.eval !== undefined ? Number(pos.eval) : null;
            var evalPrev = prevPos.eval !== undefined ? Number(prevPos.eval) : null;
            if (evalNow !== null && evalPrev !== null) {
                var swing = Math.abs(evalNow - evalPrev);
                if (swing > EVAL_SWING_THRESHOLD) {
                    importance += 2;
                    reason = reason
                        ? reason + " / Cambio evaluación (" + swing + "cp)"
                        : "Cambio evaluación (" + swing + "cp)";
                }
            }

            if (importance > 0) {
                moments.push({
                    ply: ply,
                    importance: importance,
                    reason: reason,
                    classification: cls || null
                });
            }
        }

        moments.sort(function (a, b) { return b.importance - a.importance; });
        return moments.slice(0, KEY_MOMENTS_LIMIT);
    }

    // ── Classification counting ─────────────────────────────────────

    function countClassifications(positions, classifications) {
        var white = {};
        var black = {};
        for (var i = 0; i < CLASSIFICATION_TYPES.length; i++) {
            white[CLASSIFICATION_TYPES[i]] = 0;
            black[CLASSIFICATION_TYPES[i]] = 0;
        }

        for (var ply = 0; ply < positions.length; ply++) {
            var cls = classifications[ply];
            if (!cls) continue;
            var side = (ply % 2 === 0) ? white : black;
            if (side[cls] !== undefined) {
                side[cls]++;
            }
        }

        return { white: white, black: black };
    }

    // ── Accuracy ────────────────────────────────────────────────────

    function computeAccuracies(positions, classifications, playerColor) {
        var playerTotal = 0, playerScore = 0;
        var opponentTotal = 0, opponentScore = 0;

        for (var ply = 0; ply < positions.length; ply++) {
            var cls = classifications[ply];
            if (cls === undefined || cls === null) continue;
            var value = SCORE_MAP[cls] !== undefined ? SCORE_MAP[cls] : 0.5;
            if (isPlayerPly(ply, playerColor)) {
                playerScore += value;
                playerTotal++;
            } else {
                opponentScore += value;
                opponentTotal++;
            }
        }

        return {
            player: playerTotal > 0 ? Math.round((playerScore / playerTotal) * 100) : 0,
            opponent: opponentTotal > 0 ? Math.round((opponentScore / opponentTotal) * 100) : 0
        };
    }

    // ── Game score ──────────────────────────────────────────────────

    function computeGameScore(session) {
        var acc = session.accuracies ? session.accuracies.player : 0;
        var phases = session.phaseRatings || {};
        var opening = phases.opening ? phases.opening.score : 0;
        var middle = phases.middlegame ? phases.middlegame.score : 0;
        var endgame = phases.endgame ? phases.endgame.score : 0;

        var phaseAvg = 0;
        var phaseCount = 0;
        if (phases.opening && phases.opening.moves > 0) { phaseAvg += opening; phaseCount++; }
        if (phases.middlegame && phases.middlegame.moves > 0) { phaseAvg += middle; phaseCount++; }
        if (phases.endgame && phases.endgame.moves > 0) { phaseAvg += endgame; phaseCount++; }
        if (phaseCount > 0) phaseAvg = phaseAvg / phaseCount;

        var combined = (acc * 0.6 + phaseAvg * 0.4);
        return Math.round(clamp(combined / 100 * 2000, 0, 2000));
    }

    // ── Coach comment ───────────────────────────────────────────────

    function buildEvalText(pos) {
        if (!pos) return "";
        var ev = pos.eval;
        if (ev === undefined || ev === null) return "";
        var cp = Number(ev);
        if (Math.abs(cp) < 30) return "La posición está equilibrada.";
        if (cp > 300) return "Ventaja decisiva para blancas (++" + (cp / 100).toFixed(1) + ").";
        if (cp < -300) return "Ventaja decisiva para negras (" + (cp / 100).toFixed(1) + ").";
        if (cp > 0) return "Ligera ventaja blancas (+" + (cp / 100).toFixed(1) + ").";
        return "Ligera ventaja negras (" + (cp / 100).toFixed(1) + ").";
    }

    function generateCoachComment(classification, san, pos) {
        var templates = COMMENT_TEMPLATES[classification];
        if (!templates) {
            return "🔍 {san}: jugada interesante. ¡Sigue analizando!"
                .replace("{san}", san || "...");
        }
        var template = pickRandom(templates);
        var evalText = buildEvalText(pos);
        return template
            .replace(/\{san\}/g, san || "...")
            .replace(/\{eval\}/g, evalText);
    }

    function getCoachComment(session, plyIndex) {
        if (session.coachComments[plyIndex] !== undefined) {
            return session.coachComments[plyIndex];
        }

        var pos = session.positions[plyIndex] || {};
        var cls = session.classifications[plyIndex] || null;
        var san = pos.san || pos.move || "...";

        if (!cls) {
            session.coachComments[plyIndex] = null;
            return null;
        }

        var comment = generateCoachComment(cls, san, pos);
        session.coachComments[plyIndex] = comment;
        return comment;
    }

    // ── Game summary ────────────────────────────────────────────────

    function getGameSummary(session) {
        var result = (session.meta && session.meta.result) ? session.meta.result : "";
        var acc = session.accuracies ? session.accuracies.player : 0;
        var keyCount = session.keyMoments ? session.keyMoments.length : 0;

        var category;
        var isWin = result === "1-0" || result === "0-1";
        var isDraw = result === "1/2-1/2" || result.toLowerCase() === "draw";
        var playerWon = false;

        if (isWin) {
            var playerColor = session.meta ? session.meta.playerColor : "white";
            playerWon = (playerColor === "white" && result === "1-0") ||
                        (playerColor === "black" && result === "0-1");
        }

        if (playerWon) {
            if (acc >= 80) category = "win_high";
            else if (acc >= 55) category = "win_mid";
            else category = "win_low";
        } else if (isDraw) {
            category = acc >= 65 ? "draw_high" : "draw_low";
        } else {
            if (acc >= 75) category = "loss_high";
            else if (acc >= 50) category = "loss_mid";
            else category = "loss_low";
        }

        var templates = SUMMARY_TEMPLATES[category] || SUMMARY_TEMPLATES.draw_low;
        var template = pickRandom(templates);

        return template
            .replace(/\{accuracy\}/g, String(acc))
            .replace(/\{keyCount\}/g, String(keyCount));
    }

    // ── Build review session ────────────────────────────────────────

    function buildClassificationsMap(positions) {
        var map = {};
        for (var ply = 0; ply < positions.length; ply++) {
            var pos = positions[ply];
            if (pos && pos.classification) {
                map[ply] = pos.classification;
            }
        }
        return map;
    }

    function buildReviewSession(pgn, positions, playerColor, meta) {
        var safePositions = Array.isArray(positions) ? positions : [];
        var safeMeta = meta || {};
        var safeColor = playerColor || "white";

        var classifications = buildClassificationsMap(safePositions);
        var accuracies = computeAccuracies(safePositions, classifications, safeColor);
        var phaseRatings = computePhaseRatings(safePositions, classifications, safeColor);
        var keyMoments = detectKeyMoments(safePositions, classifications);
        var countsBySide = countClassifications(safePositions, classifications);

        return {
            pgn: pgn || "",
            positions: safePositions,
            accuracies: accuracies,
            classifications: classifications,
            meta: {
                result: safeMeta.result || "",
                playerColor: safeColor,
                rivalElo: safeMeta.rivalElo || null,
                duration: safeMeta.duration || null,
                opening: safeMeta.opening || ""
            },
            countsBySide: countsBySide,
            phaseRatings: phaseRatings,
            keyMoments: keyMoments,
            coachComments: {}
        };
    }

    // ── Accessors ───────────────────────────────────────────────────

    function getKeyMoments(session) {
        return session.keyMoments || [];
    }

    function getPhaseRating(session, phase) {
        if (!session.phaseRatings) return { score: 0, moves: 0 };
        return session.phaseRatings[phase] || { score: 0, moves: 0 };
    }

    // ── Export ───────────────────────────────────────────────────────

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.coachReview = {
        buildReviewSession: buildReviewSession,
        getCoachComment: getCoachComment,
        getGameSummary: getGameSummary,
        getKeyMoments: getKeyMoments,
        getPhaseRating: getPhaseRating,
        getPhaseIcon: getPhaseIcon,
        computeGameScore: computeGameScore
    };
})(window);
