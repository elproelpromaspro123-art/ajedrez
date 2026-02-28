(function initChatUiModule(global) {
    function resolveMessageClasses(type) {
        const tokens = String(type || "")
            .toLowerCase()
            .split(/\s+/)
            .map((token) => token.trim())
            .filter(Boolean);

        const isUser = tokens.includes("user") || tokens.includes("ai-user");
        const baseRoleClass = isUser ? "ai-user" : "ai-bot";
        const extras = tokens.filter((token) => (
            token !== "user"
            && token !== "bot"
            && token !== "ai-user"
            && token !== "ai-bot"
        ));

        return ["ai-msg", baseRoleClass, ...extras].join(" ");
    }

    function appendMessage(messagesEl, text, type) {
        if (!messagesEl) return null;
        const div = document.createElement("div");
        div.className = resolveMessageClasses(type);
        div.textContent = text;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div;
    }

    function appendCountdown(messagesEl, seconds) {
        if (!messagesEl) return null;
        const div = document.createElement("div");
        div.className = "ai-msg ai-bot ai-rate-limit";
        let remaining = seconds;

        const update = () => {
            if (remaining <= 0) {
                div.textContent = "Listo. Ya puedes enviar otra pregunta.";
                return;
            }
            div.textContent = `Limite de solicitudes. Reintenta en ${remaining}s...`;
            remaining -= 1;
            setTimeout(update, 1000);
        };

        update();
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div;
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.chatUi = {
        appendMessage,
        appendCountdown
    };
})(typeof window !== "undefined" ? window : globalThis);
