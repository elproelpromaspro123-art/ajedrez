(function initLocaleModule(global) {
    const locales = {
        es: {
            "app.title": "Ajedrez Lab",
            "app.subtitle": "Tu laboratorio personal de ajedrez - juega, analiza y mejora.",
            "tab.play": "Jugar",
            "tab.analyze": "Analizar",
            "tab.study": "Estudio",
            "tab.profile": "Perfil",
            "analysis.parsing": "Parseando PGN...",
            "analysis.evaluating": "Evaluando posicion {current} de {total}...",
            "analysis.generating": "Generando reporte final...",
            "analysis.completed": "Analisis completado",
            "error.network": "Error de red. Intenta de nuevo.",
            "error.rate_limit": "Demasiadas solicitudes. Espera {seconds}s.",
            "error.offline": "Sin conexion a internet.",
            "ai.greeting": "Hola, soy tu asistente de ajedrez con IA.",
            "ai.placeholder": "Preguntame algo...",
            "ai.send": "Enviar"
        },
        en: {
            "app.title": "Chess Lab",
            "app.subtitle": "Your personal chess lab - play, analyze and improve.",
            "tab.play": "Play",
            "tab.analyze": "Analyze",
            "tab.study": "Study",
            "tab.profile": "Profile",
            "analysis.parsing": "Parsing PGN...",
            "analysis.evaluating": "Evaluating position {current} of {total}...",
            "analysis.generating": "Generating final report...",
            "analysis.completed": "Analysis completed",
            "error.network": "Network error. Try again.",
            "error.rate_limit": "Too many requests. Wait {seconds}s.",
            "error.offline": "No internet connection.",
            "ai.greeting": "Hi, I am your AI chess assistant.",
            "ai.placeholder": "Ask me something...",
            "ai.send": "Send"
        },
        pt: {
            "app.title": "Laboratorio de Xadrez",
            "app.subtitle": "Seu laboratorio pessoal de xadrez - jogue, analise e melhore.",
            "tab.play": "Jogar",
            "tab.analyze": "Analisar",
            "tab.study": "Estudo",
            "tab.profile": "Perfil",
            "analysis.parsing": "Analisando PGN...",
            "analysis.evaluating": "Avaliando posicao {current} de {total}...",
            "analysis.generating": "Gerando relatorio final...",
            "analysis.completed": "Analise concluida",
            "error.network": "Erro de rede. Tente novamente.",
            "error.rate_limit": "Muitas solicitacoes. Aguarde {seconds}s.",
            "error.offline": "Sem conexao com a internet.",
            "ai.greeting": "Ola, sou seu assistente de xadrez com IA.",
            "ai.placeholder": "Pergunte algo...",
            "ai.send": "Enviar"
        }
    };

    let currentLang = "es";

    function setLanguage(lang) {
        if (locales[lang]) {
            currentLang = lang;
        }
    }

    function getLanguage() {
        return currentLang;
    }

    function t(key, params) {
        const dict = locales[currentLang] || locales.es;
        let text = dict[key] || locales.es[key] || key;
        if (params && typeof params === "object") {
            Object.keys(params).forEach(function (param) {
                text = text.replace(new RegExp("\\{" + param + "\\}", "g"), String(params[param]));
            });
        }
        return text;
    }

    function getAvailableLanguages() {
        return Object.keys(locales);
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.locale = {
        t: t,
        setLanguage: setLanguage,
        getLanguage: getLanguage,
        getAvailableLanguages: getAvailableLanguages
    };
})(typeof window !== "undefined" ? window : globalThis);
