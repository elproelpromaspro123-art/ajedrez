(function initStudyModule(global) {
    function buildOpeningPlan(openingName, side) {
        const name = String(openingName || "").toLowerCase();
        const color = side === "black" ? "negras" : "blancas";

        if (name.includes("sicil")) {
            return [
                `Controla d5 y lucha por iniciativa con ${color}.`,
                "Define rapido tu estructura: ...d6/...e6 y desarrollo natural.",
                "Evita debilidades tempranas en rey antes de completar desarrollo."
            ];
        }

        if (name.includes("espan") || name.includes("ruy")) {
            return [
                "Mantén tensión central antes de romper con d4 o ...d5.",
                "Coordina caballo-f alfil-c para presión sobre e5/e4.",
                "Prioriza estructura sana y actividad de torres en columnas centrales."
            ];
        }

        if (name.includes("india") || name.includes("indian")) {
            return [
                "Decide plan de flanco rey (f5/e5) o control posicional del centro.",
                "Completa fianchetto y evita mover peones del rey sin necesidad.",
                "Juega por rupturas temáticas solo cuando tus piezas estén coordinadas."
            ];
        }

        return [
            "Desarrolla piezas menores antes de maniobras de dama.",
            "Asegura rey (enroque) y conecta torres temprano.",
            "Define una ruptura central coherente con tu estructura."
        ];
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.study = {
        buildOpeningPlan
    };
})(window);
