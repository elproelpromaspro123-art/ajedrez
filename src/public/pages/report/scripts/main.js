
const Chess = window.Chess;

if (!Chess) {
    throw new Error("Chess library failed to load.");
}

/* ===== Piece Names in Spanish ===== */
const PIECE_NAME_ES = {
    p: "Pe\u00f3n", n: "Caballo", b: "Alfil", r: "Torre", q: "Dama", k: "Rey",
    P: "Pe\u00f3n", N: "Caballo", B: "Alfil", R: "Torre", Q: "Dama", K: "Rey"
};

const SAN_PIECE_ES = {
    "K": "Rey", "Q": "Dama", "R": "Torre", "B": "Alfil", "N": "Caballo"
};

function sanToSpanish(san) {
    if (!san) return san;
    let desc = san;
    if (san === "O-O") return "Enroque corto";
    if (san === "O-O-O") return "Enroque largo";
    const pieceChar = san[0];
    if (SAN_PIECE_ES[pieceChar]) {
        desc = SAN_PIECE_ES[pieceChar] + " " + san.slice(1);
    } else if (/^[a-h]/.test(san)) {
        desc = "Pe\u00f3n " + san;
    }
    desc = desc.replace("x", " captura en ").replace("+", " (jaque)").replace("#", " (jaque mate)");
    return desc;
}

const PIECE_IMAGE = {
    p: "/static/media/black_pawn.svg",
    n: "/static/media/black_knight.svg",
    b: "/static/media/black_bishop.svg",
    r: "/static/media/black_rook.svg",
    q: "/static/media/black_queen.svg",
    k: "/static/media/black_king.svg",
    P: "/static/media/white_pawn.svg",
    N: "/static/media/white_knight.svg",
    B: "/static/media/white_bishop.svg",
    R: "/static/media/white_rook.svg",
    Q: "/static/media/white_queen.svg",
    K: "/static/media/white_king.svg"
};

const CLASSIFICATION_ORDER = [
    "brilliant",
    "great",
    "best",
    "excellent",
    "good",
    "inaccuracy",
    "mistake",
    "blunder"
];

const CLASSIFICATION_LABEL = {
    brilliant: "Brillante",
    great: "Gran jugada",
    best: "Mejor",
    excellent: "Excelente",
    good: "Buena",
    inaccuracy: "Inexactitud",
    mistake: "Error",
    blunder: "Blunder",
    book: "Teoria",
    forced: "Forzada"
};

const CLASSIFICATION_SYMBOL = {
    brilliant: "!!",
    great: "!",
    best: "*",
    excellent: "+",
    good: "",
    inaccuracy: "?!",
    mistake: "?",
    blunder: "??",
    book: "=",
    forced: "F"
};

const CLASSIFICATION_DOT_COLOR = {
    brilliant: "#1baca6",
    great: "#5c8bb0",
    best: "#96bc4b",
    excellent: "#96bc4b",
    good: "#a0a0a0",
    inaccuracy: "#f7c631",
    mistake: "#e58f2a",
    blunder: "#ca3431"
};

const ENGINE_PRIMARY = "/static/scripts/stockfish-18-standard-worker.js";
const ENGINE_FALLBACK = "/static/scripts/stockfish-nnue-16.js";
const MAX_ENGINE_MATE_PLY = 99;
const MATE_DISPLAY_CAP = 20;
const MAX_ENGINE_CP = 3500;
const APP_BOOT_AT = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
const APP_MODULES = window.ReportModules || {};
const storageModule = APP_MODULES.storage || null;
const uiModule = APP_MODULES.ui || null;
const openingsModule = APP_MODULES.openings || null;
const studyModule = APP_MODULES.study || null;
const aiModule = APP_MODULES.ai || null;
const playModule = APP_MODULES.play || null;
const analysisModule = APP_MODULES.analysis || null;
const engineModule = APP_MODULES.engine || null;
const localeModule = APP_MODULES.locale || null;
const chatUiModule = APP_MODULES.chatUi || null;
const coachReviewModule = APP_MODULES.coachReview || null;
function t(key, params) {
    return localeModule ? localeModule.t(key, params) : key;
}

const el = {
    tabs: Array.from(document.querySelectorAll(".tab-btn")),
    panels: Array.from(document.querySelectorAll(".panel")),

    lastUpdateLabel: document.querySelector("#last-update-label"),
    perfMetricLoad: document.querySelector("#perf-metric-load"),
    perfMetricFirstEval: document.querySelector("#perf-metric-first-eval"),
    perfMetricExplorer: document.querySelector("#perf-metric-explorer"),
    perfMetricMemory: document.querySelector("#perf-metric-memory"),

    playBoard: document.querySelector("#play-board"),
    playStatus: document.querySelector("#play-status"),
    playMoveList: document.querySelector("#play-move-list"),
    playStartBtn: document.querySelector("#play-start-btn"),
    authStatus: document.querySelector("#auth-status"),
    authUsername: document.querySelector("#auth-username"),
    authPassword: document.querySelector("#auth-password"),
    authLoginBtn: document.querySelector("#auth-login-btn"),
    authRegisterBtn: document.querySelector("#auth-register-btn"),
    authGuestPanel: document.querySelector("#auth-guest-panel"),
    authUserPanel: document.querySelector("#auth-user-panel"),
    authUserLabel: document.querySelector("#auth-user-label"),
    authLogoutBtn: document.querySelector("#auth-logout-btn"),
    authLockOverlay: document.querySelector("#auth-lock-overlay"),
    playHintBtn: document.querySelector("#play-hint-btn"),
    playUndoBtn: document.querySelector("#play-undo-btn"),
    playCancelPremoveBtn: document.querySelector("#play-cancel-premove-btn"),
    playResignBtn: document.querySelector("#play-resign-btn"),
    playFlipBtn: document.querySelector("#play-flip-btn"),
    playBackBtn: document.querySelector("#play-back-btn"),
    playNewGameBtn: document.querySelector("#play-new-game-btn"),
    playAccuracyScore: document.querySelector("#play-accuracy-score"),
    playPremoveState: document.querySelector("#play-premove-state"),
    playClockStrip: document.querySelector("#play-clock-strip"),
    playClockBot: document.querySelector("#play-clock-bot"),
    playClockPlayer: document.querySelector("#play-clock-player"),

    playSetupPanel: document.querySelector("#play-setup-panel"),
    playGamePanel: document.querySelector("#play-game-panel"),
    playPanelGrid: document.querySelector("#play-panel-grid"),
    playBoardCard: document.querySelector("#play-board-card"),
    coachHistoryContainer: document.querySelector("#coach-history-container"),

    /* Computer panel */
    computerPanel: document.querySelector("#computer-panel"),
    computerPanelTitle: document.querySelector("#computer-panel-title"),
    computerLines: document.querySelector("#computer-lines"),

    /* Move confirmation */
    moveConfirmBar: document.querySelector("#move-confirm-bar"),
    confirmText: document.querySelector("#confirm-text"),
    confirmYesBtn: document.querySelector("#confirm-yes-btn"),
    confirmNoBtn: document.querySelector("#confirm-no-btn"),

    /* Endgame Modal */
    endgameModal: document.querySelector("#endgame-modal"),
    endgameTitle: document.querySelector("#endgame-title"),
    endgameReason: document.querySelector("#endgame-reason"),
    endgameWinner: document.querySelector("#endgame-winner"),
    endgameDuration: document.querySelector("#endgame-duration"),
    endgameMoves: document.querySelector("#endgame-moves"),
    endgameOpening: document.querySelector("#endgame-opening"),
    endgameAccuracyPlayer: document.querySelector("#endgame-accuracy-player"),
    endgameAccuracyRival: document.querySelector("#endgame-accuracy-rival"),
    endgameImpact: document.querySelector("#endgame-impact"),
    endgameAnalyzeBtn: document.querySelector("#endgame-analyze-btn"),
    endgamePgnBtn: document.querySelector("#endgame-pgn-btn"),
    endgameHomeBtn: document.querySelector("#endgame-home-btn"),
    endgameCloseBtn: document.querySelector("#endgame-close-btn"),
    endgameCoachReviewBtn: document.querySelector("#endgame-coach-review-btn"),

    /* Coach Review Overlay */
    crOverlay: document.querySelector("#coach-review-overlay"),
    crBoard: document.querySelector("#cr-board"),
    crEvalGraph: document.querySelector("#cr-eval-graph"),
    crNavStart: document.querySelector("#cr-nav-start"),
    crNavPrev: document.querySelector("#cr-nav-prev"),
    crNavPlay: document.querySelector("#cr-nav-play"),
    crNavNext: document.querySelector("#cr-nav-next"),
    crNavEnd: document.querySelector("#cr-nav-end"),
    crVoiceBtn: document.querySelector("#cr-voice-btn"),
    crCloseBtn: document.querySelector("#cr-close-btn"),
    crCloseBottomBtn: document.querySelector("#cr-close-bottom-btn"),
    crNewGameBtn: document.querySelector("#cr-new-game-btn"),
    crCoachAvatar: document.querySelector("#cr-coach-avatar"),
    crSpeechText: document.querySelector("#cr-speech-text"),
    crGameScore: document.querySelector("#cr-game-score"),
    crWhiteName: document.querySelector("#cr-white-name"),
    crBlackName: document.querySelector("#cr-black-name"),
    crWhiteAccuracy: document.querySelector("#cr-white-accuracy"),
    crBlackAccuracy: document.querySelector("#cr-black-accuracy"),
    crClassificationBody: document.querySelector("#cr-classification-body"),
    crPhases: document.querySelector("#cr-phases"),
    crKeyMoments: document.querySelector("#cr-key-moments"),
    crMoveList: document.querySelector("#cr-move-list"),

    botPreset: document.querySelector("#bot-preset"),
    botCustomElo: document.querySelector("#bot-custom-elo"),
    playerColor: document.querySelector("#player-color"),
    playMode: document.querySelector("#play-mode"),
    playModeNote: document.querySelector("#play-mode-note"),
    coachDepth: document.querySelector("#coach-depth"),
    coachDepthValue: document.querySelector("#coach-depth-value"),
    coachMessage: document.querySelector("#coach-message"),

    /* --- All settings now from the modal with set- prefix --- */
    setCoachAuto: document.querySelector("#set-coach-auto"),
    setHints: document.querySelector("#set-hints"),
    setEvalBar: document.querySelector("#set-eval-bar"),
    setThreatArrows: document.querySelector("#set-threat-arrows"),
    setSuggestionArrows: document.querySelector("#set-suggestion-arrows"),
    setMoveComments: document.querySelector("#set-move-comments"),
    setComputer: document.querySelector("#set-computer"),
    setTakebacks: document.querySelector("#set-takebacks"),
    setLegal: document.querySelector("#set-legal"),
    setLastMove: document.querySelector("#set-lastmove"),
    setCoordinates: document.querySelector("#set-coordinates"),
    setBoardTheme: document.querySelector("#set-board-theme"),
    setPieceTheme: document.querySelector("#set-piece-theme"),
    setSound: document.querySelector("#set-sound"),
    setErrorSound: document.querySelector("#set-error-sound"),
    setUiTheme: document.querySelector("#set-ui-theme"),
    setPieceAnim: document.querySelector("#set-piece-anim"),
    setPremove: document.querySelector("#set-premove"),
    setAutoPromo: document.querySelector("#set-autopromo"),
    setTimeControl: document.querySelector("#set-time-control"),
    setGameType: document.querySelector("#set-game-type"),

    settingsBtn: document.querySelector("#play-settings-btn"),
    settingsModal: document.querySelector("#settings-modal"),
    settingsCloseBtn: document.querySelector("#settings-close-btn"),
    settingsOverlay: document.querySelector("#settings-overlay"),

    analysisBoard: document.querySelector("#analysis-board"),
    analysisPgn: document.querySelector("#analysis-pgn"),
    analysisDepth: document.querySelector("#analysis-depth"),
    analysisDepthValue: document.querySelector("#analysis-depth-value"),
    analysisRunBtn: document.querySelector("#analysis-run-btn"),
    analysisProgress: document.querySelector("#analysis-progress"),
    analysisStatus: document.querySelector("#analysis-status"),
    analysisOverallAccuracy: document.querySelector("#analysis-overall-accuracy"),
    analysisWhiteAccuracy: document.querySelector("#analysis-white-accuracy"),
    analysisBlackAccuracy: document.querySelector("#analysis-black-accuracy"),
    analysisOpening: document.querySelector("#analysis-opening"),
    analysisClassificationBody: document.querySelector("#classification-table-body"),
    analysisMoveMeta: document.querySelector("#analysis-move-meta"),
    analysisMoveList: document.querySelector("#analysis-move-list"),
    analysisTopLines: document.querySelector("#analysis-top-lines"),
    analysisStartBtn: document.querySelector("#analysis-start-btn"),
    analysisPrevBtn: document.querySelector("#analysis-prev-btn"),
    analysisNextBtn: document.querySelector("#analysis-next-btn"),
    analysisEndBtn: document.querySelector("#analysis-end-btn"),
    analysisRetryBtn: document.querySelector("#analysis-retry-btn"),
    analysisEvalGraph: document.querySelector("#analysis-eval-graph"),
    analysisGraphLegend: document.querySelector("#analysis-graph-legend"),
    analysisMoveExplanation: document.querySelector("#analysis-move-explanation"),
    analysisAiSummary: document.querySelector("#analysis-ai-summary"),
    analysisExplainAiBtn: document.querySelector("#analysis-explain-ai-btn"),
    analysisRetryStatus: document.querySelector("#analysis-retry-status"),
    analysisRetryBoard: document.querySelector("#analysis-retry-board"),
    analysisRetryStartBtn: document.querySelector("#analysis-retry-start-btn"),
    analysisRetrySolutionBtn: document.querySelector("#analysis-retry-solution-btn"),
    progressStudyStreak: document.querySelector("#progress-study-streak"),
    progressGamesCount: document.querySelector("#progress-games-count"),
    progressWeeklyChart: document.querySelector("#progress-weekly-chart"),
    progressTopOpenings: document.querySelector("#progress-top-openings"),
    progressCommonErrors: document.querySelector("#progress-common-errors"),

    evalBar: document.querySelector("#eval-bar"),
    evalFill: document.querySelector("#eval-fill"),
    evalLabelWhite: document.querySelector("#eval-label-white"),
    evalLabelBlack: document.querySelector("#eval-label-black"),

    playEvalBar: document.querySelector("#play-eval-bar"),
    playEvalFill: document.querySelector("#play-eval-fill"),
    playEvalLabelWhite: document.querySelector("#play-eval-label-white"),
    playEvalLabelBlack: document.querySelector("#play-eval-label-black"),
    playMoveBadge: document.querySelector("#play-move-badge"),

    promotionModal: document.querySelector("#promotion-modal"),
    promoPieces: Array.from(document.querySelectorAll(".promo-piece")),
    promoOverlay: document.querySelector(".promo-overlay"),

    studyDiagrams: Array.from(document.querySelectorAll(".study-diagram")),
    ecoFilterColor: document.querySelector("#eco-filter-color"),
    ecoFilterPopularity: document.querySelector("#eco-filter-popularity"),
    ecoFilterSuccess: document.querySelector("#eco-filter-success"),
    ecoSearch: document.querySelector("#eco-search"),
    ecoTree: document.querySelector("#eco-tree"),
    ecoDetailTitle: document.querySelector("#eco-detail-title"),
    ecoDetailMeta: document.querySelector("#eco-detail-meta"),
    ecoDetailBoard: document.querySelector("#eco-detail-board"),
    ecoDetailPlan: document.querySelector("#eco-detail-plan"),
    ecoLoadPlayBtn: document.querySelector("#eco-load-play-btn"),
    aiActionAudit: document.querySelector("#ai-action-audit"),
    lessonCards: Array.from(document.querySelectorAll(".lesson-course-card")),
    lessonTitle: document.querySelector("#lesson-title"),
    lessonDescription: document.querySelector("#lesson-description"),
    lessonSteps: document.querySelector("#lesson-steps"),
    lessonPracticeBoard: document.querySelector("#lesson-practice-board"),
    lessonPrompt: document.querySelector("#lesson-prompt"),
    lessonOptions: document.querySelector("#lesson-options"),
    lessonFeedback: document.querySelector("#lesson-feedback"),
    profileGamesTotal: document.querySelector("#profile-games-total"),
    profileWinrate: document.querySelector("#profile-winrate"),
    profileAvgAccuracy: document.querySelector("#profile-avg-accuracy"),
    profileEstimatedElo: document.querySelector("#profile-estimated-elo"),
    profileEloGraph: document.querySelector("#profile-elo-graph"),
    profileEloMeta: document.querySelector("#profile-elo-meta"),
    profileTopOpenings: document.querySelector("#profile-top-openings"),
    profileHistoryBody: document.querySelector("#profile-history-body"),
    profileRefreshBtn: document.querySelector("#profile-refresh-btn"),
    profileWdlBar: document.querySelector("#profile-wdl-bar"),
    profileWdlLegend: document.querySelector("#profile-wdl-legend"),

    fxMove: document.querySelector("#fx-move"),
    fxCapture: document.querySelector("#fx-capture"),
    fxCheck: document.querySelector("#fx-check"),
    fxCastle: document.querySelector("#fx-castle"),
    fxPromote: document.querySelector("#fx-promote"),
    fxEnd: document.querySelector("#fx-end")
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function sideFromTurn(turn) {
    return turn === "w" ? "white" : "black";
}

function turnFromSide(side) {
    return side === "white" ? "w" : "b";
}

function pieceSymbolFromMove(move) {
    if (!move || !move.piece || !move.color) {
        return null;
    }
    const base = String(move.piece).toLowerCase();
    if (!/^[pnbrqk]$/.test(base)) {
        return null;
    }
    return move.color === "w" ? base.toUpperCase() : base;
}

function nowMs() {
    return typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
}

function canPersistLocalData() {
    return Boolean(authState && authState.authenticated);
}

function readStored(path, fallbackValue) {
    if (!storageModule || !storageModule.read) {
        return fallbackValue;
    }
    return storageModule.read(path, fallbackValue);
}

function writeStored(path, value) {
    if (!storageModule || !storageModule.write) {
        return value;
    }
    if (!canPersistLocalData()) {
        return value;
    }
    return storageModule.write(path, value);
}

function mutateStored(mutator) {
    if (!storageModule || !storageModule.mutate) {
        return null;
    }
    if (!canPersistLocalData()) {
        return null;
    }
    return storageModule.mutate(mutator);
}

function withAuthFetchOptions(init) {
    return Object.assign(
        {
            credentials: "same-origin",
            cache: "no-store"
        },
        init || {}
    );
}

async function readJsonResponseSafe(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function setAuthStatus(message) {
    if (!el.authStatus) {
        return;
    }
    el.authStatus.textContent = String(message || "");
}

function applyAuthLockState() {
    if (typeof document === "undefined" || !document.body) {
        return;
    }
    const locked = !authState.authenticated;
    document.body.classList.toggle("auth-locked", locked);
    if (el.authLockOverlay) {
        el.authLockOverlay.setAttribute("aria-hidden", locked ? "false" : "true");
    }
    if (locked && el.authUsername && !authState.busy) {
        setTimeout(() => {
            if (el.authUsername && !authState.authenticated) {
                el.authUsername.focus();
            }
        }, 40);
    }
}

function clearGuestPersistedData() {
    if (!storageModule || !storageModule.mutate) {
        return;
    }

    storageModule.mutate((data) => {
        if (!data || typeof data !== "object") {
            return;
        }

        data.progress = { games: [], activities: [] };
        data.ai = { log: [], chatHistory: [] };
        data.session = { snapshot: null };
        data.metrics = { entries: [] };
    });

    sessionRuntimeState.restorePayload = null;
}

function applyAuthUiState() {
    if (el.authGuestPanel) {
        el.authGuestPanel.style.display = authState.authenticated ? "none" : "";
    }
    if (el.authUserPanel) {
        el.authUserPanel.style.display = authState.authenticated ? "" : "none";
    }
    if (el.authUserLabel) {
        el.authUserLabel.textContent = authState.username || "--";
    }
}

function setAuthBusy(isBusy) {
    authState.busy = Boolean(isBusy);

    [el.authUsername, el.authPassword].forEach((input) => {
        if (input) {
            input.disabled = authState.busy;
        }
    });
    [el.authLoginBtn, el.authRegisterBtn, el.authLogoutBtn].forEach((button) => {
        if (button) {
            button.disabled = authState.busy;
        }
    });
}

function setAuthState(authenticated, username = "") {
    const wasAuthenticated = authState.authenticated;
    authState.authenticated = Boolean(authenticated);
    authState.username = authState.authenticated ? String(username || "") : "";
    applyAuthUiState();
    applyAuthLockState();
    refreshPlayModeUiState();
    if (wasAuthenticated && !authState.authenticated) {
        clearGuestPersistedData();
    }
}

function getAuthInputCredentials() {
    const username = el.authUsername ? String(el.authUsername.value || "").trim() : "";
    const password = el.authPassword ? String(el.authPassword.value || "").trim() : "";
    if (!username || !password) {
        return null;
    }
    return { username, password };
}

function clearAuthPasswordInput() {
    if (el.authPassword) {
        el.authPassword.value = "";
    }
}

async function refreshAuthSessionStatus() {
    try {
        const response = await fetch("/api/auth/session", withAuthFetchOptions());
        if (!response.ok) {
            throw new Error(`Session request failed (${response.status}).`);
        }
        const payload = await readJsonResponseSafe(response);
        const authenticated = Boolean(payload && payload.authenticated);
        if (authenticated) {
            const username = payload && payload.user && payload.user.username ? String(payload.user.username) : "";
            setAuthState(true, username);
            setAuthStatus(`Sesion iniciada como ${username}. Tus datos se guardan en base de datos.`);
            return true;
        }

        setAuthState(false, "");
        clearGuestPersistedData();
        setAuthStatus("No has iniciado sesion. Inicia para guardar todo en base de datos.");
        return false;
    } catch {
        if (authState.authenticated && authState.username) {
            setAuthStatus(`No se pudo validar la sesion con el servidor para ${authState.username}. Reintentando...`);
            return true;
        }

        setAuthState(false, "");
        setAuthStatus("No se pudo validar la sesion con el servidor. Verifica la conexion e inicia sesion de nuevo.");
        return false;
    }
}

async function onAuthenticatedSessionChanged() {
    progressState.remoteHydrated = false;
    if (!authState.authenticated) {
        profileState.games = [];
        profileState.eloTimeline = [];
        lessonState.progressByLesson = {};
        renderProgressDashboard();
        return;
    }

    await hydrateProfileStoreFromDatabase();
    scheduleProfileStoreSync(120);
    renderProgressDashboard();
}

async function registerWithCredentials() {
    const credentials = getAuthInputCredentials();
    if (!credentials) {
        setAuthStatus("Completa usuario y contrase\u00f1a para crear cuenta.");
        return;
    }

    setAuthBusy(true);
    try {
        const response = await fetch("/api/auth/register", withAuthFetchOptions({
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(credentials)
        }));
        const payload = await readJsonResponseSafe(response);
        if (!response.ok) {
            const message = payload && payload.message ? String(payload.message) : "No se pudo crear la cuenta.";
            setAuthStatus(message);
            return;
        }

        const username = payload && payload.user && payload.user.username ? String(payload.user.username) : credentials.username;
        setAuthState(true, username);
        const warning = payload && payload.warning ? ` ${String(payload.warning)}` : "";
        setAuthStatus(`Cuenta creada e iniciada como ${username}.${warning}`);
        clearAuthPasswordInput();
        await onAuthenticatedSessionChanged();
    } catch {
        setAuthStatus("No se pudo crear la cuenta por un error de red.");
    } finally {
        setAuthBusy(false);
    }
}

async function loginWithCredentials() {
    const credentials = getAuthInputCredentials();
    if (!credentials) {
        setAuthStatus("Completa usuario y contrase\u00f1a para iniciar sesion.");
        return;
    }

    setAuthBusy(true);
    try {
        const response = await fetch("/api/auth/login", withAuthFetchOptions({
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(credentials)
        }));
        const payload = await readJsonResponseSafe(response);
        if (!response.ok) {
            const message = payload && payload.message ? String(payload.message) : "No se pudo iniciar sesion.";
            setAuthStatus(message);
            return;
        }

        const username = payload && payload.user && payload.user.username ? String(payload.user.username) : credentials.username;
        setAuthState(true, username);
        setAuthStatus(`Sesion iniciada como ${username}.`);
        clearAuthPasswordInput();
        await onAuthenticatedSessionChanged();
    } catch {
        setAuthStatus("No se pudo iniciar sesion por un error de red.");
    } finally {
        setAuthBusy(false);
    }
}

async function logoutCurrentSession() {
    setAuthBusy(true);
    try {
        await fetch("/api/auth/logout", withAuthFetchOptions({
            method: "POST"
        }));
    } catch {
        // ignore network errors; we still clear local auth state
    } finally {
        setAuthState(false, "");
        setAuthStatus("Sesion cerrada. El guardado remoto queda desactivado hasta iniciar sesion.");
        clearAuthPasswordInput();
        progressState.remoteHydrated = false;
        await onAuthenticatedSessionChanged();
        setAuthBusy(false);
    }
}

function formatDurationMs(ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
        return "--";
    }
    if (ms < 1000) {
        return `${Math.round(ms)} ms`;
    }
    return `${(ms / 1000).toFixed(2)} s`;
}

function formatMemoryBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "--";
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(0)} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
}

function resolveUiTheme(theme) {
    const requested = String(theme || "dark").toLowerCase();
    if (requested === "light" || requested === "dark") {
        return requested;
    }

    if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    return "dark";
}

function applyUiTheme(theme, persist = true) {
    const requested = String(theme || "dark").toLowerCase();
    const resolved = resolveUiTheme(requested);
    document.body.dataset.uiTheme = resolved;
    document.documentElement.style.colorScheme = resolved;

    const themeColor = resolved === "light" ? "#f3f4f7" : "#0f1117";
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
        themeMeta.setAttribute("content", themeColor);
    }

    if (persist && uiModule && uiModule.savePreference) {
        uiModule.savePreference("ui_theme", requested);
    }
}

function formatEval(evaluation) {
    if (!evaluation) {
        return "--";
    }

    if (evaluation.type === "mate") {
        const value = clamp(Math.trunc(Number(evaluation.value) || 0), -MAX_ENGINE_MATE_PLY, MAX_ENGINE_MATE_PLY);
        if (value === 0) {
            return "M0";
        }

        const sign = value > 0 ? "+" : "-";
        const matePly = Math.abs(value);
        return matePly >= MATE_DISPLAY_CAP
            ? `${sign}M${MATE_DISPLAY_CAP}+`
            : `${sign}M${matePly}`;
    }

    const cpValue = clamp(Math.trunc(Number(evaluation.value) || 0), -MAX_ENGINE_CP, MAX_ENGINE_CP);
    const sign = cpValue >= 0 ? "+" : "-";
    return `${sign}${Math.abs(cpValue / 100).toFixed(2)}`;
}

function sanitizeEngineEvaluation(evaluation) {
    if (!evaluation || typeof evaluation !== "object") {
        return null;
    }

    const type = String(evaluation.type || "").toLowerCase();
    if (type === "mate") {
        const raw = Number(evaluation.value);
        if (!Number.isFinite(raw)) {
            return null;
        }
        return {
            type: "mate",
            value: clamp(Math.trunc(raw), -MAX_ENGINE_MATE_PLY, MAX_ENGINE_MATE_PLY)
        };
    }

    const raw = Number(evaluation.value);
    if (!Number.isFinite(raw)) {
        return null;
    }

    return {
        type: "cp",
        value: clamp(Math.trunc(raw), -MAX_ENGINE_CP, MAX_ENGINE_CP)
    };
}

function isPromotionTransitionValid(from, to) {
    const fromRank = parseInt(from && from[1], 10);
    const toRank = parseInt(to && to[1], 10);
    return (fromRank === 7 && toRank === 8) || (fromRank === 2 && toRank === 1);
}

function parseUciMove(uci) {
    if (!uci || !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(uci)) {
        return null;
    }

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.slice(4) || undefined;

    if (promotion && !isPromotionTransitionValid(from, to)) {
        return null;
    }

    return {
        from,
        to,
        promotion
    };
}

function normalizeUciMoveForFen(fen, uciMove) {
    const parsed = parseUciMove(uciMove);
    if (!parsed) {
        return null;
    }

    try {
        const game = new Chess(fen);
        const move = game.move(parsed);
        if (!move) {
            return null;
        }

        const promotion = move.promotion || undefined;
        return {
            from: move.from,
            to: move.to,
            promotion,
            uci: `${move.from}${move.to}${promotion || ""}`,
            san: move.san
        };
    } catch {
        return null;
    }
}

function normalizeEngineLinesForFen(fen, lines) {
    const source = Array.isArray(lines) ? lines : [];
    if (source.length === 0) {
        return [];
    }

    const byId = new Map();
    source.forEach((line) => {
        if (!line || typeof line !== "object") {
            return;
        }

        const normalizedMove = normalizeUciMoveForFen(fen, line.moveUCI || line.bestMove || "");
        const evaluation = sanitizeEngineEvaluation(line.evaluation);
        if (!normalizedMove || !evaluation) {
            return;
        }

        const id = clamp(parseInt(line.id || "1", 10) || 1, 1, 8);
        const depth = clamp(parseInt(line.depth || "0", 10) || 0, 0, 99);
        const normalizedLine = {
            id,
            depth,
            moveUCI: normalizedMove.uci,
            moveSAN: normalizedMove.san,
            evaluation
        };

        const existing = byId.get(id);
        if (!existing || normalizedLine.depth >= existing.depth) {
            byId.set(id, normalizedLine);
        }
    });

    const sortedById = Array.from(byId.values()).sort((a, b) => a.id - b.id);
    const dedupedByTarget = new Map();
    sortedById.forEach((line) => {
        const baseKey = String(line.moveUCI || "").slice(0, 4);
        if (!/^[a-h][1-8][a-h][1-8]$/.test(baseKey)) {
            return;
        }
        const existing = dedupedByTarget.get(baseKey);
        if (!existing || line.depth > existing.depth || evalToCp(line.evaluation) > evalToCp(existing.evaluation)) {
            dedupedByTarget.set(baseKey, line);
        }
    });

    return Array.from(dedupedByTarget.values())
        .sort((a, b) => a.id - b.id)
        .slice(0, 5)
        .map((line, index) => ({
            ...line,
            id: index + 1
        }));
}

function fenMapFromFen(fen) {
    const boardState = fen.split(" ")[0].split("/");
    const map = new Map();

    for (let rank = 8; rank >= 1; rank--) {
        const row = boardState[8 - rank];
        let file = 0;

        for (const char of row) {
            if (/\d/.test(char)) {
                file += parseInt(char, 10);
                continue;
            }

            const square = `${"abcdefgh"[file]}${rank}`;
            map.set(square, char);
            file += 1;
        }
    }

    return map;
}

class BoardView {
    constructor(root, options = {}) {
        this.root = root;
        this.root.classList.add("chessboard");
        this.orientation = options.orientation || "white";
        this.interactive = Boolean(options.interactive);
        this.showCoordinates = options.showCoordinates !== false;
        this.currentFen = "8/8/8/8/8/8/8/8 w - - 0 1";
        this.squareMap = new Map();
        this.onSquareClick = null;
        this.canDragFrom = null;
        this.arrowIdPrefix = `board-arrows-${Math.random().toString(36).slice(2, 9)}`;
        this.arrowLayer = null;
        this.arrowGroup = null;

        if (!this.root) {
            throw new Error("Board root not found.");
        }

        this._wasDragging = false;
        this._pointerDownHandled = false;

        this.root.addEventListener("click", (event) => {
            if (!this.interactive || !this.onSquareClick) return;
            if (this._wasDragging) {
                this._wasDragging = false;
                this._pointerDownHandled = false;
                return;
            }
            if (this._pointerDownHandled) { this._pointerDownHandled = false; return; }
            const target = event.target.closest(".square");
            if (target && target.dataset.square) {
                this.onSquareClick(target.dataset.square);
            }
        });

        // --- Smooth pointer-based drag & drop ---
        this._dragState = null;
        this._dragGhost = null;

        this.root.addEventListener("pointerdown", (event) => {
            if (!this.interactive) return;
            const squareEl = event.target.closest(".square");
            if (!squareEl || !squareEl.dataset.square) return;
            const img = squareEl.querySelector("img");
            if (!img) return;
            const square = squareEl.dataset.square;

            if (this.canDragFrom && !this.canDragFrom(square)) {
                return;
            }

            event.preventDefault();
            squareEl.setPointerCapture(event.pointerId);

            const rect = this.root.getBoundingClientRect();
            const squareSize = rect.width / 8;

            // Create ghost image for dragging
            const ghost = img.cloneNode(true);
            ghost.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 9999;
                width: ${squareSize * 1.15}px;
                height: ${squareSize * 1.15}px;
                opacity: 0.92;
                filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5));
                transition: none;
                will-change: transform;
            `;
            ghost.style.left = (event.clientX - squareSize * 0.575) + "px";
            ghost.style.top = (event.clientY - squareSize * 0.575) + "px";
            document.body.appendChild(ghost);

            img.style.opacity = "0.3";
            squareEl.classList.add("drag-origin");
            this.root.classList.add("drag-active");

            this._dragState = {
                fromSquare: square,
                pointerId: event.pointerId,
                originImg: img,
                squareSize
            };
            this._dragGhost = ghost;

            // Fire click to show legal moves immediately on pointer down; mark so the subsequent click does not toggle selection off.
            this._pointerDownHandled = true;
            if (this.onSquareClick) {
                this.onSquareClick(square);
            }
        });

        this.root.addEventListener("pointermove", (event) => {
            if (!this._dragState || event.pointerId !== this._dragState.pointerId) return;
            if (!this._dragGhost) return;
            event.preventDefault();
            const sz = this._dragState.squareSize;
            this._dragGhost.style.left = (event.clientX - sz * 0.575) + "px";
            this._dragGhost.style.top = (event.clientY - sz * 0.575) + "px";
        });

        this.root.addEventListener("pointerup", (event) => {
            if (!this._dragState || event.pointerId !== this._dragState.pointerId) return;
            event.preventDefault();

            const state = this._dragState;
            const ghost = this._dragGhost;

            // Clean up ghost
            if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
            this._dragGhost = null;

            // Find target square before restoring UI, to know if we're dropping on a new square
            const target = document.elementFromPoint(event.clientX, event.clientY);
            const targetSquare = target ? target.closest(".square") : null;
            const droppedOnSource = Boolean(targetSquare && targetSquare.dataset.square === state.fromSquare);
            const willDrop = Boolean(targetSquare && targetSquare.dataset.square && targetSquare.dataset.square !== state.fromSquare);

            // Restore origin image only if we did NOT drop on another square (evita tirón al soltar)
            if (state.originImg && !willDrop) {
                state.originImg.style.opacity = "";
            }

            // Remove classes
            this.root.classList.remove("drag-active");
            this.root.querySelectorAll(".drag-origin").forEach((el) => el.classList.remove("drag-origin"));
            this._pointerDownHandled = droppedOnSource;

            if (willDrop) {
                this._wasDragging = true;
                this._pointerDownHandled = false;
                if (this.onDrop) {
                    this.onDrop(state.fromSquare, targetSquare.dataset.square);
                }
            }

            this._dragState = null;
        });

        this.root.addEventListener("pointercancel", () => {
            if (this._dragGhost && this._dragGhost.parentNode) {
                this._dragGhost.parentNode.removeChild(this._dragGhost);
            }
            if (this._dragState && this._dragState.originImg) {
                this._dragState.originImg.style.opacity = "";
            }
            this.root.classList.remove("drag-active");
            this.root.querySelectorAll(".drag-origin").forEach((el) => el.classList.remove("drag-origin"));
            this._dragState = null;
            this._dragGhost = null;
            this._pointerDownHandled = false;
            this._wasDragging = false;
        });

        this.buildSquares();
    }

    orderedSquares() {
        const files = this.orientation === "white" ? "abcdefgh" : "hgfedcba";
        const ranks = this.orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];

        const squares = [];
        for (const rank of ranks) {
            for (const file of files.split("")) {
                squares.push(`${file}${rank}`);
            }
        }

        return squares;
    }

    isLight(square) {
        const file = "abcdefgh".indexOf(square[0]);
        const rank = parseInt(square[1], 10);
        return (file + rank) % 2 === 0;
    }

    buildSquares() {
        this.root.innerHTML = "";
        this.squareMap.clear();

        const fragment = document.createDocumentFragment();
        const squares = this.orderedSquares();
        squares.forEach((square, index) => {
            const squareEl = document.createElement("button");
            squareEl.type = "button";
            squareEl.className = `square ${this.isLight(square) ? "light" : "dark"}`;
            squareEl.dataset.square = square;

            const row = Math.floor(index / 8);
            const col = index % 8;

            if (col === 0) {
                squareEl.dataset.rankLabel = square[1];
            }
            if (row === 7) {
                squareEl.dataset.fileLabel = square[0];
            }

            if (!this.interactive) {
                squareEl.style.cursor = "default";
            }

            this.squareMap.set(square, squareEl);
            fragment.appendChild(squareEl);
        });

        this.root.appendChild(fragment);
        this.ensureArrowLayer();
        this.root.classList.toggle("hide-coordinates", !this.showCoordinates);
        this.setFen(this.currentFen);
    }

    getOrientation() {
        return this.orientation;
    }

    setOrientation(side) {
        this.orientation = side;
        this.buildSquares();
    }

    setCoordinatesVisible(visible) {
        this.showCoordinates = visible;
        this.root.classList.toggle("hide-coordinates", !visible);
    }

    ensureArrowLayer() {
        if (!this.arrowLayer) {
            this.arrowLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.arrowLayer.setAttribute("class", "board-arrows");
            this.arrowLayer.setAttribute("viewBox", "0 0 100 100");
            this.arrowLayer.setAttribute("preserveAspectRatio", "none");

            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

            const suggestionMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
            suggestionMarker.setAttribute("id", `${this.arrowIdPrefix}-suggestion`);
            suggestionMarker.setAttribute("viewBox", "0 0 10 10");
            suggestionMarker.setAttribute("refX", "7");
            suggestionMarker.setAttribute("refY", "5");
            suggestionMarker.setAttribute("markerWidth", "3");
            suggestionMarker.setAttribute("markerHeight", "3");
            suggestionMarker.setAttribute("orient", "auto-start-reverse");
            const suggestionPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            suggestionPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
            suggestionPath.setAttribute("class", "board-arrow-head board-arrow-head-suggestion");
            suggestionMarker.appendChild(suggestionPath);

            const threatMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
            threatMarker.setAttribute("id", `${this.arrowIdPrefix}-threat`);
            threatMarker.setAttribute("viewBox", "0 0 10 10");
            threatMarker.setAttribute("refX", "7");
            threatMarker.setAttribute("refY", "5");
            threatMarker.setAttribute("markerWidth", "3");
            threatMarker.setAttribute("markerHeight", "3");
            threatMarker.setAttribute("orient", "auto-start-reverse");
            const threatPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            threatPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
            threatPath.setAttribute("class", "board-arrow-head board-arrow-head-threat");
            threatMarker.appendChild(threatPath);

            defs.append(suggestionMarker, threatMarker);
            this.arrowLayer.appendChild(defs);

            this.arrowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.arrowGroup.setAttribute("class", "board-arrows-group");
            this.arrowLayer.appendChild(this.arrowGroup);
        }

        if (!this.arrowLayer.parentNode || this.arrowLayer.parentNode !== this.root) {
            this.root.appendChild(this.arrowLayer);
        }
    }

    squareCenter(square) {
        if (!square || !/^[a-h][1-8]$/.test(square)) {
            return null;
        }

        const file = "abcdefgh".indexOf(square[0]);
        const rank = parseInt(square[1], 10);
        if (file < 0 || !Number.isFinite(rank)) {
            return null;
        }

        const fileIndex = this.orientation === "white" ? file : (7 - file);
        const rankIndex = this.orientation === "white" ? (8 - rank) : (rank - 1);
        return {
            x: (fileIndex + 0.5) * 12.5,
            y: (rankIndex + 0.5) * 12.5
        };
    }

    clearArrows() {
        if (!this.arrowGroup) {
            return;
        }
        while (this.arrowGroup.firstChild) {
            this.arrowGroup.removeChild(this.arrowGroup.firstChild);
        }
    }

    drawArrow(fromSquare, toSquare, kind = "suggestion") {
        if (!this.arrowLayer || !this.arrowGroup) {
            this.ensureArrowLayer();
        }

        const from = this.squareCenter(fromSquare);
        const to = this.squareCenter(toSquare);
        if (!from || !to) {
            return;
        }

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.3) {
            return;
        }

        const shrink = Math.min(3.5, distance * 0.18);
        const targetX = to.x - (dx / distance) * shrink;
        const targetY = to.y - (dy / distance) * shrink;
        const normalX = distance > 0 ? (-dy / distance) : 0;
        const normalY = distance > 0 ? (dx / distance) : 0;
        const bend = Math.min(3.5, Math.max(0.6, distance * 0.1));
        const controlX = (from.x + targetX) / 2 + (normalX * bend);
        const controlY = (from.y + targetY) / 2 + (normalY * bend);
        const colorKind = kind === "threat" ? "threat" : "suggestion";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute(
            "d",
            `M ${from.x.toFixed(3)} ${from.y.toFixed(3)} Q ${controlX.toFixed(3)} ${controlY.toFixed(3)} ${targetX.toFixed(3)} ${targetY.toFixed(3)}`
        );
        path.setAttribute("class", `board-arrow board-arrow-${colorKind}`);
        path.setAttribute("marker-end", `url(#${this.arrowIdPrefix}-${colorKind})`);

        const tail = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        tail.setAttribute("cx", from.x.toFixed(3));
        tail.setAttribute("cy", from.y.toFixed(3));
        tail.setAttribute("r", "0.8");
        tail.setAttribute("class", `board-arrow-tail board-arrow-tail-${colorKind}`);

        this.arrowGroup.append(path, tail);
    }

    setFen(fen) {
        this.currentFen = fen;
        const map = fenMapFromFen(fen);

        this.squareMap.forEach((squareEl, square) => {
            const newPiece = map.get(square) || null;
            const currentImg = squareEl.querySelector("img");
            const currentPiece = currentImg ? currentImg.alt : null;

            if (newPiece === currentPiece) return;

            if (currentImg) {
                currentImg.remove();
            }

            if (newPiece) {
                squareEl.classList.add("occupied");
                const img = document.createElement("img");
                img.src = PIECE_IMAGE[newPiece];
                img.alt = newPiece;
                img.draggable = false;
                squareEl.appendChild(img);
            } else {
                squareEl.classList.remove("occupied");
            }
        });
    }

    animateMove(move, options = {}) {
        if (!move || !move.from || !move.to) {
            return;
        }

        const fromEl = this.squareMap.get(move.from);
        const toEl = this.squareMap.get(move.to);
        if (!fromEl || !toEl) {
            return;
        }

        const destinationImg = toEl.querySelector("img");
        if (!destinationImg) {
            return;
        }

        const pieceSymbol = options.pieceSymbol || pieceSymbolFromMove(move) || destinationImg.alt;
        const pieceSrc = PIECE_IMAGE[pieceSymbol];
        if (!pieceSrc) {
            return;
        }

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        if (!fromRect.width || !toRect.width) {
            return;
        }

        const ghost = document.createElement("img");
        ghost.className = "piece-glide-ghost";
        ghost.src = pieceSrc;
        ghost.alt = "";
        ghost.style.width = `${toRect.width * 0.88}px`;
        ghost.style.height = `${toRect.height * 0.88}px`;
        ghost.style.left = `${fromRect.left + (fromRect.width * 0.06)}px`;
        ghost.style.top = `${fromRect.top + (fromRect.height * 0.06)}px`;
        ghost.style.opacity = "0.96";

        document.body.appendChild(ghost);
        destinationImg.style.opacity = "0";

        const dx = toRect.left - fromRect.left;
        const dy = toRect.top - fromRect.top;
        const duration = Number.isFinite(options.durationMs) ? options.durationMs : 210;

        const cleanup = () => {
            if (ghost.parentNode) {
                ghost.parentNode.removeChild(ghost);
            }
            destinationImg.style.opacity = "";
        };

        if (ghost.animate) {
            const animation = ghost.animate(
                [
                    { transform: "translate(0px, 0px) scale(1)", opacity: 0.96 },
                    { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 0.86 }
                ],
                {
                    duration,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
                }
            );
            animation.onfinish = cleanup;
            animation.oncancel = cleanup;
            return;
        }

        ghost.style.transition = `transform ${duration}ms cubic-bezier(0.22,1,0.36,1), opacity ${duration}ms ease`;
        requestAnimationFrame(() => {
            ghost.style.transform = `translate(${dx}px, ${dy}px)`;
            ghost.style.opacity = "0.86";
        });
        window.setTimeout(cleanup, duration + 30);
    }

    clearHighlights() {
        this.squareMap.forEach((squareEl) => {
            squareEl.classList.remove("selected", "legal", "legal-capture", "last-from", "last-to", "hint-from", "hint-to", "preview-from", "preview-to", "premove-from", "premove-to");
            const dot = squareEl.querySelector(".legal-dot");
            if (dot) {
                dot.remove();
            }
        });
        this.clearArrows();
    }

    highlightSquares(squares, className) {
        squares.forEach((square) => {
            const squareEl = this.squareMap.get(square);
            if (squareEl) {
                squareEl.classList.add(className);
            }
        });
    }

    highlightLegalMoves(squares, fen) {
        const fenMap = fenMapFromFen(fen);
        squares.forEach((square) => {
            const squareEl = this.squareMap.get(square);
            if (squareEl) {
                squareEl.classList.add("legal");
                if (fenMap.has(square)) {
                    squareEl.classList.add("legal-capture");
                }
                const dot = document.createElement("div");
                dot.className = "legal-dot";
                squareEl.appendChild(dot);
            }
        });
    }
}

function playAudio(audioElement) {
    if (!audioElement) {
        return;
    }

    audioElement.currentTime = 0;
    audioElement.play().catch(() => { });
}

let errorAudioContext = null;

function playErrorSound() {
    const settings = getPlaySettings();
    if (!settings.sound || !settings.errorSound) {
        return;
    }

    try {
        if (typeof window === "undefined" || !window.AudioContext) {
            return;
        }

        if (!errorAudioContext) {
            errorAudioContext = new window.AudioContext();
        }

        const context = errorAudioContext;
        if (context.state === "suspended") {
            context.resume().catch(() => { });
        }

        const now = context.currentTime;
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.09);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    } catch {
        // ignore audio failures
    }
}

function parseInfoLine(message, fen) {
    if (!message.startsWith("info depth")) {
        return null;
    }

    const depthMatch = message.match(/\bdepth (\d+)/);
    const idMatch = message.match(/\bmultipv (\d+)/);
    const moveMatch = message.match(/\bpv ([a-h][1-8][a-h][1-8][nbrq]?)/);

    if (!depthMatch || !moveMatch) {
        return null;
    }

    const id = parseInt(idMatch ? idMatch[1] : "1", 10);
    const depth = parseInt(depthMatch[1], 10);

    const cpMatch = message.match(/\bscore cp (-?\d+)/);
    const mateMatch = message.match(/\bscore mate (-?\d+)/);
    let evaluation = null;

    if (cpMatch) {
        let value = parseInt(cpMatch[1], 10);
        if (fen.includes(" b ")) {
            value *= -1;
        }
        evaluation = sanitizeEngineEvaluation({ type: "cp", value });
    } else if (mateMatch) {
        let value = parseInt(mateMatch[1], 10);
        if (fen.includes(" b ")) {
            value *= -1;
        }
        evaluation = sanitizeEngineEvaluation({ type: "mate", value });
    }

    if (!evaluation) {
        return null;
    }

    return {
        id,
        depth,
        moveUCI: moveMatch[1],
        evaluation
    };
}

function eloToSkill(elo) {
    return clamp(Math.round((elo - 400) / 120), 0, 20);
}

function getEngineThreads() {
    if (typeof navigator === "undefined") {
        return 2;
    }
    const hw = Number(navigator.hardwareConcurrency || 2);
    if (!Number.isFinite(hw) || hw <= 1) {
        return 1;
    }
    return clamp(Math.floor(hw / 2), 1, 4);
}

function getEngineHashMb() {
    if (typeof navigator === "undefined") {
        return 96;
    }
    const memory = Number(navigator.deviceMemory || 4);
    if (!Number.isFinite(memory)) {
        return 96;
    }
    if (memory >= 12) return 192;
    if (memory >= 8) return 160;
    if (memory >= 4) return 128;
    return 64;
}

function createStockfishWorker(enginePath) {
    const normalizedPath = String(enginePath || "").toLowerCase();
    const moduleWorker = normalizedPath.includes("stockfish-18-standard-worker.js");
    if (moduleWorker) {
        return new Worker(enginePath, { type: "module" });
    }
    return new Worker(enginePath);
}

function runStockfishInternal(options, enginePath) {
    const {
        fen,
        depth,
        multipv,
        movetime,
        elo,
        timeoutMs = 60000
    } = options;

    return new Promise((resolve, reject) => {
        let worker;
        let timeoutId;
        let started = false;
        const linesById = new Map();
        let resolved = false;

        const cleanup = () => {
            clearTimeout(timeoutId);
            if (worker) {
                worker.terminate();
            }
        };

        try {
            worker = createStockfishWorker(enginePath);
        } catch (error) {
            reject(error);
            return;
        }

        timeoutId = setTimeout(() => {
            const partialLines = normalizeEngineLinesForFen(
                fen,
                Array.from(linesById.values()).sort((a, b) => a.id - b.id)
            );
            if (!resolved && partialLines.length > 0) {
                resolved = true;
                cleanup();
                resolve({
                    bestMove: partialLines[0].moveUCI || "",
                    lines: partialLines
                });
                return;
            }
            cleanup();
            reject(new Error("El motor tardo demasiado en responder."));
        }, timeoutMs);

        worker.onmessage = (event) => {
            const message = String(event.data || "");

            if (message === "uciok") {
                worker.postMessage(`setoption name Threads value ${getEngineThreads()}`);
                worker.postMessage(`setoption name Hash value ${getEngineHashMb()}`);
                worker.postMessage("setoption name UCI_AnalyseMode value true");
                worker.postMessage("setoption name Move Overhead value 20");
                worker.postMessage("setoption name Minimum Thinking Time value 15");
                worker.postMessage("setoption name Ponder value false");
                worker.postMessage("setoption name Use NNUE value true");
                worker.postMessage(`setoption name MultiPV value ${Math.max(1, multipv || 1)}`);

                if (elo) {
                    const boundedElo = clamp(elo, 400, 2800);
                    worker.postMessage("setoption name UCI_LimitStrength value true");
                    worker.postMessage(`setoption name UCI_Elo value ${boundedElo}`);
                    worker.postMessage(`setoption name Skill Level value ${eloToSkill(boundedElo)}`);
                } else {
                    worker.postMessage("setoption name UCI_LimitStrength value false");
                }

                worker.postMessage("isready");
                return;
            }

            if (message === "readyok" && !started) {
                started = true;
                worker.postMessage("ucinewgame");
                worker.postMessage(`position fen ${fen}`);

                if (movetime) {
                    worker.postMessage(`go movetime ${movetime}`);
                } else {
                    worker.postMessage(`go depth ${depth}`);
                }
                return;
            }

            const parsed = parseInfoLine(message, fen);
            if (parsed) {
                const existing = linesById.get(parsed.id);
                if (!existing || parsed.depth >= existing.depth) {
                    linesById.set(parsed.id, parsed);
                }
            }

            if (message.startsWith("bestmove")) {
                const bestMove = message.split(" ")[1] || "";
                const normalizedLines = normalizeEngineLinesForFen(
                    fen,
                    Array.from(linesById.values()).sort((a, b) => a.id - b.id)
                );
                const normalizedBest = normalizeUciMoveForFen(fen, bestMove);

                if (!resolved) {
                    resolved = true;
                    cleanup();

                    resolve({
                        bestMove: normalizedBest ? normalizedBest.uci : (normalizedLines[0] ? normalizedLines[0].moveUCI : ""),
                        lines: normalizedLines
                    });
                }
            }
        };

        worker.onerror = (error) => {
            cleanup();
            reject(error);
        };

        worker.postMessage("uci");
    });
}

const ENGINE_EVAL_CACHE = new Map();
let engineAssetWarm = false;

function buildEvalCacheKey(options) {
    return [
        options.fen || "",
        options.depth || "",
        options.multipv || "",
        options.movetime || "",
        options.elo || ""
    ].join("|");
}

async function warmEngineAsset() {
    if (engineAssetWarm) {
        return;
    }
    engineAssetWarm = true;
    await Promise.allSettled([
        fetch(ENGINE_PRIMARY, { cache: "force-cache" }),
        fetch(ENGINE_FALLBACK, { cache: "force-cache" })
    ]);
}

async function evaluateWithStockfish(options) {
    const startedAt = nowMs();
    if (engineModule && engineModule.evaluateWithStockfish) {
        try {
            const value = await engineModule.evaluateWithStockfish(options);
            markFirstEvalMetric(nowMs() - startedAt);
            return value;
        } catch {
            // Continue with inline fallback path below.
        }
    }

    // Fallback to inline implementation
    const cacheKey = buildEvalCacheKey(options);
    const cached = ENGINE_EVAL_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.at) < 2200) {
        markFirstEvalMetric(nowMs() - startedAt);
        return cached.value;
    }

    await warmEngineAsset();

    try {
        const value = await runStockfishInternal(options, ENGINE_PRIMARY);
        ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
        markFirstEvalMetric(nowMs() - startedAt);
        return value;
    } catch {
        try {
            const value = await runStockfishInternal(options, ENGINE_FALLBACK);
            ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
            markFirstEvalMetric(nowMs() - startedAt);
            return value;
        } catch {
            const emergencyOptions = {
                ...options,
                multipv: 1,
                movetime: clamp(Number(options.movetime || 900), 350, 1400),
                depth: clamp(Number(options.depth || 10), 8, 14),
                timeoutMs: 30000
            };
            const value = await runStockfishInternal(emergencyOptions, ENGINE_FALLBACK);
            ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
            markFirstEvalMetric(nowMs() - startedAt);
            return value;
        }
    }
}

function uciToSanFromFen(fen, uciMove) {
    if (engineModule && engineModule.uciToSanFromFen) {
        return engineModule.uciToSanFromFen(fen, uciMove);
    }

    const normalized = normalizeUciMoveForFen(fen, uciMove);
    return normalized ? normalized.san : String(uciMove || "");
}

/* ===== Promotion Modal ===== */

let promotionResolve = null;

function showPromotionModal(color) {
    const prefix = color === "white" ? "white" : "black";
    const pieceNames = { q: "queen", r: "rook", b: "bishop", n: "knight" };

    el.promoPieces.forEach((btn) => {
        const piece = btn.dataset.piece;
        const img = btn.querySelector("img");
        if (img && pieceNames[piece]) {
            img.src = `/static/media/${prefix}_${pieceNames[piece]}.svg`;
        }
    });

    el.promotionModal.classList.add("visible");

    return new Promise((resolve) => {
        promotionResolve = resolve;
    });
}

function hidePromotionModal() {
    el.promotionModal.classList.remove("visible");
}

/* ===== Eval Bar ===== */

function updateEvalBar(evaluation) {
    updateEvalBarElements(evaluation, el.evalBar, el.evalFill, el.evalLabelWhite, el.evalLabelBlack);
}

function updatePlayEvalBar(evaluation) {
    if (!el.playEvalBar || !el.playEvalFill) return;
    let whitePercent = 50;
    if (evaluation) {
        if (evaluation.type === "mate") {
            whitePercent = evaluation.value > 0 ? 100 : (evaluation.value < 0 ? 0 : 50);
        } else {
            const cp = evaluation.value / 100;
            whitePercent = 50 + 50 * (2 / (1 + Math.exp(-0.4 * cp)) - 1);
            whitePercent = clamp(whitePercent, 2, 98);
        }
    }
    el.playEvalFill.style.height = `${whitePercent}%`;
    if (el.playEvalLabelWhite && el.playEvalLabelBlack && playState) {
        const text = formatEvalForPlayer(evaluation);
        const playerVal = evaluation ? getEvalValueForPlayer(evaluation) : 0;
        if (playState.playerColor === "white") {
            if (!evaluation || playerVal >= 0) {
                el.playEvalLabelWhite.textContent = text;
                el.playEvalLabelBlack.textContent = "";
            } else {
                el.playEvalLabelBlack.textContent = text;
                el.playEvalLabelWhite.textContent = "";
            }
        } else {
            if (!evaluation || playerVal >= 0) {
                el.playEvalLabelBlack.textContent = text;
                el.playEvalLabelWhite.textContent = "";
            } else {
                el.playEvalLabelWhite.textContent = text;
                el.playEvalLabelBlack.textContent = "";
            }
        }
    }
}

function updateEvalBarElements(evaluation, barEl, fillEl, whiteLbl, blackLbl) {
    if (!barEl || !fillEl) {
        return;
    }

    let whitePercent = 50;

    if (evaluation) {
        if (evaluation.type === "mate") {
            whitePercent = evaluation.value > 0 ? 100 : (evaluation.value < 0 ? 0 : 50);
        } else {
            const cp = evaluation.value / 100;
            whitePercent = 50 + 50 * (2 / (1 + Math.exp(-0.4 * cp)) - 1);
            whitePercent = clamp(whitePercent, 2, 98);
        }
    }

    fillEl.style.height = `${whitePercent}%`;

    if (whiteLbl && blackLbl) {
        const evalText = formatEval(evaluation);
        if (!evaluation || evaluation.value >= 0) {
            whiteLbl.textContent = evalText;
            blackLbl.textContent = "";
        } else {
            blackLbl.textContent = evalText;
            whiteLbl.textContent = "";
        }
    }
}

/* ===== Play State ===== */

const PLAY_MODES = {
    CASUAL: "casual",
    RANKED: "ranked",
    COACH: "coach"
};

const RANKED_FORCED_SETTINGS = {
    coachAuto: false,
    hints: false,
    moveComments: false,
    computer: true,
    takebacks: false,
    evalBar: false,
    legalMoves: false,
    threatArrows: false,
    suggestionArrows: false
};

const playState = {
    board: new BoardView(el.playBoard, { orientation: "white", interactive: true, showCoordinates: true }),
    game: new Chess(),
    playerColor: "white",
    botColor: "black",
    gameMode: PLAY_MODES.CASUAL,
    gameType: "standard",
    botElo: 1200,
    selectedSquare: null,
    legalTargets: [],
    hintMove: null,
    lastMove: null,
    thinking: false,
    coaching: false,
    sessionId: 0,
    lastEvalBefore: null,
    lastEvalAfter: null,
    moveClassifications: {},
    moveOpeningDetails: {},
    previewMove: null,       // {from, to} for visual preview highlight
    pendingConfirmMove: null, // {from, to, san, promotion} awaiting yes/no
    premove: null, // {from,to,promotion}
    computerTopLines: [],    // latest engine top lines for computer panel
    computerTopLinesFen: "",
    moveHistory: [],         // persistent move history until new game
    pendingEvaluations: 0,
    startTime: null,         // track game duration
    endgameShown: false,
    manualGameOver: null,    // { title, reason, winner } for resign outcomes
    lastRankedProfileDelta: null, // summary of profile changes after a ranked game
    lastAnimatedMoveKey: "",
    clockConfigSeconds: 0,
    clockRemainingMs: { white: 0, black: 0 },
    clockActiveSide: null,
    clockLastTickAt: 0,
    clockTimerId: null,
    engineFallbackNotified: false
};

const progressState = {
    persistedGameSession: null,
    remoteHydrated: false,
    remoteSyncTimer: null,
    remoteSyncInFlight: false
};

const authState = {
    authenticated: false,
    username: "",
    busy: false
};

const perfState = {
    firstEvalMs: null,
    explorerLatencyMs: null,
    memoryBytes: null
};

const aiRuntimeState = {
    inFlight: false,
    lastSentAt: 0,
    minIntervalMs: 3500,
    minResponseDelayMs: 1100
};

const sessionRuntimeState = {
    saveTimer: null,
    restorePayload: readStored("session.snapshot", null)
};

const openingExplorerState = {
    rootFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rows: [],
    filteredRows: [],
    visibleRows: [],
    selectedNode: null,
    detailBoard: null,
    loading: false,
    focusedIndex: 0,
    collapsedIds: new Set(),
    filterRunId: 0
};

const profileState = {
    games: [],
    eloTimeline: []
};

const lessonState = {
    board: null,
    selectedLessonId: null,
    selectedExerciseIndex: 0,
    progressByLesson: {}
};

function normalizePlayMode(value) {
    const v = String(value || "").toLowerCase();
    if (v === PLAY_MODES.RANKED) return PLAY_MODES.RANKED;
    if (v === PLAY_MODES.COACH) return PLAY_MODES.COACH;
    return PLAY_MODES.CASUAL;
}

function getSelectedPlayMode() {
    return normalizePlayMode(el.playMode ? el.playMode.value : PLAY_MODES.CASUAL);
}

function normalizeGameType(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "training" || normalized === "challenge") {
        return normalized;
    }
    return "standard";
}

function isPlayGameOver() {
    return playState.game.isGameOver() || Boolean(playState.manualGameOver);
}

function isRankedActiveGame() {
    return normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED
        && Boolean(playState.startTime)
        && !isPlayGameOver();
}

function getRankedLockedControls() {
    return [
        el.setCoachAuto,
        el.setHints,
        el.setMoveComments,
        el.setComputer,
        el.setTakebacks,
        el.setEvalBar,
        el.setLegal,
        el.setThreatArrows,
        el.setSuggestionArrows
    ];
}

function enforceRankedSettings() {
    if (el.setCoachAuto) el.setCoachAuto.checked = RANKED_FORCED_SETTINGS.coachAuto;
    if (el.setHints) el.setHints.checked = RANKED_FORCED_SETTINGS.hints;
    if (el.setMoveComments) el.setMoveComments.checked = RANKED_FORCED_SETTINGS.moveComments;
    if (el.setComputer) el.setComputer.checked = RANKED_FORCED_SETTINGS.computer;
    if (el.setTakebacks) el.setTakebacks.checked = RANKED_FORCED_SETTINGS.takebacks;
    if (el.setEvalBar) el.setEvalBar.checked = RANKED_FORCED_SETTINGS.evalBar;
    if (el.setLegal) el.setLegal.checked = RANKED_FORCED_SETTINGS.legalMoves;
    if (el.setThreatArrows) el.setThreatArrows.checked = RANKED_FORCED_SETTINGS.threatArrows;
    if (el.setSuggestionArrows) el.setSuggestionArrows.checked = RANKED_FORCED_SETTINGS.suggestionArrows;
}

function refreshPlayModeUiState() {
    const requiresAuth = !authState.authenticated;
    const rankedSelected = getSelectedPlayMode() === PLAY_MODES.RANKED;
    const rankedLive = isRankedActiveGame();
    const activeGame = Boolean(playState.startTime) && !isPlayGameOver();
    const lockControls = rankedSelected || rankedLive;
    const lockColorSelector = rankedSelected || rankedLive;

    if (lockControls) {
        enforceRankedSettings();
    }

    getRankedLockedControls().forEach((control) => {
        if (control) {
            control.disabled = lockControls;
        }
    });

    if (el.playerColor) {
        if (rankedSelected) {
            el.playerColor.value = "random";
        }
        el.playerColor.disabled = lockColorSelector;
    }

    const coachSelected = getSelectedPlayMode() === PLAY_MODES.COACH;
    const coachLive = normalizePlayMode(playState.gameMode) === PLAY_MODES.COACH && Boolean(playState.startTime) && !isPlayGameOver();

    if (el.playModeNote) {
        if (requiresAuth) {
            el.playModeNote.textContent = "Inicia sesion para jugar y guardar datos en tu perfil.";
        } else if (coachSelected || coachLive) {
            el.playModeNote.textContent = "\ud83c\udf93 Jugar con Entrenador: el coach te guia en cada turno y al final revisamos la partida juntos.";
        } else {
            el.playModeNote.textContent = rankedSelected || rankedLive
                ? "Clasificatoria: color aleatorio (blancas/negras) y sin ayudas. Solo este modo suma perfil."
                : "Clasica: usa tus ajustes libremente. No suma estadisticas del perfil.";
        }
    }

    if (el.playHintBtn) {
        el.playHintBtn.disabled = rankedLive;
    }
    if (el.playUndoBtn) {
        el.playUndoBtn.disabled = rankedLive;
    }
    if (el.playResignBtn) {
        el.playResignBtn.disabled = !playState.startTime || isPlayGameOver();
    }
    if (el.playStartBtn) {
        el.playStartBtn.disabled = requiresAuth;
    }
    if (el.playSettingsBtn) {
        el.playSettingsBtn.style.display = (coachSelected || coachLive) ? "none" : "";
    }
    if (el.setTimeControl) {
        el.setTimeControl.disabled = activeGame;
    }
    if (el.setGameType) {
        if (rankedSelected || rankedLive) {
            el.setGameType.value = "standard";
        }
        el.setGameType.disabled = activeGame || rankedSelected || rankedLive;
    }
}

function getRankedGamesOnly(games) {
    const source = Array.isArray(games) ? games : [];
    return source.filter((game) => {
        if (!game || typeof game !== "object") {
            return false;
        }
        return normalizePlayMode(game.mode) === PLAY_MODES.RANKED || game.ranked === true;
    });
}

function getPlaySettings() {
    const rawTimeControl = parseInt(el.setTimeControl ? el.setTimeControl.value : "0", 10);
    return {
        showLegal: el.setLegal ? el.setLegal.checked : true,
        showLastMove: el.setLastMove ? el.setLastMove.checked : true,
        autoCoach: el.setCoachAuto ? el.setCoachAuto.checked : true,
        showCoordinates: el.setCoordinates ? el.setCoordinates.checked : true,
        sound: el.setSound ? el.setSound.checked : true,
        errorSound: el.setErrorSound ? el.setErrorSound.checked : true,
        uiTheme: el.setUiTheme ? el.setUiTheme.value : "dark",
        pieceAnimation: el.setPieceAnim ? el.setPieceAnim.checked : true,
        premoveEnabled: el.setPremove ? el.setPremove.checked : true,
        autoPromotion: el.setAutoPromo ? el.setAutoPromo.checked : true,
        showEvalBar: el.setEvalBar ? el.setEvalBar.checked : true,
        hintsEnabled: el.setHints ? el.setHints.checked : true,
        takebacksEnabled: el.setTakebacks ? el.setTakebacks.checked : true,
        computerEnabled: el.setComputer ? el.setComputer.checked : true,
        moveComments: el.setMoveComments ? el.setMoveComments.checked : true,
        threatArrows: el.setThreatArrows ? el.setThreatArrows.checked : false,
        suggestionArrows: el.setSuggestionArrows ? el.setSuggestionArrows.checked : false,
        timeControlSeconds: Number.isFinite(rawTimeControl) ? clamp(rawTimeControl, 0, 1800) : 0,
        gameType: normalizeGameType(el.setGameType ? el.setGameType.value : "standard"),
        boardTheme: el.setBoardTheme ? el.setBoardTheme.value : "classic",
        pieceTheme: el.setPieceTheme ? el.setPieceTheme.value : "default"
    };
}

function setComputerTopLines(lines, fen, options = {}) {
    const normalize = options.normalize !== false;
    const source = Array.isArray(lines) ? lines : [];
    const normalized = normalize ? normalizeEngineLinesForFen(fen, source) : source;
    playState.computerTopLines = normalized;
    playState.computerTopLinesFen = normalized.length > 0 ? String(fen || "") : "";
}

function clearComputerTopLines() {
    playState.computerTopLines = [];
    playState.computerTopLinesFen = "";
}

function formatClockMs(ms) {
    const safeMs = Math.max(0, Math.trunc(Number(ms) || 0));
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function stopPlayClockTimer() {
    if (playState.clockTimerId) {
        clearInterval(playState.clockTimerId);
        playState.clockTimerId = null;
    }
}

function renderPlayClock() {
    if (!el.playClockStrip || !el.playClockPlayer || !el.playClockBot) {
        return;
    }

    const enabled = Boolean(playState.startTime)
        && !isPlayGameOver()
        && Number(playState.clockConfigSeconds) > 0;
    if (!enabled) {
        el.playClockStrip.style.display = "none";
        return;
    }

    el.playClockStrip.style.display = "";
    const playerMs = playState.playerColor === "white"
        ? playState.clockRemainingMs.white
        : playState.clockRemainingMs.black;
    const botMs = playState.botColor === "white"
        ? playState.clockRemainingMs.white
        : playState.clockRemainingMs.black;

    el.playClockPlayer.textContent = `Tu reloj: ${formatClockMs(playerMs)}`;
    el.playClockBot.textContent = `Bot: ${formatClockMs(botMs)}`;

    el.playClockPlayer.classList.toggle("is-active", playState.clockActiveSide === playState.playerColor);
    el.playClockBot.classList.toggle("is-active", playState.clockActiveSide === playState.botColor);
    el.playClockPlayer.classList.toggle("is-low", playerMs <= 15000);
    el.playClockBot.classList.toggle("is-low", botMs <= 15000);
}

function settleActiveClock(now = Date.now()) {
    if (Number(playState.clockConfigSeconds) <= 0 || !playState.clockActiveSide) {
        return;
    }

    const elapsed = Math.max(0, Number(now) - Number(playState.clockLastTickAt || now));
    if (elapsed <= 0) {
        return;
    }

    const key = playState.clockActiveSide === "black" ? "black" : "white";
    playState.clockRemainingMs[key] = Math.max(0, (playState.clockRemainingMs[key] || 0) - elapsed);
    playState.clockLastTickAt = now;
}

function handleTimeForfeit(flaggedSide) {
    if (isPlayGameOver()) {
        return;
    }

    stopPlayClockTimer();
    const side = flaggedSide === "black" ? "black" : "white";
    const winner = side === "white" ? "Negras" : "Blancas";
    const playerLost = side === playState.playerColor;
    const title = playerLost ? "Derrota" : "Victoria";
    const reason = "por tiempo";

    if (side === "white") {
        playState.clockRemainingMs.white = 0;
    } else {
        playState.clockRemainingMs.black = 0;
    }

    playState.manualGameOver = { title, reason, winner };
    showEndgameSummary(title, reason, winner);
    setCoachMessage(coachNotice("game", `${title} - ${reason}`));
    if (getPlaySettings().sound) {
        playAudio(el.fxEnd);
    }
    renderPlayBoard();
    renderPlayStatus();
    scheduleSessionSnapshotSave();
}

function tickPlayClock() {
    if (Number(playState.clockConfigSeconds) <= 0 || !playState.startTime || isPlayGameOver()) {
        stopPlayClockTimer();
        renderPlayClock();
        return;
    }

    if (!playState.clockActiveSide) {
        playState.clockActiveSide = sideFromTurn(playState.game.turn());
        playState.clockLastTickAt = Date.now();
    }

    settleActiveClock(Date.now());
    const key = playState.clockActiveSide === "black" ? "black" : "white";
    if ((playState.clockRemainingMs[key] || 0) <= 0) {
        handleTimeForfeit(playState.clockActiveSide);
        return;
    }

    renderPlayClock();
}

function switchPlayClockTo(side) {
    if (Number(playState.clockConfigSeconds) <= 0 || !playState.startTime || isPlayGameOver()) {
        return;
    }

    const target = side === "black" ? "black" : "white";
    const now = Date.now();
    settleActiveClock(now);
    playState.clockActiveSide = target;
    playState.clockLastTickAt = now;
    renderPlayClock();
}

function syncPlayClockState() {
    const seconds = Number(getPlaySettings().timeControlSeconds || 0);
    const shouldRun = Boolean(playState.startTime) && !isPlayGameOver() && seconds > 0;

    if (!shouldRun) {
        playState.clockConfigSeconds = seconds;
        playState.clockActiveSide = null;
        playState.clockLastTickAt = 0;
        stopPlayClockTimer();
        renderPlayClock();
        return;
    }

    if (playState.clockConfigSeconds !== seconds || !Number.isFinite(playState.clockRemainingMs.white)) {
        const initialMs = seconds * 1000;
        playState.clockConfigSeconds = seconds;
        playState.clockRemainingMs = { white: initialMs, black: initialMs };
        playState.clockActiveSide = sideFromTurn(playState.game.turn());
        playState.clockLastTickAt = Date.now();
    }

    if (!playState.clockTimerId) {
        playState.clockTimerId = setInterval(tickPlayClock, 200);
    }

    const turnSide = sideFromTurn(playState.game.turn());
    if (playState.clockActiveSide !== turnSide) {
        switchPlayClockTo(turnSide);
    } else if (!playState.clockLastTickAt) {
        playState.clockLastTickAt = Date.now();
    }

    renderPlayClock();
}

function resetPlayClockForNewGame() {
    stopPlayClockTimer();
    const seconds = Number(getPlaySettings().timeControlSeconds || 0);
    playState.clockConfigSeconds = seconds;
    if (seconds > 0) {
        const initialMs = seconds * 1000;
        playState.clockRemainingMs = { white: initialMs, black: initialMs };
        playState.clockActiveSide = sideFromTurn(playState.game.turn());
        playState.clockLastTickAt = Date.now();
        playState.clockTimerId = setInterval(tickPlayClock, 200);
    } else {
        playState.clockRemainingMs = { white: 0, black: 0 };
        playState.clockActiveSide = null;
        playState.clockLastTickAt = 0;
    }
    renderPlayClock();
}

function getEvalValueForSide(evaluation, side) {
    if (!evaluation) return 0;
    const flip = side === "black" ? -1 : 1;
    return evalToCp(evaluation) * flip;
}

function getEvalValueForPlayer(evaluation) {
    return getEvalValueForSide(evaluation, playState.playerColor);
}

function formatEvalForPlayer(evaluation) {
    if (!evaluation) return "--";
    const playerValue = getEvalValueForPlayer(evaluation);
    if (evaluation.type === "mate") {
        if (playerValue === 0) return "M0";
        const matePly = clamp(Math.trunc(Math.abs(playerValue)), 0, MAX_ENGINE_MATE_PLY);
        if (matePly >= MATE_DISPLAY_CAP) {
            return `${playerValue > 0 ? "+" : "-"}M${MATE_DISPLAY_CAP}+`;
        }
        return `${playerValue > 0 ? "+" : "-"}M${matePly}`;
    }
    const cpValue = clamp(Math.trunc(playerValue), -MAX_ENGINE_CP, MAX_ENGINE_CP);
    return `${cpValue >= 0 ? "+" : "-"}${Math.abs(cpValue / 100).toFixed(2)}`;
}

const COACH_PREFIX = {
    info: "\u2139\ufe0f",
    tip: "\ud83d\udca1",
    ok: "\u2713",
    warn: "\u26a0\ufe0f",
    error: "\u274c",
    engine: "\u2699\ufe0f",
    bot: "\ud83e\udd16",
    game: "\u265f",
    setup: "\u2726"
};

const COACH_SPEECH_RATE = 0.92;
const COACH_SPEECH_PITCH = 1.06;
const COACH_SPEECH_VOLUME = 1;
const COACH_SPEECH_MIN_INTERVAL_MS = 1200;
const COACH_SPEECH_MAX_LENGTH = 280;

const coachSpeechState = {
    enabled: true,
    voice: null,
    loaded: false,
    lastText: "",
    lastAt: 0
};

function coachNotice(type, text) {
    const icon = COACH_PREFIX[type] || COACH_PREFIX.info;
    return `${icon} ${text}`;
}

function stripCoachSpeechText(value) {
    const raw = String(value || "");
    const noEmojis = raw.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
    const cleaned = noEmojis
        .replace(/[\u2600-\u27BF]/g, " ")
        .replace(/[•·]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!cleaned) return "";
    if (cleaned.length <= COACH_SPEECH_MAX_LENGTH) return cleaned;
    return `${cleaned.slice(0, COACH_SPEECH_MAX_LENGTH - 1)}…`;
}

function loadCoachVoice() {
    if (!("speechSynthesis" in window)) {
        return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (!Array.isArray(voices) || voices.length === 0) {
        return;
    }
    const esVoices = voices.filter((v) => /^es(-|$)/i.test(v.lang || ""));
    const preferNatural = esVoices.find((v) => /Google|Microsoft|Natural|Premium|Daniel|Paulina|Sabina|Monica/i.test(v.name || ""));
    const preferEs = preferNatural || esVoices[0] || voices.find((v) => /^es(-|$)/i.test(v.lang || ""));
    const preferEn = voices.find((v) => /^en(-|$)/i.test(v.lang || ""));
    coachSpeechState.voice = preferEs || preferEn || voices[0] || null;
    coachSpeechState.loaded = true;
}

function updateCoachVoiceButton() {
    if (!el.crVoiceBtn) return;
    const muted = !coachSpeechState.enabled;
    el.crVoiceBtn.classList.toggle("is-muted", muted);
    el.crVoiceBtn.textContent = muted ? "\ud83d\udd07" : "\ud83d\udd0a";
    el.crVoiceBtn.setAttribute("aria-label", muted ? "Activar voz del entrenador" : "Silenciar voz del entrenador");
    el.crVoiceBtn.setAttribute("aria-pressed", muted ? "true" : "false");
}

function stopCoachSpeech() {
    if (!("speechSynthesis" in window)) {
        return;
    }
    window.speechSynthesis.cancel();
}

function speakCoachText(message, options = {}) {
    if (!coachSpeechState.enabled || !("speechSynthesis" in window)) {
        return;
    }

    const force = Boolean(options.force);
    const text = stripCoachSpeechText(message);
    if (!text) {
        return;
    }

    const now = Date.now();
    if (!force && text === coachSpeechState.lastText && (now - coachSpeechState.lastAt) < 5000) {
        return;
    }
    if (!force && (now - coachSpeechState.lastAt) < COACH_SPEECH_MIN_INTERVAL_MS) {
        return;
    }

    if (!coachSpeechState.loaded) {
        loadCoachVoice();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (coachSpeechState.voice) {
        utterance.voice = coachSpeechState.voice;
        utterance.lang = coachSpeechState.voice.lang || "es-ES";
    } else {
        utterance.lang = "es-ES";
    }
    utterance.rate = COACH_SPEECH_RATE;
    utterance.pitch = COACH_SPEECH_PITCH;
    utterance.volume = COACH_SPEECH_VOLUME;

    stopCoachSpeech();
    window.speechSynthesis.speak(utterance);
    coachSpeechState.lastText = text;
    coachSpeechState.lastAt = now;
}

function setTextWithOptionalOpeningLink(container, message, openingContext) {
    if (!container) {
        return;
    }

    container.innerHTML = "";

    const openingName = openingContext && openingContext.openingName;
    if (!openingName) {
        container.textContent = message;
        return;
    }

    const sourceText = String(message || "");
    const sourceLower = sourceText.toLowerCase();
    const openingLower = String(openingName).toLowerCase();
    const index = sourceLower.indexOf(openingLower);

    if (index === -1) {
        container.appendChild(document.createTextNode(sourceText));
        container.appendChild(document.createTextNode(" "));
        container.appendChild(createOpeningStudyLink(openingName, openingContext, "compact"));
        return;
    }

    const before = sourceText.slice(0, index);
    const after = sourceText.slice(index + openingName.length);

    if (before) {
        container.appendChild(document.createTextNode(before));
    }

    container.appendChild(createOpeningStudyLink(openingName, openingContext, "inline"));

    if (after) {
        container.appendChild(document.createTextNode(after));
    }
}

function setCoachMessage(message, options = {}) {
    const openingContext = options && options.openingName
        ? {
            openingName: options.openingName,
            openingFen: options.openingFen || null,
            historyLine: options.historyLine || null
        }
        : null;

    if (el.coachMessage) {
        setTextWithOptionalOpeningLink(el.coachMessage, message, openingContext);
    }

    if (!el.coachHistoryContainer) {
        return;
    }

    const msgEl = document.createElement("p");
    msgEl.className = "coach-msg";
    setTextWithOptionalOpeningLink(msgEl, message, openingContext);

    el.coachHistoryContainer.appendChild(msgEl);
    el.coachHistoryContainer.scrollTop = el.coachHistoryContainer.scrollHeight;
    scheduleSessionSnapshotSave();

    const forceSpeech = Boolean(options && options.forceSpeech);
    const shouldSpeakByMode = isCoachMode()
        && Boolean(playState.startTime)
        && !isPlayGameOver();
    if (forceSpeech || shouldSpeakByMode) {
        speakCoachText(message, { force: forceSpeech });
    }
}

/* ===== Move Classification (chess.com style) ===== */

const MOVE_CLASSES = [
    { key: "brilliant", label: "\u00a1Brillante!", icon: "\u2b50", maxLoss: -30 },  // gained >30 cp unexpectedly
    { key: "great", label: "\u00a1Gran jugada!", icon: "\ud83d\udd25", maxLoss: 0 },
    { key: "best", label: "Mejor jugada", icon: "\u2705", maxLoss: 10 },
    { key: "excellent", label: "Excelente", icon: "\ud83d\udfe2", maxLoss: 18 },
    { key: "good", label: "Buena jugada", icon: "\ud83d\udc4d", maxLoss: 30 },
    { key: "book", label: "Jugada te\u00f3rica", icon: "\ud83d\udcda", maxLoss: 0 }, // special
    { key: "inaccuracy", label: "Imprecisi\u00f3n", icon: "\u26a0\ufe0f", maxLoss: 100 },
    { key: "mistake", label: "Error", icon: "\u274c", maxLoss: 250 },
    { key: "blunder", label: "\u00a1Desastre!", icon: "\ud83d\udca5", maxLoss: Infinity }
];

function cpToExpectedPointsForWhite(cp) {
    const safe = clamp(Number(cp || 0), -2000, 2000);
    return 1 / (1 + Math.exp(-safe / 220));
}

function getExpectedPointsForMover(cp, moverIsWhite) {
    const whitePoints = cpToExpectedPointsForWhite(cp);
    return moverIsWhite ? whitePoints : (1 - whitePoints);
}

function classifyMove(cpLoss, isBookMove, previousEvalCp = 0, currentEvalCp = 0, moverIsWhite = true) {
    if (isBookMove) return MOVE_CLASSES.find(c => c.key === "book");
    const beforePoints = getExpectedPointsForMover(previousEvalCp, moverIsWhite);
    const afterPoints = getExpectedPointsForMover(currentEvalCp, moverIsWhite);
    const expectedLoss = Math.max(0, beforePoints - afterPoints);
    const expectedGain = Math.max(0, afterPoints - beforePoints);

    // Chess.com style: classify by expected points lost/won.
    if (expectedGain >= 0.18 && cpLoss <= -120) return MOVE_CLASSES.find(c => c.key === "brilliant");
    if (expectedGain >= 0.08 && cpLoss <= -45) return MOVE_CLASSES.find(c => c.key === "great");
    if (expectedLoss <= 0.004) return MOVE_CLASSES.find(c => c.key === "best");
    if (expectedLoss <= 0.012) return MOVE_CLASSES.find(c => c.key === "excellent");
    if (expectedLoss < 0.02) return MOVE_CLASSES.find(c => c.key === "good");
    if (expectedLoss < 0.05) return MOVE_CLASSES.find(c => c.key === "inaccuracy");
    if (expectedLoss < 0.10) return MOVE_CLASSES.find(c => c.key === "mistake");
    return MOVE_CLASSES.find(c => c.key === "blunder");
}

function normalizeCpLossNoise(cpLoss, cpBefore, cpAfter, historyPly, hasOpeningContext) {
    const raw = Number(cpLoss);
    const before = Number(cpBefore);
    const after = Number(cpAfter);
    if (!Number.isFinite(raw) || !Number.isFinite(before) || !Number.isFinite(after)) {
        return raw;
    }

    const delta = Math.abs(after - before);
    const inOpeningWindow = Number.isFinite(historyPly) && historyPly <= 20;
    const neutralBand = Math.abs(before) <= 140 && Math.abs(after) <= 140;

    // Very small swings are mostly engine noise at fast depth.
    if (delta <= 24) {
        return 0;
    }

    // Opening positions fluctuate naturally; soften penalties for low-impact choices.
    if (inOpeningWindow && neutralBand && delta <= 70) {
        if (raw > 0) return Math.min(raw, 24);
        return Math.max(raw, -24);
    }

    // If the move is still in an identified opening family, avoid over-penalizing.
    if (hasOpeningContext && raw > 0 && delta <= 90) {
        return Math.min(raw, 30);
    }

    return raw;
}

function evalToCp(evaluation) {
    if (!evaluation) return 0;
    if (evaluation.type === "mate") {
        const value = clamp(Math.trunc(Number(evaluation.value) || 0), -MAX_ENGINE_MATE_PLY, MAX_ENGINE_MATE_PLY);
        return value > 0 ? 10000 : (value < 0 ? -10000 : 0);
    }
    return clamp(Math.trunc(Number(evaluation.value) || 0), -MAX_ENGINE_CP, MAX_ENGINE_CP); // centipawns
}

function showMoveBadge(classification, sideLabel = "", detail = "", detailContext = null) {
    if (!el.playMoveBadge) return;
    el.playMoveBadge.className = `move-badge ${classification.key}`;
    el.playMoveBadge.innerHTML = "";

    const mainText = document.createElement("span");
    mainText.className = "move-badge-main";
    mainText.textContent = `${classification.icon} ${sideLabel ? `${sideLabel}: ` : ""}${classification.label}`;
    el.playMoveBadge.appendChild(mainText);

    if (detail) {
        el.playMoveBadge.appendChild(document.createTextNode(" \u2022 "));

        if (classification.key === "book") {
            el.playMoveBadge.appendChild(createOpeningStudyLink(detail, detailContext || { openingName: detail }, "badge"));
        } else {
            el.playMoveBadge.appendChild(document.createTextNode(detail));
        }
    }

    el.playMoveBadge.style.display = "inline-flex";
    // re-trigger animation
    el.playMoveBadge.style.animation = "none";
    void el.playMoveBadge.offsetHeight;
    el.playMoveBadge.style.animation = "";
}

function hideMoveBadge() {
    if (el.playMoveBadge) el.playMoveBadge.style.display = "none";
}

function decorateMoveSpan(span, isPlayerMove, classificationKey, moveIndex) {
    span.classList.add(isPlayerMove ? "is-player-move" : "is-rival-move");

    const ownerTag = document.createElement("span");
    ownerTag.className = `move-owner-tag ${isPlayerMove ? "player" : "rival"}`;
    ownerTag.textContent = isPlayerMove ? "TU" : "RIVAL";
    span.prepend(ownerTag);

    if (!classificationKey) {
        return;
    }

    const label = CLASSIFICATION_LABEL[classificationKey];
    if (!label) {
        return;
    }

    if (classificationKey === "book") {
        const openingDetail = playState.moveOpeningDetails[moveIndex];
        if (openingDetail && openingDetail.name) {
            const openingLink = createOpeningStudyLink(
                openingDetail.name,
                {
                    openingName: openingDetail.name,
                    openingFen: openingDetail.fen || null,
                    historyLine: openingDetail.line || null
                },
                "mini"
            );
            span.appendChild(openingLink);
        }
    }

    const clsTag = document.createElement("span");
    clsTag.className = `move-cls-label cls-${classificationKey}`;
    clsTag.textContent = label;
    span.appendChild(clsTag);
}

function buildMoveSpanContent(san, dotColor, symbol) {
    const frag = document.createDocumentFragment();
    const dot = document.createElement("span");
    dot.className = "move-cls-dot";
    dot.style.background = dotColor;
    frag.appendChild(dot);
    const text = document.createElement("span");
    text.className = "move-san-text";
    text.textContent = san;
    frag.appendChild(text);
    if (symbol) {
        const sym = document.createElement("span");
        sym.className = "move-cls-sym";
        sym.style.color = dotColor;
        sym.textContent = symbol;
        frag.appendChild(sym);
    }
    return frag;
}

function renderPlayMoveList() {
    if (!el.playMoveList) return;
    const history = playState.game.history({ verbose: true });
    el.playMoveList.innerHTML = "";
    const playerIsWhite = playState.playerColor === "white";

    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const wMove = history[i];
        const bMove = history[i + 1];

        const li = document.createElement("li");

        const numSpan = document.createElement("span");
        numSpan.className = "move-num";
        numSpan.textContent = `${moveNumber}.`;

        const wSpan = document.createElement("span");
        wSpan.className = "move-san";
        let wCls = playState.moveClassifications[i];
        if (wCls) {
            const dotColor = CLASSIFICATION_DOT_COLOR[wCls] || "#888";
            const symbol = CLASSIFICATION_SYMBOL[wCls] || "";
            wSpan.appendChild(buildMoveSpanContent(wMove.san, dotColor, symbol));
            wSpan.classList.add(`cls-${wCls}`);
        } else {
            const wText = document.createElement("span");
            wText.className = "move-san-text";
            wText.textContent = wMove.san;
            wSpan.appendChild(wText);
        }
        decorateMoveSpan(wSpan, playerIsWhite, wCls, i);

        const bSpan = document.createElement("span");
        bSpan.className = "move-san";
        if (bMove) {
            let bCls = playState.moveClassifications[i + 1];
            if (bCls) {
                const dotColor = CLASSIFICATION_DOT_COLOR[bCls] || "#888";
                const symbol = CLASSIFICATION_SYMBOL[bCls] || "";
                bSpan.appendChild(buildMoveSpanContent(bMove.san, dotColor, symbol));
                bSpan.classList.add(`cls-${bCls}`);
            } else {
                const bText = document.createElement("span");
                bText.className = "move-san-text";
                bText.textContent = bMove.san;
                bSpan.appendChild(bText);
            }
            decorateMoveSpan(bSpan, !playerIsWhite, bCls, i + 1);
        } else {
            bSpan.classList.add("is-empty");
        }

        li.appendChild(numSpan);
        li.appendChild(wSpan);
        li.appendChild(bSpan);
        el.playMoveList.appendChild(li);
    }
    el.playMoveList.scrollTop = el.playMoveList.scrollHeight;
}

function buildCoachComment(classification, move, evalAfter, openingName) {
    const evalText = formatEval(evalAfter);
    const sanStr = move ? move.san : "";
    const descStr = move ? sanToSpanish(move.san) : "";

    switch (classification.key) {
        case "brilliant":
            return `${classification.icon} \u2726 ${descStr} (${sanStr}) \u2014 \u00a1Brillante! Jugada excepcional. \u2022 Eval: ${evalText}`;
        case "great":
            return `${classification.icon} \u25b8 ${descStr} (${sanStr}) \u2014 \u00a1Gran jugada! Mejoraste tu posici\u00f3n. \u2022 Eval: ${evalText}`;
        case "best":
            return `${classification.icon} \u2713 ${descStr} (${sanStr}) \u2014 La mejor jugada aqu\u00ed. \u2022 Eval: ${evalText}`;
        case "excellent":
            return `${classification.icon} ${descStr} (${sanStr}) \u2014 Excelente jugada, muy precisa. \u2022 Eval: ${evalText}`;
        case "good":
            return `\ud83d\udc4d ${descStr} (${sanStr}) \u2014 Buena jugada. \u2022 Eval: ${evalText}`;
        case "book":
            return `\ud83d\udcda \u2726 ${descStr} (${sanStr}) \u2014 Jugada te\u00f3rica: ${openingName || "Apertura no catalogada"}. \u2022 Eval: ${evalText}`;
        case "inaccuracy":
            return `\u26a0\ufe0f ${descStr} (${sanStr}) \u2014 Imprecisi\u00f3n, hab\u00eda algo mejor. \u2022 Eval: ${evalText}`;
        case "mistake":
            return `\u274c ${descStr} (${sanStr}) \u2014 Error. Perdiste ventaja. \u2022 Eval: ${evalText}`;
        case "blunder":
            return `\ud83d\udca5 ${descStr} (${sanStr}) \u2014 \u00a1Desastre! Pierde material o posici\u00f3n cr\u00edtica. \u2022 Eval: ${evalText}`;
        default:
            return `${descStr} \u2022 Eval: ${evalText}`;
    }
}

/* ===== Opening book with names (chess.com style) ===== */
const OPENING_BOOK = [
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"], name: "Ruy Lopez Cerrada" },
    { moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"], name: "Siciliana - Variante Najdorf" },
    { moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"], name: "Siciliana - Variante Dragon" },
    { moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e6"], name: "Siciliana - Scheveningen" },
    { moves: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e5"], name: "Siciliana - Sveshnikov" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6"], name: "Ruy Lopez - Variante del Cambio" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"], name: "Italiana - Giuoco Pianissimo" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4"], name: "Gambito Evans" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5"], name: "Ataque Fegatello (Fried Liver)" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"], name: "Escocesa - Linea Principal" },
    { moves: ["e4", "e5", "Nc3", "Nf6", "f4"], name: "Gambito de Viena" },
    { moves: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "g6"], name: "Siciliana - Dragon Acelerado" },
    { moves: ["e4", "c5", "Nf3", "Nc6", "Bb5"], name: "Siciliana - Variante Rossolimo" },
    { moves: ["e4", "c5", "Nf3", "d6", "Bb5+"], name: "Siciliana - Variante Moscu" },
    { moves: ["e4", "c5", "Nc3", "Nc6", "f4"], name: "Siciliana - Ataque Grand Prix" },
    { moves: ["e4", "d6", "d4", "Nf6", "Nc3", "g6", "f4"], name: "Defensa Pirc - Ataque Austriaco" },
    { moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Nf3", "c6"], name: "Defensa Semi-Eslava" },
    { moves: ["e4", "e6", "d4", "d5", "Nc3", "Bb4"], name: "Francesa - Variante Winawer" },
    { moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6"], name: "Francesa - Variante Clasica" },
    { moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5"], name: "Caro-Kann - Clasica Bf5" },
    { moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5"], name: "Defensa Grunfeld" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Apertura Espanola (Ruy Lopez)" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"], name: "Ruy Lopez - Variante Morphy" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"], name: "Defensa Berlin" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "f5"], name: "Gambito Schliemann" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Apertura Italiana" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], name: "Giuoco Piano" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"], name: "Defensa Dos Caballos" },
    { moves: ["e4", "e5", "Nf3", "Nf6"], name: "Defensa Petrov" },
    { moves: ["e4", "e5", "Nf3", "d6"], name: "Defensa Philidor" },
    { moves: ["e4", "e5", "Nf3", "f5"], name: "Gambito Leton" },
    { moves: ["e4", "e5", "Nc3"], name: "Apertura Viena" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Nc3"], name: "Apertura de los Cuatro Caballos" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"], name: "Cuatro Caballos - Simetrica" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "c3"], name: "Apertura Ponziani" },
    { moves: ["e4", "e5", "f4"], name: "Gambito de Rey" },
    { moves: ["e4", "e5", "f4", "exf4"], name: "Gambito de Rey Aceptado" },
    { moves: ["e4", "e5", "f4", "d5"], name: "Gambito Falkbeer" },
    { moves: ["e4", "e5", "d4"], name: "Gambito del Centro" },
    { moves: ["e4", "e5", "d4", "exd4", "Qxd4"], name: "Apertura del Centro" },
    { moves: ["e4", "e5", "Bc4"], name: "Apertura del Alfil" },
    { moves: ["e4", "e5", "Qh5"], name: "Apertura Parham" },
    { moves: ["e4", "c5"], name: "Defensa Siciliana" },
    { moves: ["e4", "c5", "Nf3"], name: "Siciliana Abierta" },
    { moves: ["e4", "c5", "Nf3", "d6"], name: "Siciliana - Estructura Najdorf/Dragon" },
    { moves: ["e4", "c5", "Nf3", "Nc6"], name: "Siciliana - Variante Clasica" },
    { moves: ["e4", "c5", "Nf3", "e6"], name: "Siciliana - Variante Paulsen" },
    { moves: ["e4", "c5", "c3"], name: "Siciliana - Variante Alapin" },
    { moves: ["e4", "c5", "Nc3"], name: "Siciliana Cerrada" },
    { moves: ["e4", "c5", "d4", "cxd4", "c3"], name: "Gambito Smith-Morra" },
    { moves: ["e4", "c5", "b4"], name: "Gambito Wing" },
    { moves: ["e4", "e6"], name: "Defensa Francesa" },
    { moves: ["e4", "e6", "d4", "d5"], name: "Defensa Francesa - Linea Principal" },
    { moves: ["e4", "e6", "d4", "d5", "e5"], name: "Francesa - Variante del Avance" },
    { moves: ["e4", "e6", "d4", "d5", "exd5"], name: "Francesa - Variante del Cambio" },
    { moves: ["e4", "e6", "d4", "d5", "Nd2"], name: "Francesa - Variante Tarrasch" },
    { moves: ["e4", "c6"], name: "Defensa Caro-Kann" },
    { moves: ["e4", "c6", "d4", "d5"], name: "Caro-Kann - Linea Principal" },
    { moves: ["e4", "c6", "d4", "d5", "e5"], name: "Caro-Kann - Variante Avance" },
    { moves: ["e4", "c6", "d4", "d5", "exd5", "cxd5"], name: "Caro-Kann - Variante Cambio" },
    { moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4"], name: "Caro-Kann - Variante Clasica" },
    { moves: ["e4", "c6", "d4", "d5", "Nd2"], name: "Caro-Kann - Ataque Karpov" },
    { moves: ["e4", "d5"], name: "Defensa Escandinava" },
    { moves: ["e4", "d5", "exd5", "Qxd5"], name: "Escandinava - Variante Principal" },
    { moves: ["e4", "d5", "exd5", "Nf6"], name: "Escandinava - Variante Moderna" },
    { moves: ["e4", "d6"], name: "Defensa Pirc" },
    { moves: ["e4", "d6", "d4", "Nf6", "Nc3", "g6"], name: "Defensa Pirc - Linea Principal" },
    { moves: ["e4", "g6"], name: "Defensa Moderna" },
    { moves: ["e4", "Nf6"], name: "Defensa Alekhine" },
    { moves: ["e4", "Nf6", "e5", "Nd5"], name: "Alekhine - Variante Moderna" },
    { moves: ["d4", "d5", "c4"], name: "Gambito de Dama" },
    { moves: ["d4", "d5", "c4", "e6"], name: "Gambito de Dama Rehusado" },
    { moves: ["d4", "d5", "c4", "dxc4"], name: "Gambito de Dama Aceptado" },
    { moves: ["d4", "d5", "c4", "c6"], name: "Defensa Eslava" },
    { moves: ["d4", "d5", "c4", "e6", "Nc3", "c5"], name: "Defensa Tarrasch" },
    { moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"], name: "Defensa India de Rey" },
    { moves: ["d4", "Nf6", "c4", "g6"], name: "Sistema Indio de Rey" },
    { moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], name: "Defensa Nimzo-India" },
    { moves: ["d4", "Nf6", "c4", "e6", "Nf3", "b6"], name: "Defensa India de Dama" },
    { moves: ["d4", "Nf6", "c4", "e6", "Nf3", "Bb4+"], name: "Defensa Bogo-India" },
    { moves: ["d4", "Nf6", "c4", "c5"], name: "Defensa Benoni" },
    { moves: ["d4", "Nf6", "c4", "c5", "d5", "b5"], name: "Gambito Benko" },
    { moves: ["d4", "Nf6", "Bg5"], name: "Ataque Trompowsky" },
    { moves: ["d4", "d5", "Nf3", "Nf6", "c4"], name: "Gambito de Dama Tardio" },
    { moves: ["d4", "d5", "Bf4"], name: "Sistema Londres" },
    { moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"], name: "Sistema Londres" },
    { moves: ["d4", "f5"], name: "Defensa Holandesa" },
    { moves: ["d4", "f5", "g3"], name: "Holandesa - Variante Leningrado" },
    { moves: ["c4"], name: "Apertura Inglesa" },
    { moves: ["c4", "e5"], name: "Inglesa - Siciliana Invertida" },
    { moves: ["c4", "c5"], name: "Inglesa - Simetrica" },
    { moves: ["c4", "Nf6"], name: "Inglesa - Linea India" },
    { moves: ["Nf3", "d5", "g3"], name: "Apertura Reti" },
    { moves: ["Nf3", "Nf6", "g3", "g6", "Bg2", "Bg7"], name: "Apertura Reti - Doble Fianchetto" },
    { moves: ["d4", "Nf6", "c4", "e6", "g3"], name: "Apertura Catalana" },
    { moves: ["d4", "Nf6", "Nf3", "e6", "g3"], name: "Catalana por transposicion" },
    { moves: ["g3"], name: "Sistema Barcza" },
    { moves: ["b3"], name: "Apertura Larsen" },
    { moves: ["f4"], name: "Apertura Bird" },
    { moves: ["f4", "e5"], name: "Gambito From" },
    { moves: ["Nc3"], name: "Apertura Dunst" },
    { moves: ["b4"], name: "Apertura Sokolsky (Polaca)" },
    { moves: ["c3"], name: "Apertura Saragossa" },
    { moves: ["a3"], name: "Apertura Anderssen" },
    { moves: ["h3"], name: "Apertura Clemenz" },
    { moves: ["d3"], name: "Apertura Mieses" },
    { moves: ["e3"], name: "Apertura Van't Kruijs" },
    { moves: ["Nh3"], name: "Apertura Amar" },
    { moves: ["e4", "e5", "Nf3", "Nc6"], name: "Apertura Abierta - Juego Abierto" },
    { moves: ["e4", "e5", "Nf3"], name: "Juego Abierto" },
    { moves: ["d4", "d5"], name: "Juego Cerrado" },
    { moves: ["e4"], name: "Apertura del Peon de Rey" },
    { moves: ["d4"], name: "Apertura del Peon de Dama" },
    { moves: ["Nf3"], name: "Apertura Reti" }
];

// Sort by longest first for best match
OPENING_BOOK.sort((a, b) => b.moves.length - a.moves.length);
OPENING_BOOK.forEach((opening) => {
    opening.normalizedMoves = opening.moves.map((move) => normalizeSanForBookMove(move));
});

const openingCatalogState = {
    loaded: false,
    loading: false,
    byPlacement: new Map(),
    byName: new Map(),
    namesByLength: [],
    source: "manual"
};

function normalizeOpeningName(name) {
    return String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSanForBookMove(move) {
    return String(move || "")
        .trim()
        .replace(/[!?]+/g, "")
        .replace(/[+#]+$/g, "")
        .replace(/\s+/g, "");
}

function normalizeFenPlacement(fen) {
    if (!fen || typeof fen !== "string") {
        return "";
    }

    return fen.trim().split(" ")[0] || "";
}

function indexOpeningEntry(name, fen) {
    if (!name) {
        return;
    }

    const placement = normalizeFenPlacement(fen);
    if (placement) {
        const existingName = openingCatalogState.byPlacement.get(placement);
        if (!existingName || name.length > existingName.length) {
            openingCatalogState.byPlacement.set(placement, name);
        }
    }

    const normalizedName = normalizeOpeningName(name);
    if (!normalizedName) {
        return;
    }

    const bucket = openingCatalogState.byName.get(normalizedName) || [];
    bucket.push({ name, fen: placement });
    openingCatalogState.byName.set(normalizedName, bucket);
}

function refreshOpeningNameIndex() {
    openingCatalogState.namesByLength = Array.from(openingCatalogState.byName.keys())
        .map((normalized) => {
            const bucket = openingCatalogState.byName.get(normalized);
            const displayName = bucket && bucket[0] ? bucket[0].name : normalized;
            return {
                normalized,
                displayName,
                len: normalized.length
            };
        })
        .sort((a, b) => b.len - a.len);
}

function deriveFenFromManualLine(moves) {
    if (typeof Chess !== "function" || !Array.isArray(moves) || moves.length === 0) {
        return null;
    }

    try {
        const board = new Chess();
        for (const move of moves) {
            const san = normalizeSanForBookMove(move);
            if (!san || !board.move(san)) {
                return null;
            }
        }
        return board.fen();
    } catch {
        return null;
    }
}

function seedManualOpeningCatalog() {
    OPENING_BOOK.forEach((opening) => {
        indexOpeningEntry(opening.name, null);
        const derivedFen = deriveFenFromManualLine(opening.moves);
        if (derivedFen) {
            indexOpeningEntry(opening.name, derivedFen);
        }
    });
    refreshOpeningNameIndex();
}

seedManualOpeningCatalog();

async function loadOpeningCatalog() {
    if (openingCatalogState.loaded || openingCatalogState.loading) {
        return;
    }

    openingCatalogState.loading = true;
    try {
        const catalogResult = openingsModule && openingsModule.fetchCatalog
            ? await openingsModule.fetchCatalog(false)
            : { openings: [] };
        const openings = Array.isArray(catalogResult.openings) ? catalogResult.openings : [];
        if (openings.length === 0) {
            throw new Error("Invalid openings payload.");
        }

        openings.forEach((entry) => {
            if (!entry || typeof entry.name !== "string" || typeof entry.fen !== "string") {
                return;
            }
            indexOpeningEntry(entry.name.trim(), entry.fen.trim());
        });

        refreshOpeningNameIndex();
        openingCatalogState.loaded = true;
        openingCatalogState.source = catalogResult.source || "api";
    } catch (error) {
        console.warn("No se pudo cargar el catalogo completo de aperturas.", error);
    } finally {
        openingCatalogState.loading = false;
    }
}

function detectOpeningByManualHistory(history) {
    const normalizedHistory = Array.isArray(history)
        ? history.map((move) => normalizeSanForBookMove(move))
        : [];

    for (const opening of OPENING_BOOK) {
        const openingMoves = Array.isArray(opening.normalizedMoves) ? opening.normalizedMoves : opening.moves;
        if (openingMoves.length > normalizedHistory.length) continue;
        let match = true;
        for (let i = 0; i < openingMoves.length; i++) {
            if (normalizedHistory[i] !== openingMoves[i]) {
                match = false;
                break;
            }
        }
        if (match) return opening.name;
    }
    return null;
}

function getBestOpeningPrefixMatch(history) {
    const normalizedHistory = Array.isArray(history)
        ? history.map((move) => normalizeSanForBookMove(move))
        : [];
    let bestName = null;
    let bestLen = 0;

    for (const opening of OPENING_BOOK) {
        const openingMoves = Array.isArray(opening.normalizedMoves) ? opening.normalizedMoves : opening.moves;
        const max = Math.min(openingMoves.length, normalizedHistory.length);
        let len = 0;
        while (len < max && openingMoves[len] === normalizedHistory[len]) {
            len += 1;
        }

        if (len > bestLen) {
            bestLen = len;
            bestName = opening.name;
        }
    }

    if (!bestName) {
        return null;
    }

    return { name: bestName, len: bestLen };
}

function detectOpeningByBestPrefix(history) {
    const best = getBestOpeningPrefixMatch(history);
    return best && best.len >= 2 ? best.name : null;
}

function detectOpeningByFen(fen) {
    const placement = normalizeFenPlacement(fen);
    if (!placement) {
        return null;
    }

    return openingCatalogState.byPlacement.get(placement) || null;
}

function detectOpening(history, fen = null) {
    const byFen = detectOpeningByFen(fen);
    if (byFen) {
        return byFen;
    }

    return detectOpeningByManualHistory(history) || detectOpeningByBestPrefix(history);
}

function historyToDisplayLine(history, maxPly = 20) {
    if (!Array.isArray(history) || history.length === 0) {
        return "";
    }

    const trimmed = history.slice(0, maxPly);
    const chunks = [];

    for (let i = 0; i < trimmed.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const white = trimmed[i];
        const black = trimmed[i + 1];
        chunks.push(black ? `${moveNum}. ${white} ${black}` : `${moveNum}. ${white}`);
    }

    return chunks.join(" ");
}

function isLikelyBookMove(history, _san, fenAfter) {
    const plyCount = Array.isArray(history) ? history.length : 0;
    const openingFromFen = detectOpeningByFen(fenAfter);
    const openingFromManual = detectOpeningByManualHistory(history);
    const prefixMatch = getBestOpeningPrefixMatch(history);
    const openingName = openingFromFen
        || openingFromManual
        || (prefixMatch && prefixMatch.len >= 2 ? prefixMatch.name : null);
    const matchedPrefixLen = prefixMatch ? prefixMatch.len : 0;

    const withinOpeningWindow = plyCount > 0 && plyCount <= 20;
    const reliableManualMatch = matchedPrefixLen >= 6;
    const reliableFenMatch = Boolean(openingFromFen) && plyCount <= 24;
    const isBook = Boolean(openingName) && withinOpeningWindow && (reliableManualMatch || reliableFenMatch);

    return {
        isBook,
        name: openingName,
        fen: fenAfter || null,
        line: history ? history.slice() : []
    };
}

function resolveOpeningByName(openingName) {
    const normalized = normalizeOpeningName(openingName);
    if (!normalized) {
        return null;
    }

    const exact = openingCatalogState.byName.get(normalized);
    if (exact && exact.length > 0) {
        const preferred = exact.find((entry) => entry.fen) || exact[0];
        return {
            name: preferred.name,
            fen: preferred.fen || null
        };
    }

    const fuzzy = openingCatalogState.namesByLength.find((entry) =>
        entry.normalized.includes(normalized) || normalized.includes(entry.normalized)
    );

    if (!fuzzy) {
        return null;
    }

    const bucket = openingCatalogState.byName.get(fuzzy.normalized);
    if (!bucket || bucket.length === 0) {
        return null;
    }

    const preferred = bucket.find((entry) => entry.fen) || bucket[0];

    return {
        name: preferred.name,
        fen: preferred.fen || null
    };
}

function getFenMaterialProfile(fen) {
    const placement = normalizeFenPlacement(fen);
    if (!placement) {
        return { pawns: 0, majorsMinors: 0 };
    }

    let pawns = 0;
    let majorsMinors = 0;
    for (const ch of placement) {
        if (!/[a-z]/i.test(ch)) continue;
        const piece = ch.toLowerCase();
        if (piece === "p") {
            pawns += 1;
        } else if (piece !== "k") {
            majorsMinors += 1;
        }
    }

    return { pawns, majorsMinors };
}

function getAdaptiveCoachEvalProfile(fen, intent = "classify", multipv = 1) {
    const history = playState && playState.game && typeof playState.game.history === "function"
        ? playState.game.history()
        : [];
    const historyPly = Array.isArray(history) ? history.length : 0;
    const material = getFenMaterialProfile(fen);
    const opening = historyPly <= 16;
    const endgame = historyPly >= 56 || material.majorsMinors <= 6 || material.pawns <= 8;

    let depth = 13;
    let movetime = 700;

    if (opening) {
        depth = 13;
        movetime = 620;
    } else if (endgame) {
        depth = 15;
        movetime = 980;
    } else {
        depth = 14;
        movetime = 820;
    }

    if (intent === "hint") {
        depth += 1;
        movetime += 120;
    } else if (intent === "lines") {
        movetime += 80;
    } else if (intent === "classify") {
        movetime += 130;
    }

    return {
        depth: clamp(depth, 10, 20),
        movetime: clamp(movetime, 420, 1800),
        multipv: clamp(Number(multipv || 1), 1, 6)
    };
}

/** Evaluate position BEFORE player move to get baseline eval */
async function getPositionEval(fen, localSession) {
    try {
        const profile = getAdaptiveCoachEvalProfile(fen, "classify", 1);
        const result = await evaluateWithStockfish({
            fen,
            depth: profile.depth,
            multipv: profile.multipv,
            movetime: profile.movetime
        });
        if (localSession !== playState.sessionId) return null;
        return result.lines[0] ? result.lines[0].evaluation : null;
    } catch {
        return null;
    }
}

/** Full move evaluation: compare eval before vs after */
async function evaluateLastMove(move, fenBefore, fenAfter, localSession, moveIndex, historyAtMove) {
    const settings = getPlaySettings();
    if (!settings.computerEnabled) {
        return;
    }
    const commentsEnabled = Boolean(settings.moveComments);

    const isPlayerMove = move.color === (playState.playerColor === "white" ? "w" : "b");

    if (isPlayerMove && commentsEnabled) {
        setCoachMessage(coachNotice("engine", "Evaluando tu jugada..."));
    }

    playState.pendingEvaluations += 1;

    try {
        // Get eval BEFORE (from white's perspective)
        const evalBefore = await getPositionEval(fenBefore, localSession);
        if (localSession !== playState.sessionId) return;

        // Get eval AFTER
        const evalAfter = await getPositionEval(fenAfter, localSession);
        if (localSession !== playState.sessionId) return;

        // Update eval bar
        if (settings.showEvalBar) {
            updatePlayEvalBar(evalAfter);
        }
        playState.lastEvalBefore = evalBefore;
        playState.lastEvalAfter = evalAfter;

        // Calculate centipawn loss from the perspective of the player who moved
        const cpBefore = evalToCp(evalBefore);
        const cpAfter = evalToCp(evalAfter);
        const moverIsWhite = move.color === "w";

        // Positive cpLoss means the move was worse
        const cpLossRaw = moverIsWhite ? (cpBefore - cpAfter) : (cpAfter - cpBefore);

        // Check book move with a snapshot of move history at evaluation time
        const bookResult = isLikelyBookMove(historyAtMove, move.san, fenAfter);
        const cpLoss = normalizeCpLossNoise(
            cpLossRaw,
            cpBefore,
            cpAfter,
            Array.isArray(historyAtMove) ? historyAtMove.length : 0,
            Boolean(bookResult.name)
        );
        const cpAfterAdjusted = moverIsWhite
            ? (cpBefore - cpLoss)
            : (cpBefore + cpLoss);
        const bookMove = bookResult.isBook && cpLoss < 90;

        // Classify and save to the exact move index
        let cls = classifyMove(cpLoss, bookMove, cpBefore, cpAfterAdjusted, moverIsWhite);

        // Cap bot move classification for low-ELO bots - a 1200 bot shouldn't be getting "brilliant"
        if (!isPlayerMove && playState.botElo <= 1600) {
            const botClsCap = playState.botElo <= 1000 ? "good"
                : playState.botElo <= 1400 ? "best"
                    : "great";
            const clsRank = { brilliant: 6, great: 5, best: 4, excellent: 3, good: 2, book: 2, inaccuracy: 1, mistake: 0, blunder: 0 };
            const capRank = clsRank[botClsCap] || 2;
            const moveRank = clsRank[cls.key] || 0;
            if (moveRank > capRank) {
                const downgrade = botClsCap === "good" ? "good" : (botClsCap === "best" ? "best" : "excellent");
                cls = MOVE_CLASSES.find(c => c.key === downgrade) || cls;
            }
        }

        playState.moveClassifications[moveIndex] = cls.key;

        if (cls.key === "book" && bookResult.name) {
            playState.moveOpeningDetails[moveIndex] = {
                name: bookResult.name,
                fen: bookResult.fen || fenAfter,
                line: bookResult.line || historyAtMove.slice()
            };
        } else {
            delete playState.moveOpeningDetails[moveIndex];
        }

        renderPlayMoveList();

        const bookDetail = cls.key === "book" && bookResult.name ? bookResult.name : "";
        const openingContext = bookDetail
            ? {
                openingName: bookDetail,
                openingFen: bookResult.fen || fenAfter,
                historyLine: historyToDisplayLine(bookResult.line || historyAtMove)
            }
            : null;

        if (isPlayerMove && commentsEnabled) {
            showMoveBadge(cls, "Tu jugada", bookDetail, openingContext);
            if (isCoachMode()) {
                const coachTip = getCoachTurnComment(move, cls, evalAfter);
                if (coachTip) {
                    setCoachMessage(coachTip, openingContext || undefined);
                } else {
                    setCoachMessage(buildCoachComment(cls, move, evalAfter, bookResult.name), openingContext || undefined);
                }
            } else {
                setCoachMessage(buildCoachComment(cls, move, evalAfter, bookResult.name), openingContext || undefined);
            }
        } else if (!isPlayerMove && commentsEnabled) {
            showMoveBadge(cls, "Rival", bookDetail, openingContext);
            const baseComment = buildCoachComment(cls, move, evalAfter, bookResult.name);
            if (isCoachMode()) {
                setCoachMessage(`\ud83e\udd16 El rival jugo ${sanToSpanish(move.san)}. ${baseComment.split(' \u2022 ')[0]} \u2022 \u00a1Tu turno! \u00bfQu\u00e9 plan tienes?`, openingContext || undefined);
            } else {
                setCoachMessage(`\ud83e\udd16 Rival \u2022 ${baseComment} \u2022 Tu turno.`, openingContext || undefined);
            }
        }
    } catch {
        if (!commentsEnabled) {
            return;
        }
        if (isPlayerMove) {
            setCoachMessage(coachNotice("warn", "Jugaste " + move.san + ". No se pudo evaluar."));
        } else {
            setCoachMessage(coachNotice("warn", "El rival jugo " + move.san + ". No se pudo evaluar su calidad."));
        }
    } finally {
        playState.pendingEvaluations = Math.max(0, playState.pendingEvaluations - 1);
        if (playState.endgameShown) {
            renderEndgameAccuracies();
        }
    }
}

function playMoveSound(move) {
    if (!getPlaySettings().sound) {
        return;
    }

    if (move.san.includes("#")) {
        playAudio(el.fxCheck);
        playAudio(el.fxEnd);
    } else if (move.san.includes("+")) {
        playAudio(el.fxCheck);
    } else if (move.san.includes("=")) {
        playAudio(el.fxPromote);
    } else if (move.san.includes("O-O")) {
        playAudio(el.fxCastle);
    } else if (move.captured) {
        playAudio(el.fxCapture);
    } else {
        playAudio(el.fxMove);
    }
}

function formatDurationFromStart() {
    if (!playState.startTime) {
        return "--";
    }

    const durationSeconds = Math.max(0, Math.floor((Date.now() - playState.startTime) / 1000));
    const hrs = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    const secs = durationSeconds % 60;

    if (hrs > 0) {
        return hrs + "h " + mins + "m " + secs + "s";
    }

    return mins + "m " + secs + "s";
}

function countClassifiedPliesForColor(color) {
    const isWhite = color === "white";
    return Object.keys(playState.moveClassifications || {}).reduce((total, key) => {
        const ply = Number(key);
        if (!Number.isFinite(ply)) {
            return total;
        }
        const colorMoved = isWhite ? (ply % 2 === 0) : (ply % 2 === 1);
        return colorMoved ? total + 1 : total;
    }, 0);
}

function computeAccuracyForColor(color) {
    if (!analysisModule || !analysisModule.computePlayerAccuracy) {
        return null;
    }
    const plies = countClassifiedPliesForColor(color);
    if (plies <= 0) {
        return null;
    }
    return analysisModule.computePlayerAccuracy(playState.moveClassifications, color);
}

function renderEndgameAccuracies() {
    if (el.endgameAccuracyPlayer) {
        const playerAccuracy = computeAccuracyForColor(playState.playerColor);
        if (Number.isFinite(playerAccuracy)) {
            el.endgameAccuracyPlayer.textContent = `${playerAccuracy.toFixed(1)}%`;
        } else {
            el.endgameAccuracyPlayer.textContent = playState.pendingEvaluations > 0 ? "Calculando..." : "--";
        }
    }
    if (el.endgameAccuracyRival) {
        const rivalColor = playState.playerColor === "white" ? "black" : "white";
        const rivalAccuracy = computeAccuracyForColor(rivalColor);
        if (Number.isFinite(rivalAccuracy)) {
            el.endgameAccuracyRival.textContent = `${rivalAccuracy.toFixed(1)}%`;
        } else {
            el.endgameAccuracyRival.textContent = playState.pendingEvaluations > 0 ? "Calculando..." : "--";
        }
    }
}

function formatSignedDelta(value, decimals = 1, suffix = "") {
    const numeric = Number(value || 0);
    const sign = numeric > 0 ? "+" : (numeric < 0 ? "-" : "");
    return `${sign}${Math.abs(numeric).toFixed(decimals)}${suffix}`;
}

function renderEndgameRankedImpact(winner) {
    if (!el.endgameImpact) {
        return;
    }

    const delta = playState.lastRankedProfileDelta;
    const playerResult = getPlayerResultLabel(winner);
    const shouldShow = normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED
        && playerResult === "loss"
        && delta
        && delta.before
        && delta.after;

    if (!shouldShow) {
        el.endgameImpact.style.display = "none";
        el.endgameImpact.innerHTML = "";
        return;
    }

    const gamesDelta = Math.round(Number(delta.after.gamesCount || 0) - Number(delta.before.gamesCount || 0));
    const eloDelta = Number(delta.after.currentElo || 0) - Number(delta.before.currentElo || 0);
    const winrateDelta = Number(delta.after.winrate || 0) - Number(delta.before.winrate || 0);
    const accuracyDelta = Number(delta.after.avgAccuracy || 0) - Number(delta.before.avgAccuracy || 0);

    el.endgameImpact.style.display = "grid";
    el.endgameImpact.innerHTML = [
        '<h4>Impacto en tu perfil (esta clasificatoria)</h4>',
        '<ul class="compact-list">',
        `<li>ELO estimado: ${Math.round(Number(delta.after.currentElo || 1200))} (${formatSignedDelta(eloDelta, 1)})</li>`,
        `<li>Winrate: ${Number(delta.after.winrate || 0).toFixed(1)}% (${formatSignedDelta(winrateDelta, 1, "%")})</li>`,
        `<li>Accuracy media: ${Number(delta.after.avgAccuracy || 0).toFixed(1)}% (${formatSignedDelta(accuracyDelta, 1, "%")})</li>`,
        `<li>Partidas rankeadas: ${Math.round(Number(delta.after.gamesCount || 0))} (${gamesDelta >= 0 ? "+" : ""}${gamesDelta})</li>`,
        "</ul>"
    ].join("");
}

function showEndgameSummary(title, reason, winner) {
    if (playState.endgameShown || !el.endgameModal) {
        return;
    }
    playState.endgameShown = true;

    const opening = detectOpening(playState.game.history(), playState.game.fen()) || "Sin apertura detectada";
    const totalPly = playState.game.history().length;
    const totalMoves = Math.ceil(totalPly / 2);
    const durationText = formatDurationFromStart();

    if (el.endgameTitle) el.endgameTitle.textContent = title;
    if (el.endgameReason) el.endgameReason.textContent = reason;
    if (el.endgameWinner) el.endgameWinner.textContent = winner;
    if (el.endgameDuration) el.endgameDuration.textContent = durationText;
    if (el.endgameMoves) el.endgameMoves.textContent = String(totalMoves);
    if (el.endgameOpening) el.endgameOpening.textContent = opening;
    persistFinishedGame(opening, winner);
    renderEndgameAccuracies();
    renderEndgameRankedImpact(winner);

    if (isCoachMode() && coachReviewModule) {
        setTimeout(() => openCoachReview(), 600);
    } else {
        el.endgameModal.style.display = "flex";
        setTimeout(() => {
            el.endgameModal.style.opacity = "1";
            el.endgameModal.style.pointerEvents = "auto";
        }, 10);
    }
}

function closeEndgameModal() {
    if (!el.endgameModal) {
        return;
    }
    el.endgameModal.style.opacity = "0";
    el.endgameModal.style.pointerEvents = "none";
    setTimeout(() => {
        if (el.endgameModal) {
            el.endgameModal.style.display = "none";
        }
    }, 300);
}

function formatGameOver(game) {
    let title = "Juego terminado";
    let reason = "Partida finalizada";
    let winner = "Empate";

    if (game.isCheckmate()) {
        winner = game.turn() === "w" ? "Negras" : "Blancas";
        const isPlayerWin =
            (winner === "Blancas" && playState.playerColor === "white")
            || (winner === "Negras" && playState.playerColor === "black");

        if (getPlaySettings().computerEnabled) {
            title = isPlayerWin ? "Victoria" : "Derrota";
        } else {
            title = "Ganan las " + winner;
        }
        reason = "por jaque mate";
    } else if (game.isStalemate()) {
        title = "Empate";
        reason = "por ahogado";
    } else if (game.isThreefoldRepetition()) {
        title = "Empate";
        reason = "por repeticion";
    } else if (game.isInsufficientMaterial()) {
        title = "Empate";
        reason = "por material insuficiente";
    } else if (game.isDraw()) {
        title = "Empate";
        reason = "por tablas";
    }

    showEndgameSummary(title, reason, winner);

    return title + " - " + reason;
}

function getCurrentGameOverText() {
    if (playState.manualGameOver) {
        showEndgameSummary(
            playState.manualGameOver.title,
            playState.manualGameOver.reason,
            playState.manualGameOver.winner
        );
        return `${playState.manualGameOver.title} - ${playState.manualGameOver.reason}`;
    }
    return formatGameOver(playState.game);
}

function renderPlayMoves() {
    const history = playState.game.history({ verbose: true });
    el.playMoveList.innerHTML = "";

    for (let i = 0; i < history.length; i += 2) {
        const white = history[i];
        const black = history[i + 1];

        const item = document.createElement("li");
        if (i >= history.length - 2) {
            item.classList.add("is-active");
        }

        const number = document.createElement("span");
        number.className = "move-num";
        number.textContent = `${Math.floor(i / 2) + 1}.`;

        const whiteSan = document.createElement("span");
        whiteSan.className = "move-san";
        whiteSan.textContent = white ? white.san : "";

        const blackSan = document.createElement("span");
        blackSan.className = "move-san";
        blackSan.textContent = black ? black.san : "";

        item.append(number, whiteSan, blackSan);
        el.playMoveList.appendChild(item);
    }

    el.playMoveList.scrollTop = el.playMoveList.scrollHeight;
}

function renderPlayLiveMetrics() {
    if (el.playAccuracyScore) {
        const accuracy = analysisModule && analysisModule.computePlayerAccuracy
            ? analysisModule.computePlayerAccuracy(playState.moveClassifications, playState.playerColor)
            : 0;
        const hasMoves = playState.game.history().length > 0;
        el.playAccuracyScore.textContent = hasMoves ? `${accuracy.toFixed(1)}%` : "--";
    }

    if (el.playPremoveState) {
        if (playState.premove && playState.premove.from && playState.premove.to) {
            el.playPremoveState.textContent = `${playState.premove.from}-${playState.premove.to}`;
        } else {
            el.playPremoveState.textContent = "No armado";
        }
    }
}

function renderPlayStatus() {
    if (isPlayGameOver()) {
        el.playStatus.textContent = getCurrentGameOverText();
        return;
    }

    const turn = sideFromTurn(playState.game.turn());
    const modePrefix = normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED && playState.startTime
        ? "Clasificatoria | "
        : "";

    if (playState.thinking) {
        el.playStatus.textContent = `${modePrefix}Bot (${playState.botElo}) pensando...`;
    } else if (turn === playState.playerColor) {
        const sideText = turn === "white" ? "blancas" : "negras";
        el.playStatus.textContent = `${modePrefix}Tu turno con ${sideText}.`;
    } else {
        el.playStatus.textContent = `${modePrefix}Turno del bot (${playState.botElo}).`;
    }
}

function renderPlayBoard() {
    const settings = getPlaySettings();
    const currentFen = playState.game.fen();

    playState.board.setCoordinatesVisible(settings.showCoordinates);
    playState.board.setFen(currentFen);
    const moveKey = playState.lastMove
        ? `${playState.game.history().length}:${playState.lastMove.from}${playState.lastMove.to}${playState.lastMove.san}`
        : "";
    if (!moveKey) {
        playState.lastAnimatedMoveKey = "";
    } else if (settings.pieceAnimation && moveKey !== playState.lastAnimatedMoveKey) {
        playState.lastAnimatedMoveKey = moveKey;
        playState.board.animateMove(playState.lastMove, { durationMs: 220 });
    }
    playState.board.clearHighlights();

    if (settings.showLastMove && playState.lastMove) {
        playState.board.highlightSquares([playState.lastMove.from], "last-from");
        playState.board.highlightSquares([playState.lastMove.to], "last-to");
    }

    if (playState.hintMove) {
        playState.board.highlightSquares([playState.hintMove.from], "hint-from");
        playState.board.highlightSquares([playState.hintMove.to], "hint-to");
    }

    // Preview highlights for suggested moves
    if (playState.previewMove) {
        playState.board.highlightSquares([playState.previewMove.from], "preview-from");
        playState.board.highlightSquares([playState.previewMove.to], "preview-to");
    }

    if (playState.premove) {
        playState.board.highlightSquares([playState.premove.from], "premove-from");
        playState.board.highlightSquares([playState.premove.to], "premove-to");
    }

    if (playState.selectedSquare) {
        playState.board.highlightSquares([playState.selectedSquare], "selected");

        if (settings.showLegal) {
            playState.board.highlightLegalMoves(playState.legalTargets, currentFen);
        }
    }

    const showAssistArrows = normalizePlayMode(playState.gameMode) !== PLAY_MODES.RANKED;
    if (showAssistArrows && settings.suggestionArrows) {
        let suggestionMove = playState.previewMove || playState.hintMove || null;
        if (!suggestionMove
            && playState.computerTopLinesFen === currentFen
            && playState.computerTopLines.length > 0) {
            const firstLine = playState.computerTopLines.find((line) => line.id === 1) || playState.computerTopLines[0];
            const normalized = firstLine ? normalizeUciMoveForFen(currentFen, firstLine.moveUCI) : null;
            suggestionMove = normalized
                ? { from: normalized.from, to: normalized.to }
                : null;
        }
        if (suggestionMove) {
            playState.board.drawArrow(suggestionMove.from, suggestionMove.to, "suggestion");
        }
    }

    if (showAssistArrows && settings.threatArrows && playState.lastMove) {
        const isPlayerTurn = sideFromTurn(playState.game.turn()) === playState.playerColor;
        const botTurnCode = turnFromSide(playState.botColor);
        if (isPlayerTurn && playState.lastMove.color === botTurnCode) {
            playState.board.drawArrow(playState.lastMove.from, playState.lastMove.to, "threat");
        }
    }

    // Eval bar visibility
    if (el.playEvalBar) {
        el.playEvalBar.style.display = settings.showEvalBar ? "" : "none";
    }
    if (el.playFlipBtn) {
        el.playFlipBtn.disabled = playState.thinking
            || playState.game.history().length > 0
            || (normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED && Boolean(playState.startTime));
    }
    if (el.playCancelPremoveBtn) {
        el.playCancelPremoveBtn.disabled = !playState.premove;
    }
    refreshPlayModeUiState();
    syncPlayClockState();

    renderPlayMoveList();
    renderPlayStatus();
    renderPlayLiveMetrics();
    renderComputerPanel();
}

function clearPlaySelection() {
    playState.selectedSquare = null;
    playState.legalTargets = [];
}

function fenForPreviewTurn(fen, side) {
    const source = String(fen || "").trim();
    if (!source) {
        return null;
    }

    const fields = source.split(/\s+/);
    if (fields.length < 2) {
        return null;
    }

    const turn = turnFromSide(side);
    if (!turn) {
        return null;
    }

    fields[1] = turn;
    if (fields.length > 3) {
        // En passant square belongs to the side-to-move window; clear it when forcing preview turn.
        fields[3] = "-";
    }
    return fields.join(" ");
}

function getPremoveCandidates(square) {
    if (!square) {
        return [];
    }

    const fen = fenForPreviewTurn(playState.game.fen(), playState.playerColor);
    if (!fen) {
        return [];
    }

    try {
        const previewGame = new Chess(fen);
        return previewGame.moves({ square, verbose: true });
    } catch {
        return [];
    }
}

function canPlayerDragFrom(square) {
    if (isPlayGameOver()) {
        return false;
    }

    const piece = playState.game.get(square);
    if (!piece) {
        return false;
    }

    if (piece.color !== turnFromSide(playState.playerColor)) {
        return false;
    }

    const playerTurn = !playState.thinking && sideFromTurn(playState.game.turn()) === playState.playerColor;
    if (playerTurn) {
        return true;
    }

    return Boolean(getPlaySettings().premoveEnabled);
}

/* ===== Computer Panel (Stockfish best lines like chess.com) ===== */

function updateComputerPanelTitle() {
    if (!el.computerPanelTitle) return;
    const colorLabel = playState.playerColor === "white" ? "Blancas" : "Negras";
    el.computerPanelTitle.textContent = `\u26a1 Tus mejores jugadas (${colorLabel})`;
}

function renderComputerPanel() {
    const settings = getPlaySettings();
    if (!el.computerPanel || !el.computerLines) return;
    if (normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED) {
        clearComputerTopLines();
        el.computerPanel.style.display = "none";
        return;
    }
    updateComputerPanelTitle();
    const isPlayerTurn = sideFromTurn(playState.game.turn()) === playState.playerColor;
    const fen = playState.game.fen();

    if (!settings.computerEnabled
        || !isPlayerTurn
        || playState.computerTopLines.length === 0
        || playState.computerTopLinesFen !== fen) {
        if (playState.computerTopLinesFen && playState.computerTopLinesFen !== fen) {
            clearComputerTopLines();
        }
        el.computerPanel.style.display = "none";
        return;
    }
    el.computerPanel.style.display = "";
    el.computerLines.innerHTML = "";

    playState.computerTopLines.forEach((line) => {
        const normalizedMove = normalizeUciMoveForFen(fen, line.moveUCI);
        if (!normalizedMove) {
            return;
        }

        const div = document.createElement("div");
        div.className = "engine-line";

        const evalSpan = document.createElement("span");
        const evalText = formatEvalForPlayer(line.evaluation);
        const playerVal = line.evaluation ? getEvalValueForPlayer(line.evaluation) : 0;
        evalSpan.className = "engine-eval " + (playerVal >= 0 ? "positive" : "negative");
        evalSpan.textContent = evalText;

        const movesSpan = document.createElement("span");
        movesSpan.className = "engine-moves";
        const san = line.moveSAN || normalizedMove.san || uciToSanFromFen(fen, line.moveUCI);
        const desc = sanToSpanish(san);
        movesSpan.textContent = `${desc} (${san})`;

        const depthSpan = document.createElement("span");
        depthSpan.className = "engine-depth";
        depthSpan.textContent = `D${line.depth}`;

        div.append(evalSpan, movesSpan, depthSpan);

        // Click to preview this move
        div.addEventListener("click", () => {
            if (normalizedMove) {
                showMoveConfirmation(normalizedMove.from, normalizedMove.to, san, normalizedMove.promotion);
            }
        });

        el.computerLines.appendChild(div);
    });

    if (!el.computerLines.firstChild) {
        el.computerPanel.style.display = "none";
    }
}

/* ===== Move Preview & Confirmation ===== */

function showMoveConfirmation(from, to, san, promotion) {
    playState.previewMove = { from, to };
    playState.pendingConfirmMove = { from, to, san, promotion };

    if (el.confirmText) {
        el.confirmText.textContent = `\u00bfJugar ${sanToSpanish(san)} (${san})?`;
    }
    if (el.moveConfirmBar) {
        el.moveConfirmBar.classList.add("visible");
    }

    renderPlayBoard();
    scheduleSessionSnapshotSave();
}

function cancelMoveConfirmation() {
    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    if (el.moveConfirmBar) {
        el.moveConfirmBar.classList.remove("visible");
    }
    renderPlayBoard();
    scheduleSessionSnapshotSave();
}

async function confirmSuggestedMove() {
    const pending = playState.pendingConfirmMove;
    if (!pending) return;

    const playerTurn = !playState.thinking && sideFromTurn(playState.game.turn()) === playState.playerColor;
    if (!playerTurn) {
        playErrorSound();
        setCoachMessage(coachNotice("info", "Espera tu turno para jugar esa sugerencia."));
        cancelMoveConfirmation();
        return;
    }

    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    if (el.moveConfirmBar) {
        el.moveConfirmBar.classList.remove("visible");
    }

    const from = String(pending.from || "").trim().toLowerCase();
    const to = String(pending.to || "").trim().toLowerCase();
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
        playErrorSound();
        setCoachMessage(coachNotice("error", "Movimiento sugerido invalido."));
        renderPlayBoard();
        return;
    }

    const fenBefore = playState.game.fen();
    const movePayload = { from, to };
    if (pending.promotion) {
        movePayload.promotion = pending.promotion;
    }

    let move = null;
    try {
        move = playState.game.move(movePayload);
    } catch {
        move = null;
    }

    if (!move) {
        playErrorSound();
        setCoachMessage(coachNotice("error", "No se pudo ejecutar ese movimiento."));
        renderPlayBoard();
        return;
    }
    const fenAfter = playState.game.fen();
    const moveIndex = playState.game.history().length - 1;
    const historyAtMove = playState.game.history().slice();

    playState.lastMove = move;
    playState.hintMove = null;
    playState.premove = null;
    clearComputerTopLines();
    switchPlayClockTo(sideFromTurn(playState.game.turn()));
    clearPlaySelection();
    playMoveSound(move);
    renderPlayBoard();
    scheduleSessionSnapshotSave();

    const localSession = playState.sessionId;
    evaluateLastMove(move, fenBefore, fenAfter, localSession, moveIndex, historyAtMove);

    if (isPlayGameOver()) {
        setCoachMessage(coachNotice("game", getCurrentGameOverText()));
        if (getPlaySettings().sound) playAudio(el.fxEnd);
        renderPlayStatus();
        return;
    }

    if (getPlaySettings().computerEnabled) {
        await playBotMove();
    }
}

/* ===== Update Computer Lines ===== */

async function updateComputerLines(fen, localSession) {
    const settings = getPlaySettings();
    if (normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED) {
        clearComputerTopLines();
        renderComputerPanel();
        renderPlayBoard();
        return;
    }
    if (!settings.computerEnabled) return;
    const turnFromFen = fen.includes(" w ") ? "white" : "black";
    if (turnFromFen !== playState.playerColor) {
        clearComputerTopLines();
        renderComputerPanel();
        renderPlayBoard();
        return;
    }

    const profile = getAdaptiveCoachEvalProfile(fen, "lines", 3);
    const needsInstantLines = playState.computerTopLinesFen !== fen
        || playState.computerTopLines.length === 0;
    let hasRenderedLines = false;

    if (needsInstantLines) {
        try {
            const quickResult = await evaluateWithStockfish({
                fen,
                depth: clamp(profile.depth - 3, 8, 14),
                multipv: 1,
                movetime: clamp(Math.round(profile.movetime * 0.35), 180, 520)
            });
            if (localSession !== playState.sessionId) return;
            if (Array.isArray(quickResult.lines) && quickResult.lines.length > 0) {
                setComputerTopLines(quickResult.lines, fen);
                hasRenderedLines = true;
                renderComputerPanel();
                renderPlayBoard();
            }
        } catch {
            // ignore quick-pass failures; deep pass may still succeed
        }
    }

    try {
        const result = await evaluateWithStockfish({
            fen,
            depth: profile.depth,
            multipv: profile.multipv,
            movetime: profile.movetime
        });
        if (localSession !== playState.sessionId) return;

        if (Array.isArray(result.lines) && result.lines.length > 0) {
            setComputerTopLines(result.lines, fen);
            hasRenderedLines = true;
        } else if (!hasRenderedLines) {
            clearComputerTopLines();
        }
        renderComputerPanel();
        renderPlayBoard();
    } catch {
        if (!hasRenderedLines) {
            clearComputerTopLines();
        }
        renderComputerPanel();
        renderPlayBoard();
    }
}

function currentBotElo() {
    const custom = parseInt(el.botCustomElo.value || "", 10);
    const settings = getPlaySettings();
    const gameType = normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED
        ? "standard"
        : normalizeGameType(settings.gameType);
    const gameTypeOffset = gameType === "training"
        ? -140
        : (gameType === "challenge" ? 180 : 0);

    if (Number.isFinite(custom)) {
        return clamp(custom + gameTypeOffset, 400, 2800);
    }

    return clamp(parseInt(el.botPreset.value, 10) + gameTypeOffset, 400, 2800);
}

function getBotDecisionProfile(elo, gameType = "standard") {
    const bounded = clamp(Number(elo || 1200), 400, 2800);
    const strength = (bounded - 400) / 2400;
    const normalizedGameType = normalizeGameType(gameType);
    const depthBoost = normalizedGameType === "challenge" ? 2 : (normalizedGameType === "training" ? -1 : 0);
    const timeScale = normalizedGameType === "challenge" ? 1.32 : (normalizedGameType === "training" ? 0.82 : 1);
    const randomnessScale = normalizedGameType === "challenge" ? 0.78 : (normalizedGameType === "training" ? 1.2 : 1);
    const candidateShift = normalizedGameType === "challenge" ? -1 : (normalizedGameType === "training" ? 1 : 0);
    const isLowElo = bounded <= 1400;
    const isVeryLowElo = bounded <= 1000;
    const humanLikeRandom = isVeryLowElo ? 0.42 : (isLowElo ? 0.30 + (1 - strength) * 0.22 : 0);
    const humanLikeRankPenalty = isVeryLowElo ? 0.3 : (isLowElo ? 0.4 + (1 - strength) * 0.3 : 0);
    return {
        multipv: strength < 0.2 ? 6 : strength < 0.35 ? 5 : strength < 0.6 ? 4 : 3,
        depth: clamp(Math.round(6 + bounded / 280) + depthBoost - (isLowElo ? 2 : 0), 5, 16),
        movetime: clamp(Math.round((170 + bounded / 3.6) * timeScale), 180, 2100),
        maxCandidates: clamp((strength < 0.3 ? 6 : strength < 0.55 ? 5 : 3) + candidateShift, 2, 6),
        temperatureCp: clamp(Math.round(290 - strength * 220) + (isLowElo ? 100 : 0), 55, 380),
        rankPenalty: isVeryLowElo ? 0.18 : (0.22 + (strength * 0.45) + humanLikeRankPenalty),
        randomMoveChance: clamp((0.32 - strength * 0.26) * randomnessScale + humanLikeRandom, 0.06, 0.55),
        isLowElo,
        isVeryLowElo
    };
}

function chooseWeightedIndex(weights) {
    const safeWeights = Array.isArray(weights) ? weights : [];
    const total = safeWeights.reduce((sum, value) => sum + (Number(value) > 0 ? Number(value) : 0), 0);
    if (total <= 0) {
        return safeWeights.length > 0 ? 0 : -1;
    }

    let target = Math.random() * total;
    for (let i = 0; i < safeWeights.length; i += 1) {
        const weight = Number(safeWeights[i]) > 0 ? Number(safeWeights[i]) : 0;
        target -= weight;
        if (target <= 0) {
            return i;
        }
    }

    return safeWeights.length - 1;
}

function chooseBotMoveFromLines(lines, botSide, profile) {
    const base = Array.isArray(lines)
        ? lines.filter((line) => line && typeof line.moveUCI === "string" && line.moveUCI.length >= 4)
        : [];
    if (base.length === 0) {
        return null;
    }

    const ranked = base
        .map((line) => ({
            line,
            score: getEvalValueForSide(line.evaluation, botSide)
        }))
        .sort((a, b) => b.score - a.score);

    const shortlist = ranked.slice(0, clamp(Number(profile && profile.maxCandidates), 2, 6));
    if (shortlist.length === 0) {
        return ranked[0] ? ranked[0].line : null;
    }

    const randomChance = Number(profile && profile.randomMoveChance || 0);
    if (Math.random() < randomChance) {
        return shortlist[Math.floor(Math.random() * shortlist.length)].line;
    }

    const isLowElo = Boolean(profile && profile.isLowElo);
    const isVeryLowElo = Boolean(profile && profile.isVeryLowElo);
    if (isVeryLowElo && shortlist.length >= 2 && Math.random() < 0.55) {
        const suboptimalIndex = Math.min(shortlist.length - 1, 1 + Math.floor(Math.random() * (shortlist.length - 1)));
        return shortlist[suboptimalIndex].line;
    }
    if (isLowElo && shortlist.length >= 2 && Math.random() < 0.42) {
        const suboptimalIndex = Math.random() < 0.55 ? 1 : (shortlist.length >= 3 ? 2 : 1);
        return shortlist[suboptimalIndex].line;
    }

    const bestScore = shortlist[0].score;
    const temperature = clamp(Number(profile && profile.temperatureCp || 120), 30, 320);
    const rankPenalty = clamp(Number(profile && profile.rankPenalty || 0.4), 0.1, 1.5);
    const weights = shortlist.map((entry, index) => {
        const loss = Math.max(0, bestScore - entry.score);
        const evalWeight = Math.exp(-loss / temperature);
        const orderWeight = 1 / (1 + (index * rankPenalty));
        return evalWeight * orderWeight;
    });

    const pick = chooseWeightedIndex(weights);
    if (pick < 0 || !shortlist[pick]) {
        return shortlist[0].line;
    }
    return shortlist[pick].line;
}

function clearPremove(showNotice = false) {
    if (!playState.premove) {
        return;
    }

    playState.premove = null;
    clearPlaySelection();
    if (showNotice) {
        setCoachMessage(coachNotice("info", "Pre-move cancelado."));
    }
    renderPlayBoard();
    scheduleSessionSnapshotSave();
}

async function tryExecuteQueuedPremove(localSession) {
    if (localSession !== playState.sessionId) {
        return false;
    }
    if (!playState.premove || isPlayGameOver()) {
        return false;
    }
    if (sideFromTurn(playState.game.turn()) !== playState.playerColor) {
        return false;
    }

    const queued = playState.premove;
    playState.premove = null;
    const fenBeforeMove = playState.game.fen();
    const movePayload = {
        from: queued.from,
        to: queued.to
    };
    if (queued.promotion) {
        movePayload.promotion = queued.promotion;
    }

    let move = null;
    try {
        move = playState.game.move(movePayload);
    } catch {
        move = null;
    }

    if (!move) {
        playErrorSound();
        setCoachMessage(coachNotice("warn", "Tu pre-move ya no era legal y fue cancelado."));
        renderPlayBoard();
        scheduleSessionSnapshotSave();
        return false;
    }

    const fenAfterMove = playState.game.fen();
    const moveIndex = playState.game.history().length - 1;
    const historyAtMove = playState.game.history().slice();

    playState.lastMove = move;
    playState.hintMove = null;
    clearComputerTopLines();
    switchPlayClockTo(sideFromTurn(playState.game.turn()));
    clearPlaySelection();
    playMoveSound(move);
    renderPlayBoard();
    scheduleSessionSnapshotSave();
    evaluateLastMove(move, fenBeforeMove, fenAfterMove, localSession, moveIndex, historyAtMove);

    if (isPlayGameOver()) {
        setCoachMessage(coachNotice("game", getCurrentGameOverText()));
        if (getPlaySettings().sound) playAudio(el.fxEnd);
        renderPlayStatus();
        return true;
    }

    if (getPlaySettings().computerEnabled) {
        await playBotMove();
    }

    return true;
}

async function maybeAutoCoach() {
    const settings = getPlaySettings();
    if (!settings.autoCoach) {
        return;
    }

    if (isPlayGameOver()) {
        return;
    }

    const turn = sideFromTurn(playState.game.turn());
    if (turn !== playState.playerColor) {
        return;
    }

    if (settings.computerEnabled) {
        await requestCoachHint(true);
    } else {
        // Give tip-only coaching without engine
        setCoachMessage(coachNotice("tip", "Es tu turno. Analiza la posicion y busca la mejor jugada."));
    }
}

function notifyEngineFallbackIfNeeded() {
    if (playState.engineFallbackNotified || !engineModule || typeof engineModule.getRuntimeStatus !== "function") {
        return;
    }

    let status = null;
    try {
        status = engineModule.getRuntimeStatus();
    } catch {
        status = null;
    }

    if (!status || !status.cspBlocked) {
        return;
    }

    playState.engineFallbackNotified = true;
    setCoachMessage(coachNotice(
        "info",
        "Tu navegador o una extension esta bloqueando WASM por CSP. Se activo un motor compatible para que la partida siga respondiendo."
    ));
}

async function playBotMove() {
    const turn = sideFromTurn(playState.game.turn());
    if (turn !== playState.botColor || isPlayGameOver()) {
        return;
    }

    const localSession = playState.sessionId;

    playState.thinking = true;
    renderPlayStatus();

    try {
        const botProfile = getBotDecisionProfile(playState.botElo, playState.gameType);
        const fenBeforeMove = playState.game.fen();

        const result = await evaluateWithStockfish({
            fen: fenBeforeMove,
            depth: botProfile.depth,
            multipv: botProfile.multipv,
            movetime: botProfile.movetime,
            elo: playState.botElo
        });

        if (localSession !== playState.sessionId) {
            return;
        }
        notifyEngineFallbackIfNeeded();

        const normalizedLines = normalizeEngineLinesForFen(fenBeforeMove, result.lines || []);
        const selectedLine = chooseBotMoveFromLines(normalizedLines, playState.botColor, botProfile);
        const selectedMoveUci = selectedLine && selectedLine.moveUCI
            ? selectedLine.moveUCI
            : result.bestMove;
        const normalizedBestMove = normalizeUciMoveForFen(fenBeforeMove, selectedMoveUci);
        if (!normalizedBestMove) {
            throw new Error("El motor devolvio una jugada invalida.");
        }

        const move = playState.game.move({
            from: normalizedBestMove.from,
            to: normalizedBestMove.to,
            promotion: normalizedBestMove.promotion
        });
        if (!move) {
            throw new Error("No se pudo aplicar la jugada del bot.");
        }

        const fenAfterMove = playState.game.fen();
        const moveIndex = playState.game.history().length - 1;
        const historyAtMove = playState.game.history().slice();

        playState.lastMove = move;
        playState.hintMove = null;
        clearComputerTopLines();
        switchPlayClockTo(sideFromTurn(playState.game.turn()));
        hideMoveBadge();
        clearPlaySelection();
        playMoveSound(move);
        renderPlayBoard();
        scheduleSessionSnapshotSave();

        // Evaluate bot's move
        evaluateLastMove(move, fenBeforeMove, fenAfterMove, localSession, moveIndex, historyAtMove);

        const premoveExecuted = await tryExecuteQueuedPremove(localSession);
        if (premoveExecuted) {
            return;
        }

        // Update computer lines for player's turn
        updateComputerLines(playState.game.fen(), localSession);

        await maybeAutoCoach();
    } catch {
        setCoachMessage(coachNotice("bot", "No se pudo obtener jugada del bot. Intenta nueva partida."));
    } finally {
        if (localSession === playState.sessionId) {
            playState.thinking = false;
            renderPlayStatus();
        }
    }
}

async function requestCoachHint(isAuto = false) {
    if (isRankedActiveGame()) {
        if (!isAuto) {
            playErrorSound();
            setCoachMessage(coachNotice("warn", "Las pistas estan desactivadas en modo Clasificatoria."));
        }
        return;
    }

    const settings = getPlaySettings();

    if (!isAuto && !settings.hintsEnabled) {
        setCoachMessage(coachNotice("warn", "Las pistas estan desactivadas. Activalas en Ajustes."));
        return;
    }

    if (!settings.computerEnabled) {
        setCoachMessage(coachNotice("warn", "El motor esta desactivado. Activalo en Ajustes para obtener sugerencias."));
        return;
    }

    if (playState.thinking || playState.coaching) {
        return;
    }

    if (isPlayGameOver()) {
        setCoachMessage(coachNotice("info", "La partida termino. Inicia una nueva para seguir entrenando."));
        return;
    }

    const turn = sideFromTurn(playState.game.turn());
    if (turn !== playState.playerColor) {
        if (!isAuto) {
            setCoachMessage(coachNotice("info", "La pista aparece cuando es tu turno."));
        }
        return;
    }

    playState.coaching = true;
    const localSession = playState.sessionId;
    const fen = playState.game.fen();

    if (!isAuto) {
        setCoachMessage(coachNotice("engine", "Calculando pista del entrenador..."));
    }

    try {
        const profile = getAdaptiveCoachEvalProfile(fen, "hint", 3);

        const result = await evaluateWithStockfish({
            fen,
            depth: profile.depth,
            multipv: profile.multipv,
            movetime: profile.movetime
        });

        if (localSession !== playState.sessionId) {
            return;
        }
        notifyEngineFallbackIfNeeded();

        // Update computer panel with engine lines
        const normalizedLines = normalizeEngineLinesForFen(fen, result.lines || []);
        setComputerTopLines(normalizedLines, fen, { normalize: false });

        const bestLine = normalizedLines.find((line) => line.id === 1) || normalizedLines[0] || null;
        const secondLine = normalizedLines.length > 1
            ? (normalizedLines.find((line) => line.id === 2) || normalizedLines[1])
            : null;
        const bestMove = bestLine ? normalizeUciMoveForFen(fen, bestLine.moveUCI) : normalizeUciMoveForFen(fen, result.bestMove);
        playState.hintMove = bestMove ? { from: bestMove.from, to: bestMove.to } : null;

        const bestSan = bestMove ? bestMove.san : "";
        const bestDesc = bestSan ? sanToSpanish(bestSan) : "sin jugada valida";
        const evalText = bestLine ? formatEvalForPlayer(bestLine.evaluation) : "--";
        const evalBias = bestLine
            ? (getEvalValueForPlayer(bestLine.evaluation) >= 0 ? "a tu favor" : "a favor del rival")
            : "";

        // Update eval bar
        if (getPlaySettings().showEvalBar && bestLine) {
            updatePlayEvalBar(bestLine.evaluation);
        }

        let message = bestSan
            ? `\u265f\ufe0f \u2726 Mejor para ti: ${bestDesc} (${bestSan}), eval ${evalText}${evalBias ? ` (${evalBias})` : ""}.`
            : `\u265f\ufe0f \u2726 El motor no devolvio una jugada valida en este intento. Eval ${evalText}${evalBias ? ` (${evalBias})` : ""}.`;

        if (secondLine) {
            const secondMove = normalizeUciMoveForFen(fen, secondLine.moveUCI);
            const alt = secondMove ? secondMove.san : uciToSanFromFen(fen, secondLine.moveUCI);
            const altDesc = sanToSpanish(alt);
            message += ` \u2022 Alternativa: ${altDesc} (${alt}).`;
        }

        setCoachMessage(message);
        renderPlayBoard();
    } catch {
        setCoachMessage(coachNotice("warn", "No se pudo calcular la pista del entrenador."));
    } finally {
        playState.coaching = false;
    }
}

async function onPlaySquareClick(square) {
    if (isPlayGameOver()) {
        return;
    }

    const settings = getPlaySettings();
    const currentTurn = sideFromTurn(playState.game.turn());
    const playerTurn = !playState.thinking && currentTurn === playState.playerColor;

    const currentPiece = playState.game.get(square);
    const ownPiece = currentPiece && currentPiece.color === turnFromSide(playState.playerColor);

    if (!playerTurn) {
        if (!settings.premoveEnabled) {
            playErrorSound();
            setCoachMessage(coachNotice("info", "No es tu turno. Espera la jugada del rival o activa pre-move."));
            return;
        }

        if (!playState.selectedSquare) {
            if (!ownPiece) {
                return;
            }

            playState.selectedSquare = square;
            playState.legalTargets = getPremoveCandidates(square).map((move) => move.to);
            if (playState.legalTargets.length > 0) {
                setCoachMessage(coachNotice("tip", "Pre-move: selecciona ahora la casilla destino."));
            } else {
                setCoachMessage(coachNotice("info", "Esa pieza no tiene pre-move valido en esta posicion."));
            }
            renderPlayBoard();
            return;
        }

        if (square === playState.selectedSquare) {
            clearPlaySelection();
            renderPlayBoard();
            return;
        }

        const premoveCandidates = getPremoveCandidates(playState.selectedSquare);
        const premove = premoveCandidates.find((move) => move.to === square);

        if (!premove) {
            if (ownPiece) {
                playState.selectedSquare = square;
                playState.legalTargets = getPremoveCandidates(square).map((move) => move.to);
                if (playState.legalTargets.length === 0) {
                    setCoachMessage(coachNotice("info", "Esa pieza no tiene pre-move valido en esta posicion."));
                }
                renderPlayBoard();
                return;
            }

            clearPlaySelection();
            playErrorSound();
            renderPlayBoard();
            return;
        }

        const needsPromotion = premove.piece === "p" && (premove.to.endsWith("8") || premove.to.endsWith("1"));
        const autoPromotion = needsPromotion
            ? (settings.autoPromotion ? "q" : (premove.promotion || "q"))
            : undefined;
        playState.premove = {
            from: premove.from,
            to: premove.to,
            promotion: autoPromotion
        };
        clearPlaySelection();
        setCoachMessage(coachNotice("tip", `Pre-move armado: ${premove.san || `${premove.from}-${premove.to}`}.`));
        renderPlayBoard();
        scheduleSessionSnapshotSave();
        return;
    }

    if (!playState.selectedSquare) {
        if (!ownPiece) {
            playErrorSound();
            return;
        }

        playState.selectedSquare = square;
        playState.legalTargets = playState.game.moves({ square, verbose: true }).map((move) => move.to);
        renderPlayBoard();
        return;
    }

    if (square === playState.selectedSquare) {
        clearPlaySelection();
        renderPlayBoard();
        return;
    }

    const legalMoves = playState.game.moves({ square: playState.selectedSquare, verbose: true });
    const intendedMove = legalMoves.find((move) => move.to === square);

    if (!intendedMove) {
        if (ownPiece) {
            playState.selectedSquare = square;
            playState.legalTargets = playState.game.moves({ square, verbose: true }).map((move) => move.to);
            renderPlayBoard();
            return;
        }

        clearPlaySelection();
        playErrorSound();
        renderPlayBoard();
        return;
    }

    let promotion;
    if (intendedMove.piece === "p" && (intendedMove.to.endsWith("8") || intendedMove.to.endsWith("1"))) {
        if (getPlaySettings().autoPromotion) {
            promotion = "q";
        } else {
            promotion = await showPromotionModal(playState.playerColor);
        }
    }

    const fenBeforeMove = playState.game.fen();
    const move = playState.game.move({
        from: intendedMove.from,
        to: intendedMove.to,
        promotion
    });

    if (!move) {
        clearPlaySelection();
        renderPlayBoard();
        return;
    }

    const fenAfterMove = playState.game.fen();
    const moveIndex = playState.game.history().length - 1;
    const historyAtMove = playState.game.history().slice();

    playState.lastMove = move;
    playState.hintMove = null;
    playState.premove = null;
    clearComputerTopLines();
    switchPlayClockTo(sideFromTurn(playState.game.turn()));
    clearPlaySelection();
    playMoveSound(move);
    renderPlayBoard();

    const localSession = playState.sessionId;
    evaluateLastMove(move, fenBeforeMove, fenAfterMove, localSession, moveIndex, historyAtMove);

    if (isPlayGameOver()) {
        setCoachMessage(coachNotice("game", getCurrentGameOverText()));
        if (getPlaySettings().sound) playAudio(el.fxEnd);
        renderPlayStatus();
        return;
    }

    // Start parallel: evaluate player move AND start bot move
    if (getPlaySettings().computerEnabled) {
        await playBotMove();
    } else {
        setCoachMessage(coachNotice("info", "Modo sin motor. Mueve las negras manualmente."));
    }
}

async function handleBoardDrop(from, to) {
    if (isPlayGameOver()) return;
    const currentTurn = sideFromTurn(playState.game.turn());
    const playerTurn = !playState.thinking && currentTurn === playState.playerColor;
    if (!playerTurn && !getPlaySettings().premoveEnabled) return;

    // Set selection manually to the dropped square so variables are matched
    playState.selectedSquare = from;
    await onPlaySquareClick(to); // Re-use the click logic to handle promotion and execution
}

function goToPlaySetup(message = coachNotice("setup", "Configura una nueva partida para empezar.")) {
    playState.sessionId += 1;
    playState.game = new Chess();
    playState.gameMode = getSelectedPlayMode();
    playState.gameType = normalizeGameType(getPlaySettings().gameType);
    playState.lastMove = null;
    playState.hintMove = null;
    playState.thinking = false;
    playState.coaching = false;
    playState.lastEvalBefore = null;
    playState.lastEvalAfter = null;
    playState.moveClassifications = {};
    playState.moveOpeningDetails = {};
    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    playState.premove = null;
    clearComputerTopLines();
    playState.moveHistory = [];
    playState.pendingEvaluations = 0;
    playState.startTime = null;
    playState.endgameShown = false;
    playState.manualGameOver = null;
    playState.lastRankedProfileDelta = null;
    playState.lastAnimatedMoveKey = "";
    playState.clockConfigSeconds = 0;
    playState.clockRemainingMs = { white: 0, black: 0 };
    playState.clockActiveSide = null;
    playState.clockLastTickAt = 0;
    playState.engineFallbackNotified = false;
    stopPlayClockTimer();
    progressState.persistedGameSession = null;
    clearPlaySelection();
    cancelMoveConfirmation();
    hideMoveBadge();

    if (el.playSetupPanel) el.playSetupPanel.style.display = "";
    if (el.playGamePanel) el.playGamePanel.style.display = "none";
    if (el.playPanelGrid) el.playPanelGrid.classList.add("setup-mode");
    if (el.playBoardCard) el.playBoardCard.style.display = "none";
    if (el.playMoveList) el.playMoveList.innerHTML = "";
    if (el.coachHistoryContainer) el.coachHistoryContainer.innerHTML = "";
    clearAiChatHistory();

    if (el.endgameModal) {
        el.endgameModal.style.opacity = "0";
        el.endgameModal.style.pointerEvents = "none";
        el.endgameModal.style.display = "none";
    }

    setCoachMessage(message);
    refreshPlayModeUiState();
    renderPlayBoard();
    scheduleSessionSnapshotSave();
}

function startNewGame() {
    if (!authState.authenticated) {
        setAuthStatus("Debes iniciar sesion para comenzar una partida.");
        applyAuthLockState();
        return;
    }

    playState.sessionId += 1;
    playState.game = new Chess();
    playState.gameMode = getSelectedPlayMode();
    const rankedMode = normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED;
    const coachMode = normalizePlayMode(playState.gameMode) === PLAY_MODES.COACH;
    playState.gameType = rankedMode ? "standard" : normalizeGameType(getPlaySettings().gameType);

    if (rankedMode) {
        enforceRankedSettings();
        if (el.setGameType) {
            el.setGameType.value = "standard";
        }
    }

    if (coachMode) {
        if (el.setCoachAuto) el.setCoachAuto.checked = true;
        if (el.setHints) el.setHints.checked = true;
        if (el.setMoveComments) el.setMoveComments.checked = true;
        if (el.setComputer) el.setComputer.checked = true;
        if (el.setTakebacks) el.setTakebacks.checked = true;
        if (el.setEvalBar) el.setEvalBar.checked = true;
        if (el.setLegal) el.setLegal.checked = true;
        if (el.setSuggestionArrows) el.setSuggestionArrows.checked = true;
    }

    const chosenColor = rankedMode
        ? (Math.random() < 0.5 ? "white" : "black")
        : (el.playerColor.value === "random"
            ? (Math.random() < 0.5 ? "white" : "black")
            : el.playerColor.value);
    if (rankedMode && el.playerColor) {
        el.playerColor.value = "random";
    } else if (el.playerColor.value === "random") {
        el.playerColor.value = chosenColor;
    }

    playState.playerColor = chosenColor;
    playState.botColor = chosenColor === "white" ? "black" : "white";
    playState.botElo = currentBotElo();
    playState.lastMove = null;
    playState.hintMove = null;
    playState.thinking = false;
    playState.lastEvalBefore = null;
    playState.lastEvalAfter = null;
    playState.moveClassifications = {};
    playState.moveOpeningDetails = {};
    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    playState.premove = null;
    clearComputerTopLines();
    playState.moveHistory = [];
    playState.pendingEvaluations = 0;
    playState.startTime = Date.now();
    playState.endgameShown = false;
    playState.manualGameOver = null;
    playState.lastRankedProfileDelta = null;
    playState.lastAnimatedMoveKey = "";
    playState.engineFallbackNotified = false;
    progressState.persistedGameSession = null;
    clearPlaySelection();
    cancelMoveConfirmation();

    playState.board.setOrientation(playState.playerColor);
    hideMoveBadge();
    updatePlayEvalBar({ type: "cp", value: 0 });
    renderPlayBoard();

    if (el.endgameModal) {
        el.endgameModal.style.opacity = "0";
        el.endgameModal.style.pointerEvents = "none";
        el.endgameModal.style.display = "none";
    }

    // UI Layout Toggles
    if (el.playSetupPanel) el.playSetupPanel.style.display = "none";
    if (el.playGamePanel) el.playGamePanel.style.display = "flex";
    if (el.playPanelGrid) el.playPanelGrid.classList.remove("setup-mode");
    if (el.playBoardCard) el.playBoardCard.style.display = "";
    if (el.coachHistoryContainer) el.coachHistoryContainer.innerHTML = "";
    clearAiChatHistory();

    if (el.playEvalBar) {
        el.playEvalBar.style.display = getPlaySettings().showEvalBar ? "" : "none";
    }

    const settings = getPlaySettings();
    const timeControlMsg = settings.timeControlSeconds > 0
        ? ` Reloj activo: ${Math.floor(settings.timeControlSeconds / 60)} min por lado.`
        : " Sin control de tiempo.";
    const typeMsg = settings.gameType === "standard"
        ? " Tipo: estandar."
        : ` Tipo: ${settings.gameType}.`;
    const eloMsg = coachMode
        ? `\ud83c\udf93 \u00a1Hola! Soy tu entrenador. Vamos a jugar juntos contra el bot (${playState.botElo} ELO). Te guiar\u00e9 en cada jugada. \u00a1Juegas con ${chosenColor === "white" ? "blancas" : "negras"}!`
        : rankedMode
            ? `Clasificatoria iniciada contra bot ${playState.botElo} ELO. Color asignado al azar: juegas con ${chosenColor === "white" ? "blancas" : "negras"}.`
            : (settings.computerEnabled
                ? `Partida clasica iniciada. Bot configurado en ${playState.botElo} ELO (no suma perfil).`
                : "Partida clasica iniciada con motor desactivado (no suma perfil).");
    setCoachMessage(coachNotice("setup", `${eloMsg}${timeControlMsg}${typeMsg}`));
    playStartSound();
    resetPlayClockForNewGame();
    refreshPlayModeUiState();

    if (getPlaySettings().computerEnabled) {
        if (sideFromTurn(playState.game.turn()) === playState.botColor) {
            playBotMove();
        } else {
            updateComputerLines(playState.game.fen(), playState.sessionId);
        }
    }

    scheduleSessionSnapshotSave();
}

function undoPlayMove() {
    if (playState.thinking) {
        return;
    }

    if (!getPlaySettings().takebacksEnabled) {
        playErrorSound();
        setCoachMessage(coachNotice("warn", "Los retrocesos estan desactivados. Activalos en Ajustes."));
        return;
    }

    if (playState.game.history().length === 0) {
        playErrorSound();
        return;
    }

    playState.game.undo();

    if (playState.game.history().length > 0 && sideFromTurn(playState.game.turn()) !== playState.playerColor) {
        playState.game.undo();
    }

    playState.lastMove = null;
    playState.hintMove = null;
    playState.premove = null;
    playState.pendingEvaluations = 0;
    playState.lastAnimatedMoveKey = "";
    clearComputerTopLines();
    switchPlayClockTo(sideFromTurn(playState.game.turn()));
    clearPlaySelection();
    setCoachMessage(coachNotice("ok", "Jugada deshecha. Es tu turno."));
    renderPlayBoard();
    renderPlayMoveList();
    scheduleSessionSnapshotSave();
}

function resignCurrentGame() {
    if (!playState.startTime || isPlayGameOver()) {
        playErrorSound();
        return;
    }

    playState.thinking = false;
    playState.coaching = false;
    playState.hintMove = null;
    playState.premove = null;
    clearComputerTopLines();
    stopPlayClockTimer();
    playState.clockActiveSide = null;
    playState.clockLastTickAt = 0;
    clearPlaySelection();
    cancelMoveConfirmation();

    const winner = playState.playerColor === "white" ? "Negras" : "Blancas";
    const title = "Derrota";
    const reason = "por abandono";
    playState.manualGameOver = { title, reason, winner };

    showEndgameSummary(title, reason, winner);
    setCoachMessage(coachNotice("game", `${title} - ${reason}`));
    if (getPlaySettings().sound) {
        playAudio(el.fxEnd);
    }
    renderPlayBoard();
    renderPlayStatus();
    scheduleSessionSnapshotSave();
}

/* ===== Analysis State ===== */

const analysisState = {
    board: new BoardView(el.analysisBoard, { orientation: "white", interactive: false, showCoordinates: true }),
    retryBoard: el.analysisRetryBoard
        ? new BoardView(el.analysisRetryBoard, { orientation: "white", interactive: true, showCoordinates: false })
        : null,
    report: null,
    currentIndex: 0,
    running: false,
    runId: 0,
    retryGame: null,
    retrySelection: null,
    retryLegalTargets: [],
    retryExpectedMoveUci: "",
    retrySourceIndex: 0,
    retryStartFen: "",
    retrySolved: false,
    aiSummary: "",
    aiSummaryLoading: false
};

function setAnalysisStatus(message) {
    el.analysisStatus.textContent = message;
}

function resetAnalysisSummary() {
    if (el.analysisOverallAccuracy) {
        el.analysisOverallAccuracy.textContent = "--";
    }
    el.analysisWhiteAccuracy.textContent = "--";
    el.analysisBlackAccuracy.textContent = "--";
    el.analysisOpening.textContent = "--";
    el.analysisClassificationBody.innerHTML = "";
    el.analysisMoveMeta.textContent = "No hay analisis cargado.";
    el.analysisMoveList.innerHTML = "";
    el.analysisTopLines.innerHTML = "";
    el.analysisProgress.value = 0;

    analysisState.report = null;
    analysisState.currentIndex = 0;
    analysisState.retryGame = null;
    analysisState.retrySelection = null;
    analysisState.retryLegalTargets = [];
    analysisState.retryExpectedMoveUci = "";
    analysisState.retrySourceIndex = 0;
    analysisState.retryStartFen = "";
    analysisState.retrySolved = false;
    analysisState.aiSummary = "";
    analysisState.aiSummaryLoading = false;

    analysisState.board.setFen("8/8/8/8/8/8/8/8 w - - 0 1");
    analysisState.board.clearHighlights();
    if (analysisState.retryBoard) {
        analysisState.retryBoard.setFen("8/8/8/8/8/8/8/8 w - - 0 1");
        analysisState.retryBoard.clearHighlights();
    }
    if (el.analysisMoveExplanation) {
        el.analysisMoveExplanation.textContent = "Selecciona una jugada para ver su explicacion.";
    }
    if (el.analysisAiSummary) {
        el.analysisAiSummary.textContent = "Ejecuta un analisis para generar un resumen estructurado con IA.";
    }
    if (el.analysisRetryStatus) {
        el.analysisRetryStatus.textContent = "Carga una jugada marcada como inexactitud/error/blunder para practicar.";
    }
    updateEvalBar(null);
    renderAnalysisEvalGraph();
}

function fillClassificationTable(classifications) {
    el.analysisClassificationBody.innerHTML = "";
    const safeClassifications = {
        white: classifications && classifications.white ? classifications.white : {},
        black: classifications && classifications.black ? classifications.black : {}
    };

    CLASSIFICATION_ORDER.forEach((key) => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");

        const dot = document.createElement("span");
        dot.className = "cls-dot";
        dot.style.backgroundColor = CLASSIFICATION_DOT_COLOR[key] || "#888";
        dot.style.marginRight = "8px";

        const symbol = CLASSIFICATION_SYMBOL[key] || "";
        const labelText = CLASSIFICATION_LABEL[key] || key;
        nameCell.appendChild(dot);
        nameCell.appendChild(document.createTextNode(`${symbol ? symbol + " " : ""}${labelText}`));

        const whiteCell = document.createElement("td");
        whiteCell.textContent = String(safeClassifications.white[key] || 0);

        const blackCell = document.createElement("td");
        blackCell.textContent = String(safeClassifications.black[key] || 0);

        row.append(nameCell, whiteCell, blackCell);
        el.analysisClassificationBody.appendChild(row);
    });
}

function isAnalysisErrorClassification(classification) {
    return classification === "inaccuracy" || classification === "mistake" || classification === "blunder";
}

function getAnalysisTopLine(position) {
    if (!position || !Array.isArray(position.topLines)) {
        return null;
    }
    return position.topLines.find((line) => line && line.id === 1) || position.topLines[0] || null;
}

function evaluationCpForAnalysisPosition(position) {
    const topLine = getAnalysisTopLine(position);
    if (!topLine || !topLine.evaluation) {
        return 0;
    }
    const cp = evalToCp(topLine.evaluation);
    return clamp(cp, -1800, 1800);
}

function computeOverallAccuracyFromReport(report) {
    if (!report || !report.accuracies) {
        return 0;
    }
    const white = Number(report.accuracies.white || 0);
    const black = Number(report.accuracies.black || 0);
    if (!Number.isFinite(white) || !Number.isFinite(black)) {
        return 0;
    }
    return (white + black) / 2;
}

function renderAnalysisEvalGraph() {
    const canvas = el.analysisEvalGraph;
    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssWidth = Math.max(180, canvas.clientWidth || 640);
    const cssHeight = Math.max(120, canvas.clientHeight || 150);
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    if (!analysisState.report || !Array.isArray(analysisState.report.positions) || analysisState.report.positions.length < 2) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "12px Instrument Sans, sans-serif";
        ctx.fillText("Sin datos de evaluacion.", 12, cssHeight / 2);
        return;
    }

    const positions = analysisState.report.positions;
    const values = positions.map((position) => evaluationCpForAnalysisPosition(position));
    const absMax = Math.max(150, ...values.map((v) => Math.abs(v)));
    const range = Math.min(1800, Math.max(220, absMax));
    const padX = 12;
    const padY = 10;
    const chartWidth = cssWidth - padX * 2;
    const chartHeight = cssHeight - padY * 2;
    const centerY = padY + chartHeight / 2;

    const toX = (index) => padX + ((values.length === 1 ? 0 : index / (values.length - 1)) * chartWidth);
    const toY = (cp) => centerY - (cp / range) * (chartHeight / 2);

    /* Grid lines */
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 0.5;
    const gridSteps = [range * 0.5, range * -0.5];
    gridSteps.forEach((cp) => {
        const gy = toY(cp);
        ctx.beginPath();
        ctx.moveTo(padX, gy);
        ctx.lineTo(padX + chartWidth, gy);
        ctx.stroke();
    });
    const moveStep = Math.max(1, Math.floor(values.length / 6));
    for (let i = moveStep; i < values.length; i += moveStep) {
        const gx = toX(i);
        ctx.beginPath();
        ctx.moveTo(gx, padY);
        ctx.lineTo(gx, padY + chartHeight);
        ctx.stroke();
    }

    /* Center line */
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, centerY);
    ctx.lineTo(padX + chartWidth, centerY);
    ctx.stroke();

    /* Gradient fills */
    const gradWhite = ctx.createLinearGradient(0, padY, 0, centerY);
    gradWhite.addColorStop(0, "rgba(129,182,76,0.35)");
    gradWhite.addColorStop(1, "rgba(129,182,76,0.02)");
    const gradBlack = ctx.createLinearGradient(0, centerY, 0, padY + chartHeight);
    gradBlack.addColorStop(0, "rgba(202,52,49,0.02)");
    gradBlack.addColorStop(1, "rgba(202,52,49,0.25)");

    ctx.beginPath();
    ctx.moveTo(toX(0), centerY);
    for (let i = 0; i < values.length; i += 1) {
        const x = toX(i);
        const y = Math.min(centerY, toY(values[i]));
        ctx.lineTo(x, y);
    }
    ctx.lineTo(toX(values.length - 1), centerY);
    ctx.closePath();
    ctx.fillStyle = gradWhite;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toX(0), centerY);
    for (let i = 0; i < values.length; i += 1) {
        const x = toX(i);
        const y = Math.max(centerY, toY(values[i]));
        ctx.lineTo(x, y);
    }
    ctx.lineTo(toX(values.length - 1), centerY);
    ctx.closePath();
    ctx.fillStyle = gradBlack;
    ctx.fill();

    /* Eval line */
    ctx.beginPath();
    for (let i = 0; i < values.length; i += 1) {
        const x = toX(i);
        const y = toY(values[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#96bc4b";
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Axis labels */
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "9px Instrument Sans, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("+", padX + 1, padY + 9);
    ctx.fillText("\u2013", padX + 1, padY + chartHeight - 2);
    ctx.textAlign = "center";
    for (let i = moveStep; i < values.length; i += moveStep) {
        ctx.fillText(String(i), toX(i), padY + chartHeight + 9);
    }

    for (let i = 1; i < positions.length; i += 1) {
        if (!isAnalysisErrorClassification(positions[i].classification)) continue;
        const x = toX(i);
        const y = toY(values[i]);
        ctx.fillStyle = "rgba(229, 143, 42, 0.9)";
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
    }

    const activeIndex = clamp(analysisState.currentIndex || 0, 0, values.length - 1);
    const activeX = toX(activeIndex);
    const activeY = toY(values[activeIndex]);
    ctx.fillStyle = "#7eb2da";
    ctx.beginPath();
    ctx.arc(activeX, activeY, 4.2, 0, Math.PI * 2);
    ctx.fill();

    if (el.analysisGraphLegend) {
        const value = values[activeIndex] / 100;
        const sign = value >= 0 ? "+" : "-";
        el.analysisGraphLegend.textContent = `Jugada ${activeIndex} | Eval ${sign}${Math.abs(value).toFixed(2)}`;
    }
}

function buildAnalysisMoveExplanation(position, index, positions) {
    if (!position || index <= 0) {
        return "Posicion inicial. Todavia no hay jugadas para explicar.";
    }

    const previous = positions[index - 1];
    const prevCp = evaluationCpForAnalysisPosition(previous);
    const currCp = evaluationCpForAnalysisPosition(position);
    const moverColor = index % 2 === 1 ? "blancas" : "negras";
    const moverSwing = index % 2 === 1 ? (currCp - prevCp) : (prevCp - currCp);
    const centi = Math.round(Math.abs(moverSwing));
    const classKey = position.classification || "";
    const classLabel = CLASSIFICATION_LABEL[classKey] || "Jugada";
    const moveSan = position.move && position.move.san ? position.move.san : "--";
    const moveDesc = sanToSpanish(moveSan);

    let qualityText = "";
    if (classKey === "brilliant" || classKey === "great" || classKey === "best") {
        qualityText = `Fue una ${classLabel.toLowerCase()} que mejoro la posicion para ${moverColor}.`;
    } else if (classKey === "good" || classKey === "excellent" || classKey === "book" || classKey === "forced") {
        qualityText = `Mantiene una idea solida para ${moverColor}.`;
    } else if (isAnalysisErrorClassification(classKey)) {
        qualityText = `Esta jugada cedio aproximadamente ${centi} centipeones para ${moverColor}.`;
    } else {
        qualityText = "Movimiento evaluado por el motor.";
    }

    const evalText = `Eval despues de la jugada: ${formatEval(getAnalysisTopLine(position)?.evaluation || null)}.`;
    const openingText = position.opening ? ` Se mantiene en ${position.opening}.` : "";
    return `${moveDesc} (${moveSan}). ${qualityText} ${evalText}${openingText}`.trim();
}

function renderAnalysisMoveExplanation() {
    if (!el.analysisMoveExplanation) {
        return;
    }

    if (!analysisState.report) {
        el.analysisMoveExplanation.textContent = "Selecciona una jugada para ver su explicacion.";
        return;
    }

    const positions = analysisState.report.positions || [];
    const index = clamp(analysisState.currentIndex || 0, 0, Math.max(0, positions.length - 1));
    const position = positions[index];
    el.analysisMoveExplanation.textContent = buildAnalysisMoveExplanation(position, index, positions);
}

async function explainCurrentAnalysisMoveWithAI() {
    if (!analysisState.report || !el.analysisMoveExplanation) {
        return;
    }

    const positions = analysisState.report.positions || [];
    const index = clamp(analysisState.currentIndex || 0, 0, Math.max(0, positions.length - 1));
    if (index <= 0 || !positions[index] || !positions[index].move) {
        el.analysisMoveExplanation.textContent = "Selecciona una jugada real para pedir explicacion IA.";
        return;
    }

    const position = positions[index];
    const previous = positions[index - 1] || null;
    const defaultExplanation = buildAnalysisMoveExplanation(position, index, positions);

    if (el.analysisExplainAiBtn) {
        el.analysisExplainAiBtn.disabled = true;
    }
    el.analysisMoveExplanation.textContent = "Consultando IA...";

    const systemPrompt = "Eres un entrenador de ajedrez. Explica una jugada en espanol de forma corta y humana. Maximo 3 oraciones. Incluye idea estrategica y error/beneficio principal.";
    const question = [
        `Jugada: ${position.move.san}`,
        `Clasificacion: ${position.classification || "sin clasificar"}`,
        `FEN antes: ${previous ? previous.fen : ""}`,
        `FEN despues: ${position.fen}`,
        `Eval antes: ${previous ? formatEval(getAnalysisTopLine(previous)?.evaluation || null) : "--"}`,
        `Eval despues: ${formatEval(getAnalysisTopLine(position)?.evaluation || null)}`
    ].join("\n");

    try {
        const response = await fetch("/api/ai-chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                systemPrompt,
                question
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.message || "No fue posible obtener explicacion IA.");
        }

        const aiText = typeof payload.content === "string" ? payload.content.trim() : "";
        el.analysisMoveExplanation.textContent = aiText || defaultExplanation;
    } catch {
        el.analysisMoveExplanation.textContent = defaultExplanation;
    } finally {
        if (el.analysisExplainAiBtn) {
            el.analysisExplainAiBtn.disabled = false;
        }
    }
}

function renderAnalysisRetryBoard() {
    if (!analysisState.retryBoard || !analysisState.retryGame) {
        return;
    }

    analysisState.retryBoard.setFen(analysisState.retryGame.fen());
    analysisState.retryBoard.clearHighlights();

    if (analysisState.retrySelection) {
        analysisState.retryBoard.highlightSquares([analysisState.retrySelection], "selected");
        if (analysisState.retryLegalTargets.length > 0) {
            analysisState.retryBoard.highlightLegalMoves(analysisState.retryLegalTargets, analysisState.retryGame.fen());
        }
    }
}

function loadRetryFromAnalysisIndex(index) {
    if (!analysisState.report || !analysisState.retryBoard) {
        return;
    }

    const positions = analysisState.report.positions || [];
    const targetIndex = clamp(index, 1, positions.length - 1);
    const target = positions[targetIndex];
    const previous = positions[targetIndex - 1];
    if (!target || !previous) {
        return;
    }
    if (!isAnalysisErrorClassification(target.classification)) {
        if (el.analysisRetryStatus) {
            el.analysisRetryStatus.textContent = "La jugada actual no es error/inexactitud. Elige otra.";
        }
        return;
    }

    try {
        analysisState.retryGame = new Chess(previous.fen);
    } catch {
        if (el.analysisRetryStatus) {
            el.analysisRetryStatus.textContent = "No se pudo cargar la posicion para reintento.";
        }
        return;
    }

    analysisState.retrySelection = null;
    analysisState.retryLegalTargets = [];
    analysisState.retrySourceIndex = targetIndex;
    analysisState.retryStartFen = previous.fen;
    analysisState.retrySolved = false;
    const expectedUci = getAnalysisTopLine(previous)?.moveUCI || "";
    analysisState.retryExpectedMoveUci = expectedUci;

    const orientation = analysisState.retryGame.turn() === "w" ? "white" : "black";
    analysisState.retryBoard.setOrientation(orientation);
    renderAnalysisRetryBoard();

    const expectedSan = expectedUci ? uciToSanFromFen(previous.fen, expectedUci) : "";
    if (el.analysisRetryStatus) {
        el.analysisRetryStatus.textContent = expectedSan
            ? `Juega la mejor linea para esta posicion (${orientation === "white" ? "blancas" : "negras"}).`
            : "Juega la mejor linea para esta posicion.";
    }
}

function showRetrySolutionLine() {
    if (!analysisState.retryGame || !analysisState.retryExpectedMoveUci || !analysisState.retryStartFen) {
        return;
    }

    try {
        const solutionGame = new Chess(analysisState.retryStartFen);
        const parsed = parseUciMove(analysisState.retryExpectedMoveUci);
        if (!parsed) {
            return;
        }
        const move = solutionGame.move(parsed);
        if (!move) {
            return;
        }
        analysisState.retryGame = solutionGame;
        analysisState.retrySelection = null;
        analysisState.retryLegalTargets = [];
        analysisState.retrySolved = true;
        renderAnalysisRetryBoard();
        if (el.analysisRetryStatus) {
            el.analysisRetryStatus.textContent = `Linea correcta: ${move.san} (${sanToSpanish(move.san)}).`;
        }
    } catch {
        // ignore
    }
}

function canRetryDragFrom(square) {
    if (!analysisState.retryGame || analysisState.retrySolved) {
        return false;
    }
    const piece = analysisState.retryGame.get(square);
    return Boolean(piece && piece.color === analysisState.retryGame.turn());
}

function onRetryBoardSquareClick(square) {
    if (!analysisState.retryGame || analysisState.retrySolved) {
        return;
    }

    const piece = analysisState.retryGame.get(square);
    const ownPiece = piece && piece.color === analysisState.retryGame.turn();

    if (!analysisState.retrySelection) {
        if (!ownPiece) {
            playErrorSound();
            return;
        }
        analysisState.retrySelection = square;
        analysisState.retryLegalTargets = analysisState.retryGame.moves({ square, verbose: true }).map((move) => move.to);
        renderAnalysisRetryBoard();
        return;
    }

    if (square === analysisState.retrySelection) {
        analysisState.retrySelection = null;
        analysisState.retryLegalTargets = [];
        renderAnalysisRetryBoard();
        return;
    }

    const legalMoves = analysisState.retryGame.moves({ square: analysisState.retrySelection, verbose: true });
    const intendedMove = legalMoves.find((move) => move.to === square);

    if (!intendedMove) {
        if (ownPiece) {
            analysisState.retrySelection = square;
            analysisState.retryLegalTargets = analysisState.retryGame.moves({ square, verbose: true }).map((move) => move.to);
            renderAnalysisRetryBoard();
            return;
        }
        playErrorSound();
        analysisState.retrySelection = null;
        analysisState.retryLegalTargets = [];
        renderAnalysisRetryBoard();
        return;
    }

    const retryMovePayload = {
        from: intendedMove.from,
        to: intendedMove.to
    };
    if (intendedMove.promotion) {
        retryMovePayload.promotion = intendedMove.promotion;
    }
    let move = null;
    try {
        move = analysisState.retryGame.move(retryMovePayload);
    } catch {
        move = null;
    }

    if (!move) {
        playErrorSound();
        return;
    }

    analysisState.retrySelection = null;
    analysisState.retryLegalTargets = [];
    analysisState.retrySolved = true;
    renderAnalysisRetryBoard();

    const playedUci = `${move.from}${move.to}${move.promotion || ""}`;
    const solved = playedUci === analysisState.retryExpectedMoveUci;
    if (el.analysisRetryStatus) {
        if (solved) {
            el.analysisRetryStatus.textContent = `Correcto: ${move.san}. Recuperaste la mejor linea.`;
        } else {
            const expectedSan = analysisState.retryExpectedMoveUci
                ? uciToSanFromFen(analysisState.retryStartFen || analysisState.retryGame.fen(), analysisState.retryExpectedMoveUci)
                : "";
            el.analysisRetryStatus.textContent = expectedSan
                ? `Tu jugada fue ${move.san}. La mejor era ${expectedSan}.`
                : `Tu jugada fue ${move.san}. Revisa la linea sugerida.`;
        }
    }
}

function onRetryBoardDrop(from, to) {
    if (!analysisState.retryGame || analysisState.retrySolved) {
        return;
    }
    const legalMoves = analysisState.retryGame.moves({ square: from, verbose: true });
    const intendedMove = legalMoves.find((move) => move.to === to);
    if (!intendedMove) {
        playErrorSound();
        return;
    }
    analysisState.retrySelection = from;
    analysisState.retryLegalTargets = legalMoves.map((move) => move.to);
    onRetryBoardSquareClick(to);
}

function buildHistoryLineFromPositions(positions, maxIndex) {
    if (!Array.isArray(positions) || maxIndex < 1) {
        return "";
    }

    const history = [];
    for (let i = 1; i <= maxIndex && i < positions.length; i += 1) {
        const san = positions[i] && positions[i].move ? positions[i].move.san : null;
        if (san) {
            history.push(san);
        }
    }

    return historyToDisplayLine(history, 24);
}

function renderAnalysisMoveList() {
    el.analysisMoveList.innerHTML = "";

    if (!analysisState.report) {
        return;
    }

    const positions = analysisState.report.positions;
    const totalMoves = Math.max(0, positions.length - 1);
    let startIndex = 1;
    let endIndex = positions.length - 1;

    if (totalMoves > 180) {
        const halfWindow = 80;
        startIndex = Math.max(1, analysisState.currentIndex - halfWindow);
        endIndex = Math.min(positions.length - 1, analysisState.currentIndex + halfWindow);
        if ((endIndex - startIndex) < 160) {
            if (startIndex === 1) {
                endIndex = Math.min(positions.length - 1, 161);
            } else if (endIndex === positions.length - 1) {
                startIndex = Math.max(1, positions.length - 161);
            }
        }
    }

    if (startIndex > 1) {
        const skippedTop = document.createElement("li");
        skippedTop.className = "move-list-virtual-note";
        skippedTop.textContent = `... ${startIndex - 1} jugadas anteriores ocultas`;
        el.analysisMoveList.appendChild(skippedTop);
    }

    for (let i = startIndex; i <= endIndex; i += 1) {
        const position = positions[i];

        const item = document.createElement("li");
        item.dataset.index = String(i);

        if (i === analysisState.currentIndex) {
            item.classList.add("is-active");
        }

        const moveNum = document.createElement("span");
        moveNum.className = "move-num";

        const moveNumber = Math.ceil(i / 2);
        const suffix = i % 2 === 1 ? "." : "...";
        moveNum.textContent = `${moveNumber}${suffix}`;

        const moveLabel = document.createElement("span");
        moveLabel.className = "move-san";
        moveLabel.textContent = position.move ? position.move.san : "--";

        item.append(moveNum, moveLabel);

        if (position.classification) {
            const badge = document.createElement("span");
            badge.className = `cls-badge cls-${position.classification}`;
            const symbol = CLASSIFICATION_SYMBOL[position.classification] || "";
            const label = CLASSIFICATION_LABEL[position.classification] || position.classification;
            badge.textContent = symbol ? `${symbol} ${label}` : label;
            item.appendChild(badge);

            if (isAnalysisErrorClassification(position.classification)) {
                const retryBtn = document.createElement("button");
                retryBtn.type = "button";
                retryBtn.className = "ghost-btn";
                retryBtn.style.width = "auto";
                retryBtn.style.padding = "3px 8px";
                retryBtn.style.fontSize = "0.72rem";
                retryBtn.textContent = "Reintentar";
                retryBtn.addEventListener("click", (event) => {
                    event.stopPropagation();
                    analysisState.currentIndex = i;
                    renderAnalysisPosition();
                    loadRetryFromAnalysisIndex(i);
                });
                item.appendChild(retryBtn);
            }
        }

        if (position.opening) {
            const openingLink = createOpeningStudyLink(
                position.opening,
                {
                    openingName: position.opening,
                    openingFen: position.fen,
                    historyLine: buildHistoryLineFromPositions(positions, i)
                },
                "mini"
            );
            item.appendChild(openingLink);
        }

        item.addEventListener("click", () => {
            analysisState.currentIndex = i;
            renderAnalysisPosition();
        });

        el.analysisMoveList.appendChild(item);
    }

    if (endIndex < positions.length - 1) {
        const skippedBottom = document.createElement("li");
        skippedBottom.className = "move-list-virtual-note";
        skippedBottom.textContent = `... ${positions.length - 1 - endIndex} jugadas posteriores ocultas`;
        el.analysisMoveList.appendChild(skippedBottom);
    }

    const activeItem = el.analysisMoveList.querySelector(".is-active");
    if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
    }
}

function renderAnalysisLines(lines, fen) {
    el.analysisTopLines.innerHTML = "";

    if (!lines || lines.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Sin l\u00edneas disponibles en esta posici\u00f3n.";
        el.analysisTopLines.appendChild(item);
        return;
    }

    lines
        .slice()
        .sort((a, b) => a.id - b.id)
        .forEach((line) => {
            const item = document.createElement("li");
            const normalizedMove = normalizeUciMoveForFen(fen, line.moveUCI);
            const san = line.moveSAN || (normalizedMove ? normalizedMove.san : uciToSanFromFen(fen, line.moveUCI));
            item.textContent = `#${line.id}  ${san}  |  Eval ${formatEval(line.evaluation)}  |  D${line.depth}`;
            el.analysisTopLines.appendChild(item);
        });
}

function renderAnalysisPosition() {
    if (!analysisState.report) {
        return;
    }

    const positions = analysisState.report.positions;
    analysisState.currentIndex = clamp(analysisState.currentIndex, 0, positions.length - 1);

    const position = positions[analysisState.currentIndex];

    analysisState.board.setFen(position.fen);
    analysisState.board.clearHighlights();

    if (analysisState.currentIndex > 0 && position.move) {
        analysisState.board.highlightSquares([position.move.uci.slice(0, 2)], "last-from");
        analysisState.board.highlightSquares([position.move.uci.slice(2, 4)], "last-to");
    }

    const topLine = position.topLines ? position.topLines.find((l) => l.id === 1) : null;
    updateEvalBar(topLine ? topLine.evaluation : null);

    el.analysisMoveMeta.innerHTML = "";

    if (analysisState.currentIndex === 0) {
        el.analysisMoveMeta.textContent = "Posici\u00f3n inicial";
    } else {
        const moveText = `Jugada ${analysisState.currentIndex}: ${position.move ? position.move.san : "--"}`;
        el.analysisMoveMeta.appendChild(document.createTextNode(moveText));

        if (position.classification) {
            const badge = document.createElement("span");
            badge.className = `cls-badge cls-${position.classification}`;
            badge.style.marginLeft = "8px";
            const symbol = CLASSIFICATION_SYMBOL[position.classification] || "";
            const label = CLASSIFICATION_LABEL[position.classification] || position.classification;
            badge.textContent = symbol ? `${symbol} ${label}` : label;
            el.analysisMoveMeta.appendChild(badge);
        }

        if (position.opening) {
            el.analysisMoveMeta.appendChild(document.createTextNode(" | Apertura: "));
            el.analysisMoveMeta.appendChild(
                createOpeningStudyLink(
                    position.opening,
                    {
                        openingName: position.opening,
                        openingFen: position.fen,
                        historyLine: buildHistoryLineFromPositions(positions, analysisState.currentIndex)
                    },
                    "inline"
                )
            );
        }
    }

    renderAnalysisLines(position.topLines || [], position.fen);
    renderAnalysisMoveList();
    renderAnalysisEvalGraph();
    renderAnalysisMoveExplanation();

    if (el.analysisRetryBtn) {
        el.analysisRetryBtn.disabled = !isAnalysisErrorClassification(position.classification);
    }
}

function collectAnalysisErrors(report) {
    const empty = { inaccuracy: 0, mistake: 0, blunder: 0 };
    if (!report || !report.classifications) {
        return empty;
    }

    const white = report.classifications.white || {};
    const black = report.classifications.black || {};
    return {
        inaccuracy: Number(white.inaccuracy || 0) + Number(black.inaccuracy || 0),
        mistake: Number(white.mistake || 0) + Number(black.mistake || 0),
        blunder: Number(white.blunder || 0) + Number(black.blunder || 0)
    };
}

function buildFallbackAnalysisSummary(report) {
    if (!report || !Array.isArray(report.positions)) {
        return "Plan inmediato: completa primero el analisis para generar resumen.";
    }

    const openingPos = report.positions.find((position) => position && position.opening);
    const openingName = openingPos && openingPos.opening ? openingPos.opening : "Sin apertura detectada";
    const accuracy = computeOverallAccuracyFromReport(report);
    const errors = collectAnalysisErrors(report);

    return [
        `Plan inmediato: revisa primero tus ${errors.blunder} blunders y ${errors.mistake} errores.`,
        `Por que funciona: corregir errores graves mejora mas rapido que pulir detalles menores.`,
        `Riesgo principal: repetir la misma secuencia sin entender el plan posicional.`,
        "Linea sugerida: vuelve a las jugadas marcadas con 'Reintentar' y busca 2 alternativas sanas.",
        `Apertura/tema: ${openingName}. Accuracy global ${accuracy.toFixed(1)}%.`
    ].join("\n");
}

function buildAnalysisAiQuestion(report, pgn) {
    const positions = Array.isArray(report && report.positions) ? report.positions : [];
    const interestingMoves = positions
        .map((position, index) => ({ position, index }))
        .filter(({ position, index }) =>
            index > 0
            && position
            && position.move
            && isAnalysisErrorClassification(position.classification)
        )
        .slice(0, 8)
        .map(({ position, index }) => {
            const moveSan = position.move && position.move.san ? position.move.san : "--";
            const evalText = formatEval(getAnalysisTopLine(position)?.evaluation || null);
            return `- Jugada ${index}: ${moveSan} (${position.classification || "sin clasificar"}) -> Eval ${evalText}`;
        });

    const openingPos = positions.find((position) => position && position.opening);
    const openingName = openingPos && openingPos.opening ? openingPos.opening : "Sin apertura detectada";
    const overall = computeOverallAccuracyFromReport(report);
    const errors = collectAnalysisErrors(report);

    return [
        "Genera un resumen de partida para entrenamiento.",
        `Apertura principal detectada: ${openingName}`,
        `Accuracy global: ${overall.toFixed(1)}%`,
        `Errores totales -> Inexactitudes: ${errors.inaccuracy}, Errores: ${errors.mistake}, Blunders: ${errors.blunder}`,
        "Jugadas criticas:",
        interestingMoves.length > 0 ? interestingMoves.join("\n") : "- No se detectaron jugadas criticas.",
        `PGN analizado: ${String(pgn || "").slice(0, 5000)}`
    ].join("\n");
}

async function generateAnalysisSummaryWithAI(report, pgn) {
    const systemPrompt = [
        "Eres un entrenador de ajedrez experto.",
        "Tu salida debe ser clara, ordenada y no confusa.",
        "Explica el por que de las decisiones, no solo que jugada hacer.",
        "Responde en espanol con este formato exacto:",
        "Plan inmediato: ...",
        "Por que funciona: ...",
        "Riesgo principal: ...",
        "Linea sugerida: ...",
        "Apertura/tema: ...",
        "Incluye nombre teorico de apertura o tema cuando exista."
    ].join("\n");

    try {
        const response = await fetch("/api/ai-chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                systemPrompt,
                question: buildAnalysisAiQuestion(report, pgn)
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload && payload.message ? payload.message : "No se pudo generar resumen IA.");
        }

        const content = typeof payload.content === "string" ? payload.content.trim() : "";
        return content || buildFallbackAnalysisSummary(report);
    } catch {
        return buildFallbackAnalysisSummary(report);
    }
}

function persistAnalyzedGame(report, pgnText) {
    if (!authState.authenticated || !analysisModule || !analysisModule.registerFinishedGame) {
        return null;
    }

    const openingPos = Array.isArray(report && report.positions)
        ? report.positions.find((position) => position && position.opening)
        : null;
    const openingName = openingPos && openingPos.opening ? openingPos.opening : "Sin apertura detectada";
    const errors = collectAnalysisErrors(report);
    const summary = analysisModule.registerFinishedGame({
        opening: openingName,
        result: "analysis",
        botElo: null,
        color: "analisis",
        accuracy: computeOverallAccuracyFromReport(report),
        errors,
        mode: "analysis",
        ranked: false,
        pgn: String(pgnText || "").slice(0, 10000)
    });

    return summary;
}

async function yieldToUi() {
    await new Promise((resolve) => {
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(() => resolve());
            return;
        }
        setTimeout(resolve, 0);
    });
}

async function refreshAnalysisSummaryIfCurrent(localRunId, report, pgn) {
    if (localRunId !== analysisState.runId) {
        return;
    }

    analysisState.aiSummaryLoading = true;
    if (el.analysisAiSummary) {
        el.analysisAiSummary.textContent = "Generando resumen IA de la partida...";
    }

    const summary = await generateAnalysisSummaryWithAI(report, pgn);
    if (localRunId !== analysisState.runId) {
        return;
    }

    analysisState.aiSummaryLoading = false;
    analysisState.aiSummary = summary;
    if (el.analysisAiSummary) {
        el.analysisAiSummary.textContent = summary;
    }
}

function getAutomaticAnalysisProfile(totalPositions) {
    const hw = typeof navigator !== "undefined"
        ? Number(navigator.hardwareConcurrency || 4)
        : 4;
    const memory = typeof navigator !== "undefined"
        ? Number(navigator.deviceMemory || 4)
        : 4;

    let depth = 13;
    if (Number.isFinite(hw) && hw >= 12) {
        depth += 2;
    } else if (Number.isFinite(hw) && hw >= 8) {
        depth += 1;
    }
    if (Number.isFinite(memory) && memory >= 8) {
        depth += 1;
    }

    if (totalPositions >= 120) {
        depth -= 2;
    } else if (totalPositions >= 80) {
        depth -= 1;
    }

    depth = clamp(depth, 10, 19);
    const movetime = clamp(Math.round(320 + depth * 62 + (hw >= 8 ? 80 : 0)), 520, 1700);
    const multipv = totalPositions >= 90 ? 1 : 2;
    return { depth, movetime, multipv };
}

async function runAnalysis() {
    const pgn = el.analysisPgn.value.trim();
    if (!pgn) {
        setAnalysisStatus("Debes introducir un PGN para analizar.");
        return;
    }

    if (analysisState.running) {
        return;
    }

    analysisState.runId += 1;
    const localRunId = analysisState.runId;

    analysisState.running = true;
    el.analysisRunBtn.disabled = true;

    resetAnalysisSummary();

    try {
        setAnalysisStatus("Parseando PGN...");

        const parseResponse = await fetch("/api/parse", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ pgn })
        });

        const parsed = await parseResponse.json();

        if (!parseResponse.ok) {
            throw new Error(parsed.message || "No se pudo parsear el PGN.");
        }

        const positions = parsed.positions || [];
        if (!positions.length) {
            throw new Error("No se detectaron posiciones v\u00e1lidas en el PGN.");
        }

        const totalPositions = positions.length;
        const autoProfile = getAutomaticAnalysisProfile(totalPositions);

        for (let i = 0; i < totalPositions; i += 1) {
            if (localRunId !== analysisState.runId) {
                return;
            }

            const progress = Math.round((i / totalPositions) * 92);
            el.analysisProgress.value = progress;
            setAnalysisStatus(`Evaluando posici\u00f3n ${i + 1} de ${totalPositions} (auto D${autoProfile.depth})...`);
            await yieldToUi();

            let evaluation;
            try {
                evaluation = await evaluateWithStockfish({
                    fen: positions[i].fen,
                    depth: autoProfile.depth,
                    multipv: autoProfile.multipv,
                    movetime: autoProfile.movetime,
                    timeoutMs: 14_000
                });
            } catch {
                evaluation = {
                    bestMove: "",
                    lines: [{
                        id: 1,
                        depth: 0,
                        moveUCI: "",
                        evaluation: { type: "cp", value: 0 }
                    }]
                };
            }

            if (localRunId !== analysisState.runId) {
                return;
            }

            positions[i].topLines = evaluation.lines.length > 0
                ? evaluation.lines
                : [{
                    id: 1,
                    depth: autoProfile.depth,
                    moveUCI: evaluation.bestMove || "",
                    evaluation: { type: "cp", value: 0 }
                }];

            positions[i].worker = "local";
        }

        el.analysisProgress.value = 95;
        setAnalysisStatus("Generando reporte final...");
        await yieldToUi();

        const reportResponse = await fetch("/api/report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ positions })
        });

        const reportPayload = await reportResponse.json();

        if (!reportResponse.ok) {
            throw new Error(reportPayload.message || "No se pudo generar el reporte.");
        }

        const rawReport = reportPayload.results || {};
        const rawAccuracies = rawReport && rawReport.accuracies ? rawReport.accuracies : {};
        const rawClassifications = rawReport && rawReport.classifications ? rawReport.classifications : {};
        analysisState.report = {
            ...rawReport,
            positions: Array.isArray(rawReport.positions) ? rawReport.positions : [],
            accuracies: {
                white: Number(rawAccuracies.white || 0),
                black: Number(rawAccuracies.black || 0)
            },
            classifications: {
                white: rawClassifications && rawClassifications.white ? rawClassifications.white : {},
                black: rawClassifications && rawClassifications.black ? rawClassifications.black : {}
            }
        };
        analysisState.currentIndex = 0;
        analysisState.aiSummary = "";
        analysisState.aiSummaryLoading = false;
        if (el.analysisAiSummary) {
            el.analysisAiSummary.textContent = "Preparando resumen IA...";
        }

        if (el.analysisOverallAccuracy) {
            el.analysisOverallAccuracy.textContent = `${computeOverallAccuracyFromReport(analysisState.report).toFixed(1)}%`;
        }
        el.analysisWhiteAccuracy.textContent = `${analysisState.report.accuracies.white.toFixed(1)}%`;
        el.analysisBlackAccuracy.textContent = `${analysisState.report.accuracies.black.toFixed(1)}%`;

        const openingPosition = analysisState.report.positions.find((position) => position.opening);
        el.analysisOpening.innerHTML = "";
        if (openingPosition && openingPosition.opening) {
            const openingIndex = analysisState.report.positions.indexOf(openingPosition);
            el.analysisOpening.appendChild(
                createOpeningStudyLink(
                    openingPosition.opening,
                    {
                        openingName: openingPosition.opening,
                        openingFen: openingPosition.fen,
                        historyLine: buildHistoryLineFromPositions(analysisState.report.positions, openingIndex)
                    },
                    "inline"
                )
            );
        } else {
            el.analysisOpening.textContent = "Sin apertura detectada";
        }

        fillClassificationTable(analysisState.report.classifications);
        renderAnalysisPosition();

        if (authState.authenticated && analysisModule && analysisModule.registerActivity) {
            const summary = analysisModule.registerActivity("analysis", {
                whiteAccuracy: analysisState.report.accuracies.white,
                blackAccuracy: analysisState.report.accuracies.black
            });
            renderProgressDashboard(summary);
            scheduleProfileStoreSync();
        }

        if (authState.authenticated) {
            const summary = persistAnalyzedGame(analysisState.report, pgn);
            if (summary) {
                renderProgressDashboard(summary);
            }
            scheduleProfileStoreSync();
        }

        el.analysisProgress.value = 100;
        setAnalysisStatus("Analisis completado.");
        showAnalysisDetail("analysis-review");
        void refreshAnalysisSummaryIfCurrent(localRunId, analysisState.report, pgn);
    } catch (error) {
        setAnalysisStatus(error instanceof Error ? error.message : "Error inesperado en el an\u00e1lisis.");
    } finally {
        if (localRunId === analysisState.runId) {
            analysisState.running = false;
            el.analysisRunBtn.disabled = false;
        }
    }
}

const studyUiState = {
    focusBoard: null
};

const LESSON_CATALOG = {
    opening_principles: {
        title: "Principios de apertura",
        description: "Objetivo: desarrollar piezas, controlar el centro y enrocar rapido.",
        steps: [
            "Saca caballos y alfiles antes de mover muchas veces la dama.",
            "Controla e4, d4, e5 y d5 con peones y piezas.",
            "Enroca temprano para proteger al rey y conectar torres."
        ],
        exercise: {
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            prompt: "Elige una jugada sana de apertura para blancas.",
            options: [
                { uci: "e2e4", label: "Peon a e4 (e4)" },
                { uci: "d2d4", label: "Peon a d4 (d4)" },
                { uci: "a2a4", label: "Peon a4 (a4)" }
            ],
            correctUci: ["e2e4", "d2d4"],
            feedback: "Buena eleccion: peon central y desarrollo natural."
        }
    },
    king_pawn_endgames: {
        title: "Finales de rey y peon",
        description: "Objetivo: usar oposicion para empujar un peon pasado.",
        steps: [
            "Acerca tu rey antes de empujar sin necesidad.",
            "Busca la oposicion: obligar al rival a ceder casillas.",
            "Empuja el peon cuando el rey rival no pueda bloquear."
        ],
        exercise: {
            fen: "8/8/8/8/4k3/8/4P3/4K3 w - - 0 1",
            prompt: "Juegan blancas: cual es el plan correcto para progresar?",
            options: [
                { uci: "e1d2", label: "Rey a d2 (Kd2)" },
                { uci: "e2e4", label: "Peon a e4 (e4)" },
                { uci: "e1f2", label: "Rey a f2 (Kf2)" }
            ],
            correctUci: ["e1d2", "e1f2"],
            feedback: "Correcto: primero activas el rey y luego empujas el peon con mejor soporte."
        }
    },
    basic_tactics: {
        title: "Tacticas esenciales",
        description: "Objetivo: detectar mates directos y amenazas forzadas.",
        steps: [
            "Revisa jaques, capturas y amenazas en cada turno.",
            "Calcula 2-3 jugadas forzadas antes de decidir.",
            "Prioriza variantes con seguridad del rey rival comprometida."
        ],
        exercise: {
            fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
            prompt: "Encuentra el remate directo para blancas.",
            options: [
                { uci: "e1e8", label: "Torre a e8 (Re8#)" },
                { uci: "g2g3", label: "Peon a g3 (g3)" },
                { uci: "h2h3", label: "Peon a h3 (h3)" }
            ],
            correctUci: ["e1e8"],
            feedback: "Exacto: Re8 es mate inmediato."
        }
    },
    piece_activity: {
        title: "Actividad de piezas",
        description: "Objetivo: centralizar piezas, coordinarlas y distinguir piezas activas de pasivas.",
        steps: [
            "Coloca caballos en casillas centrales protegidas (avanzadas/outposts).",
            "Coordina tus piezas para que apunten a los mismos puntos debiles.",
            "Evita piezas pasivas: busca mejorar la peor pieza de tu posicion."
        ],
        exercise: {
            fen: "r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 0 9",
            prompt: "Blancas juegan: como mejorar la actividad de las piezas?",
            options: [
                { uci: "d4c6", label: "Caballo a c6 (Nc6)" },
                { uci: "a2a3", label: "Peon a a3 (a3)" },
                { uci: "h2h3", label: "Peon a h3 (h3)" }
            ],
            correctUci: ["d4c6"],
            feedback: "Correcto: Nc6 centraliza el caballo en una casilla dominante atacando puntos clave."
        }
    },
    pawn_structures: {
        title: "Estructuras de peones",
        description: "Objetivo: entender peones doblados, aislados, cadenas y debilidades estructurales.",
        steps: [
            "Identifica peones debiles: aislados, doblados o retrasados.",
            "Usa rupturas de peon para abrir lineas o deshacer la cadena rival.",
            "Apoya tu estructura con piezas y evita crear debilidades innecesarias."
        ],
        exercise: {
            fen: "r1bqkb1r/pp3ppp/2n1pn2/2pp4/3P4/2N1PN2/PPP2PPP/R1BQKB1R w KQkq - 0 5",
            prompt: "Blancas juegan: cual es la mejor ruptura central?",
            options: [
                { uci: "d4c5", label: "Peon captura c5 (dxc5)" },
                { uci: "e3e4", label: "Peon a e4 (e4)" },
                { uci: "f1d3", label: "Alfil a d3 (Bd3)" }
            ],
            correctUci: ["e3e4"],
            feedback: "Correcto: e4 desafia la cadena de peones negra y abre el centro con ventaja."
        }
    },
    calculation: {
        title: "Calculo tactico",
        description: "Objetivo: visualizar lineas forzadas y calcular secuencias concretas.",
        steps: [
            "Identifica jugadas candidatas: jaques, capturas y amenazas.",
            "Calcula cada linea hasta una posicion estable antes de elegir.",
            "Prioriza jugadas forzadas que limiten las respuestas del rival."
        ],
        exercise: {
            fen: "r2qr1k1/ppp2ppp/2n5/3N4/2BP4/8/PPP2PPP/R2Q1RK1 w - - 0 12",
            prompt: "Blancas juegan: encuentra la secuencia tactica ganadora.",
            options: [
                { uci: "d5c7", label: "Caballo a c7 (Nc7)" },
                { uci: "c4b5", label: "Alfil a b5 (Bb5)" },
                { uci: "d4d5", label: "Peon a d5 (d5)" }
            ],
            correctUci: ["d5c7"],
            feedback: "Correcto: Nc7 es horquilla de caballo que gana la calidad atacando torre y dama."
        }
    },
    endgame_rook: {
        title: "Finales de torre",
        description: "Objetivo: dominar la posicion de Lucena, Philidor, torres activas y tecnica de corte.",
        steps: [
            "Activa tu torre: colocala detras de los peones pasados.",
            "Usa la tecnica del puente (Lucena) para promover con torre y peon.",
            "Corta al rey rival con tu torre para impedir su avance."
        ],
        exercise: {
            fen: "1K6/1P1k4/8/8/8/8/r7/5R2 w - - 0 1",
            prompt: "Blancas juegan: como progresar en esta posicion de Lucena?",
            options: [
                { uci: "f1f4", label: "Torre a f4 (Rf4)" },
                { uci: "b8a7", label: "Rey a a7 (Ka7)" },
                { uci: "f1d1", label: "Torre a d1 (Rd1+)" }
            ],
            correctUci: ["f1f4"],
            feedback: "Correcto: Rf4 inicia la tecnica del puente para promover el peon con proteccion de la torre."
        }
    }
};

function getLessonById(lessonId) {
    const key = String(lessonId || "").trim();
    return LESSON_CATALOG[key] || null;
}

function ensureLessonBoard() {
    if (!el.lessonPracticeBoard) {
        return null;
    }
    if (!lessonState.board) {
        lessonState.board = new BoardView(el.lessonPracticeBoard, {
            orientation: "white",
            interactive: false,
            showCoordinates: false
        });
    }
    return lessonState.board;
}

function persistLessonProgress() {
    writeStored("session.lessonProgress", lessonState.progressByLesson);
    scheduleProfileStoreSync();
}

function renderLessonSelection(lessonId) {
    const lesson = getLessonById(lessonId);
    if (!lesson) {
        return;
    }

    lessonState.selectedLessonId = lessonId;
    lessonState.selectedExerciseIndex = 0;
    el.lessonCards.forEach((card) => {
        card.classList.toggle("is-active", card.dataset.lessonId === lessonId);
    });

    if (el.lessonTitle) {
        const progress = lessonState.progressByLesson[lessonId];
        const suffix = progress && progress.completed ? " (completada)" : "";
        el.lessonTitle.textContent = `${lesson.title}${suffix}`;
    }
    if (el.lessonDescription) {
        el.lessonDescription.textContent = lesson.description;
    }

    if (el.lessonSteps) {
        el.lessonSteps.innerHTML = "";
        lesson.steps.forEach((step, index) => {
            const item = document.createElement("div");
            item.className = "lesson-step";
            item.textContent = `${index + 1}. ${step}`;
            el.lessonSteps.appendChild(item);
        });
    }

    const board = ensureLessonBoard();
    if (board) {
        board.setFen(lesson.exercise.fen);
        board.setOrientation(lesson.exercise.fen.includes(" b ") ? "black" : "white");
    }

    if (el.lessonPrompt) {
        el.lessonPrompt.textContent = lesson.exercise.prompt;
    }

    if (el.lessonFeedback) {
        el.lessonFeedback.textContent = "";
    }

    if (el.lessonOptions) {
        el.lessonOptions.innerHTML = "";
        lesson.exercise.options.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ghost-btn";
            button.textContent = option.label;
            button.addEventListener("click", () => {
                const correctList = Array.isArray(lesson.exercise.correctUci)
                    ? lesson.exercise.correctUci
                    : [];
                const solved = correctList.includes(option.uci);
                if (solved) {
                    lessonState.progressByLesson[lessonId] = {
                        completed: true,
                        at: new Date().toISOString()
                    };
                    persistLessonProgress();
                    registerStudyActivity({ source: "lesson_complete", lessonId });
                } else {
                    playErrorSound();
                    registerStudyActivity({ source: "lesson_attempt", lessonId, solved: false });
                }

                if (el.lessonFeedback) {
                    el.lessonFeedback.textContent = solved
                        ? lesson.exercise.feedback
                        : "No es la mejor opcion. Revisa el plan y vuelve a intentar.";
                }
            });
            el.lessonOptions.appendChild(button);
        });
    }
}

function bindLessonsUi() {
    el.lessonCards.forEach((card) => {
        card.addEventListener("click", () => {
            const lessonId = card.dataset.lessonId;
            if (!lessonId) {
                return;
            }
            renderLessonSelection(lessonId);
            registerStudyActivity({ source: "lesson_open", lessonId });
        });
    });
}

function ensureFullFen(fen) {
    const placement = normalizeFenPlacement(fen);
    if (!placement) {
        return "";
    }

    if (String(fen || "").trim().split(" ").length >= 4) {
        return String(fen).trim();
    }

    return `${placement} w - - 0 1`;
}

function activateMainTab(targetId) {
    const tabButton = document.querySelector(`[data-tab-target="${targetId}"]`);
    if (tabButton) {
        tabButton.click();
        scheduleSessionSnapshotSave();
    }
}

function showAnalysisDetail(targetId) {
    const landing = document.getElementById("analysis-landing");
    const detail = document.getElementById(targetId);

    if (!detail) {
        return;
    }

    if (landing) {
        landing.style.display = "none";
    }

    document.querySelectorAll(".analysis-detail").forEach((panel) => {
        panel.style.display = panel.id === targetId ? "block" : "none";
    });

    detail.style.animation = "reveal 0.25s ease";
    scheduleSessionSnapshotSave();
}

function showAnalysisLanding() {
    const landing = document.getElementById("analysis-landing");
    document.querySelectorAll(".analysis-detail").forEach((panel) => {
        panel.style.display = "none";
    });

    if (landing) {
        landing.style.display = "";
        landing.style.animation = "reveal 0.25s ease";
    }

    scheduleSessionSnapshotSave();
}

function showStudyDetail(targetId) {
    const landing = document.getElementById("study-landing");
    const detail = document.getElementById(targetId);

    if (!detail) {
        return;
    }

    if (landing) {
        landing.style.display = "none";
    }

    document.querySelectorAll(".study-detail").forEach((panel) => {
        panel.style.display = panel.id === targetId ? "block" : "none";
    });

    detail.style.animation = "reveal 0.25s ease";
    scheduleSessionSnapshotSave();
}

function showStudyLanding() {
    const landing = document.getElementById("study-landing");
    document.querySelectorAll(".study-detail").forEach((panel) => {
        panel.style.display = "none";
    });

    if (landing) {
        landing.style.display = "";
        landing.style.animation = "reveal 0.25s ease";
    }

    scheduleSessionSnapshotSave();
}

function buildStudyUrl(context = {}) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "study-section");
    url.searchParams.set("study", "study-openings");

    if (context.openingName) {
        url.searchParams.set("opening", context.openingName);
    }
    if (context.openingFen) {
        const fenPlacement = normalizeFenPlacement(context.openingFen);
        if (fenPlacement) {
            url.searchParams.set("fen", fenPlacement);
        }
    }
    if (context.historyLine) {
        url.searchParams.set("line", context.historyLine);
    }

    return url.toString();
}

function openOpeningInStudyTab(context) {
    const openingName = context && context.openingName ? context.openingName : null;
    if (!openingName) {
        return;
    }

    registerStudyActivity({ source: "opening_link", openingName });
    window.open(buildStudyUrl(context), "_blank", "noopener,noreferrer");
}

function createOpeningStudyLink(openingName, context = {}, variant = "inline") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `opening-link opening-link-${variant}`;
    button.textContent = openingName;
    button.title = `${openingName} - Abrir en Estudio en una nueva pestana`;

    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openOpeningInStudyTab({
            openingName,
            openingFen: context.openingFen || null,
            historyLine: context.historyLine || null
        });
    });

    return button;
}

function ensureStudyOpeningFocusCard() {
    const section = document.getElementById("study-openings");
    if (!section) {
        return null;
    }

    let card = document.getElementById("study-opening-focus");
    if (card) {
        return card;
    }

    card = document.createElement("article");
    card.id = "study-opening-focus";
    card.className = "card study-card study-opening-focus";
    card.style.display = "none";
    card.innerHTML = `
        <h3 id="study-focus-title">Apertura detectada</h3>
        <p id="study-focus-subtitle">Abre esta linea para estudiarla.</p>
        <div id="study-focus-board" class="study-diagram"></div>
        <p id="study-focus-line" class="study-note"></p>
    `;

    const intro = section.querySelector(".study-intro");
    if (intro) {
        intro.insertAdjacentElement("afterend", card);
    } else {
        section.prepend(card);
    }

    return card;
}

function renderStudyOpeningFocus(openingName, openingFen, historyLine) {
    const card = ensureStudyOpeningFocusCard();
    if (!card || !openingName) {
        return;
    }

    const resolved = resolveOpeningByName(openingName);
    const titleText = resolved ? resolved.name : openingName;
    const finalFen = openingFen || (resolved && resolved.fen ? resolved.fen : null);
    const fullFen = ensureFullFen(finalFen);

    const titleEl = card.querySelector("#study-focus-title");
    const subtitleEl = card.querySelector("#study-focus-subtitle");
    const lineEl = card.querySelector("#study-focus-line");
    const boardEl = card.querySelector("#study-focus-board");

    if (titleEl) {
        titleEl.textContent = titleText;
    }
    if (subtitleEl) {
        subtitleEl.textContent = "Apertura marcada como jugada teorica. Puedes repasarla aqui.";
    }
    if (lineEl) {
        lineEl.textContent = historyLine
            ? `Linea detectada: ${historyLine}`
            : "Linea no disponible para esta deteccion.";
    }

    if (boardEl && fullFen) {
        if (!studyUiState.focusBoard) {
            studyUiState.focusBoard = new BoardView(boardEl, {
                orientation: "white",
                interactive: false,
                showCoordinates: false
            });
        }
        studyUiState.focusBoard.setFen(fullFen);
    }

    card.style.display = "grid";
    card.style.animation = "reveal 0.25s ease";
}

function applyStudyDeepLinkFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const explicitTab = params.get("tab");
    const studyTarget = params.get("study");
    const openingName = params.get("opening");
    const openingFen = params.get("fen");
    const historyLine = params.get("line");

    const wantsStudy = explicitTab === "study-section" || Boolean(studyTarget || openingName || historyLine);
    if (!wantsStudy) {
        return;
    }

    activateMainTab("study-section");

    if (studyTarget) {
        showStudyDetail(studyTarget);
    }

    if (openingName || historyLine) {
        showStudyDetail("study-openings");
        renderStudyOpeningFocus(openingName || "Apertura detectada", openingFen, historyLine || "");
        registerStudyActivity({ source: "deep_link", openingName: openingName || "" });
    }
}

function computeErrorBucketsForPlayer() {
    const isWhite = playState.playerColor === "white";
    const errors = { inaccuracy: 0, mistake: 0, blunder: 0 };

    Object.entries(playState.moveClassifications || {}).forEach(([indexText, cls]) => {
        const ply = Number(indexText);
        if (!Number.isFinite(ply)) return;
        const isPlayerMove = isWhite ? (ply % 2 === 0) : (ply % 2 === 1);
        if (!isPlayerMove) return;

        if (cls === "inaccuracy" || cls === "mistake" || cls === "blunder") {
            errors[cls] += 1;
        }
    });

    return errors;
}

function getPlayerResultLabel(winnerLabel) {
    if (!getPlaySettings().computerEnabled) {
        return "manual";
    }

    if (winnerLabel === "Empate") {
        return "draw";
    }

    const playerWon = (winnerLabel === "Blancas" && playState.playerColor === "white")
        || (winnerLabel === "Negras" && playState.playerColor === "black");

    return playerWon ? "win" : "loss";
}

function mergeListByKey(localItems, remoteItems, keyBuilder, maxItems) {
    const map = new Map();

    const appendAll = (items) => {
        (Array.isArray(items) ? items : []).forEach((item) => {
            if (!item || typeof item !== "object") {
                return;
            }
            const key = keyBuilder(item);
            if (!key) {
                return;
            }
            if (!map.has(key)) {
                map.set(key, item);
            }
        });
    };

    appendAll(remoteItems);
    appendAll(localItems);

    const merged = Array.from(map.values())
        .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));

    if (maxItems && merged.length > maxItems) {
        return merged.slice(merged.length - maxItems);
    }
    return merged;
}

function mergeProgressWithRemote(localProgress, remoteProgress) {
    const local = localProgress && typeof localProgress === "object" ? localProgress : { games: [], activities: [] };
    const remote = remoteProgress && typeof remoteProgress === "object" ? remoteProgress : { games: [], activities: [] };

    const mergedGames = mergeListByKey(
        local.games,
        remote.games,
        (item) => `${item.at || ""}|${item.opening || ""}|${item.result || ""}|${item.botElo || ""}|${item.color || ""}|${Number(item.accuracy || 0).toFixed(2)}|${item.mode || ""}|${item.ranked ? "1" : "0"}`,
        400
    );

    const mergedActivities = mergeListByKey(
        local.activities,
        remote.activities,
        (item) => `${item.at || ""}|${item.type || ""}|${JSON.stringify(item.payload || null)}`,
        1200
    );

    return {
        games: mergedGames,
        activities: mergedActivities
    };
}

async function hydrateProfileStoreFromDatabase() {
    if (!analysisModule || !analysisModule.loadProgress || !analysisModule.saveProgress) {
        return;
    }
    if (!authState.authenticated) {
        return;
    }
    if (progressState.remoteHydrated) {
        return;
    }

    try {
        const response = await fetch("/api/profile-store", withAuthFetchOptions());
        if (response.status === 401) {
            const payload = await readJsonResponseSafe(response);
            setAuthState(false, "");
            progressState.remoteHydrated = false;
            setAuthStatus(payload && payload.message
                ? String(payload.message)
                : "Sesion expirada. Vuelve a iniciar sesion.");
            return;
        }
        if (!response.ok) {
            throw new Error("Remote store unavailable");
        }

        const payload = await readJsonResponseSafe(response);
        const remoteData = payload && payload.data && typeof payload.data === "object"
            ? payload.data
            : {};
        const localProgress = analysisModule.loadProgress();
        const mergedProgress = mergeProgressWithRemote(localProgress, remoteData.progress);
        analysisModule.saveProgress(mergedProgress);

        const lessonProgress = remoteData.lessons && typeof remoteData.lessons === "object"
            ? remoteData.lessons.progressByLesson
            : null;
        if (lessonProgress && typeof lessonProgress === "object") {
            lessonState.progressByLesson = { ...lessonState.progressByLesson, ...lessonProgress };
        }

        progressState.remoteHydrated = true;
        renderProgressDashboard();
    } catch {
        // keep local-only mode when remote DB is unavailable
    }
}

async function syncProfileStoreToDatabaseNow() {
    if (!analysisModule || !analysisModule.loadProgress) {
        return;
    }
    if (!authState.authenticated) {
        return;
    }
    if (progressState.remoteSyncInFlight) {
        return;
    }

    progressState.remoteSyncInFlight = true;
    try {
        const progress = analysisModule.loadProgress();
        const response = await fetch("/api/profile-store/sync", withAuthFetchOptions({
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                progress,
                lessons: {
                    progressByLesson: lessonState.progressByLesson
                },
                profile: {
                    syncedAt: new Date().toISOString()
                }
            })
        }));
        if (response.status === 401) {
            const payload = await readJsonResponseSafe(response);
            setAuthState(false, "");
            progressState.remoteHydrated = false;
            setAuthStatus(payload && payload.message
                ? String(payload.message)
                : "Sesion expirada. Vuelve a iniciar sesion.");
            return;
        }
        if (!response.ok) {
            throw new Error(`Remote profile sync failed (${response.status}).`);
        }
    } catch {
        // ignore sync failures; local data remains authoritative
    } finally {
        progressState.remoteSyncInFlight = false;
    }
}

function scheduleProfileStoreSync(delayMs = 700) {
    if (progressState.remoteSyncTimer) {
        clearTimeout(progressState.remoteSyncTimer);
    }
    progressState.remoteSyncTimer = setTimeout(() => {
        progressState.remoteSyncTimer = null;
        syncProfileStoreToDatabaseNow();
    }, delayMs);
}

function computeEloTimeline(games, initialRating = 1200) {
    const timeline = [];
    let rating = initialRating;

    (Array.isArray(games) ? games : []).forEach((game, index) => {
        const result = String(game && game.result ? game.result : "manual");
        const botElo = Number(game && game.botElo);
        if (!(result === "win" || result === "loss" || result === "draw") || !Number.isFinite(botElo)) {
            timeline.push({
                index,
                at: game && game.at ? game.at : null,
                rating
            });
            return;
        }

        const score = result === "win" ? 1 : (result === "draw" ? 0.5 : 0);
        const expected = 1 / (1 + Math.pow(10, (botElo - rating) / 400));
        const k = 24;
        rating += k * (score - expected);
        rating = clamp(rating, 400, 3200);

        timeline.push({
            index,
            at: game && game.at ? game.at : null,
            rating
        });
    });

    return timeline;
}

function computeProfileHeadlineMetrics(games) {
    const source = Array.isArray(games) ? games : [];
    const completedGames = source.filter((game) => {
        const result = String(game && game.result ? game.result : "manual");
        return result === "win" || result === "loss" || result === "draw";
    });
    const wins = completedGames.filter((game) => game.result === "win").length;
    const avgAccuracy = source.length > 0
        ? source.reduce((acc, game) => acc + Number(game.accuracy || 0), 0) / source.length
        : 0;
    const winrate = completedGames.length > 0 ? (wins / completedGames.length) * 100 : 0;
    const eloTimeline = computeEloTimeline(source, 1200);
    const currentElo = eloTimeline.length > 0
        ? Number(eloTimeline[eloTimeline.length - 1].rating || 1200)
        : 1200;

    const draws = completedGames.filter((game) => game.result === "draw").length;
    const losses = completedGames.filter((game) => game.result === "loss").length;

    return {
        gamesCount: source.length,
        completedGamesCount: completedGames.length,
        wins,
        draws,
        losses,
        avgAccuracy,
        winrate,
        currentElo,
        eloTimeline
    };
}

function drawProfileEloGraph(timeline) {
    const canvas = el.profileEloGraph;
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssWidth = Math.max(220, canvas.clientWidth || 720);
    const cssHeight = Math.max(120, canvas.clientHeight || 180);
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    if (!Array.isArray(timeline) || timeline.length < 2) {
        ctx.fillStyle = "rgba(255,255,255,0.62)";
        ctx.font = "12px Instrument Sans, sans-serif";
        ctx.fillText("Necesitas mas partidas para ver tendencia.", 14, cssHeight / 2);
        return;
    }

    const ratings = timeline.map((point) => Number(point.rating || 1200));
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const span = Math.max(120, maxRating - minRating);
    const padX = 12;
    const padY = 12;
    const chartWidth = cssWidth - padX * 2;
    const chartHeight = cssHeight - padY * 2;

    const toX = (index) => padX + (index / (timeline.length - 1)) * chartWidth;
    const toY = (rating) => padY + ((maxRating - rating) / span) * chartHeight;

    /* Grid lines */
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 0.5;
    const gridCount = 4;
    for (let g = 1; g < gridCount; g += 1) {
        const gy = padY + (g / gridCount) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padX, gy);
        ctx.lineTo(padX + chartWidth, gy);
        ctx.stroke();
    }
    const xStep = Math.max(1, Math.floor(timeline.length / 5));
    for (let i = xStep; i < timeline.length; i += xStep) {
        const gx = toX(i);
        ctx.beginPath();
        ctx.moveTo(gx, padY);
        ctx.lineTo(gx, padY + chartHeight);
        ctx.stroke();
    }

    /* Gradient fill below line */
    const grad = ctx.createLinearGradient(0, padY, 0, padY + chartHeight);
    grad.addColorStop(0, "rgba(126,178,218,0.32)");
    grad.addColorStop(1, "rgba(126,178,218,0.02)");
    ctx.beginPath();
    ctx.moveTo(toX(0), padY + chartHeight);
    for (let i = 0; i < timeline.length; i += 1) {
        ctx.lineTo(toX(i), toY(ratings[i]));
    }
    ctx.lineTo(toX(timeline.length - 1), padY + chartHeight);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    /* Line */
    ctx.beginPath();
    for (let i = 0; i < timeline.length; i += 1) {
        const x = toX(i);
        const y = toY(ratings[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#7eb2da";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    /* Axis labels */
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "9px Instrument Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(maxRating)), padX - 3, padY + 9);
    ctx.fillText(String(Math.round(minRating)), padX - 3, padY + chartHeight);
    ctx.textAlign = "center";
    for (let i = xStep; i < timeline.length; i += xStep) {
        ctx.fillText(String(i + 1), toX(i), padY + chartHeight + 10);
    }

    const lastX = toX(timeline.length - 1);
    const lastY = toY(ratings[ratings.length - 1]);
    ctx.fillStyle = "#96bc4b";
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4.2, 0, Math.PI * 2);
    ctx.fill();
}

function renderProfileDashboard() {
    if (!analysisModule || !analysisModule.loadProgress) {
        return;
    }

    const progress = analysisModule.loadProgress();
    const games = getRankedGamesOnly(progress.games);
    const metrics = computeProfileHeadlineMetrics(games);
    profileState.games = games;
    profileState.eloTimeline = metrics.eloTimeline;

    if (el.profileGamesTotal) el.profileGamesTotal.textContent = String(metrics.gamesCount);
    if (el.profileWinrate) el.profileWinrate.textContent = `${metrics.winrate.toFixed(1)}%`;
    if (el.profileAvgAccuracy) el.profileAvgAccuracy.textContent = `${metrics.avgAccuracy.toFixed(1)}%`;
    if (el.profileEstimatedElo) el.profileEstimatedElo.textContent = String(Math.round(metrics.currentElo));

    /* WDL bar */
    if (el.profileWdlBar) {
        el.profileWdlBar.innerHTML = "";
        const total = metrics.completedGamesCount;
        if (total > 0) {
            const wPct = ((metrics.wins / total) * 100).toFixed(1);
            const dPct = ((metrics.draws / total) * 100).toFixed(1);
            const lPct = ((metrics.losses / total) * 100).toFixed(1);
            const wSpan = document.createElement("span");
            wSpan.className = "wdl-win";
            wSpan.style.width = wPct + "%";
            wSpan.textContent = metrics.wins > 0 ? String(metrics.wins) : "";
            const dSpan = document.createElement("span");
            dSpan.className = "wdl-draw";
            dSpan.style.width = dPct + "%";
            dSpan.textContent = metrics.draws > 0 ? String(metrics.draws) : "";
            const lSpan = document.createElement("span");
            lSpan.className = "wdl-loss";
            lSpan.style.width = lPct + "%";
            lSpan.textContent = metrics.losses > 0 ? String(metrics.losses) : "";
            el.profileWdlBar.appendChild(wSpan);
            el.profileWdlBar.appendChild(dSpan);
            el.profileWdlBar.appendChild(lSpan);
        }
    }
    if (el.profileWdlLegend) {
        const total = metrics.completedGamesCount;
        if (total > 0) {
            el.profileWdlLegend.textContent = `V ${metrics.wins}  T ${metrics.draws}  D ${metrics.losses}`;
        } else {
            el.profileWdlLegend.textContent = "";
        }
    }

    drawProfileEloGraph(profileState.eloTimeline);
    if (el.profileEloMeta) {
        if (games.length === 0) {
            el.profileEloMeta.textContent = "Sin clasificatorias registradas. Juega en modo Clasificatoria para estimar ELO.";
        } else {
            const startElo = profileState.eloTimeline.length > 0 ? profileState.eloTimeline[0].rating : 1200;
            const delta = metrics.currentElo - startElo;
            const sign = delta >= 0 ? "+" : "-";
            el.profileEloMeta.textContent = `Tendencia clasificatoria: ${sign}${Math.abs(delta).toFixed(1)} desde tus primeras partidas rankeadas.`;
        }
    }

    if (el.profileTopOpenings) {
        el.profileTopOpenings.innerHTML = "";
        const openingMap = new Map();
        games.forEach((game) => {
            const opening = String(game && game.opening ? game.opening : "Sin apertura detectada");
            openingMap.set(opening, (openingMap.get(opening) || 0) + 1);
        });

        const top = Array.from(openingMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7);
        if (top.length === 0) {
            const li = document.createElement("li");
            li.textContent = "Aun no hay clasificatorias guardadas.";
            el.profileTopOpenings.appendChild(li);
        } else {
            top.forEach(([name, count]) => {
                const li = document.createElement("li");
                li.textContent = `${name} (${count})`;
                el.profileTopOpenings.appendChild(li);
            });
        }
    }

    if (el.profileHistoryBody) {
        el.profileHistoryBody.innerHTML = "";
        const timelineByIndex = new Map(profileState.eloTimeline.map((point) => [point.index, point.rating]));
        games
            .slice()
            .reverse()
            .forEach((game, reverseIndex) => {
                const originalIndex = games.length - 1 - reverseIndex;
                const row = document.createElement("tr");
                const at = game && game.at ? new Date(game.at) : null;
                const dateText = at && Number.isFinite(at.getTime()) ? at.toLocaleDateString("es-ES") : "--";
                const botElo = Number.isFinite(Number(game && game.botElo)) ? String(game.botElo) : "--";
                const color = game && game.color ? String(game.color) : "--";
                const result = game && game.result ? String(game.result) : "--";
                const accuracy = Number.isFinite(Number(game && game.accuracy))
                    ? `${Number(game.accuracy).toFixed(1)}%`
                    : "--";
                const opening = game && game.opening ? String(game.opening) : "Sin apertura detectada";
                const rating = timelineByIndex.has(originalIndex)
                    ? Math.round(Number(timelineByIndex.get(originalIndex)))
                    : "--";

                [dateText, botElo, color, result, accuracy, opening, String(rating)].forEach((value) => {
                    const td = document.createElement("td");
                    td.textContent = value;
                    row.appendChild(td);
                });

                el.profileHistoryBody.appendChild(row);
            });
    }
}

function renderProgressDashboard(summary = null) {
    if (!analysisModule || !analysisModule.summarize) {
        return;
    }

    const progress = analysisModule.loadProgress();
    const rankedOnlyProgress = {
        ...(progress && typeof progress === "object" ? progress : {}),
        games: getRankedGamesOnly(progress && progress.games)
    };
    const computed = analysisModule.summarize(rankedOnlyProgress);
    if (!computed) {
        return;
    }

    if (el.progressStudyStreak) {
        el.progressStudyStreak.textContent = `${computed.studyStreakDays || 0} d\u00edas`;
    }
    if (el.progressGamesCount) {
        el.progressGamesCount.textContent = String(computed.gamesCount || 0);
    }

    if (el.progressWeeklyChart) {
        el.progressWeeklyChart.innerHTML = "";
        const weekly = Array.isArray(computed.weekly) ? computed.weekly : [];
        if (weekly.length === 0) {
            el.progressWeeklyChart.textContent = "Sin datos a\u00fan.";
        } else {
            weekly.forEach((item) => {
                const bar = document.createElement("div");
                bar.className = "progress-week-bar";

                const label = document.createElement("span");
                label.className = "progress-week-label";
                label.textContent = item.label.slice(5);

                const rail = document.createElement("div");
                rail.className = "progress-week-rail";

                const fill = document.createElement("div");
                fill.className = "progress-week-fill";
                fill.style.height = `${clamp(item.accuracy || 0, 0, 100)}%`;
                fill.title = `${(item.accuracy || 0).toFixed(1)}%`;

                rail.appendChild(fill);
                bar.append(label, rail);
                el.progressWeeklyChart.appendChild(bar);
            });
        }
    }

    if (el.progressTopOpenings) {
        el.progressTopOpenings.innerHTML = "";
        const topOpenings = Array.isArray(computed.topOpenings) ? computed.topOpenings : [];
        if (topOpenings.length === 0) {
            const li = document.createElement("li");
            li.textContent = "Sin clasificatorias registradas.";
            el.progressTopOpenings.appendChild(li);
        } else {
            topOpenings.forEach((entry) => {
                const li = document.createElement("li");
                li.textContent = `${entry.name} (${entry.count})`;
                el.progressTopOpenings.appendChild(li);
            });
        }
    }

    if (el.progressCommonErrors) {
        el.progressCommonErrors.innerHTML = "";
        const commonErrors = Array.isArray(computed.commonErrors) ? computed.commonErrors : [];
        const labels = {
            inaccuracy: "Inexactitudes",
            mistake: "Errores",
            blunder: "Blunders"
        };

        commonErrors.forEach((entry) => {
            const li = document.createElement("li");
            li.textContent = `${labels[entry.type] || entry.type}: ${entry.count}`;
            el.progressCommonErrors.appendChild(li);
        });
    }

    renderProfileDashboard();
}

function readRankedProfileMetricsSnapshot() {
    if (!analysisModule || !analysisModule.loadProgress) {
        return null;
    }
    const progress = analysisModule.loadProgress();
    const games = getRankedGamesOnly(progress && progress.games);
    return computeProfileHeadlineMetrics(games);
}

function persistFinishedGame(openingName, winnerLabel) {
    if (!analysisModule || !analysisModule.registerFinishedGame) {
        return;
    }
    if (progressState.persistedGameSession === playState.sessionId) {
        return;
    }

    if (!authState.authenticated) {
        progressState.persistedGameSession = playState.sessionId;
        setCoachMessage(coachNotice("warn", "Partida finalizada. Inicia sesion para guardar estadisticas del perfil."));
        scheduleSessionSnapshotSave();
        return;
    }

    playState.lastRankedProfileDelta = null;

    if (normalizePlayMode(playState.gameMode) !== PLAY_MODES.RANKED) {
        progressState.persistedGameSession = playState.sessionId;
        setCoachMessage(coachNotice("info", "Partida clasica finalizada. No suma estadisticas de perfil (solo Clasificatoria)."));
        scheduleSessionSnapshotSave();
        return;
    }

    const beforeMetrics = readRankedProfileMetricsSnapshot();
    const accuracy = computeAccuracyForColor(playState.playerColor) || 0;

    const summary = analysisModule.registerFinishedGame({
        opening: openingName || "Sin apertura detectada",
        result: getPlayerResultLabel(winnerLabel),
        color: playState.playerColor,
        botElo: playState.botElo,
        mode: PLAY_MODES.RANKED,
        ranked: true,
        accuracy,
        errors: computeErrorBucketsForPlayer()
    });

    const afterMetrics = readRankedProfileMetricsSnapshot();
    if (beforeMetrics && afterMetrics) {
        playState.lastRankedProfileDelta = {
            before: beforeMetrics,
            after: afterMetrics
        };
    }

    progressState.persistedGameSession = playState.sessionId;
    renderProgressDashboard(summary);
    scheduleSessionSnapshotSave();
    scheduleProfileStoreSync();
}

function registerStudyActivity(payload) {
    if (!analysisModule || !analysisModule.registerActivity) {
        return;
    }
    if (!authState.authenticated) {
        return;
    }
    const summary = analysisModule.registerActivity("study", payload || null);
    renderProgressDashboard(summary);
    scheduleSessionSnapshotSave();
    scheduleProfileStoreSync();
}

async function ensureExplorerNodeChildren(parentNode) {
    if (!parentNode || parentNode.loaded || !openingsModule || !openingsModule.fetchExplorerPosition) {
        return;
    }

    const startedAt = nowMs();
    const result = await openingsModule.fetchExplorerPosition({
        fen: parentNode.fen,
        moves: 14
    });
    markExplorerLatencyMetric(nowMs() - startedAt);

    const payload = result && result.payload ? result.payload : null;
    const moves = payload && Array.isArray(payload.moves) ? payload.moves : [];
    const knownIds = new Set(openingExplorerState.rows.map((row) => row.id));
    const knownFen = new Set(openingExplorerState.rows.map((row) => row.fen));

    moves.forEach((move, index) => {
        if (!move || !move.uci) {
            return;
        }

        let childFen = "";
        try {
            const game = new Chess(parentNode.fen);
            game.move({
                from: move.uci.slice(0, 2),
                to: move.uci.slice(2, 4),
                promotion: move.uci.slice(4) || undefined
            });
            childFen = game.fen();
        } catch {
            return;
        }

        if (knownFen.has(childFen)) {
            return;
        }

        const white = Number(move.white || 0);
        const black = Number(move.black || 0);
        const draws = Number(move.draws || 0);
        const games = white + black + draws;
        const lineText = parentNode.line ? `${parentNode.line} ${move.san}` : move.san;
        const name = move.opening && move.opening.name
            ? move.opening.name
            : detectOpening(lineText.split(" "), childFen) || "Linea sin nombre";
        const eco = move.opening && move.opening.eco
            ? move.opening.eco
            : (openingsModule && openingsModule.ecoBucketFromName ? openingsModule.ecoBucketFromName(name) : "A00");
        const childId = `${parentNode.id}_${index}_${move.uci}`;
        if (knownIds.has(childId)) {
            return;
        }
        knownIds.add(childId);
        knownFen.add(childFen);

        openingExplorerState.rows.push({
            id: childId,
            parentId: parentNode.id,
            depth: parentNode.depth + 1,
            fen: childFen,
            san: move.san,
            line: lineText,
            name,
            eco,
            white,
            black,
            draws,
            games,
            expanded: false,
            loaded: false,
            hasChildren: parentNode.depth < 5 && games > 0
        });
    });

    parentNode.loaded = true;
}

function computeExplorerRowMetrics(row, colorFilter, rootGames) {
    const total = Number(row.games || 0);
    const popularity = rootGames > 0 ? (total / rootGames) * 100 : 0;
    const success = openingsModule && openingsModule.computeSuccessRate
        ? openingsModule.computeSuccessRate(row, colorFilter)
        : 0;
    return { popularity, success };
}

function classifyExplorerFrequency(popularity) {
    const value = Number(popularity || 0);
    if (value >= 14) return "high";
    if (value >= 6) return "medium";
    return "low";
}

function classifyExplorerResult(success) {
    const value = Number(success || 0);
    if (value >= 56) return "favorable";
    if (value >= 45) return "balanced";
    return "risky";
}

function formatExplorerFrequencyLabel(tier) {
    switch (String(tier || "all").toLowerCase()) {
        case "high":
            return "Muy jugada";
        case "medium":
            return "Intermedia";
        case "low":
            return "Poco jugada";
        default:
            return "Sin clasificar";
    }
}

function playStartSound() {
    const settings = getPlaySettings();
    if (!settings.sound) {
        return;
    }

    try {
        if (typeof window === "undefined" || !window.AudioContext) {
            playAudio(el.fxMove);
            return;
        }

        if (!errorAudioContext) {
            errorAudioContext = new window.AudioContext();
        }

        const context = errorAudioContext;
        if (context.state === "suspended") {
            context.resume().catch(() => { });
        }

        const now = context.currentTime;
        const oscA = context.createOscillator();
        const oscB = context.createOscillator();
        const gain = context.createGain();

        oscA.type = "triangle";
        oscB.type = "sine";
        oscA.frequency.setValueAtTime(440, now);
        oscA.frequency.exponentialRampToValueAtTime(659.25, now + 0.13);
        oscB.frequency.setValueAtTime(554.37, now + 0.02);
        oscB.frequency.exponentialRampToValueAtTime(880, now + 0.16);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

        oscA.connect(gain);
        oscB.connect(gain);
        gain.connect(context.destination);
        oscA.start(now);
        oscB.start(now + 0.01);
        oscA.stop(now + 0.2);
        oscB.stop(now + 0.2);
    } catch {
        playAudio(el.fxMove);
    }
}

function formatExplorerResultLabel(tier) {
    switch (String(tier || "all").toLowerCase()) {
        case "favorable":
            return "Favorable";
        case "balanced":
            return "Equilibrada";
        case "risky":
            return "Riesgosa";
        default:
            return "Sin clasificar";
    }
}

function normalizeExplorerFrequencyFilter(value) {
    const normalized = String(value || "all").trim().toLowerCase();
    if (normalized === "high" || normalized === "medium" || normalized === "low") {
        return normalized;
    }
    return "all";
}

function normalizeExplorerResultFilter(value) {
    const normalized = String(value || "all").trim().toLowerCase();
    if (normalized === "favorable" || normalized === "balanced" || normalized === "risky") {
        return normalized;
    }
    return "all";
}

function mapLegacyPopularityToTier(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return "all";
    }
    if (numeric >= 14) return "high";
    if (numeric >= 6) return "medium";
    return "low";
}

function mapLegacySuccessToTier(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return "all";
    }
    if (numeric >= 56) return "favorable";
    if (numeric >= 45) return "balanced";
    return "risky";
}

function buildExplorerRowMap() {
    return new Map(openingExplorerState.rows.map((row) => [row.id, row]));
}

function explorerHasChildren(row) {
    return openingExplorerState.rows.some((candidate) => candidate.parentId === row.id);
}

function isExplorerRowVisibleByCollapse(row, rowMap) {
    let parentId = row.parentId;
    while (parentId) {
        if (openingExplorerState.collapsedIds.has(parentId)) {
            return false;
        }
        const parent = rowMap.get(parentId);
        parentId = parent ? parent.parentId : null;
    }
    return true;
}

function getExplorerDomId(rowId) {
    return `eco-row-${String(rowId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function focusExplorerRow(index) {
    const rows = openingExplorerState.visibleRows;
    if (!Array.isArray(rows) || rows.length === 0 || !el.ecoTree) {
        return;
    }

    openingExplorerState.focusedIndex = clamp(index, 0, rows.length - 1);
    renderExplorerTree();
    const row = rows[openingExplorerState.focusedIndex];
    if (!row) return;
    const node = document.getElementById(getExplorerDomId(row.id));
    if (node) {
        node.focus();
    }
}

async function handleExplorerTreeKeydown(event) {
    if (!Array.isArray(openingExplorerState.visibleRows) || openingExplorerState.visibleRows.length === 0) {
        return;
    }

    const rows = openingExplorerState.visibleRows;
    const currentIndex = clamp(openingExplorerState.focusedIndex || 0, 0, rows.length - 1);
    const row = rows[currentIndex];
    const stateRow = openingExplorerState.rows.find((entry) => entry.id === row.id) || row;
    const hasChildren = explorerHasChildren(stateRow) || (stateRow.depth < 5 && stateRow.hasChildren);

    if (event.key === "ArrowDown") {
        event.preventDefault();
        focusExplorerRow(currentIndex + 1);
        return;
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        focusExplorerRow(currentIndex - 1);
        return;
    }

    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        renderExplorerDetail(stateRow);
        if (!stateRow.loaded && stateRow.depth < 5) {
            await ensureExplorerNodeChildren(stateRow);
            await applyExplorerFilters();
        } else {
            renderExplorerTree();
        }
        registerStudyActivity({ source: "explorer_key_enter", eco: stateRow.eco, name: stateRow.name });
        scheduleSessionSnapshotSave();
        return;
    }

    if (event.key === "ArrowRight") {
        if (!hasChildren) {
            return;
        }
        event.preventDefault();

        if (openingExplorerState.collapsedIds.has(stateRow.id)) {
            openingExplorerState.collapsedIds.delete(stateRow.id);
            await applyExplorerFilters();
            return;
        }

        if (!stateRow.loaded && stateRow.depth < 5) {
            await ensureExplorerNodeChildren(stateRow);
            await applyExplorerFilters();
        }

        const childIndex = openingExplorerState.visibleRows.findIndex((entry) => entry.parentId === stateRow.id);
        if (childIndex >= 0) {
            focusExplorerRow(childIndex);
        }
        return;
    }

    if (event.key === "ArrowLeft") {
        event.preventDefault();

        if (hasChildren && !openingExplorerState.collapsedIds.has(stateRow.id)) {
            openingExplorerState.collapsedIds.add(stateRow.id);
            await applyExplorerFilters();
            return;
        }

        if (stateRow.parentId) {
            const parentIndex = openingExplorerState.visibleRows.findIndex((entry) => entry.id === stateRow.parentId);
            if (parentIndex >= 0) {
                focusExplorerRow(parentIndex);
            }
        }
    }
}

async function applyExplorerFilters() {
    openingExplorerState.filterRunId += 1;
    const currentRunId = openingExplorerState.filterRunId;

    const filters = {
        frequencyTier: normalizeExplorerFrequencyFilter(el.ecoFilterPopularity ? el.ecoFilterPopularity.value : "all"),
        resultTier: normalizeExplorerResultFilter(el.ecoFilterSuccess ? el.ecoFilterSuccess.value : "all"),
        query: el.ecoSearch ? el.ecoSearch.value : ""
    };
    const queryText = String(filters.query || "").trim();

    const buildEnrichedRows = () => {
        const rows = openingExplorerState.rows.filter((row) => row.parentId !== null);
        const rootGames = rows
            .filter((row) => row.depth === 1)
            .reduce((sum, row) => sum + Number(row.games || 0), 0);
        const colorFilter = el.ecoFilterColor ? el.ecoFilterColor.value : "white";

        return rows.map((row) => {
            const metrics = computeExplorerRowMetrics(row, colorFilter, rootGames);
            return {
                ...row,
                popularity: metrics.popularity,
                success: metrics.success,
                frequencyTier: classifyExplorerFrequency(metrics.popularity),
                resultTier: classifyExplorerResult(metrics.success)
            };
        });
    };

    let enrichedRows = buildEnrichedRows();

    let filteredRows = enrichedRows;
    if (openingsModule && openingsModule.filterTreeRows) {
        try {
            filteredRows = await openingsModule.filterTreeRows(enrichedRows, filters);
        } catch {
            filteredRows = enrichedRows;
        }
    }

    if (currentRunId !== openingExplorerState.filterRunId) {
        return;
    }

    if (queryText && (!Array.isArray(filteredRows) || filteredRows.length === 0)) {
        const firstDepthUnloaded = openingExplorerState.rows
            .filter((row) => row && row.depth === 1 && !row.loaded)
            .slice(0, 14);

        if (firstDepthUnloaded.length > 0) {
            for (let i = 0; i < firstDepthUnloaded.length; i += 1) {
                // Load one level deeper while searching so terms like "Defensa" return matches.
                await ensureExplorerNodeChildren(firstDepthUnloaded[i]);
                if (currentRunId !== openingExplorerState.filterRunId) {
                    return;
                }
            }

            enrichedRows = buildEnrichedRows();
            filteredRows = enrichedRows;
            if (openingsModule && openingsModule.filterTreeRows) {
                try {
                    filteredRows = await openingsModule.filterTreeRows(enrichedRows, filters);
                } catch {
                    filteredRows = enrichedRows;
                }
            }
            if (currentRunId !== openingExplorerState.filterRunId) {
                return;
            }
        }
    }

    openingExplorerState.filteredRows = Array.isArray(filteredRows)
        ? filteredRows
        : enrichedRows;

    const rowMap = buildExplorerRowMap();
    openingExplorerState.visibleRows = openingExplorerState.filteredRows.filter((row) => {
        return isExplorerRowVisibleByCollapse(row, rowMap);
    });

    if (openingExplorerState.visibleRows.length === 0) {
        openingExplorerState.focusedIndex = 0;
        openingExplorerState.selectedNode = null;
    } else {
        const selectedId = openingExplorerState.selectedNode ? openingExplorerState.selectedNode.id : null;
        const selectedIndex = selectedId
            ? openingExplorerState.visibleRows.findIndex((entry) => entry.id === selectedId)
            : -1;
        openingExplorerState.focusedIndex = selectedIndex >= 0
            ? selectedIndex
            : clamp(openingExplorerState.focusedIndex || 0, 0, openingExplorerState.visibleRows.length - 1);
    }

    if (currentRunId !== openingExplorerState.filterRunId) {
        return;
    }

    renderExplorerTree();
}

function renderExplorerDetail(node) {
    if (!node) {
        return;
    }
    openingExplorerState.selectedNode = node;

    if (el.ecoDetailTitle) {
        el.ecoDetailTitle.textContent = `${node.eco} \u2022 ${node.name}`;
    }
    if (el.ecoDetailMeta) {
        const total = Number(node.games || 0);
        const frequencyLabel = formatExplorerFrequencyLabel(node.frequencyTier);
        const resultLabel = formatExplorerResultLabel(node.resultTier);
        el.ecoDetailMeta.textContent = `Linea: ${node.line} | Frecuencia ${frequencyLabel} | Resultado ${resultLabel} | Muestra ${total}`;
    }
    if (el.ecoDetailPlan) {
        const plans = studyModule && studyModule.buildOpeningPlan
            ? studyModule.buildOpeningPlan(node.name, el.ecoFilterColor ? el.ecoFilterColor.value : "white")
            : ["Desarrolla piezas, controla centro y asegura al rey."];
        el.ecoDetailPlan.textContent = "";
        plans.forEach((step, index) => {
            const line = document.createElement("div");
            line.textContent = `${index + 1}. ${step}`;
            el.ecoDetailPlan.appendChild(line);
        });
    }

    if (el.ecoDetailBoard) {
        if (!openingExplorerState.detailBoard) {
            openingExplorerState.detailBoard = new BoardView(el.ecoDetailBoard, {
                orientation: "white",
                interactive: false,
                showCoordinates: false
            });
        }
        openingExplorerState.detailBoard.setFen(node.fen);
    }
}

function renderExplorerTree() {
    if (!el.ecoTree) {
        return;
    }
    el.ecoTree.textContent = "";

    const rows = openingExplorerState.visibleRows.slice(0, 220);
    if (rows.length === 0) {
        const hasQuery = Boolean(el.ecoSearch && String(el.ecoSearch.value || "").trim());
        const frequency = formatExplorerFrequencyLabel(normalizeExplorerFrequencyFilter(el.ecoFilterPopularity ? el.ecoFilterPopularity.value : "all"));
        const result = formatExplorerResultLabel(normalizeExplorerResultFilter(el.ecoFilterSuccess ? el.ecoFilterSuccess.value : "all"));
        const emptyMessage = hasQuery
            ? "No hay coincidencias con esa busqueda. Prueba con otro termino o codigo ECO."
            : `Sin lineas para los filtros actuales (Frecuencia ${frequency} / Resultado ${result}).`;
        const emptyNote = document.createElement("p");
        emptyNote.className = "eco-empty-note";
        emptyNote.textContent = emptyMessage;
        el.ecoTree.appendChild(emptyNote);
        el.ecoTree.removeAttribute("aria-activedescendant");
        return;
    }

    rows.forEach((row, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "eco-row";
        item.style.paddingLeft = `${8 + row.depth * 14}px`;
        item.id = getExplorerDomId(row.id);
        if (openingExplorerState.selectedNode && openingExplorerState.selectedNode.id === row.id) {
            item.classList.add("is-active");
        }
        if (openingExplorerState.focusedIndex === index) {
            item.classList.add("is-focus");
        }

        const frequencyLabel = formatExplorerFrequencyLabel(row.frequencyTier);
        const resultLabel = formatExplorerResultLabel(row.resultTier);
        const main = document.createElement("span");
        main.className = "eco-row-main";
        main.textContent = `${row.eco} - ${row.san || "..."} \u2192 ${row.name}`;

        const meta = document.createElement("span");
        meta.className = "eco-row-meta";
        meta.textContent = `${frequencyLabel} | ${resultLabel}`;

        item.appendChild(main);
        item.appendChild(meta);
        item.setAttribute("role", "treeitem");
        item.setAttribute("aria-level", String(row.depth + 1));
        const hasChildren = explorerHasChildren(row) || (row.depth < 5 && row.hasChildren);
        if (hasChildren) {
            item.setAttribute("aria-expanded", openingExplorerState.collapsedIds.has(row.id) ? "false" : "true");
        }
        item.tabIndex = openingExplorerState.focusedIndex === index ? 0 : -1;
        item.setAttribute("aria-label", `${row.name}, frecuencia ${frequencyLabel}, resultado ${resultLabel}`);

        item.addEventListener("click", async () => {
            openingExplorerState.focusedIndex = index;
            renderExplorerDetail(row);
            const stateRow = openingExplorerState.rows.find((entry) => entry.id === row.id) || row;
            if (!stateRow.loaded && stateRow.depth < 5) {
                await ensureExplorerNodeChildren(stateRow);
                await applyExplorerFilters();
            } else {
                renderExplorerTree();
            }
            registerStudyActivity({ source: "explorer_click", eco: row.eco, name: row.name });
            scheduleSessionSnapshotSave();
        });

        item.addEventListener("dblclick", async () => {
            const hasChildren = explorerHasChildren(row) || (row.depth < 5 && row.hasChildren);
            if (!hasChildren) return;
            if (openingExplorerState.collapsedIds.has(row.id)) {
                openingExplorerState.collapsedIds.delete(row.id);
            } else {
                openingExplorerState.collapsedIds.add(row.id);
            }
            await applyExplorerFilters();
            scheduleSessionSnapshotSave();
        });

        el.ecoTree.appendChild(item);
    });

    const focused = rows[clamp(openingExplorerState.focusedIndex, 0, rows.length - 1)];
    if (focused) {
        el.ecoTree.setAttribute("aria-activedescendant", getExplorerDomId(focused.id));
    }
}

async function initOpeningExplorer() {
    if (!el.ecoTree || !openingsModule || !openingsModule.fetchExplorerPosition) {
        return;
    }

    const rootNode = {
        id: "root",
        parentId: null,
        depth: 0,
        fen: openingExplorerState.rootFen,
        line: "",
        name: "Posicion inicial",
        eco: "A00",
        white: 0,
        black: 0,
        draws: 0,
        games: 0,
        expanded: true,
        loaded: false,
        hasChildren: true
    };

    openingExplorerState.rows = [rootNode];
    openingExplorerState.visibleRows = [];
    openingExplorerState.focusedIndex = 0;
    if (!openingExplorerState.collapsedIds) {
        openingExplorerState.collapsedIds = new Set();
    }

    const onFilterChange = async () => {
        await applyExplorerFilters();
        scheduleSessionSnapshotSave();
    };

    [el.ecoFilterColor, el.ecoFilterPopularity, el.ecoFilterSuccess].forEach((control) => {
        if (control) {
            control.addEventListener("input", onFilterChange);
            control.addEventListener("change", onFilterChange);
        }
    });

    if (el.ecoSearch) {
        el.ecoSearch.addEventListener("input", onFilterChange);
    }

    el.ecoTree.addEventListener("keydown", (event) => {
        void handleExplorerTreeKeydown(event);
    });

    if (el.ecoLoadPlayBtn) {
        el.ecoLoadPlayBtn.addEventListener("click", () => {
            const node = openingExplorerState.selectedNode;
            if (!node) return;

            try {
                playState.game.load(node.fen);
                playState.lastMove = null;
                clearPlaySelection();

                if (el.playSetupPanel) el.playSetupPanel.style.display = "none";
                if (el.playGamePanel) el.playGamePanel.style.display = "flex";
                if (el.playPanelGrid) el.playPanelGrid.classList.remove("setup-mode");
                if (el.playBoardCard) el.playBoardCard.style.display = "";

                renderPlayBoard();
                renderPlayMoveList();
                activateMainTab("play-section");
                setCoachMessage(coachNotice("info", `Linea cargada: ${node.name}.`));
                scheduleSessionSnapshotSave();
            } catch {
                setCoachMessage(coachNotice("warn", "No se pudo cargar esa linea en el tablero."));
            }
        });
    }

    try {
        await ensureExplorerNodeChildren(rootNode);
        await applyExplorerFilters();
    } catch (error) {
        if (el.ecoTree) {
            el.ecoTree.textContent = "No se pudo cargar el explorador ECO en este momento.";
        }
        console.error("Opening explorer init failed:", error);
    }
}

function bindGlobalShortcuts() {
    if (!uiModule || !uiModule.registerKeyboardShortcuts) {
        return;
    }

    uiModule.registerKeyboardShortcuts({
        h: () => requestCoachHint(false),
        u: () => undoPlayMove(),
        n: () => startNewGame(),
        f: () => {
            if (el.playFlipBtn) el.playFlipBtn.click();
        },
        a: () => activateMainTab("analysis-section"),
        s: () => activateMainTab("study-section"),
        p: () => activateMainTab("profile-section"),
        "?": () => {
            window.alert("Atajos:\\nH pista\\nU deshacer\\nN nueva partida\\nF girar\\nA analisis\\nS estudio\\nP perfil");
        }
    });
}

/* ===== Study Diagrams ===== */

let studyDiagramObserver = null;

function renderSingleStudyDiagram(container) {
    if (!container || container.dataset.rendered === "1") {
        return;
    }
    const fen = container.dataset.fen;
    if (!fen) {
        return;
    }

    const board = new BoardView(container, {
        orientation: "white",
        interactive: false,
        showCoordinates: false
    });

    board.setFen(fen);
    container.dataset.rendered = "1";
}

function renderStudyDiagrams() {
    if (!Array.isArray(el.studyDiagrams) || el.studyDiagrams.length === 0) {
        return;
    }

    if (!("IntersectionObserver" in window)) {
        el.studyDiagrams.forEach(renderSingleStudyDiagram);
        return;
    }

    if (studyDiagramObserver) {
        studyDiagramObserver.disconnect();
    }

    studyDiagramObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }
            const target = entry.target;
            if (target instanceof HTMLElement) {
                renderSingleStudyDiagram(target);
                studyDiagramObserver.unobserve(target);
            }
        });
    }, {
        rootMargin: "220px 0px"
    });

    el.studyDiagrams.forEach((container) => {
        if (container.dataset.rendered === "1") {
            return;
        }
        studyDiagramObserver.observe(container);
    });
}

/* ===== Tabs ===== */

function bindTabs() {
    el.tabs.forEach((button) => {
        button.addEventListener("click", () => {
            const target = button.dataset.tabTarget;
            if (!target) {
                return;
            }

            el.tabs.forEach((tab) => {
                tab.classList.remove("is-active");
                tab.setAttribute("aria-selected", "false");
            });
            el.panels.forEach((panel) => panel.classList.remove("is-active"));

            button.classList.add("is-active");
            button.setAttribute("aria-selected", "true");

            const panel = document.querySelector(`#${target}`);
            if (panel) {
                panel.classList.add("is-active");
            }

            if (target === "study-section") {
                registerStudyActivity({ source: "tab_switch" });
            }

            scheduleSessionSnapshotSave();
        });
    });
}

/* ===== Event Binding ===== */

function applySettingsToBoard() {
    if (getSelectedPlayMode() === PLAY_MODES.RANKED || isRankedActiveGame()) {
        enforceRankedSettings();
    }

    const s = getPlaySettings();
    playState.board.setCoordinatesVisible(s.showCoordinates);
    applyUiTheme(s.uiTheme, true);
    if (playModule && playModule.applyBoardAndPieceTheme) {
        playModule.applyBoardAndPieceTheme(s.boardTheme, s.pieceTheme);
    } else if (uiModule) {
        uiModule.applyBoardTheme(s.boardTheme);
        uiModule.applyPieceTheme(s.pieceTheme);
    }

    if (!s.premoveEnabled && playState.premove) {
        clearPremove(false);
    }

    if (uiModule && uiModule.savePreference) {
        uiModule.savePreference("error_sound", Boolean(s.errorSound));
        uiModule.savePreference("piece_animation", Boolean(s.pieceAnimation));
        uiModule.savePreference("premove_enabled", Boolean(s.premoveEnabled));
    }
    writeStored("preferences.time_control", String(s.timeControlSeconds));
    writeStored("preferences.game_type", String(s.gameType || "standard"));

    /* Eval bar visibility in analysis */
    if (el.evalBar) {
        el.evalBar.style.display = s.showEvalBar ? "" : "none";
    }

    if (!s.computerEnabled) {
        clearComputerTopLines();
    } else if (playState.startTime
        && !isPlayGameOver()
        && sideFromTurn(playState.game.turn()) === playState.playerColor
        && playState.computerTopLines.length === 0) {
        updateComputerLines(playState.game.fen(), playState.sessionId);
    }

    syncPlayClockState();
    renderPlayBoard();
}

/* ===== Coach Review System ===== */

const coachReviewState = {
    active: false,
    session: null,
    board: null,
    currentPly: 0,
    autoPlayTimer: null,
    typingTimer: null
};

const CR_CLASSIFICATION_ROWS = [
    { key: "brilliant", label: "Brillante", icon: "!!" },
    { key: "great", label: "Genial", icon: "!" },
    { key: "book", label: "Libro", icon: "\ud83d\udcda" },
    { key: "best", label: "Mejor", icon: "\u2b50" },
    { key: "excellent", label: "Excelente", icon: "\ud83d\udc4d" },
    { key: "good", label: "Bueno", icon: "\u2705" },
    { key: "inaccuracy", label: "Imprecisi\u00f3n", icon: "\u2753\u2757" },
    { key: "mistake", label: "Error", icon: "\u2753" },
    { key: "blunder", label: "Omisi\u00f3n", icon: "\u274c" }
];

function isCoachMode() {
    return normalizePlayMode(playState.gameMode) === PLAY_MODES.COACH;
}

function buildCoachReviewPositions() {
    const history = playState.game.history({ verbose: true });
    const replay = new Chess();
    const positions = [{ fen: replay.fen(), classification: null, san: null, eval: 0 }];
    const swingByClass = {
        brilliant: 170,
        great: 110,
        best: 70,
        excellent: 45,
        good: 20,
        book: 10,
        inaccuracy: -80,
        mistake: -170,
        blunder: -320
    };
    let estimatedWhiteEvalCp = 0;

    for (let i = 0; i < history.length; i++) {
        const move = history[i];
        replay.move(move.san);
        const cls = playState.moveClassifications[i] || null;
        const classKey = typeof cls === "string" ? cls : (cls && cls.key ? cls.key : "");
        const moverIsWhite = i % 2 === 0;
        const swingForMover = swingByClass[classKey] || 0;
        estimatedWhiteEvalCp = clamp(
            estimatedWhiteEvalCp + (moverIsWhite ? swingForMover : -swingForMover),
            -1200,
            1200
        );

        positions.push({
            fen: replay.fen(),
            classification: cls,
            san: move.san,
            move: move.san,
            from: move.from,
            to: move.to,
            eval: estimatedWhiteEvalCp
        });
    }

    return positions;
}

function openCoachReview() {
    if (!coachReviewModule) return;

    closeEndgameModal();

    const positions = buildCoachReviewPositions();
    const opening = detectOpening(playState.game.history(), playState.game.fen()) || "";

    const resultText = (() => {
        if (playState.manualGameOver) {
            const w = playState.manualGameOver.winner;
            if (w === "Blancas") return "1-0";
            if (w === "Negras") return "0-1";
            return "1/2-1/2";
        }
        if (playState.game.isCheckmate()) {
            return playState.game.turn() === "w" ? "0-1" : "1-0";
        }
        return "1/2-1/2";
    })();

    const meta = {
        result: resultText,
        playerColor: playState.playerColor,
        rivalElo: playState.botElo,
        duration: formatDurationFromStart(),
        opening: opening
    };

    const session = coachReviewModule.buildReviewSession(
        playState.game.pgn(),
        positions,
        playState.playerColor,
        meta
    );

    coachReviewState.session = session;
    coachReviewState.currentPly = 0;
    coachReviewState.active = true;

    if (!coachReviewState.board && el.crBoard) {
        coachReviewState.board = new BoardView(el.crBoard, {
            orientation: playState.playerColor,
            interactive: false,
            showCoordinates: true
        });
    }
    if (coachReviewState.board) {
        coachReviewState.board.setOrientation(playState.playerColor);
    }

    renderCoachReviewAll();

    if (el.crOverlay) {
        el.crOverlay.style.display = "flex";
        setTimeout(() => {
            el.crOverlay.classList.add("is-visible");
        }, 20);
    }

    const summary = coachReviewModule.getGameSummary(session);
    typeCoachSpeech(summary);
}

function closeCoachReview() {
    coachReviewState.active = false;
    stopCoachAutoPlay();
    stopCoachSpeech();
    if (coachReviewState.typingTimer) {
        clearTimeout(coachReviewState.typingTimer);
        coachReviewState.typingTimer = null;
    }
    if (el.crOverlay) {
        el.crOverlay.classList.remove("is-visible");
        setTimeout(() => {
            el.crOverlay.style.display = "none";
        }, 400);
    }
}

function typeCoachSpeech(text, speed = 18) {
    if (!el.crSpeechText) return;
    if (coachReviewState.typingTimer) {
        clearTimeout(coachReviewState.typingTimer);
        coachReviewState.typingTimer = null;
    }

    if (el.crCoachAvatar) el.crCoachAvatar.classList.add("is-speaking");
    el.crSpeechText.textContent = "";
    speakCoachText(text, { force: true });
    let i = 0;

    function typeChar() {
        if (i < text.length) {
            el.crSpeechText.textContent += text[i];
            i++;
            coachReviewState.typingTimer = setTimeout(typeChar, speed);
        } else {
            if (el.crCoachAvatar) el.crCoachAvatar.classList.remove("is-speaking");
            coachReviewState.typingTimer = null;
        }
    }
    typeChar();
}

function navigateCoachReview(ply) {
    if (!coachReviewState.session) return;
    const maxPly = coachReviewState.session.positions.length - 1;
    coachReviewState.currentPly = clamp(ply, 0, maxPly);
    renderCoachReviewPosition();
    renderCoachReviewMoveListHighlight();

    const pos = coachReviewState.session.positions[coachReviewState.currentPly];
    if (coachReviewState.currentPly === 0) {
        typeCoachSpeech(coachReviewModule.getGameSummary(coachReviewState.session));
    } else {
        const comment = coachReviewModule.getCoachComment(coachReviewState.session, coachReviewState.currentPly);
        if (comment) {
            typeCoachSpeech(comment);
        } else {
            const san = pos ? (pos.san || pos.move || "...") : "...";
            typeCoachSpeech(`\u27a1\ufe0f ${sanToSpanish(san)} - Jugada normal, sin grandes incidencias.`);
        }
    }

    if (pos && pos.fen && coachReviewState.board) {
        coachReviewState.board.setFen(pos.fen);
        coachReviewState.board.clearHighlights();
        if (pos.from && pos.to) {
            coachReviewState.board.highlightSquares([pos.from], "last-from");
            coachReviewState.board.highlightSquares([pos.to], "last-to");
        }
    }

    renderCoachReviewEvalGraph();
}

function stopCoachAutoPlay() {
    if (coachReviewState.autoPlayTimer) {
        clearInterval(coachReviewState.autoPlayTimer);
        coachReviewState.autoPlayTimer = null;
    }
}

function toggleCoachAutoPlay() {
    if (coachReviewState.autoPlayTimer) {
        stopCoachAutoPlay();
        return;
    }
    const maxPly = coachReviewState.session ? coachReviewState.session.positions.length - 1 : 0;
    coachReviewState.autoPlayTimer = setInterval(() => {
        if (coachReviewState.currentPly >= maxPly) {
            stopCoachAutoPlay();
            return;
        }
        navigateCoachReview(coachReviewState.currentPly + 1);
    }, 2000);
}

function renderCoachReviewAll() {
    renderCoachReviewPosition();
    renderCoachReviewAccuracies();
    renderCoachReviewClassifications();
    renderCoachReviewPhases();
    renderCoachReviewKeyMoments();
    renderCoachReviewMoveList();
    renderCoachReviewGameScore();
    renderCoachReviewEvalGraph();
}

function renderCoachReviewPosition() {
    if (!coachReviewState.session || !coachReviewState.board) return;
    const pos = coachReviewState.session.positions[coachReviewState.currentPly];
    if (!pos) return;
    coachReviewState.board.setFen(pos.fen);
    coachReviewState.board.clearHighlights();
    if (pos.from && pos.to) {
        coachReviewState.board.highlightSquares([pos.from], "last-from");
        coachReviewState.board.highlightSquares([pos.to], "last-to");
    }
}

function renderCoachReviewAccuracies() {
    if (!coachReviewState.session) return;
    const acc = coachReviewState.session.accuracies;
    const isWhite = coachReviewState.session.meta.playerColor === "white";

    if (el.crWhiteName) el.crWhiteName.textContent = isWhite ? "T\u00fa" : "Rival";
    if (el.crBlackName) el.crBlackName.textContent = isWhite ? "Rival" : "T\u00fa";

    const playerAcc = acc.player;
    const opponentAcc = acc.opponent;

    if (el.crWhiteAccuracy) el.crWhiteAccuracy.textContent = (isWhite ? playerAcc : opponentAcc) + "%";
    if (el.crBlackAccuracy) el.crBlackAccuracy.textContent = (isWhite ? opponentAcc : playerAcc) + "%";
}

function renderCoachReviewClassifications() {
    if (!el.crClassificationBody || !coachReviewState.session) return;
    el.crClassificationBody.innerHTML = "";
    const counts = coachReviewState.session.countsBySide;
    const isWhite = coachReviewState.session.meta.playerColor === "white";

    CR_CLASSIFICATION_ROWS.forEach(row => {
        const wCount = counts.white[row.key] || 0;
        const bCount = counts.black[row.key] || 0;

        const tr = document.createElement("tr");
        const tdW = document.createElement("td");
        tdW.className = "cr-cls-count white-count";
        tdW.textContent = isWhite ? wCount : bCount;

        const tdName = document.createElement("td");
        tdName.className = `cr-cls-name cr-cls-${row.key}`;
        tdName.textContent = row.label;

        const tdIcon = document.createElement("td");
        tdIcon.className = `cr-cls-icon cr-cls-${row.key}`;
        tdIcon.textContent = row.icon;

        const tdB = document.createElement("td");
        tdB.className = "cr-cls-count black-count";
        tdB.textContent = isWhite ? bCount : wCount;

        tr.append(tdW, tdName, tdIcon, tdB);
        el.crClassificationBody.appendChild(tr);
    });
}

function renderCoachReviewPhases() {
    if (!el.crPhases || !coachReviewState.session || !coachReviewModule) return;
    el.crPhases.innerHTML = "";
    const phases = [
        { key: "opening", label: "Apertura" },
        { key: "middlegame", label: "Medio juego" },
        { key: "endgame", label: "Final de partida" }
    ];

    phases.forEach(phase => {
        const rating = coachReviewModule.getPhaseRating(coachReviewState.session, phase.key);
        const icon = coachReviewModule.getPhaseIcon(rating.score);

        const row = document.createElement("div");
        row.className = "cr-phase-row";

        const label = document.createElement("span");
        label.className = "cr-phase-label";
        label.textContent = phase.label;

        const score = document.createElement("span");
        score.className = "cr-phase-score";
        score.textContent = rating.moves > 0 ? rating.score : "--";

        const iconEl = document.createElement("span");
        iconEl.className = "cr-phase-icon";
        iconEl.textContent = rating.moves > 0 ? icon : "\u2796";

        row.append(label, score, iconEl);
        el.crPhases.appendChild(row);
    });
}

function renderCoachReviewKeyMoments() {
    if (!el.crKeyMoments || !coachReviewState.session || !coachReviewModule) return;
    el.crKeyMoments.innerHTML = "";
    const moments = coachReviewModule.getKeyMoments(coachReviewState.session);

    if (moments.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No se detectaron momentos clave.";
        el.crKeyMoments.appendChild(empty);
        return;
    }

    const clsIcons = {
        brilliant: "\u2b50", great: "\ud83d\udd25", blunder: "\ud83d\udca5",
        mistake: "\u274c", inaccuracy: "\u26a0\ufe0f"
    };

    moments.forEach(moment => {
        const item = document.createElement("div");
        item.className = "cr-moment-item";
        item.addEventListener("click", () => navigateCoachReview(moment.ply));

        const icon = document.createElement("span");
        icon.className = "cr-moment-icon";
        icon.textContent = clsIcons[moment.classification] || "\ud83d\udd0d";

        const moveNum = Math.ceil(moment.ply / 2);
        const side = moment.ply % 2 === 0 ? "" : "...";
        const pos = coachReviewState.session.positions[moment.ply];
        const san = pos ? (pos.san || pos.move || "") : "";

        const moveSpan = document.createElement("span");
        moveSpan.className = "cr-moment-move";
        moveSpan.textContent = `${moveNum}.${side} ${san}`;

        const desc = document.createElement("span");
        desc.className = "cr-moment-desc";
        desc.textContent = moment.reason;

        item.append(icon, moveSpan, desc);
        el.crKeyMoments.appendChild(item);
    });
}

function renderCoachReviewMoveList() {
    if (!el.crMoveList || !coachReviewState.session) return;
    el.crMoveList.innerHTML = "";
    const positions = coachReviewState.session.positions;

    for (let i = 1; i < positions.length; i += 2) {
        const wPos = positions[i];
        const bPos = i + 1 < positions.length ? positions[i + 1] : null;
        const moveNum = Math.ceil(i / 2);

        const entry = document.createElement("div");
        entry.className = "cr-move-entry";
        entry.dataset.ply = String(i);

        const num = document.createElement("span");
        num.className = "cr-move-num";
        num.textContent = `${moveNum}.`;

        const wSan = document.createElement("span");
        wSan.className = "cr-move-san";
        const wCls = wPos.classification;
        if (wCls && CLASSIFICATION_DOT_COLOR[wCls]) {
            const dot = document.createElement("span");
            dot.className = "cr-move-cls-dot";
            dot.style.background = CLASSIFICATION_DOT_COLOR[wCls];
            wSan.appendChild(dot);
        }
        wSan.appendChild(document.createTextNode(wPos.san || ""));
        wSan.addEventListener("click", () => navigateCoachReview(i));

        const bSan = document.createElement("span");
        bSan.className = "cr-move-san";
        if (bPos) {
            const bCls = bPos.classification;
            if (bCls && CLASSIFICATION_DOT_COLOR[bCls]) {
                const dot = document.createElement("span");
                dot.className = "cr-move-cls-dot";
                dot.style.background = CLASSIFICATION_DOT_COLOR[bCls];
                bSan.appendChild(dot);
            }
            bSan.appendChild(document.createTextNode(bPos.san || ""));
            bSan.addEventListener("click", () => navigateCoachReview(i + 1));
        }

        entry.append(num, wSan, bSan);
        el.crMoveList.appendChild(entry);
    }

    renderCoachReviewMoveListHighlight();
}

function renderCoachReviewMoveListHighlight() {
    if (!el.crMoveList) return;
    el.crMoveList.querySelectorAll(".cr-move-entry").forEach(entry => {
        const ply = parseInt(entry.dataset.ply, 10);
        const isActive = ply === coachReviewState.currentPly || ply + 1 === coachReviewState.currentPly;
        entry.classList.toggle("is-active", isActive);
    });
}

function renderCoachReviewGameScore() {
    if (!el.crGameScore || !coachReviewState.session || !coachReviewModule) return;
    const score = coachReviewModule.computeGameScore(coachReviewState.session);
    el.crGameScore.textContent = String(score);
}

function renderCoachReviewEvalGraph() {
    if (!el.crEvalGraph || !coachReviewState.session) return;
    const canvas = el.crEvalGraph;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const positions = coachReviewState.session.positions;
    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    if (positions.length < 2) return;

    const step = w / (positions.length - 1);

    ctx.beginPath();
    ctx.strokeStyle = "rgba(129,182,76,0.8)";
    ctx.lineWidth = 2;

    for (let i = 0; i < positions.length; i++) {
        const ev = Number(positions[i].eval || 0);
        const normalized = clamp(ev / 500, -1, 1);
        const y = midY - normalized * (midY - 4);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * step, y);
    }
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "rgba(129,182,76,0.15)");
    gradient.addColorStop(0.5, "rgba(129,182,76,0)");
    gradient.addColorStop(1, "rgba(202,52,49,0.15)");

    ctx.beginPath();
    for (let i = 0; i < positions.length; i++) {
        const ev = Number(positions[i].eval || 0);
        const normalized = clamp(ev / 500, -1, 1);
        const y = midY - normalized * (midY - 4);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * step, y);
    }
    ctx.lineTo((positions.length - 1) * step, midY);
    ctx.lineTo(0, midY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    if (coachReviewState.currentPly > 0 && coachReviewState.currentPly < positions.length) {
        const x = coachReviewState.currentPly * step;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        ctx.fillStyle = "#81b64c";
        ctx.beginPath();
        const ev = Number(positions[coachReviewState.currentPly].eval || 0);
        const ny = midY - clamp(ev / 500, -1, 1) * (midY - 4);
        ctx.arc(x, ny, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function getCoachTurnComment(move, cls, evalAfter) {
    if (!cls) return null;
    const key = cls.key || cls;
    const templates = {
        brilliant: [
            "\u2728 \u00a1Madre m\u00eda, {san}! Eso fue BRILLANTE. No cualquiera la encuentra, \u00a1tienes ojo de maestro!",
            "\ud83c\udf1f \u00a1WOW! {san} es una obra de arte. Me dejaste sin palabras, \u00a1sigue as\u00ed!",
            "\ud83d\udca1 \u00a1{san}! Pensar fuera de la caja. Jugada de alto nivel, \u00a1me encanta tu creatividad!",
            "\ud83d\ude80 \u00a1ESPECTACULAR! {san} demuestra que ves lo que otros no. \u00a1Qu\u00e9 talento!",
            "\u2b50 \u00a1{san}! Momento \u00e9pico de la partida. \u00a1Brillante de verdad!"
        ],
        great: [
            "\ud83d\udc4f \u00a1Muy bien, {san}! Buen instinto, mejoras mucho la posici\u00f3n.",
            "\ud83d\udcaa {san} es fuerte. Se nota que piensas bien, \u00a1sigue con esa energ\u00eda!",
            "\ud83d\udd25 \u00a1{san}, excelente elecci\u00f3n! Tu rival sentir\u00e1 la presi\u00f3n. \u00a1Bien hecho!",
            "\ud83c\udfaf {san} fue gran jugada. Lees bien la posici\u00f3n, \u00a1me gusta!",
            "\ud83d\ude04 \u00a1Buena esa! {san} demuestra que est\u00e1s en ritmo."
        ],
        best: [
            "\u2705 \u00a1Perfecto! {san} es exacto. \u00a1Ni un GM lo har\u00eda mejor aqu\u00ed!",
            "\ud83c\udfaf \u00a1{san} es LA jugada! Precisi\u00f3n total. Sigue as\u00ed.",
            "\ud83d\udc4d \u00a1Impecable! {san} es la mejor. Tu c\u00e1lculo funciona genial.",
            "\u2713 {san}, justo en el clavo. \u00a1Gran precisi\u00f3n!"
        ],
        excellent: [
            "\u2b50 \u00a1Muy bien! {san} es excelente. Juegas con solidez.",
            "\ud83d\udc4d {san} mantiene todo bajo control. \u00a1Buen trabajo!",
            "\ud83d\ude0a \u00a1{san}! Buenas decisiones. La partida va por buen camino.",
            "\u2714\ufe0f {san} es muy precisa. Sigue as\u00ed, \u00a1vas genial!"
        ],
        good: [
            "\ud83d\ude42 {san} est\u00e1 bien, pero \u00bfviste alguna m\u00e1s activa? Vale buscar m\u00e1s.",
            "\ud83d\udc4c {san} es s\u00f3lida. Tip: busca jugadas que presionen al rival.",
            "\ud83e\udd14 {san} est\u00e1 OK pero hab\u00eda algo mejor. \u00a1Sigue buscando!",
            "\u2796 {san} correcta. Pregunta: \u00bfpuedo amenazar algo con mi jugada?",
            "\ud83d\udca1 {san} est\u00e1 OK. Antes de mover, mira capturas, jaques o amenazas."
        ],
        book: [
            "\ud83d\udcda \u00a1De libro! {san} sigue la teor\u00eda. \u00a1Buena preparaci\u00f3n!",
            "\ud83c\udf93 {san} es teor\u00eda. Conocer aperturas da ventaja desde el inicio.",
            "\ud83d\udcda \u00a1Perfecto! {san} la juegan los maestros, \u00a1vas bien!",
            "\ud83c\udf1f {san}, jugada te\u00f3rica. Te ahorra tiempo y evita trampas."
        ],
        inaccuracy: [
            "\u26a0\ufe0f {san} no es la mejor. Hab\u00eda algo un poco m\u00e1s fuerte. \u00a1Sigue atento!",
            "\ud83e\udd14 {san} pierde ventajita. Tip: rev\u00edsa amenazas del rival.",
            "\u26a0\ufe0f {san} es imprecisa. Tranquilo, todos lo hacemos. Calcula una m\u00e1s.",
            "\ud83d\udca1 {san} no era \u00f3ptimo. Pregunta: \u00bfqu\u00e9 quiere hacer mi rival?",
            "\ud83d\ude15 {san} no es ideal. No pasa nada, lo importante es aprender."
        ],
        mistake: [
            "\u274c \u00a1Uy! {san} es error. \u00a1Tranquilo! Cada error ense\u00f1a. Revisa jaques y capturas.",
            "\ud83d\ude2c {san} complica cosas. No pasa nada, \u00a1vamos a recuperarnos!",
            "\u274c {san} pierde ventaja. Mira qu\u00e9 puede hacer el rival DESPU\u00c9S de tu jugada.",
            "\ud83d\udea8 {san} fue tropez\u00f3n. \u00a1\u00c1nimo! Los mejores tambi\u00e9n cometen errores."
        ],
        blunder: [
            "\ud83d\udea8 \u00a1Cuidado! {san} es error grave. Respira y calcula una jugada m\u00e1s.",
            "\ud83d\udca5 \u00a1Ay! {san} cambi\u00f3 el rumbo. No te desanimes, \u00a1a seguir luchando!",
            "\u274c {san}, no viste la respuesta. Clave: revisa SIEMPRE las amenazas.",
            "\ud83d\ude30 {san} es serio. Pero de errores se aprende m\u00e1s que de victorias."
        ]
    };

    const pool = templates[key] || ["\u27a1\ufe0f {san} - Jugada interesante. \u00bfQu\u00e9 plan ten\u00edas?"];
    const t = pool[Math.floor(Math.random() * pool.length)];
    const san = move ? move.san : "...";
    return t.replace(/\{san\}/g, sanToSpanish(san));
}


function bindCoachReviewEvents() {
    if (el.crCloseBtn) el.crCloseBtn.addEventListener("click", closeCoachReview);
    if (el.crVoiceBtn) {
        el.crVoiceBtn.addEventListener("click", () => {
            coachSpeechState.enabled = !coachSpeechState.enabled;
            writeStored("preferences.coach_voice", coachSpeechState.enabled ? "1" : "0");
            updateCoachVoiceButton();
            if (!coachSpeechState.enabled) {
                stopCoachSpeech();
            } else if (coachReviewState.active && el.crSpeechText && el.crSpeechText.textContent) {
                speakCoachText(el.crSpeechText.textContent, { force: true });
            }
        });
    }
    if (el.crCloseBottomBtn) el.crCloseBottomBtn.addEventListener("click", closeCoachReview);
    if (el.crNavStart) el.crNavStart.addEventListener("click", () => navigateCoachReview(0));
    if (el.crNavPrev) el.crNavPrev.addEventListener("click", () => navigateCoachReview(coachReviewState.currentPly - 1));
    if (el.crNavNext) el.crNavNext.addEventListener("click", () => navigateCoachReview(coachReviewState.currentPly + 1));
    if (el.crNavEnd) el.crNavEnd.addEventListener("click", () => {
        const max = coachReviewState.session ? coachReviewState.session.positions.length - 1 : 0;
        navigateCoachReview(max);
    });
    if (el.crNavPlay) el.crNavPlay.addEventListener("click", toggleCoachAutoPlay);
    if (el.crNewGameBtn) el.crNewGameBtn.addEventListener("click", () => {
        closeCoachReview();
        goToPlaySetup(coachNotice("setup", "\u00a1Vamos con otra partida! Configura tu pr\u00f3ximo reto."));
    });
    if (el.crEvalGraph) {
        el.crEvalGraph.addEventListener("click", (e) => {
            if (!coachReviewState.session) return;
            const rect = el.crEvalGraph.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = x / rect.width;
            const ply = Math.round(ratio * (coachReviewState.session.positions.length - 1));
            navigateCoachReview(ply);
        });
    }
    if (el.endgameCoachReviewBtn) {
        el.endgameCoachReviewBtn.addEventListener("click", openCoachReview);
    }
}

function bindEvents() {
    playState.board.onSquareClick = onPlaySquareClick;
    playState.board.onDrop = handleBoardDrop;
    playState.board.canDragFrom = canPlayerDragFrom;

    if (el.authLoginBtn) {
        el.authLoginBtn.addEventListener("click", () => {
            loginWithCredentials();
        });
    }
    if (el.authRegisterBtn) {
        el.authRegisterBtn.addEventListener("click", () => {
            registerWithCredentials();
        });
    }
    if (el.authLogoutBtn) {
        el.authLogoutBtn.addEventListener("click", () => {
            logoutCurrentSession();
        });
    }
    if (el.authPassword) {
        el.authPassword.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }
            event.preventDefault();
            loginWithCredentials();
        });
    }

    if (el.endgameCloseBtn) {
        el.endgameCloseBtn.addEventListener("click", () => {
            closeEndgameModal();
        });
    }

    if (el.endgamePgnBtn) {
        el.endgamePgnBtn.addEventListener("click", () => {
            const pgn = playState.game.pgn();
            const blob = new Blob([pgn], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ajedrez_lab_${Date.now()}.pgn`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (el.endgameAnalyzeBtn) {
        el.endgameAnalyzeBtn.addEventListener("click", () => {
            const pgn = playState.game.pgn();
            if (el.analysisPgn) {
                el.analysisPgn.value = pgn;
            }

            closeEndgameModal();

            // Switch to analysis tab automatically
            const tabBtn = document.querySelector('[data-tab-target="analysis-section"]');
            if (tabBtn) tabBtn.click();

            showAnalysisDetail("analysis-input");
            // Trigger analysis loading
            if (el.analysisRunBtn) el.analysisRunBtn.click();
        });
    }

    if (el.endgameHomeBtn) {
        el.endgameHomeBtn.addEventListener("click", () => {
            closeEndgameModal();
            goToPlaySetup(coachNotice("info", "Volviste al inicio. Ajusta color y nivel para una nueva partida."));
            activateMainTab("play-section");
        });
    }

    el.playStartBtn.addEventListener("click", startNewGame);
    if (el.playMode) {
        el.playMode.addEventListener("change", () => {
            const selectedMode = getSelectedPlayMode();
            writeStored("preferences.play_mode", selectedMode);
            applySettingsToBoard();
            if (!playState.startTime) {
                const modeMessage = selectedMode === PLAY_MODES.RANKED
                    ? "Modo Clasificatoria activado: sin ayudas y con impacto en perfil."
                    : selectedMode === PLAY_MODES.COACH
                        ? "Modo Jugar con Entrenador activado: guia por voz y revision automatica al terminar."
                        : "Modo Clasico activado: puedes usar ajustes libres sin afectar perfil.";
                setCoachMessage(coachNotice("setup", modeMessage));
            }
            refreshPlayModeUiState();
            scheduleSessionSnapshotSave();
        });
    }
    if (el.playBackBtn) {
        el.playBackBtn.addEventListener("click", () => {
            goToPlaySetup(coachNotice("info", "Volviste al inicio. Ajusta color y nivel para una nueva partida."));
        });
    }
    el.playNewGameBtn.addEventListener("click", () => {
        goToPlaySetup(coachNotice("setup", "Partida cerrada. Configura una nueva partida."));
    });
    el.playHintBtn.addEventListener("click", () => requestCoachHint(false));
    el.playUndoBtn.addEventListener("click", undoPlayMove);
    if (el.playResignBtn) {
        el.playResignBtn.addEventListener("click", resignCurrentGame);
    }
    if (el.playCancelPremoveBtn) {
        el.playCancelPremoveBtn.addEventListener("click", () => {
            if (!playState.premove) {
                playErrorSound();
                return;
            }
            clearPremove(true);
        });
    }

    el.playFlipBtn.addEventListener("click", async () => {
        if (playState.thinking) {
            return;
        }

        if (normalizePlayMode(playState.gameMode) === PLAY_MODES.RANKED && Boolean(playState.startTime)) {
            playErrorSound();
            setCoachMessage(coachNotice("warn", "En Clasificatoria el color es aleatorio y no se puede cambiar."));
            return;
        }

        if (playState.game.history().length > 0) {
            setCoachMessage(coachNotice("warn", "Solo puedes girar/cambiar color antes de la primera jugada."));
            return;
        }

        playState.playerColor = playState.playerColor === "white" ? "black" : "white";
        playState.botColor = playState.playerColor === "white" ? "black" : "white";
        if (el.playerColor) {
            el.playerColor.value = playState.playerColor;
        }

        playState.hintMove = null;
        playState.premove = null;
        clearComputerTopLines();
        clearPlaySelection();
        playState.board.setOrientation(playState.playerColor);
        renderPlayBoard();

        const sideText = playState.playerColor === "white" ? "blancas" : "negras";
        setCoachMessage(coachNotice("ok", `Color cambiado: ahora juegas con ${sideText}.`));

        if (!getPlaySettings().computerEnabled) {
            return;
        }

        if (sideFromTurn(playState.game.turn()) === playState.botColor) {
            await playBotMove();
        } else {
            updateComputerLines(playState.game.fen(), playState.sessionId);
        }
    });

    /* Move confirmation buttons */
    if (el.confirmYesBtn) {
        el.confirmYesBtn.addEventListener("click", () => confirmSuggestedMove());
    }
    if (el.confirmNoBtn) {
        el.confirmNoBtn.addEventListener("click", () => cancelMoveConfirmation());
    }

    /* Settings modal open/close */
    let _settingsTrapHandler = null;
    function openSettingsModal() {
        if (!el.settingsModal) return;
        el.settingsModal.classList.add("visible");
        const focusable = el.settingsModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length) focusable[0].focus();
        _settingsTrapHandler = (e) => {
            if (e.key !== "Tab" || !focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        el.settingsModal.addEventListener("keydown", _settingsTrapHandler);
    }
    function closeSettingsModal() {
        if (!el.settingsModal) return;
        el.settingsModal.classList.remove("visible");
        if (_settingsTrapHandler) {
            el.settingsModal.removeEventListener("keydown", _settingsTrapHandler);
            _settingsTrapHandler = null;
        }
        if (el.settingsBtn) el.settingsBtn.focus();
    }
    if (el.settingsBtn) {
        el.settingsBtn.addEventListener("click", () => openSettingsModal());
    }
    if (el.settingsCloseBtn) {
        el.settingsCloseBtn.addEventListener("click", () => closeSettingsModal());
    }
    if (el.settingsOverlay) {
        el.settingsOverlay.addEventListener("click", () => closeSettingsModal());
    }
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (el.settingsModal && el.settingsModal.classList.contains("visible")) {
            closeSettingsModal();
            return;
        }
        if (el.promotionModal && el.promotionModal.classList.contains("visible")) {
            if (promotionResolve) {
                promotionResolve("q");
                promotionResolve = null;
            }
            hidePromotionModal();
            return;
        }
        if (el.endgameModal && el.endgameModal.style.display === "flex") {
            closeEndgameModal();
        }
    });

    /* Wire ALL settings toggles to update the board live */
    const allSettings = [
        el.setCoachAuto, el.setHints, el.setEvalBar,
        el.setThreatArrows, el.setSuggestionArrows,
        el.setMoveComments, el.setComputer, el.setTakebacks,
        el.setLegal, el.setLastMove, el.setCoordinates,
        el.setSound, el.setErrorSound, el.setAutoPromo,
        el.setBoardTheme, el.setPieceTheme, el.setUiTheme,
        el.setPieceAnim, el.setPremove, el.setTimeControl, el.setGameType
    ];
    allSettings.forEach((toggle) => {
        if (toggle) {
            toggle.addEventListener("change", applySettingsToBoard);
        }
    });

    if (el.coachDepth && el.coachDepthValue) {
        el.coachDepth.addEventListener("input", () => {
            el.coachDepthValue.textContent = el.coachDepth.value;
        });
    }

    /* Sidebar tabs (Coach / AI) */
    document.querySelectorAll("[data-sidebar-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
            const targetId = tab.getAttribute("data-sidebar-tab");
            document.querySelectorAll(".sidebar-tab").forEach(t => {
                t.classList.remove("is-active");
                t.setAttribute("aria-selected", "false");
            });
            document.querySelectorAll(".sidebar-tab-content").forEach(c => c.classList.remove("is-active"));
            tab.classList.add("is-active");
            tab.setAttribute("aria-selected", "true");
            const panel = document.getElementById(targetId);
            if (panel) panel.classList.add("is-active");
        });
    });

    el.analysisRunBtn.addEventListener("click", runAnalysis);

    el.analysisStartBtn.addEventListener("click", () => {
        if (!analysisState.report) return;
        analysisState.currentIndex = 0;
        renderAnalysisPosition();
    });

    el.analysisPrevBtn.addEventListener("click", () => {
        if (!analysisState.report) return;
        analysisState.currentIndex -= 1;
        renderAnalysisPosition();
    });

    el.analysisNextBtn.addEventListener("click", () => {
        if (!analysisState.report) return;
        analysisState.currentIndex += 1;
        renderAnalysisPosition();
    });

    el.analysisEndBtn.addEventListener("click", () => {
        if (!analysisState.report) return;
        analysisState.currentIndex = analysisState.report.positions.length - 1;
        renderAnalysisPosition();
    });

    if (el.analysisRetryBtn) {
        el.analysisRetryBtn.addEventListener("click", () => {
            if (!analysisState.report) return;
            if (isAnalysisErrorClassification(analysisState.report.positions[analysisState.currentIndex]?.classification)) {
                loadRetryFromAnalysisIndex(analysisState.currentIndex);
                return;
            }
            const firstErrorIndex = analysisState.report.positions.findIndex((position, index) =>
                index > 0 && isAnalysisErrorClassification(position.classification)
            );
            if (firstErrorIndex > 0) {
                analysisState.currentIndex = firstErrorIndex;
                renderAnalysisPosition();
                loadRetryFromAnalysisIndex(firstErrorIndex);
            } else if (el.analysisRetryStatus) {
                el.analysisRetryStatus.textContent = "No se encontraron errores para reintentar en esta partida.";
            }
        });
    }

    if (el.analysisRetryStartBtn) {
        el.analysisRetryStartBtn.addEventListener("click", () => {
            if (!analysisState.report) return;
            loadRetryFromAnalysisIndex(analysisState.currentIndex);
        });
    }

    if (el.analysisRetrySolutionBtn) {
        el.analysisRetrySolutionBtn.addEventListener("click", () => {
            showRetrySolutionLine();
        });
    }

    if (el.analysisExplainAiBtn) {
        el.analysisExplainAiBtn.addEventListener("click", () => {
            explainCurrentAnalysisMoveWithAI();
        });
    }

    if (el.analysisEvalGraph) {
        el.analysisEvalGraph.addEventListener("click", (event) => {
            if (!analysisState.report || !analysisState.report.positions || analysisState.report.positions.length === 0) {
                return;
            }
            const rect = el.analysisEvalGraph.getBoundingClientRect();
            const relative = clamp(event.clientX - rect.left, 0, rect.width || 1);
            const ratio = rect.width > 0 ? relative / rect.width : 0;
            const targetIndex = Math.round(ratio * (analysisState.report.positions.length - 1));
            analysisState.currentIndex = clamp(targetIndex, 0, analysisState.report.positions.length - 1);
            renderAnalysisPosition();
        });
    }

    if (analysisState.retryBoard) {
        analysisState.retryBoard.onSquareClick = onRetryBoardSquareClick;
        analysisState.retryBoard.onDrop = onRetryBoardDrop;
        analysisState.retryBoard.canDragFrom = canRetryDragFrom;
    }

    // Promotion modal
    el.promoPieces.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (promotionResolve) {
                promotionResolve(btn.dataset.piece);
                promotionResolve = null;
            }
            hidePromotionModal();
        });
    });

    if (el.promoOverlay) {
        el.promoOverlay.addEventListener("click", () => {
            if (promotionResolve) {
                promotionResolve("q");
                promotionResolve = null;
            }
            hidePromotionModal();
        });
    }

    // Keyboard navigation for analysis
    document.addEventListener("keydown", (e) => {
        const analysisPanel = document.querySelector("#analysis-section");
        if (!analysisPanel || !analysisPanel.classList.contains("is-active")) {
            return;
        }
        if (!analysisState.report) {
            return;
        }

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            analysisState.currentIndex -= 1;
            renderAnalysisPosition();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            analysisState.currentIndex += 1;
            renderAnalysisPosition();
        } else if (e.key === "Home") {
            e.preventDefault();
            analysisState.currentIndex = 0;
            renderAnalysisPosition();
        } else if (e.key === "End") {
            e.preventDefault();
            analysisState.currentIndex = analysisState.report.positions.length - 1;
            renderAnalysisPosition();
        }
    });

    // Touch navigation for analysis (swipe left/right)
    if (el.analysisBoard) {
        let touchStartX = null;
        let touchStartY = null;

        el.analysisBoard.addEventListener("touchstart", (event) => {
            const touch = event.touches && event.touches[0];
            if (!touch) return;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: true });

        el.analysisBoard.addEventListener("touchend", (event) => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touch || touchStartX === null || touchStartY === null) return;
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            touchStartX = null;
            touchStartY = null;

            if (Math.abs(dx) < 42 || Math.abs(dy) > 36) return;
            if (!analysisState.report) return;

            if (dx < 0) {
                analysisState.currentIndex += 1;
            } else {
                analysisState.currentIndex -= 1;
            }
            renderAnalysisPosition();
        }, { passive: true });
    }

    // Analysis section navigation
    document.querySelectorAll("[data-analysis-target]").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-analysis-target");
            if (!target) return;
            showAnalysisDetail(target);
        });
    });

    document.querySelectorAll("[data-analysis-back]").forEach(btn => {
        btn.addEventListener("click", () => {
            showAnalysisLanding();
        });
    });

    // Study section navigation
    document.querySelectorAll("[data-study-target]").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-study-target");
            if (!target) return;
            showStudyDetail(target);
            registerStudyActivity({ source: "study_category", target });
        });
    });

    document.querySelectorAll("[data-study-back]").forEach(btn => {
        btn.addEventListener("click", () => {
            showStudyLanding();
        });
    });

    if (el.profileRefreshBtn) {
        el.profileRefreshBtn.addEventListener("click", async () => {
            await hydrateProfileStoreFromDatabase();
            renderProgressDashboard();
        });
    }

    let _resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => {
            renderAnalysisEvalGraph();
            drawProfileEloGraph(profileState.eloTimeline);
        }, 150);
    });
}

/* ===== AI Chess Assistant ===== */

const aiChatMessages = document.querySelector("#ai-chat-messages");
const aiChatInput = document.querySelector("#ai-chat-input");
const aiChatSend = document.querySelector("#ai-chat-send");

function getDefaultAiGreeting() {
    const base = String(t("ai.greeting") || "").trim();
    const greeting = base && base !== "ai.greeting"
        ? base
        : "Hola, soy tu asistente de ajedrez con IA.";
    return `${greeting} Preguntame lo que quieras.`;
}

function clearAiChatHistory(options = {}) {
    const { includeGreeting = true } = options;
    if (!aiChatMessages) {
        return;
    }

    aiChatMessages.innerHTML = "";
    if (includeGreeting) {
        addAiMessage(getDefaultAiGreeting(), "ai-bot");
    }
}

function isGreetingQuestion(question) {
    const normalized = String(question || "")
        .trim()
        .toLowerCase()
        .replace(/[!?.,;:]/g, " ");
    if (!normalized) {
        return false;
    }
    return /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|que tal|hi|hello)\s*$/.test(normalized);
}

function addAiMessage(text, type) {
    if (chatUiModule && chatUiModule.appendMessage) {
        const external = chatUiModule.appendMessage(aiChatMessages, text, type);
        scheduleSessionSnapshotSave();
        return external;
    }
    if (!aiChatMessages) return;
    const div = document.createElement("div");
    div.className = `ai-msg ${type}`;
    const isUser = String(type || "").includes("user");
    const sender = document.createElement("span");
    sender.className = "ai-msg-sender";
    sender.textContent = isUser ? "Tu" : "Asistente IA";

    const body = document.createElement("span");
    body.className = "ai-msg-body";

    // Simple markdown parsing for bold and newlines in message body
    let htmlText = String(text || "")
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    body.innerHTML = htmlText;
    div.append(sender, body);

    aiChatMessages.appendChild(div);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    scheduleSessionSnapshotSave();
    return div;
}

function addAiCountdownMessage(seconds) {
    if (chatUiModule && chatUiModule.appendCountdown) {
        chatUiModule.appendCountdown(aiChatMessages, seconds);
        return;
    }
    if (!aiChatMessages) return;
    const div = document.createElement("div");
    div.className = "ai-msg ai-bot ai-rate-limit";
    let remaining = seconds;
    function update() {
        if (remaining <= 0) {
            div.textContent = "Listo. Ya puedes enviar otra pregunta.";
            return;
        }
        div.textContent = "Limite de solicitudes. Puedes reintentar en " + remaining + "s...";
        remaining--;
        setTimeout(update, 1000);
    }
    update();
    aiChatMessages.appendChild(div);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

function shouldSkipInteractiveNode(textNode) {
    if (!textNode || !textNode.parentElement) {
        return true;
    }

    return Boolean(textNode.parentElement.closest(".clickable-move, .opening-link, .ai-action-chip"));
}

function replaceMatchesInTextNodes(root, regex, createNodeFromMatch) {
    if (!root) {
        return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let currentNode = walker.nextNode();

    while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
        if (shouldSkipInteractiveNode(textNode)) {
            return;
        }

        const sourceText = textNode.nodeValue || "";
        regex.lastIndex = 0;
        let match = regex.exec(sourceText);
        if (!match) {
            return;
        }

        regex.lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let cursor = 0;

        while ((match = regex.exec(sourceText)) !== null) {
            if (match.index > cursor) {
                fragment.appendChild(document.createTextNode(sourceText.slice(cursor, match.index)));
            }

            const replacementNode = createNodeFromMatch(match);
            if (replacementNode) {
                fragment.appendChild(replacementNode);
            } else {
                fragment.appendChild(document.createTextNode(match[0]));
            }

            cursor = match.index + match[0].length;
        }

        if (cursor < sourceText.length) {
            fragment.appendChild(document.createTextNode(sourceText.slice(cursor)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    });
}

function confirmAiActionAndRun(action, description, execute) {
    logAiActionEvent(action, "approved");
    try {
        execute();
        setCoachMessage(coachNotice("info", `${description}.`));
    } finally {
        scheduleSessionSnapshotSave();
    }
}

function runAiAction(actionId, argument) {
    const normalized = String(actionId || "").trim().toLowerCase();
    const arg = String(argument || "").trim();
    const action = { type: normalized, argument: arg };

    if (normalized === "pista" || normalized === "hint") {
        confirmAiActionAndRun(action, "Solicitar pista del entrenador", () => {
            requestCoachHint(false);
        });
        return;
    }

    if (normalized === "deshacer" || normalized === "undo") {
        confirmAiActionAndRun(action, "Deshacer ultima jugada", () => {
            undoPlayMove();
        });
        return;
    }

    if (normalized === "nueva" || normalized === "new_game") {
        confirmAiActionAndRun(action, "Iniciar una nueva partida", () => {
            startNewGame();
        });
        return;
    }

    if (normalized === "analizar" || normalized === "analyze") {
        confirmAiActionAndRun(action, "Enviar la partida actual al analisis", () => {
            if (el.analysisPgn) {
                el.analysisPgn.value = playState.game.pgn();
            }
            activateMainTab("analysis-section");
            showAnalysisDetail("analysis-input");
            if (el.analysisRunBtn) {
                el.analysisRunBtn.click();
            }
        });
        return;
    }

    if (normalized === "estudiar" || normalized === "study") {
        const detectedOpening = arg || detectOpening(playState.game.history(), playState.game.fen());
        if (!detectedOpening) {
            setCoachMessage(coachNotice("info", "No se detecto una apertura para estudiar en esta posicion."));
            logAiActionEvent(action, "blocked", { reason: "opening_not_found" });
            return;
        }

        confirmAiActionAndRun(action, `Abrir estudio de apertura: ${detectedOpening}`, () => {
            openOpeningInStudyTab({
                openingName: detectedOpening,
                openingFen: playState.game.fen(),
                historyLine: historyToDisplayLine(playState.game.history(), 24)
            });
        });
        return;
    }

    if (normalized === "flip") {
        confirmAiActionAndRun(action, "Girar el tablero y cambiar color antes de jugar", () => {
            if (el.playFlipBtn) el.playFlipBtn.click();
        });
        return;
    }

    if (normalized === "open_study") {
        confirmAiActionAndRun(action, "Abrir el centro de estudio", () => {
            activateMainTab("study-section");
        });
        return;
    }

    if (normalized === "load_line") {
        const selected = openingExplorerState.selectedNode;
        if (!selected) {
            setCoachMessage(coachNotice("info", "Selecciona primero una linea en el explorador ECO."));
            logAiActionEvent(action, "blocked", { reason: "explorer_line_not_selected" });
            return;
        }
        confirmAiActionAndRun(action, `Cargar linea seleccionada: ${selected.name}`, () => {
            playState.game.load(selected.fen);
            playState.lastMove = null;
            clearPlaySelection();
            renderPlayBoard();
            renderPlayMoveList();
            activateMainTab("play-section");
        });
        return;
    }

    logAiActionEvent(action, "ignored", { reason: "unknown_action" });
}

function makeAiActionsClickable(msgEl) {
    if (!msgEl) return;

    const actionRegex = /\[\[\s*accion:([a-z_]+)(?:\|([^\]]+))?\s*\]\]/gi;
    const actionLabels = {
        pista: "Pedir pista",
        hint: "Pedir pista",
        deshacer: "Deshacer",
        undo: "Deshacer",
        nueva: "Nueva partida",
        new_game: "Nueva partida",
        analizar: "Analizar",
        analyze: "Analizar",
        estudiar: "Estudiar apertura",
        study: "Estudiar apertura"
    };

    replaceMatchesInTextNodes(msgEl, actionRegex, (match) => {
        const actionId = match[1] || "";
        const argument = match[2] || "";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ai-action-chip";

        const label = actionLabels[actionId.toLowerCase()] || `Accion: ${actionId}`;
        button.textContent = argument ? `${label} \u2192 ${argument}` : label;
        button.title = "Clic para ejecutar con confirmacion";

        button.addEventListener("click", () => runAiAction(actionId, argument));
        return button;
    });
}

function appendStructuredAiActions(msgEl, actions) {
    if (!msgEl || !Array.isArray(actions) || actions.length === 0) {
        return;
    }

    const wrap = document.createElement("div");
    wrap.className = "ai-action-wrap";

    actions.forEach((action) => {
        const type = String(action.type || "").trim().toLowerCase();
        const argument = String(action.argument || "").trim();
        const label = String(action.label || "").trim();

        if (!type) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ai-action-chip";
        btn.textContent = label || (argument ? `${type} \u2192 ${argument}` : type);
        btn.addEventListener("click", () => runAiAction(type, argument));
        wrap.appendChild(btn);
    });

    if (wrap.childElementCount > 0) {
        msgEl.appendChild(document.createElement("br"));
        msgEl.appendChild(wrap);
    }
}

function makeOpeningMentionsClickable(msgEl) {
    if (!msgEl) return;

    const openingPhraseRegex = /\b(?:Apertura|Defensa|Gambito|Sistema)\s+[^\n\.;:!?]{3,80}/gi;
    replaceMatchesInTextNodes(msgEl, openingPhraseRegex, (match) => {
        const phrase = String(match[0] || "").trim();
        const resolved = resolveOpeningByName(phrase);
        if (!resolved || !resolved.name) {
            return null;
        }

        return createOpeningStudyLink(
            resolved.name,
            {
                openingName: resolved.name,
                openingFen: resolved.fen,
                historyLine: historyToDisplayLine(playState.game.history(), 24)
            },
            "inline"
        );
    });
}

/* Make SAN moves in AI bot messages clickable */
function makeMovesClickable(msgEl) {
    if (!msgEl) return;

    const sanRegex = /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O|O-O)\b/g;
    replaceMatchesInTextNodes(msgEl, sanRegex, (match) => {
        const san = match[1];
        const span = document.createElement("span");
        span.className = "clickable-move";
        span.textContent = san;
        span.title = `Clic para jugar: ${sanToSpanish(san)}`;
        span.addEventListener("click", () => {
            try {
                if (playState.thinking || sideFromTurn(playState.game.turn()) !== playState.playerColor) {
                    addAiMessage("Ahora no puedes mover esa jugada. Espera tu turno.", "ai-bot");
                    return;
                }
                const game = new Chess(playState.game.fen());
                const move = game.move(san);
                if (move) {
                    showMoveConfirmation(move.from, move.to, move.san, move.promotion);
                    setCoachMessage(coachNotice("info", `Vista previa cargada: ${sanToSpanish(move.san)}. Confirma con Si/No.`));
                } else {
                    addAiMessage(`No puedo jugar ${san} en esta posicion actual.`, "ai-bot");
                }
            } catch { }
        });
        return span;
    });
}

function getMaterialCount(game) {
    const board = game.board().flat().filter(Boolean);
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let white = 0, black = 0;
    for (const piece of board) {
        const val = values[piece.type] || 0;
        if (piece.color === "w") white += val;
        else black += val;
    }
    return { white, black, diff: white - black };
}

function describeMaterial(diff) {
    if (diff === 0) return "El material est\u00e1 igualado.";
    const side = diff > 0 ? "Blancas" : "Negras";
    const abs = Math.abs(diff);
    if (abs >= 9) return `${side} tienen ventaja decisiva de material (+${abs} puntos).`;
    if (abs >= 5) return `${side} tienen una pieza mayor de ventaja (+${abs}).`;
    if (abs >= 3) return `${side} tienen ventaja de pieza menor (+${abs}).`;
    if (abs >= 1) return `${side} tienen ligera ventaja material (+${abs}).`;
    return "Material pr\u00e1cticamente igualado.";
}

function getGamePhaseAI(game) {
    const h = game.history().length;
    const pieces = game.board().flat().filter(Boolean).length;
    if (h <= 10) return "apertura";
    if (pieces <= 12) return "final";
    return "medio juego";
}

function getAiMessageNodeText(node) {
    if (!node) {
        return "";
    }
    const body = node.querySelector ? node.querySelector(".ai-msg-body") : null;
    const raw = body && body.textContent ? body.textContent : node.textContent;
    return String(raw || "").trim();
}

function collectRecentAiChatContext(maxEntries = 6) {
    if (!aiChatMessages || maxEntries <= 0) {
        return [];
    }

    return Array.from(aiChatMessages.children)
        .map((node) => {
            const text = getAiMessageNodeText(node);
            if (!text) {
                return null;
            }
            if (node.classList && node.classList.contains("ai-thinking")) {
                return null;
            }
            const role = node.classList && node.classList.contains("ai-user") ? "Usuario" : "Asistente";
            return `${role}: ${text.slice(0, 260)}`;
        })
        .filter(Boolean)
        .slice(-maxEntries);
}

async function generateAiResponse(question, recentContext = []) {
    const trimmedQuestion = String(question || "").trim();
    if (isGreetingQuestion(trimmedQuestion)) {
        return {
            text: "Hola. Encantado de ayudarte. Cuando quieras, dime la jugada o posicion que te preocupa y la revisamos paso a paso.",
            actions: []
        };
    }

    const game = playState.game;
    const fen = game.fen();
    const history = game.history();
    const phase = getGamePhaseAI(game);
    const material = getMaterialCount(game);
    const materialDesc = describeMaterial(material.diff);
    const turn = game.turn() === "w" ? "blancas" : "negras";
    const moveNum = Math.ceil(history.length / 2);
    const detectedOpening = detectOpening(history, fen);

    let engineEval = null;
    let bestMoveStr = "";
    let bestMoveDesc = "";
    try {
        const result = await evaluateWithStockfish({ fen, depth: 10, multipv: 1, movetime: 500 });
        if (result.lines[0]) {
            engineEval = result.lines[0].evaluation;
            bestMoveStr = uciToSanFromFen(fen, result.bestMove);
            bestMoveDesc = sanToSpanish(bestMoveStr);
        }
    } catch { /* ignore */ }

    const evalText = engineEval ? formatEval(engineEval) : "desconocida";

    const systemPrompt = `Eres un entrenador de ajedrez humano, calmado y amable para Ajedrez Lab.

TONO:
- Cercano, natural y suave. Evita sonar mandon o agresivo.
- Comienza con una frase breve de empatia o saludo cuando tenga sentido.
- No ignores la pregunta. Respondela directo primero.

ESTILO:
- Respuesta corta y ligera (3-6 lineas), clara y util.
- Si recomiendas jugadas, explica: idea, por que funciona y riesgo.
- Si no hay datos suficientes, dilo con honestidad y da una alternativa prudente.

SALIDA:
- Devuelve SOLO JSON valido (sin markdown externo).
- Formato JSON: {"text":"...", "actions":[{"type":"hint|undo|new_game|analyze|study|flip|open_study|load_line","label":"...", "argument":"..."}]}
- Usa 0-3 acciones maximo.
- Si recomiendas estudiar apertura, agrega accion "study" con el nombre en "argument".

Contexto:
- Fase: ${phase}
- Turno: ${turn}
- Jugada: ${moveNum}
- Ultimas jugadas: ${history.slice(-10).join(" ") || "(sin jugadas)"}
- Material: ${materialDesc}
- Eval Stockfish: ${evalText}
- Mejor jugada sugerida: ${bestMoveDesc} (${bestMoveStr})
- Apertura detectada: ${detectedOpening || "Sin apertura detectada"}`;
    const contextBlock = Array.isArray(recentContext) && recentContext.length > 0
        ? `Conversacion reciente:\n${recentContext.join("\n")}`
        : "Conversacion reciente: (sin historial previo)";
    const aiQuestion = [
        contextBlock,
        `Pregunta actual del usuario: ${trimmedQuestion}`
    ].join("\n\n");

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
        ? setTimeout(() => controller.abort(), 8500)
        : null;

    try {
        const response = await fetch("/api/ai-chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            signal: controller ? controller.signal : undefined,
            body: JSON.stringify({
                systemPrompt,
                question: aiQuestion.slice(0, 1600),
                structured: true
            })
        });

        const payload = await response.json();
        if (response.status === 429) {
            const retryAfter = payload && Number.isFinite(payload.retryAfterMs)
                ? Math.ceil(Number(payload.retryAfterMs) / 1000)
                : 10;
            return {
                text: `Espera ${retryAfter}s antes de pedir otra respuesta de IA.`,
                actions: [],
                rateLimited: true,
                retryAfterSeconds: retryAfter
            };
        }

        if (!response.ok) {
            throw new Error(payload.message || `API Error: ${response.status}`);
        }

        const content = typeof payload.content === "string" ? payload.content.trim() : "";
        const actionsFromApi = Array.isArray(payload.actions) ? payload.actions : [];
        const parsed = aiModule && aiModule.parseStructuredResponse
            ? aiModule.parseStructuredResponse(JSON.stringify({ text: content, actions: actionsFromApi }))
            : { text: content, actions: actionsFromApi };

        const text = String(parsed.text || content || "").trim();
        if (!text) {
            throw new Error("Respuesta vacia del asistente IA.");
        }

        return {
            text,
            actions: Array.isArray(parsed.actions) ? parsed.actions : []
        };
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            return {
                text: "La respuesta de IA supero el tiempo limite. Intenta de nuevo con una pregunta mas corta.",
                actions: []
            };
        }
        console.error("AI chat error:", err);
        return {
            text: "Lo siento, fallo la conexion con mi motor principal de IA.",
            actions: []
        };
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

async function handleAiChat() {
    if (!aiChatInput || !aiChatMessages) return;
    const question = aiChatInput.value.trim();
    if (!question) return;

    if (isRankedActiveGame()) {
        addAiMessage("La asistencia IA esta desactivada durante una clasificatoria en curso.", "ai-bot");
        return;
    }

    if (aiRuntimeState.inFlight) {
        addAiMessage("Espera a que termine la respuesta anterior.", "ai-bot");
        return;
    }

    const now = Date.now();
    const elapsed = now - aiRuntimeState.lastSentAt;
    if (elapsed < aiRuntimeState.minIntervalMs) {
        const waitSeconds = Math.ceil((aiRuntimeState.minIntervalMs - elapsed) / 1000);
        addAiMessage(`Espera ${waitSeconds}s antes de enviar otra consulta.`, "ai-bot");
        return;
    }

    const recentContext = collectRecentAiChatContext(6);
    addAiMessage(question, "ai-user");
    aiChatInput.value = "";

    const thinkingMsg = addAiMessage("Pensando...", "ai-bot ai-thinking");
    aiRuntimeState.inFlight = true;
    aiRuntimeState.lastSentAt = now;
    const requestStartedAt = Date.now();

    try {
        const aiResponse = await generateAiResponse(question, recentContext);
        const remainingDelay = aiRuntimeState.minResponseDelayMs - (Date.now() - requestStartedAt);
        if (remainingDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }
        if (aiResponse.rateLimited) {
            thinkingMsg.remove();
            addAiCountdownMessage(aiResponse.retryAfterSeconds);
        } else {
            const textTarget = thinkingMsg.querySelector
                ? (thinkingMsg.querySelector(".ai-msg-body") || thinkingMsg)
                : thinkingMsg;
            textTarget.textContent = aiResponse.text;
            thinkingMsg.classList.remove("ai-thinking");
            appendStructuredAiActions(thinkingMsg, aiResponse.actions);
            makeAiActionsClickable(thinkingMsg);
            makeMovesClickable(thinkingMsg);
            makeOpeningMentionsClickable(thinkingMsg);
        }
    } catch {
        const textTarget = thinkingMsg.querySelector
            ? (thinkingMsg.querySelector(".ai-msg-body") || thinkingMsg)
            : thinkingMsg;
        textTarget.textContent = "Lo siento, no pude procesar tu pregunta. Int\u00e9ntalo de nuevo.";
        thinkingMsg.classList.remove("ai-thinking");
    } finally {
        aiRuntimeState.inFlight = false;
        scheduleSessionSnapshotSave();
    }
}

function bindAiChat() {
    if (aiChatSend) {
        aiChatSend.addEventListener("click", handleAiChat);
    }
    if (aiChatInput) {
        aiChatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleAiChat();
            }
        });
    }
}

/* ===== Today Label ===== */

function setTodayLabel() {
    if (!el.lastUpdateLabel) {
        return;
    }

    const today = new Date();
    const monthNames = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    el.lastUpdateLabel.textContent = `Actualizado: ${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`;
}

function updatePerformanceMetricsView() {
    if (el.perfMetricLoad) {
        const loadMs = Math.max(0, nowMs() - APP_BOOT_AT);
        el.perfMetricLoad.textContent = `Carga inicial: ${formatDurationMs(loadMs)}`;
    }
    if (el.perfMetricFirstEval) {
        el.perfMetricFirstEval.textContent = `1a eval motor: ${formatDurationMs(perfState.firstEvalMs)}`;
    }
    if (el.perfMetricExplorer) {
        el.perfMetricExplorer.textContent = `Latencia ECO: ${formatDurationMs(perfState.explorerLatencyMs)}`;
    }
    if (el.perfMetricMemory) {
        el.perfMetricMemory.textContent = `Memoria sesion: ${formatMemoryBytes(perfState.memoryBytes)}`;
    }
}

function pushPerformanceEntry(name, value) {
    if (!Number.isFinite(value)) {
        return;
    }
    const nextEntry = {
        at: new Date().toISOString(),
        name: String(name || "metric"),
        value: Math.round(value * 100) / 100
    };
    const current = readStored("metrics.entries", []);
    const list = Array.isArray(current) ? current.slice() : [];
    list.push(nextEntry);
    writeStored("metrics.entries", list.slice(-300));
}

function refreshSessionMemoryMetric() {
    let bytes = 0;

    if (typeof performance !== "undefined" && performance.memory && Number.isFinite(performance.memory.usedJSHeapSize)) {
        bytes = performance.memory.usedJSHeapSize;
    } else if (storageModule && storageModule.getStore) {
        try {
            const store = storageModule.getStore();
            bytes = JSON.stringify(store || {}).length;
        } catch {
            bytes = 0;
        }
    }

    if (Number.isFinite(bytes) && bytes > 0) {
        perfState.memoryBytes = bytes;
        pushPerformanceEntry("session_memory_bytes", bytes);
        updatePerformanceMetricsView();
    }
}

function markFirstEvalMetric(elapsedMs) {
    if (perfState.firstEvalMs != null || !Number.isFinite(elapsedMs)) {
        return;
    }
    perfState.firstEvalMs = elapsedMs;
    pushPerformanceEntry("first_stockfish_eval_ms", elapsedMs);
    updatePerformanceMetricsView();
}

function markExplorerLatencyMetric(elapsedMs) {
    if (!Number.isFinite(elapsedMs)) {
        return;
    }
    perfState.explorerLatencyMs = elapsedMs;
    pushPerformanceEntry("eco_latency_ms", elapsedMs);
    updatePerformanceMetricsView();
}

function getCurrentActiveTabId() {
    const current = document.querySelector(".tab-btn.is-active");
    return current && current.dataset ? current.dataset.tabTarget || "play-section" : "play-section";
}

function getVisibleAnalysisSectionId() {
    const detail = document.querySelector(".analysis-detail[style*='display: block']");
    return detail && detail.id ? detail.id : null;
}

function getVisibleStudySectionId() {
    const detail = document.querySelector(".study-detail[style*='display: block']");
    return detail && detail.id ? detail.id : null;
}

function serializeAiChatForSession() {
    // User requested that AI chat must not persist across sessions/games.
    return [];
}

function serializeCoachHistoryForSession() {
    if (!el.coachHistoryContainer) {
        return [];
    }

    return Array.from(el.coachHistoryContainer.querySelectorAll("p"))
        .map((node) => (node.textContent || "").trim())
        .filter(Boolean)
        .slice(-24);
}

function restoreAiChatFromSession(history) {
    void history;
    clearAiChatHistory();
}

function buildSessionSnapshot() {
    settleActiveClock(Date.now());
    return {
        savedAt: new Date().toISOString(),
        activeTab: getCurrentActiveTabId(),
        analysisSection: getVisibleAnalysisSectionId(),
        studySection: getVisibleStudySectionId(),
        play: {
            fen: playState.game.fen(),
            pgn: playState.game.pgn(),
            history: playState.game.history(),
            gameMode: playState.gameMode,
            gameType: playState.gameType,
            startTime: playState.startTime,
            playerColor: playState.playerColor,
            botColor: playState.botColor,
            botElo: playState.botElo,
            manualGameOver: playState.manualGameOver,
            boardOrientation: playState.board.getOrientation ? playState.board.getOrientation() : playState.playerColor,
            clockConfigSeconds: playState.clockConfigSeconds,
            clockRemainingMs: playState.clockRemainingMs,
            clockActiveSide: playState.clockActiveSide
        },
        explorer: {
            color: el.ecoFilterColor ? el.ecoFilterColor.value : "white",
            popularity: el.ecoFilterPopularity ? String(el.ecoFilterPopularity.value || "all") : "all",
            success: el.ecoFilterSuccess ? String(el.ecoFilterSuccess.value || "all") : "all",
            query: el.ecoSearch ? el.ecoSearch.value : "",
            selectedId: openingExplorerState.selectedNode ? openingExplorerState.selectedNode.id : null,
            collapsedIds: Array.from(openingExplorerState.collapsedIds || [])
        },
        ai: {
            chatHistory: serializeAiChatForSession()
        },
        coach: {
            history: serializeCoachHistoryForSession()
        }
    };
}

function persistSessionSnapshotNow() {
    if (sessionRuntimeState.saveTimer) {
        clearTimeout(sessionRuntimeState.saveTimer);
        sessionRuntimeState.saveTimer = null;
    }
    if (!authState.authenticated) {
        return;
    }
    writeStored("session.snapshot", buildSessionSnapshot());
}

function scheduleSessionSnapshotSave(delayMs = 260) {
    if (!authState.authenticated) {
        return;
    }
    if (sessionRuntimeState.saveTimer) {
        clearTimeout(sessionRuntimeState.saveTimer);
    }
    sessionRuntimeState.saveTimer = setTimeout(() => {
        sessionRuntimeState.saveTimer = null;
        writeStored("session.snapshot", buildSessionSnapshot());
    }, delayMs);
}

function restoreSessionPrefilters() {
    const snapshot = sessionRuntimeState.restorePayload;
    if (!snapshot || typeof snapshot !== "object") {
        return;
    }

    const explorer = snapshot.explorer || {};
    if (el.ecoFilterColor && explorer.color) {
        el.ecoFilterColor.value = explorer.color;
    }
    if (el.ecoFilterPopularity) {
        const rawPopularity = explorer.popularity;
        const normalizedPopularity = typeof rawPopularity === "string"
            ? normalizeExplorerFrequencyFilter(rawPopularity)
            : mapLegacyPopularityToTier(rawPopularity);
        el.ecoFilterPopularity.value = normalizedPopularity;
    }
    if (el.ecoFilterSuccess) {
        const rawSuccess = explorer.success;
        const normalizedSuccess = typeof rawSuccess === "string"
            ? normalizeExplorerResultFilter(rawSuccess)
            : mapLegacySuccessToTier(rawSuccess);
        el.ecoFilterSuccess.value = normalizedSuccess;
    }
    if (el.ecoSearch && typeof explorer.query === "string") {
        el.ecoSearch.value = explorer.query;
    }
    if (Array.isArray(explorer.collapsedIds)) {
        openingExplorerState.collapsedIds = new Set(explorer.collapsedIds.map((id) => String(id)));
    }
}

function restorePlayFromSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || !snapshot.play) {
        return;
    }

    const play = snapshot.play;
    const restoredGame = new Chess();
    let restored = false;

    if (typeof play.pgn === "string" && play.pgn.trim()) {
        try {
            restoredGame.loadPgn(play.pgn);
            restored = true;
        } catch {
            restored = false;
        }
    }

    if (!restored && Array.isArray(play.history)) {
        try {
            play.history.forEach((san) => {
                if (typeof san === "string" && san.trim()) {
                    restoredGame.move(san.trim());
                }
            });
            restored = restoredGame.history().length > 0;
        } catch {
            restored = false;
        }
    }

    if (!restored && typeof play.fen === "string" && play.fen.trim()) {
        try {
            restoredGame.load(play.fen);
            restored = true;
        } catch {
            restored = false;
        }
    }

    if (!restored) {
        return;
    }

    playState.game = restoredGame;
    playState.lastMove = null;
    playState.hintMove = null;
    playState.premove = null;
    playState.lastAnimatedMoveKey = "";
    clearPlaySelection();

    playState.playerColor = play.playerColor === "black" ? "black" : "white";
    playState.botColor = playState.playerColor === "white" ? "black" : "white";
    playState.botElo = Number.isFinite(play.botElo) ? clamp(Number(play.botElo), 400, 2800) : playState.botElo;
    playState.gameMode = normalizePlayMode(play.gameMode);
    playState.gameType = playState.gameMode === PLAY_MODES.RANKED
        ? "standard"
        : normalizeGameType(play.gameType);
    playState.startTime = Number.isFinite(Number(play.startTime)) ? Number(play.startTime) : null;
    playState.manualGameOver = play && typeof play.manualGameOver === "object" && play.manualGameOver
        ? {
            title: String(play.manualGameOver.title || "Juego terminado"),
            reason: String(play.manualGameOver.reason || "Partida finalizada"),
            winner: String(play.manualGameOver.winner || "Empate")
        }
        : null;
    playState.endgameShown = false;
    stopPlayClockTimer();
    playState.clockConfigSeconds = clamp(Number(play.clockConfigSeconds || 0), 0, 1800);
    const savedClock = play.clockRemainingMs || {};
    const initialClockMs = playState.clockConfigSeconds > 0 ? playState.clockConfigSeconds * 1000 : 0;
    const maxClockMs = Math.max(initialClockMs, 1_800_000);
    playState.clockRemainingMs = {
        white: Number.isFinite(Number(savedClock.white))
            ? clamp(Number(savedClock.white), 0, maxClockMs)
            : initialClockMs,
        black: Number.isFinite(Number(savedClock.black))
            ? clamp(Number(savedClock.black), 0, maxClockMs)
            : initialClockMs
    };
    playState.clockActiveSide = play.clockActiveSide === "black" ? "black" : "white";
    playState.clockLastTickAt = Date.now();
    if (playState.startTime && !isPlayGameOver() && playState.clockConfigSeconds > 0) {
        playState.clockTimerId = setInterval(tickPlayClock, 200);
    } else {
        playState.clockActiveSide = null;
    }

    if (el.playerColor) {
        el.playerColor.value = playState.playerColor;
    }
    if (el.playMode) {
        el.playMode.value = playState.gameMode;
    }
    if (el.setGameType) {
        el.setGameType.value = playState.gameType;
    }
    if (el.botPreset) {
        el.botPreset.value = String(playState.botElo);
    }
    if (el.playSetupPanel && el.playGamePanel && el.playPanelGrid && el.playBoardCard) {
        const hasGame = playState.game.history().length > 0 || playState.game.fen() !== openingExplorerState.rootFen;
        el.playSetupPanel.style.display = hasGame ? "none" : "";
        el.playGamePanel.style.display = hasGame ? "flex" : "none";
        el.playBoardCard.style.display = hasGame ? "" : "none";
        el.playPanelGrid.classList.toggle("setup-mode", !hasGame);
    }

    const orientation = play.boardOrientation === "black" ? "black" : playState.playerColor;
    playState.board.setOrientation(orientation);
    applySettingsToBoard();
    refreshPlayModeUiState();
    renderPlayBoard();
    renderPlayMoveList();
}

function restoreSessionAfterInit() {
    const snapshot = sessionRuntimeState.restorePayload;
    if (!snapshot || typeof snapshot !== "object") {
        return;
    }

    restorePlayFromSnapshot(snapshot);

    restoreAiChatFromSession(snapshot.ai && snapshot.ai.chatHistory);

    if (snapshot.coach && Array.isArray(snapshot.coach.history) && el.coachHistoryContainer) {
        el.coachHistoryContainer.innerHTML = "";
        snapshot.coach.history.forEach((line) => {
            const text = String(line || "").trim();
            if (!text) return;
            const p = document.createElement("p");
            p.className = "coach-msg";
            p.textContent = text;
            el.coachHistoryContainer.appendChild(p);
        });
        const latest = el.coachHistoryContainer.lastElementChild;
        if (latest && el.coachMessage) {
            el.coachMessage.textContent = latest.textContent || "";
        }
    }

    if (snapshot.analysisSection) {
        showAnalysisDetail(snapshot.analysisSection);
    }

    if (snapshot.studySection) {
        showStudyDetail(snapshot.studySection);
    }

    if (snapshot.activeTab) {
        activateMainTab(snapshot.activeTab);
    }

    if (snapshot.explorer && snapshot.explorer.selectedId) {
        const selected = openingExplorerState.rows.find((row) => row.id === snapshot.explorer.selectedId);
        if (selected) {
            renderExplorerDetail(selected);
            renderExplorerTree();
        }
    }

    scheduleSessionSnapshotSave(0);
}

function bindSessionPersistence() {
    const passivePersist = () => scheduleSessionSnapshotSave();
    ["click", "change", "input"].forEach((eventName) => {
        document.addEventListener(eventName, passivePersist, { passive: true });
    });

    window.setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) {
            return;
        }
        scheduleSessionSnapshotSave(0);
    }, 5000);

    window.setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) {
            return;
        }
        refreshSessionMemoryMetric();
    }, 12000);

    window.setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) {
            return;
        }
        scheduleProfileStoreSync(0);
    }, 25000);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            scheduleSessionSnapshotSave(0);
            refreshSessionMemoryMetric();
            scheduleProfileStoreSync(300);
        }
    });

    window.addEventListener("beforeunload", persistSessionSnapshotNow);
}

function renderAiActionAudit() {
    if (!el.aiActionAudit) {
        return;
    }
    el.aiActionAudit.innerHTML = "";

    const log = aiModule && aiModule.readActionLog
        ? aiModule.readActionLog()
        : [];
    const rows = Array.isArray(log) ? log.slice(-12).reverse() : [];

    if (rows.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Sin acciones registradas.";
        el.aiActionAudit.appendChild(item);
        return;
    }

    rows.forEach((entry) => {
        const li = document.createElement("li");
        const status = String(entry.status || "unknown");
        const marker = status === "approved"
            ? "SI"
            : (status === "rejected" ? "NO" : "INFO");
        const actionType = String(entry.actionType || "accion");
        const argument = String(entry.argument || "");
        li.textContent = `${marker}: ${actionType}${argument ? ` (${argument})` : ""}`;
        el.aiActionAudit.appendChild(li);
    });
}

function logAiActionEvent(action, status, meta) {
    if (authState.authenticated && aiModule && aiModule.logAction) {
        aiModule.logAction(action, status, meta || null);
    }
    renderAiActionAudit();
    scheduleSessionSnapshotSave(80);
}

function hasExplicitDeepLink() {
    const params = new URLSearchParams(window.location.search);
    return ["tab", "study", "opening", "fen", "line"].some((key) => params.has(key));
}

async function init() {
    if (storageModule && storageModule.removeLegacyKeys) {
        storageModule.removeLegacyKeys();
    }

    if (el.playMode) {
        el.playMode.value = normalizePlayMode(readStored("preferences.play_mode", PLAY_MODES.CASUAL));
        playState.gameMode = el.playMode.value;
    }
    coachSpeechState.enabled = readStored("preferences.coach_voice", "1") !== "0";
    if ("speechSynthesis" in window) {
        loadCoachVoice();
        window.speechSynthesis.onvoiceschanged = () => {
            loadCoachVoice();
        };
    } else {
        coachSpeechState.enabled = false;
    }
    updateCoachVoiceButton();

    lessonState.progressByLesson = {};

    if (uiModule && uiModule.applyStoredThemes) {
        uiModule.applyStoredThemes();
        if (el.setBoardTheme && uiModule.loadPreference) {
            el.setBoardTheme.value = uiModule.loadPreference("board_theme", el.setBoardTheme.value || "classic");
        }
        if (el.setPieceTheme && uiModule.loadPreference) {
            el.setPieceTheme.value = uiModule.loadPreference("piece_theme", el.setPieceTheme.value || "default");
        }
        if (el.setUiTheme && uiModule.loadPreference) {
            el.setUiTheme.value = uiModule.loadPreference("ui_theme", el.setUiTheme.value || "dark");
        }
        if (el.setErrorSound && uiModule.loadPreference) {
            el.setErrorSound.checked = Boolean(uiModule.loadPreference("error_sound", true));
        }
        if (el.setPieceAnim && uiModule.loadPreference) {
            el.setPieceAnim.checked = Boolean(uiModule.loadPreference("piece_animation", true));
        }
        if (el.setPremove && uiModule.loadPreference) {
            el.setPremove.checked = Boolean(uiModule.loadPreference("premove_enabled", true));
        }
    }
    if (el.setTimeControl) {
        const savedTimeControl = String(readStored("preferences.time_control", el.setTimeControl.value || "0"));
        if (Array.from(el.setTimeControl.options || []).some((opt) => opt.value === savedTimeControl)) {
            el.setTimeControl.value = savedTimeControl;
        }
    }
    if (el.setGameType) {
        const savedGameType = String(readStored("preferences.game_type", el.setGameType.value || "standard"));
        if (Array.from(el.setGameType.options || []).some((opt) => opt.value === savedGameType)) {
            el.setGameType.value = savedGameType;
        }
    }

    bindTabs();
    bindEvents();
    bindCoachReviewEvents();
    setAuthState(false, "");
    setAuthStatus("Validando sesion...");
    bindLessonsUi();
    bindAiChat();
    loadOpeningCatalog();
    if (typeof window !== "undefined" && window.matchMedia) {
        const media = window.matchMedia("(prefers-color-scheme: light)");
        if (media && media.addEventListener) {
            media.addEventListener("change", () => {
                if (el.setUiTheme && el.setUiTheme.value === "auto") {
                    applyUiTheme("auto", false);
                }
            });
        }
    }
    renderStudyDiagrams();
    setTodayLabel();
    updatePerformanceMetricsView();
    refreshSessionMemoryMetric();
    renderAiActionAudit();
    bindSessionPersistence();

    if (el.coachDepth && el.coachDepthValue) {
        el.coachDepthValue.textContent = el.coachDepth.value;
    }
    if (el.analysisDepthValue) {
        el.analysisDepthValue.textContent = "Ajuste automatico";
    }

    renderPlayBoard();
    resetAnalysisSummary();

    // Initialize play eval bar
    updatePlayEvalBar({ type: "cp", value: 0 });
    applySettingsToBoard();
    refreshPlayModeUiState();
    await initOpeningExplorer();
    const authenticated = await refreshAuthSessionStatus();
    if (authenticated) {
        sessionRuntimeState.restorePayload = readStored("session.snapshot", null);
        restoreSessionPrefilters();
        lessonState.progressByLesson = readStored("session.lessonProgress", {});
        await hydrateProfileStoreFromDatabase();
    } else {
        sessionRuntimeState.restorePayload = null;
        lessonState.progressByLesson = {};
        if (storageModule && storageModule.write) {
            storageModule.write("session.snapshot", null);
        }
    }
    renderProgressDashboard();
    bindGlobalShortcuts();
    renderLessonSelection("opening_principles");

    if (authState.authenticated) {
        if (hasExplicitDeepLink()) {
            applyStudyDeepLinkFromUrl();
        } else {
            restoreSessionAfterInit();
        }
    }

    scheduleSessionSnapshotSave(0);
}

void init();
