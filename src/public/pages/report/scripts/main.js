
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

const ENGINE_PRIMARY = "/static/scripts/stockfish-nnue-16.js";
const ENGINE_FALLBACK = "/static/scripts/stockfish.js";
const APP_BOOT_AT = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
const APP_MODULES = window.ReportModules || {};
const storageModule = APP_MODULES.storage || null;
const uiModule = APP_MODULES.ui || null;
const openingsModule = APP_MODULES.openings || null;
const studyModule = APP_MODULES.study || null;
const aiModule = APP_MODULES.ai || null;
const playModule = APP_MODULES.play || null;
const analysisModule = APP_MODULES.analysis || null;

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
    playHintBtn: document.querySelector("#play-hint-btn"),
    playUndoBtn: document.querySelector("#play-undo-btn"),
    playFlipBtn: document.querySelector("#play-flip-btn"),
    playBackBtn: document.querySelector("#play-back-btn"),
    playNewGameBtn: document.querySelector("#play-new-game-btn"),

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
    endgameAnalyzeBtn: document.querySelector("#endgame-analyze-btn"),
    endgamePgnBtn: document.querySelector("#endgame-pgn-btn"),
    endgameCloseBtn: document.querySelector("#endgame-close-btn"),


    botPreset: document.querySelector("#bot-preset"),
    botCustomElo: document.querySelector("#bot-custom-elo"),
    playerColor: document.querySelector("#player-color"),
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
    ecoFilterPopularityValue: document.querySelector("#eco-filter-popularity-value"),
    ecoFilterSuccess: document.querySelector("#eco-filter-success"),
    ecoFilterSuccessValue: document.querySelector("#eco-filter-success-value"),
    ecoSearch: document.querySelector("#eco-search"),
    ecoTree: document.querySelector("#eco-tree"),
    ecoDetailTitle: document.querySelector("#eco-detail-title"),
    ecoDetailMeta: document.querySelector("#eco-detail-meta"),
    ecoDetailBoard: document.querySelector("#eco-detail-board"),
    ecoDetailPlan: document.querySelector("#eco-detail-plan"),
    ecoLoadPlayBtn: document.querySelector("#eco-load-play-btn"),
    aiActionAudit: document.querySelector("#ai-action-audit"),

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

function nowMs() {
    return typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
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
    return storageModule.write(path, value);
}

function mutateStored(mutator) {
    if (!storageModule || !storageModule.mutate) {
        return null;
    }
    return storageModule.mutate(mutator);
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

function formatEval(evaluation) {
    if (!evaluation) {
        return "--";
    }

    if (evaluation.type === "mate") {
        if (evaluation.value === 0) {
            return "M0";
        }

        const sign = evaluation.value > 0 ? "+" : "-";
        return `${sign}M${Math.abs(evaluation.value)}`;
    }

    const sign = evaluation.value >= 0 ? "+" : "-";
    return `${sign}${Math.abs(evaluation.value / 100).toFixed(2)}`;
}

function parseUciMove(uci) {
    if (!uci || !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(uci)) {
        return null;
    }

    return {
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4) || undefined
    };
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

            // Fire click to show legal moves immediately on pointer down.
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

            // Restore origin image
            if (state.originImg) state.originImg.style.opacity = "";

            // Remove classes
            this.root.classList.remove("drag-active");
            this.root.querySelectorAll(".drag-origin").forEach((el) => el.classList.remove("drag-origin"));

            // Find target square
            const target = document.elementFromPoint(event.clientX, event.clientY);
            const targetSquare = target ? target.closest(".square") : null;
            const droppedOnSource = Boolean(targetSquare && targetSquare.dataset.square === state.fromSquare);
            this._pointerDownHandled = droppedOnSource;

            if (targetSquare && targetSquare.dataset.square && targetSquare.dataset.square !== state.fromSquare) {
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
            this.root.appendChild(squareEl);
        });

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

    clearHighlights() {
        this.squareMap.forEach((squareEl) => {
            squareEl.classList.remove("selected", "legal", "legal-capture", "last-from", "last-to", "hint-from", "hint-to", "preview-from", "preview-to");
            const dot = squareEl.querySelector(".legal-dot");
            if (dot) {
                dot.remove();
            }
        });
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

    let evaluation;

    const cpMatch = message.match(/\bscore cp (-?\d+)/);
    const mateMatch = message.match(/\bscore mate (-?\d+)/);

    if (cpMatch) {
        let value = parseInt(cpMatch[1], 10);
        if (fen.includes(" b ")) {
            value *= -1;
        }
        evaluation = { type: "cp", value };
    } else if (mateMatch) {
        let value = parseInt(mateMatch[1], 10);
        if (fen.includes(" b ")) {
            value *= -1;
        }
        evaluation = { type: "mate", value };
    } else {
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

function runStockfishInternal(options, enginePath) {
    const {
        fen,
        depth,
        multipv,
        movetime,
        elo,
        timeoutMs = 45000
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
            worker = new Worker(enginePath);
        } catch (error) {
            reject(error);
            return;
        }

        timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error("Engine timeout."));
        }, timeoutMs);

        worker.onmessage = (event) => {
            const message = String(event.data || "");

            if (message === "uciok") {
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

                if (!resolved) {
                    resolved = true;
                    cleanup();

                    resolve({
                        bestMove,
                        lines: Array.from(linesById.values()).sort((a, b) => a.id - b.id)
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
    try {
        await fetch(ENGINE_PRIMARY, { cache: "force-cache" });
    } catch {
        // ignore warmup failures
    }
}

async function evaluateWithStockfish(options) {
    const startedAt = nowMs();
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
        const value = await runStockfishInternal(options, ENGINE_FALLBACK);
        ENGINE_EVAL_CACHE.set(cacheKey, { at: Date.now(), value });
        markFirstEvalMetric(nowMs() - startedAt);
        return value;
    }
}

function uciToSanFromFen(fen, uciMove) {
    const parsed = parseUciMove(uciMove);
    if (!parsed) {
        return uciMove;
    }

    try {
        const game = new Chess(fen);
        const move = game.move(parsed);
        return move ? move.san : uciMove;
    } catch {
        return uciMove;
    }
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
    updateEvalBarElements(evaluation, el.playEvalBar, el.playEvalFill, el.playEvalLabelWhite, el.playEvalLabelBlack);
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

const playState = {
    board: new BoardView(el.playBoard, { orientation: "white", interactive: true, showCoordinates: true }),
    game: new Chess(),
    playerColor: "white",
    botColor: "black",
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
    computerTopLines: [],    // latest engine top lines for computer panel
    moveHistory: [],         // persistent move history until new game
    startTime: null,         // track game duration
    endgameShown: false
};

const progressState = {
    persistedGameSession: null
};

const perfState = {
    firstEvalMs: null,
    explorerLatencyMs: null,
    memoryBytes: null
};

const aiRuntimeState = {
    inFlight: false,
    lastSentAt: 0,
    minIntervalMs: 10000
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
    collapsedIds: new Set()
};

function getPlaySettings() {
    return {
        showLegal: el.setLegal ? el.setLegal.checked : true,
        showLastMove: el.setLastMove ? el.setLastMove.checked : true,
        autoCoach: el.setCoachAuto ? el.setCoachAuto.checked : true,
        showCoordinates: el.setCoordinates ? el.setCoordinates.checked : true,
        sound: el.setSound ? el.setSound.checked : true,
        autoPromotion: el.setAutoPromo ? el.setAutoPromo.checked : true,
        showEvalBar: el.setEvalBar ? el.setEvalBar.checked : true,
        hintsEnabled: el.setHints ? el.setHints.checked : true,
        takebacksEnabled: el.setTakebacks ? el.setTakebacks.checked : true,
        computerEnabled: el.setComputer ? el.setComputer.checked : true,
        moveComments: el.setMoveComments ? el.setMoveComments.checked : true,
        boardTheme: el.setBoardTheme ? el.setBoardTheme.value : "classic",
        pieceTheme: el.setPieceTheme ? el.setPieceTheme.value : "default"
    };
}

function getEvalValueForPlayer(evaluation) {
    if (!evaluation) return 0;
    const flip = playState.playerColor === "black" ? -1 : 1;
    return evaluation.value * flip;
}

function formatEvalForPlayer(evaluation) {
    if (!evaluation) return "--";
    const playerValue = getEvalValueForPlayer(evaluation);
    if (evaluation.type === "mate") {
        if (playerValue === 0) return "M0";
        return `${playerValue > 0 ? "+" : "-"}M${Math.abs(playerValue)}`;
    }
    return `${playerValue >= 0 ? "+" : "-"}${Math.abs(playerValue / 100).toFixed(2)}`;
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

function coachNotice(type, text) {
    const icon = COACH_PREFIX[type] || COACH_PREFIX.info;
    return `${icon} ${text}`;
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
}

/* ===== Move Classification (chess.com style) ===== */

const MOVE_CLASSES = [
    { key: "brilliant", label: "\u00a1Brillante!", icon: "\u2b50", maxLoss: -30 },  // gained >30 cp unexpectedly
    { key: "great", label: "\u00a1Gran jugada!", icon: "\ud83d\udd25", maxLoss: 0 },
    { key: "best", label: "Mejor jugada", icon: "\u2705", maxLoss: 10 },
    { key: "good", label: "Buena jugada", icon: "\ud83d\udc4d", maxLoss: 30 },
    { key: "book", label: "Jugada te\u00f3rica", icon: "\ud83d\udcda", maxLoss: 0 }, // special
    { key: "inaccuracy", label: "Imprecisi\u00f3n", icon: "\u26a0\ufe0f", maxLoss: 100 },
    { key: "mistake", label: "Error", icon: "\u274c", maxLoss: 250 },
    { key: "blunder", label: "\u00a1Desastre!", icon: "\ud83d\udca5", maxLoss: Infinity }
];

function classifyMove(cpLoss, isBookMove) {
    if (isBookMove) return MOVE_CLASSES.find(c => c.key === "book");
    if (cpLoss <= -30) return MOVE_CLASSES.find(c => c.key === "brilliant");
    if (cpLoss <= 0) return MOVE_CLASSES.find(c => c.key === "great");
    if (cpLoss <= 10) return MOVE_CLASSES.find(c => c.key === "best");
    if (cpLoss <= 30) return MOVE_CLASSES.find(c => c.key === "good");
    if (cpLoss <= 100) return MOVE_CLASSES.find(c => c.key === "inaccuracy");
    if (cpLoss <= 250) return MOVE_CLASSES.find(c => c.key === "mistake");
    return MOVE_CLASSES.find(c => c.key === "blunder");
}

function evalToCp(evaluation) {
    if (!evaluation) return 0;
    if (evaluation.type === "mate") {
        return evaluation.value > 0 ? 10000 : -10000;
    }
    return evaluation.value; // centipawns
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

    const clsTag = document.createElement("span");
    clsTag.className = `move-cls-label cls-${classificationKey}`;
    clsTag.textContent = label;
    span.appendChild(clsTag);

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
            wSpan.innerHTML = `<span class="move-cls-dot" style="background:${dotColor}"></span><span class="move-san-text">${wMove.san}</span>${symbol ? `<span class="move-cls-sym" style="color:${dotColor}">${symbol}</span>` : ""}`;
            wSpan.classList.add(`cls-${wCls}`);
        } else {
            wSpan.innerHTML = `<span class="move-san-text">${wMove.san}</span>`;
        }
        decorateMoveSpan(wSpan, playerIsWhite, wCls, i);

        const bSpan = document.createElement("span");
        bSpan.className = "move-san";
        if (bMove) {
            let bCls = playState.moveClassifications[i + 1];
            if (bCls) {
                const dotColor = CLASSIFICATION_DOT_COLOR[bCls] || "#888";
                const symbol = CLASSIFICATION_SYMBOL[bCls] || "";
                bSpan.innerHTML = `<span class="move-cls-dot" style="background:${dotColor}"></span><span class="move-san-text">${bMove.san}</span>${symbol ? `<span class="move-cls-sym" style="color:${dotColor}">${symbol}</span>` : ""}`;
                bSpan.classList.add(`cls-${bCls}`);
            } else {
                bSpan.innerHTML = `<span class="move-san-text">${bMove.san}</span>`;
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
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Apertura Espanola (Ruy Lopez)" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"], name: "Ruy Lopez - Variante Morphy" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Apertura Italiana" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], name: "Giuoco Piano" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"], name: "Defensa Dos Caballos" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "d4"], name: "Apertura Escocesa" },
    { moves: ["e4", "e5", "Nf3", "Nf6"], name: "Defensa Petrov" },
    { moves: ["e4", "e5", "Nf3", "d6"], name: "Defensa Philidor" },
    { moves: ["e4", "e5", "f4"], name: "Gambito de Rey" },
    { moves: ["e4", "e5", "d4"], name: "Gambito del Centro" },
    { moves: ["e4", "e5", "Nc3"], name: "Apertura Viena" },
    { moves: ["e4", "c5"], name: "Defensa Siciliana" },
    { moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3"], name: "Siciliana - Variante Najdorf" },
    { moves: ["e4", "c5", "Nf3", "Nc6"], name: "Siciliana - Variante Clasica" },
    { moves: ["e4", "c5", "Nf3", "e6"], name: "Siciliana - Variante Paulsen" },
    { moves: ["e4", "c5", "c3"], name: "Siciliana - Variante Alapin" },
    { moves: ["e4", "e6"], name: "Defensa Francesa" },
    { moves: ["e4", "e6", "d4", "d5"], name: "Defensa Francesa - Clasica" },
    { moves: ["e4", "e6", "d4", "d5", "Nc3"], name: "Francesa - Variante Winawer" },
    { moves: ["e4", "c6"], name: "Defensa Caro-Kann" },
    { moves: ["e4", "c6", "d4", "d5"], name: "Caro-Kann - Linea Principal" },
    { moves: ["e4", "d5"], name: "Defensa Escandinava" },
    { moves: ["e4", "d6"], name: "Defensa Pirc" },
    { moves: ["e4", "g6"], name: "Defensa Moderna" },
    { moves: ["e4", "Nf6"], name: "Defensa Alekhine" },
    { moves: ["d4", "d5", "c4"], name: "Gambito de Dama" },
    { moves: ["d4", "d5", "c4", "e6"], name: "Gambito de Dama Rehusado" },
    { moves: ["d4", "d5", "c4", "dxc4"], name: "Gambito de Dama Aceptado" },
    { moves: ["d4", "d5", "c4", "c6"], name: "Defensa Eslava" },
    { moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"], name: "Defensa India de Rey" },
    { moves: ["d4", "Nf6", "c4", "g6"], name: "Sistema Indio de Rey" },
    { moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], name: "Defensa Nimzo-India" },
    { moves: ["d4", "Nf6", "c4", "e6", "Nf3", "b6"], name: "Defensa India de Dama" },
    { moves: ["d4", "Nf6", "c4", "c5"], name: "Defensa Benoni" },
    { moves: ["d4", "Nf6", "Nf3", "g6", "c4", "Bg7"], name: "India de Rey - Sistema Clasico" },
    { moves: ["d4", "Nf6", "Bg5"], name: "Ataque Trompowsky" },
    { moves: ["d4", "d5", "Nf3", "Nf6", "c4"], name: "Gambito de Dama Tardio" },
    { moves: ["d4", "d5", "Bf4"], name: "Sistema Londres" },
    { moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"], name: "Sistema Londres" },
    { moves: ["d4", "f5"], name: "Defensa Holandesa" },
    { moves: ["c4"], name: "Apertura Inglesa" },
    { moves: ["c4", "e5"], name: "Inglesa - Siciliana Invertida" },
    { moves: ["c4", "c5"], name: "Inglesa - Simetrica" },
    { moves: ["Nf3", "d5", "g3"], name: "Apertura Reti" },
    { moves: ["Nf3", "Nf6", "g3", "g6", "Bg2", "Bg7"], name: "Apertura Reti - Doble Fianchetto" },
    { moves: ["g3"], name: "Sistema Barcza" },
    { moves: ["b3"], name: "Apertura Larsen" },
    { moves: ["f4"], name: "Apertura Bird" },
    { moves: ["e4", "e5", "Nf3", "Nc6"], name: "Apertura Abierta - Juego Abierto" },
    { moves: ["e4", "e5", "Nf3"], name: "Juego Abierto" },
    { moves: ["d4", "d5"], name: "Juego Cerrado" },
    { moves: ["e4"], name: "Apertura del Peon de Rey" },
    { moves: ["d4"], name: "Apertura del Peon de Dama" }
];

// Sort by longest first for best match
OPENING_BOOK.sort((a, b) => b.moves.length - a.moves.length);

const BOOK_MOVES_BASIC = new Set([
    "e4", "d4", "Nf3", "c4", "g3", "b3", "f4", "Nc3", "e3", "d3", "b4", "c3",
    "e5", "d5", "Nf6", "c5", "g6", "e6", "c6", "d6", "b6", "Nc6", "f5",
    "Bb5", "Bc4", "Be2", "Bd3", "Bg2", "Bb2", "Bf4", "Bg5", "Be7", "Bb4", "Bc5", "Bb7",
    "O-O", "O-O-O", "a3", "a6", "h3", "h6", "Re1", "Qe2", "Qd2", "Qb3"
]);

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

function seedManualOpeningCatalog() {
    OPENING_BOOK.forEach((opening) => {
        indexOpeningEntry(opening.name, null);
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
    for (const opening of OPENING_BOOK) {
        if (opening.moves.length > history.length) continue;
        let match = true;
        for (let i = 0; i < opening.moves.length; i++) {
            if (history[i] !== opening.moves[i]) {
                match = false;
                break;
            }
        }
        if (match) return opening.name;
    }
    return null;
}

function detectOpeningByBestPrefix(history) {
    let bestName = null;
    let bestLen = 0;

    for (const opening of OPENING_BOOK) {
        const max = Math.min(opening.moves.length, history.length);
        let len = 0;
        while (len < max && opening.moves[len] === history[len]) {
            len += 1;
        }

        if (len > bestLen) {
            bestLen = len;
            bestName = opening.name;
        }
    }

    return bestLen >= 2 ? bestName : null;
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

function isLikelyBookMove(history, san, fenAfter) {
    const openingName = detectOpening(history, fenAfter);
    const withinOpeningWindow = history.length <= 30;
    const sanLooksTheoretical = BOOK_MOVES_BASIC.has(san);
    const isBook = withinOpeningWindow && (sanLooksTheoretical || Boolean(openingName));

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

/** Evaluate position BEFORE player move to get baseline eval */
async function getPositionEval(fen, localSession) {
    try {
        const result = await evaluateWithStockfish({
            fen,
            depth: 12,
            multipv: 1,
            movetime: 800
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
    if (!settings.computerEnabled || !settings.moveComments) {
        return;
    }

    const isPlayerMove = move.color === (playState.playerColor === "white" ? "w" : "b");

    if (isPlayerMove) {
        setCoachMessage(coachNotice("engine", "Evaluando tu jugada..."));
    }

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
        const cpLoss = moverIsWhite ? (cpBefore - cpAfter) : (cpAfter - cpBefore);

        // Check book move with a snapshot of move history at evaluation time
        const bookResult = isLikelyBookMove(historyAtMove, move.san, fenAfter);
        const bookMove = bookResult.isBook && cpLoss < 30;

        // Classify and save to the exact move index
        const cls = classifyMove(cpLoss, bookMove);
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

        if (isPlayerMove) {
            showMoveBadge(cls, "Tu jugada", bookDetail, openingContext);
            setCoachMessage(buildCoachComment(cls, move, evalAfter, bookResult.name), openingContext || undefined);
        } else {
            showMoveBadge(cls, "Rival", bookDetail, openingContext);
            const baseComment = buildCoachComment(cls, move, evalAfter, bookResult.name);
            setCoachMessage(`\ud83e\udd16 Rival \u2022 ${baseComment} \u2022 Tu turno.`, openingContext || undefined);
        }
    } catch {
        if (isPlayerMove) {
            setCoachMessage(coachNotice("warn", "Jugaste " + move.san + ". No se pudo evaluar."));
        } else {
            setCoachMessage(coachNotice("warn", "El rival jugo " + move.san + ". No se pudo evaluar su calidad."));
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

    if (!playState.endgameShown && el.endgameModal) {
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

        el.endgameModal.style.display = "flex";
        setTimeout(() => {
            el.endgameModal.style.opacity = "1";
            el.endgameModal.style.pointerEvents = "auto";
        }, 10);
    }

    return title + " - " + reason;
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

function renderPlayStatus() {
    if (playState.game.isGameOver()) {
        el.playStatus.textContent = formatGameOver(playState.game);
        return;
    }

    const turn = sideFromTurn(playState.game.turn());

    if (playState.thinking) {
        el.playStatus.textContent = `Bot (${playState.botElo}) pensando...`;
    } else if (turn === playState.playerColor) {
        const sideText = turn === "white" ? "blancas" : "negras";
        el.playStatus.textContent = `Tu turno con ${sideText}.`;
    } else {
        el.playStatus.textContent = `Turno del bot (${playState.botElo}).`;
    }
}

function renderPlayBoard() {
    const settings = getPlaySettings();

    playState.board.setCoordinatesVisible(settings.showCoordinates);
    playState.board.setFen(playState.game.fen());
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

    if (playState.selectedSquare) {
        playState.board.highlightSquares([playState.selectedSquare], "selected");

        if (settings.showLegal) {
            playState.board.highlightLegalMoves(playState.legalTargets, playState.game.fen());
        }
    }

    // Eval bar visibility
    if (el.playEvalBar) {
        el.playEvalBar.style.display = settings.showEvalBar ? "" : "none";
    }
    if (el.playFlipBtn) {
        el.playFlipBtn.disabled = playState.thinking || playState.game.history().length > 0;
    }

    renderPlayMoveList();
    renderPlayStatus();
    renderComputerPanel();
}

function clearPlaySelection() {
    playState.selectedSquare = null;
    playState.legalTargets = [];
}

function canPlayerDragFrom(square) {
    if (playState.thinking || playState.game.isGameOver()) {
        return false;
    }

    if (sideFromTurn(playState.game.turn()) !== playState.playerColor) {
        return false;
    }

    const piece = playState.game.get(square);
    if (!piece) {
        return false;
    }

    return piece.color === turnFromSide(playState.playerColor);
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
    updateComputerPanelTitle();
    const isPlayerTurn = sideFromTurn(playState.game.turn()) === playState.playerColor;

    if (!settings.computerEnabled || !isPlayerTurn || playState.computerTopLines.length === 0) {
        el.computerPanel.style.display = "none";
        return;
    }
    el.computerPanel.style.display = "";
    el.computerLines.innerHTML = "";

    const fen = playState.game.fen();
    playState.computerTopLines.forEach((line) => {
        const div = document.createElement("div");
        div.className = "engine-line";

        const evalSpan = document.createElement("span");
        const evalText = formatEvalForPlayer(line.evaluation);
        const playerVal = line.evaluation ? getEvalValueForPlayer(line.evaluation) : 0;
        evalSpan.className = "engine-eval " + (playerVal >= 0 ? "positive" : "negative");
        evalSpan.textContent = evalText;

        const movesSpan = document.createElement("span");
        movesSpan.className = "engine-moves";
        const san = line.moveSAN || uciToSanFromFen(fen, line.moveUCI);
        const desc = sanToSpanish(san);
        movesSpan.textContent = `${desc} (${san})`;

        const depthSpan = document.createElement("span");
        depthSpan.className = "engine-depth";
        depthSpan.textContent = `D${line.depth}`;

        div.append(evalSpan, movesSpan, depthSpan);

        // Click to preview this move
        div.addEventListener("click", () => {
            const parsed = parseUciMove(line.moveUCI);
            if (parsed) {
                showMoveConfirmation(parsed.from, parsed.to, san, parsed.promotion);
            }
        });

        el.computerLines.appendChild(div);
    });
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

    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    if (el.moveConfirmBar) {
        el.moveConfirmBar.classList.remove("visible");
    }

    const fenBefore = playState.game.fen();
    const move = playState.game.move({
        from: pending.from,
        to: pending.to,
        promotion: pending.promotion || "q"
    });

    if (!move) {
        setCoachMessage(coachNotice("error", "No se pudo ejecutar ese movimiento."));
        renderPlayBoard();
        return;
    }
    const fenAfter = playState.game.fen();
    const moveIndex = playState.game.history().length - 1;
    const historyAtMove = playState.game.history().slice();

    playState.lastMove = move;
    playState.hintMove = null;
    playState.computerTopLines = [];
    clearPlaySelection();
    playMoveSound(move);
    renderPlayBoard();
    scheduleSessionSnapshotSave();

    const localSession = playState.sessionId;
    evaluateLastMove(move, fenBefore, fenAfter, localSession, moveIndex, historyAtMove);

    if (playState.game.isGameOver()) {
        setCoachMessage(coachNotice("game", formatGameOver(playState.game)));
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
    if (!settings.computerEnabled) return;
    const turnFromFen = fen.includes(" w ") ? "white" : "black";
    if (turnFromFen !== playState.playerColor) {
        playState.computerTopLines = [];
        renderComputerPanel();
        return;
    }

    try {
        const depth = clamp(parseInt(el.coachDepth.value, 10), 8, 18);
        const result = await evaluateWithStockfish({
            fen,
            depth,
            multipv: 3,
            movetime: 1000
        });
        if (localSession !== playState.sessionId) return;

        playState.computerTopLines = result.lines || [];
        renderComputerPanel();
    } catch {
        playState.computerTopLines = [];
        renderComputerPanel();
    }
}

function currentBotElo() {
    const custom = parseInt(el.botCustomElo.value || "", 10);
    if (Number.isFinite(custom)) {
        return clamp(custom, 400, 2800);
    }

    return clamp(parseInt(el.botPreset.value, 10), 400, 2800);
}

async function maybeAutoCoach() {
    const settings = getPlaySettings();
    if (!settings.autoCoach) {
        return;
    }

    if (playState.game.isGameOver()) {
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

async function playBotMove() {
    const turn = sideFromTurn(playState.game.turn());
    if (turn !== playState.botColor || playState.game.isGameOver()) {
        return;
    }

    const localSession = playState.sessionId;

    playState.thinking = true;
    renderPlayStatus();

    try {
        const depth = clamp(Math.round(playState.botElo / 180), 8, 16);
        const moveTime = clamp(Math.round(260 + playState.botElo / 2), 320, 2200);
        const fenBeforeMove = playState.game.fen();

        const result = await evaluateWithStockfish({
            fen: fenBeforeMove,
            depth,
            multipv: 1,
            movetime: moveTime,
            elo: playState.botElo
        });

        if (localSession !== playState.sessionId) {
            return;
        }

        const parsed = parseUciMove(result.bestMove);
        if (!parsed) {
            throw new Error("Engine returned invalid move.");
        }

        const move = playState.game.move(parsed);
        if (!move) {
            throw new Error("Could not apply bot move.");
        }

        const fenAfterMove = playState.game.fen();
        const moveIndex = playState.game.history().length - 1;
        const historyAtMove = playState.game.history().slice();

        playState.lastMove = move;
        playState.hintMove = null;
        hideMoveBadge();
        clearPlaySelection();
        playMoveSound(move);
        renderPlayBoard();
        scheduleSessionSnapshotSave();

        // Evaluate bot's move
        evaluateLastMove(move, fenBeforeMove, fenAfterMove, localSession, moveIndex, historyAtMove);


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

    if (playState.game.isGameOver()) {
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
        const depth = clamp(parseInt(el.coachDepth.value, 10), 8, 20);

        const result = await evaluateWithStockfish({
            fen,
            depth,
            multipv: 3,
            movetime: 1200
        });

        if (localSession !== playState.sessionId) {
            return;
        }

        // Update computer panel with engine lines
        playState.computerTopLines = result.lines || [];

        const bestParsed = parseUciMove(result.bestMove);
        playState.hintMove = bestParsed ? { from: bestParsed.from, to: bestParsed.to } : null;

        const bestLine = result.lines[0];
        const secondLine = result.lines[1];

        const bestSan = uciToSanFromFen(fen, result.bestMove);
        const bestDesc = sanToSpanish(bestSan);
        const evalText = bestLine ? formatEvalForPlayer(bestLine.evaluation) : "--";
        const evalBias = bestLine
            ? (getEvalValueForPlayer(bestLine.evaluation) >= 0 ? "a tu favor" : "a favor del rival")
            : "";

        // Update eval bar
        if (getPlaySettings().showEvalBar && bestLine) {
            updatePlayEvalBar(bestLine.evaluation);
        }

        let message = `\u265f\ufe0f \u2726 Mejor para ti: ${bestDesc} (${bestSan}), eval ${evalText}${evalBias ? ` (${evalBias})` : ""}.`;

        if (secondLine) {
            const alt = uciToSanFromFen(fen, secondLine.moveUCI);
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
    if (playState.thinking || playState.game.isGameOver()) {
        return;
    }

    const currentTurn = sideFromTurn(playState.game.turn());
    if (currentTurn !== playState.playerColor) {
        return;
    }

    const currentPiece = playState.game.get(square);
    const ownPiece = currentPiece && currentPiece.color === turnFromSide(playState.playerColor);

    if (!playState.selectedSquare) {
        if (!ownPiece) {
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
    playState.computerTopLines = [];
    clearPlaySelection();
    playMoveSound(move);
    renderPlayBoard();

    const localSession = playState.sessionId;
    evaluateLastMove(move, fenBeforeMove, fenAfterMove, localSession, moveIndex, historyAtMove);

    if (playState.game.isGameOver()) {
        setCoachMessage(coachNotice("game", formatGameOver(playState.game)));
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
    if (playState.thinking || playState.game.isGameOver()) return;
    const currentTurn = sideFromTurn(playState.game.turn());
    if (currentTurn !== playState.playerColor) return;

    const legalMoves = playState.game.moves({ square: from, verbose: true });
    const intendedMove = legalMoves.find((move) => move.to === to);

    if (!intendedMove) {
        clearPlaySelection();
        renderPlayBoard();
        return;
    }

    // Set selection manually to the dropped square so variables are matched
    playState.selectedSquare = from;
    await onPlaySquareClick(to); // Re-use the click logic to handle promotion and execution
}

function goToPlaySetup(message = coachNotice("setup", "Configura una nueva partida para empezar.")) {
    playState.sessionId += 1;
    playState.game = new Chess();
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
    playState.computerTopLines = [];
    playState.moveHistory = [];
    playState.startTime = null;
    playState.endgameShown = false;
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

    if (el.endgameModal) {
        el.endgameModal.style.opacity = "0";
        el.endgameModal.style.pointerEvents = "none";
        el.endgameModal.style.display = "none";
    }

    setCoachMessage(message);
    renderPlayBoard();
    scheduleSessionSnapshotSave();
}

function startNewGame() {
    playState.sessionId += 1;
    playState.game = new Chess();

    const chosenColor = el.playerColor.value === "random"
        ? (Math.random() < 0.5 ? "white" : "black")
        : el.playerColor.value;
    if (el.playerColor.value === "random") {
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
    playState.computerTopLines = [];
    playState.moveHistory = [];
    playState.startTime = Date.now();
    playState.endgameShown = false;
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

    if (el.playEvalBar) {
        el.playEvalBar.style.display = getPlaySettings().showEvalBar ? "" : "none";
    }

    const eloMsg = getPlaySettings().computerEnabled
        ? `Partida nueva. Bot configurado en ${playState.botElo} ELO. \u00a1Buena suerte!`
        : `Partida nueva. Motor desactivado \u2014 juega ambos lados.`;
    setCoachMessage(coachNotice("setup", eloMsg));

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
        setCoachMessage(coachNotice("warn", "Los retrocesos estan desactivados. Activalos en Ajustes."));
        return;
    }

    if (playState.game.history().length === 0) {
        return;
    }

    playState.game.undo();

    if (playState.game.history().length > 0 && sideFromTurn(playState.game.turn()) !== playState.playerColor) {
        playState.game.undo();
    }

    playState.lastMove = null;
    playState.hintMove = null;
    clearPlaySelection();
    setCoachMessage(coachNotice("ok", "Jugada deshecha. Es tu turno."));
    renderPlayBoard();
    renderPlayMoveList();
    scheduleSessionSnapshotSave();
}

/* ===== Analysis State ===== */

const analysisState = {
    board: new BoardView(el.analysisBoard, { orientation: "white", interactive: false, showCoordinates: true }),
    report: null,
    currentIndex: 0,
    running: false,
    runId: 0
};

function setAnalysisStatus(message) {
    el.analysisStatus.textContent = message;
}

function resetAnalysisSummary() {
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

    analysisState.board.setFen("8/8/8/8/8/8/8/8 w - - 0 1");
    analysisState.board.clearHighlights();
    updateEvalBar(null);
}

function fillClassificationTable(classifications) {
    el.analysisClassificationBody.innerHTML = "";

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
        whiteCell.textContent = String(classifications.white[key] || 0);

        const blackCell = document.createElement("td");
        blackCell.textContent = String(classifications.black[key] || 0);

        row.append(nameCell, whiteCell, blackCell);
        el.analysisClassificationBody.appendChild(row);
    });
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

    for (let i = 1; i < positions.length; i += 1) {
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
            const san = line.moveSAN || uciToSanFromFen(fen, line.moveUCI);
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

        const depth = clamp(parseInt(el.analysisDepth.value, 10), 8, 20);

        for (let i = 0; i < positions.length; i += 1) {
            if (localRunId !== analysisState.runId) {
                return;
            }

            const progress = Math.round((i / positions.length) * 100);
            el.analysisProgress.value = progress;
            setAnalysisStatus(`Evaluando posici\u00f3n ${i + 1} de ${positions.length}...`);

            const evaluation = await evaluateWithStockfish({
                fen: positions[i].fen,
                depth,
                multipv: 2
            });

            if (localRunId !== analysisState.runId) {
                return;
            }

            positions[i].topLines = evaluation.lines.length > 0
                ? evaluation.lines
                : [{
                    id: 1,
                    depth,
                    moveUCI: evaluation.bestMove || "",
                    evaluation: { type: "cp", value: 0 }
                }];

            positions[i].worker = "local";
        }

        el.analysisProgress.value = 100;
        setAnalysisStatus("Calculando clasificaciones...");

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

        analysisState.report = reportPayload.results;
        analysisState.currentIndex = 0;

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

        if (analysisModule && analysisModule.registerActivity) {
            const summary = analysisModule.registerActivity("analysis", {
                whiteAccuracy: analysisState.report.accuracies.white,
                blackAccuracy: analysisState.report.accuracies.black
            });
            renderProgressDashboard(summary);
        }

        setAnalysisStatus("Analisis completado.");
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
    button.title = "Abrir en Estudio en una nueva pesta\u00f1a";

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

function renderProgressDashboard(summary = null) {
    if (!analysisModule || !analysisModule.summarize) {
        return;
    }

    const computed = summary || analysisModule.summarize(analysisModule.loadProgress());
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
            li.textContent = "Sin partidas registradas.";
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
}

function persistFinishedGame(openingName, winnerLabel) {
    if (!analysisModule || !analysisModule.registerFinishedGame) {
        return;
    }
    if (progressState.persistedGameSession === playState.sessionId) {
        return;
    }

    const accuracy = analysisModule.computePlayerAccuracy
        ? analysisModule.computePlayerAccuracy(playState.moveClassifications, playState.playerColor)
        : 0;

    const summary = analysisModule.registerFinishedGame({
        opening: openingName || "Sin apertura detectada",
        result: getPlayerResultLabel(winnerLabel),
        color: playState.playerColor,
        accuracy,
        errors: computeErrorBucketsForPlayer()
    });

    progressState.persistedGameSession = playState.sessionId;
    renderProgressDashboard(summary);
    scheduleSessionSnapshotSave();
}

function registerStudyActivity(payload) {
    if (!analysisModule || !analysisModule.registerActivity) {
        return;
    }
    const summary = analysisModule.registerActivity("study", payload || null);
    renderProgressDashboard(summary);
    scheduleSessionSnapshotSave();
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
    const rows = openingExplorerState.rows.filter((row) => row.parentId !== null);
    const rootGames = rows
        .filter((row) => row.depth === 1)
        .reduce((sum, row) => sum + Number(row.games || 0), 0);
    const colorFilter = el.ecoFilterColor ? el.ecoFilterColor.value : "white";

    const enrichedRows = rows.map((row) => {
        const metrics = computeExplorerRowMetrics(row, colorFilter, rootGames);
        return {
            ...row,
            popularity: metrics.popularity,
            success: metrics.success
        };
    });

    const filters = {
        minPopularity: el.ecoFilterPopularity ? Number(el.ecoFilterPopularity.value || 0) : 0,
        minSuccess: el.ecoFilterSuccess ? Number(el.ecoFilterSuccess.value || 0) : 0,
        query: el.ecoSearch ? el.ecoSearch.value : ""
    };

    if (openingsModule && openingsModule.filterTreeRows) {
        try {
            openingExplorerState.filteredRows = await openingsModule.filterTreeRows(enrichedRows, filters);
        } catch {
            openingExplorerState.filteredRows = enrichedRows;
        }
    } else {
        openingExplorerState.filteredRows = enrichedRows;
    }

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
        const success = Number(node.success || 0).toFixed(1);
        const pop = Number(node.popularity || 0).toFixed(1);
        el.ecoDetailMeta.textContent = `Linea: ${node.line} | Popularidad ${pop}% | Exito ${success}% | Muestra ${total}`;
    }
    if (el.ecoDetailPlan) {
        const plans = studyModule && studyModule.buildOpeningPlan
            ? studyModule.buildOpeningPlan(node.name, el.ecoFilterColor ? el.ecoFilterColor.value : "white")
            : ["Desarrolla piezas, controla centro y asegura al rey."];
        el.ecoDetailPlan.innerHTML = plans.map((step, index) => `${index + 1}. ${step}`).join("<br>");
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
    el.ecoTree.innerHTML = "";

    const rows = openingExplorerState.visibleRows.slice(0, 220);
    if (rows.length === 0) {
        el.ecoTree.textContent = "Sin lineas para los filtros actuales.";
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

        const success = Number(row.success || 0).toFixed(1);
        const pop = Number(row.popularity || 0).toFixed(1);
        item.innerHTML = `<span class=\"eco-row-main\">${row.eco} - ${row.san || "..."} \u2192 ${row.name}</span><span class=\"eco-row-meta\">P ${pop}% | E ${success}%</span>`;
        item.setAttribute("role", "treeitem");
        item.setAttribute("aria-level", String(row.depth + 1));
        const hasChildren = explorerHasChildren(row) || (row.depth < 5 && row.hasChildren);
        if (hasChildren) {
            item.setAttribute("aria-expanded", openingExplorerState.collapsedIds.has(row.id) ? "false" : "true");
        }
        item.tabIndex = openingExplorerState.focusedIndex === index ? 0 : -1;
        item.setAttribute("aria-label", `${row.name}, popularidad ${pop} por ciento, exito ${success} por ciento`);

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

    if (el.ecoFilterPopularityValue && el.ecoFilterPopularity) {
        el.ecoFilterPopularityValue.textContent = `${el.ecoFilterPopularity.value}%`;
    }
    if (el.ecoFilterSuccessValue && el.ecoFilterSuccess) {
        el.ecoFilterSuccessValue.textContent = `${el.ecoFilterSuccess.value}%`;
    }

    const onFilterChange = async () => {
        if (el.ecoFilterPopularityValue && el.ecoFilterPopularity) {
            el.ecoFilterPopularityValue.textContent = `${el.ecoFilterPopularity.value}%`;
        }
        if (el.ecoFilterSuccessValue && el.ecoFilterSuccess) {
            el.ecoFilterSuccessValue.textContent = `${el.ecoFilterSuccess.value}%`;
        }
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
            if (!window.confirm(`Cargar la linea ${node.name} en el tablero principal?`)) return;

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
        n: () => {
            if (window.confirm("Iniciar una nueva partida?")) startNewGame();
        },
        f: () => {
            if (el.playFlipBtn) el.playFlipBtn.click();
        },
        a: () => activateMainTab("analysis-section"),
        s: () => activateMainTab("study-section"),
        "?": () => {
            window.alert("Atajos:\\nH pista\\nU deshacer\\nN nueva partida\\nF girar\\nA analisis\\nS estudio");
        }
    });
}

/* ===== Study Diagrams ===== */

function renderStudyDiagrams() {
    el.studyDiagrams.forEach((container) => {
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

            el.tabs.forEach((tab) => tab.classList.remove("is-active"));
            el.panels.forEach((panel) => panel.classList.remove("is-active"));

            button.classList.add("is-active");

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
    const s = getPlaySettings();
    playState.board.setCoordinatesVisible(s.showCoordinates);
    if (playModule && playModule.applyBoardAndPieceTheme) {
        playModule.applyBoardAndPieceTheme(s.boardTheme, s.pieceTheme);
    } else if (uiModule) {
        uiModule.applyBoardTheme(s.boardTheme);
        uiModule.applyPieceTheme(s.pieceTheme);
    }

    /* Eval bar visibility in analysis */
    if (el.evalBar) {
        el.evalBar.style.display = s.showEvalBar ? "" : "none";
    }

    if (!s.computerEnabled) {
        playState.computerTopLines = [];
    } else if (playState.startTime
        && !playState.game.isGameOver()
        && sideFromTurn(playState.game.turn()) === playState.playerColor
        && playState.computerTopLines.length === 0) {
        updateComputerLines(playState.game.fen(), playState.sessionId);
    }

    renderPlayBoard();
}

function bindEvents() {
    playState.board.onSquareClick = onPlaySquareClick;
    playState.board.onDrop = handleBoardDrop;
    playState.board.canDragFrom = canPlayerDragFrom;

    if (el.endgameCloseBtn) {
        el.endgameCloseBtn.addEventListener("click", () => {
            el.endgameModal.style.opacity = "0";
            el.endgameModal.style.pointerEvents = "none";
            setTimeout(() => el.endgameModal.style.display = "none", 300);
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

            el.endgameModal.style.opacity = "0";
            el.endgameModal.style.pointerEvents = "none";
            setTimeout(() => el.endgameModal.style.display = "none", 300);

            // Switch to analysis tab automatically
            const tabBtn = document.querySelector('[data-tab-target="analysis-section"]');
            if (tabBtn) tabBtn.click();

            // Trigger analysis loading
            if (el.analysisRunBtn) el.analysisRunBtn.click();
        });
    }

    el.playStartBtn.addEventListener("click", startNewGame);
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

    el.playFlipBtn.addEventListener("click", async () => {
        if (playState.thinking) {
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
        playState.computerTopLines = [];
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
    if (el.settingsBtn) {
        el.settingsBtn.addEventListener("click", () => {
            if (el.settingsModal) el.settingsModal.classList.add("visible");
        });
    }
    if (el.settingsCloseBtn) {
        el.settingsCloseBtn.addEventListener("click", () => {
            if (el.settingsModal) el.settingsModal.classList.remove("visible");
        });
    }
    if (el.settingsOverlay) {
        el.settingsOverlay.addEventListener("click", () => {
            if (el.settingsModal) el.settingsModal.classList.remove("visible");
        });
    }
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && el.settingsModal && el.settingsModal.classList.contains("visible")) {
            el.settingsModal.classList.remove("visible");
        }
    });

    /* Wire ALL settings toggles to update the board live */
    const allSettings = [
        el.setCoachAuto, el.setHints, el.setEvalBar,
        el.setThreatArrows, el.setSuggestionArrows,
        el.setMoveComments, el.setComputer, el.setTakebacks,
        el.setLegal, el.setLastMove, el.setCoordinates,
        el.setSound, el.setAutoPromo, el.setBoardTheme, el.setPieceTheme
    ];
    allSettings.forEach((toggle) => {
        if (toggle) {
            toggle.addEventListener("change", applySettingsToBoard);
        }
    });

    el.coachDepth.addEventListener("input", () => {
        el.coachDepthValue.textContent = el.coachDepth.value;
    });

    /* Sidebar tabs (Coach / AI) */
    document.querySelectorAll("[data-sidebar-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
            const targetId = tab.getAttribute("data-sidebar-tab");
            document.querySelectorAll(".sidebar-tab").forEach(t => t.classList.remove("is-active"));
            document.querySelectorAll(".sidebar-tab-content").forEach(c => c.classList.remove("is-active"));
            tab.classList.add("is-active");
            const panel = document.getElementById(targetId);
            if (panel) panel.classList.add("is-active");
        });
    });

    el.analysisDepth.addEventListener("input", () => {
        el.analysisDepthValue.textContent = el.analysisDepth.value;
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
}

/* ===== AI Chess Assistant ===== */

const aiChatMessages = document.querySelector("#ai-chat-messages");
const aiChatInput = document.querySelector("#ai-chat-input");
const aiChatSend = document.querySelector("#ai-chat-send");

function addAiMessage(text, type) {
    if (!aiChatMessages) return;
    const div = document.createElement("div");
    div.className = `ai-msg ${type}`;

    // Simple markdown parsing for bold and newlines
    let htmlText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    div.innerHTML = htmlText;

    aiChatMessages.appendChild(div);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    scheduleSessionSnapshotSave();
    return div;
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
    const approved = window.confirm(`${description}\n\nConfirma con Si/No.`);
    if (!approved) {
        logAiActionEvent(action, "rejected");
        return;
    }

    logAiActionEvent(action, "approved");

    execute();
    scheduleSessionSnapshotSave();
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
        span.title = `Clic para previsualizar: ${sanToSpanish(san)}`;
        span.addEventListener("click", () => {
            try {
                const game = new Chess(playState.game.fen());
                const move = game.move(san);
                if (move) {
                    showMoveConfirmation(move.from, move.to, move.san, move.promotion);
                }
            } catch {}
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

async function generateAiResponse(question) {
    const game = playState.game;
    const fen = game.fen();
    const history = game.history();
    const phase = getGamePhaseAI(game);
    const material = getMaterialCount(game);
    const materialDesc = describeMaterial(material.diff);
    const turn = game.turn() === "w" ? "blancas" : "negras";
    const moveNum = Math.ceil(history.length / 2);

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

    const systemPrompt = `Eres un asistente de ajedrez conciso y accionable para la webapp Ajedrez Lab.

REGLAS:
1. Se BREVE y DIRECTO. Maximo 3-4 oraciones.
2. Cuando sugieras un movimiento, siempre menciona el nombre de la pieza en espanol (Peon, Caballo, Alfil, Torre, Dama, Rey) seguido de la notacion.
3. Ejemplo: "Mueve el Caballo a f3 (Nf3)" o "Juega Peon a e4 (e4)".
4. Si te piden ayuda, da la mejor jugada con el nombre de la pieza y una razon corta.
5. Responde en espanol.
6. Usa simbolos visuales de forma moderada para claridad: "\u2022", "\u2192", "\u2713", "\u26A0".
7. Debes responder SOLO en JSON valido sin markdown.
8. Formato obligatorio: {"text":"...", "actions":[{"type":"hint|undo|new_game|analyze|study|flip|open_study|load_line","label":"...", "argument":"..."}]}.
9. Incluye 0-3 acciones maximo. Solo usa tipos de la whitelist.
10. Si hablas de una apertura concreta, incluye accion study con el nombre exacto en argument.

Contexto de la partida:
- Fase: ${phase} | Turno: ${turn} | Jugada #${moveNum}
- Ultimas jugadas: ${history.slice(-8).join(" ")}
- Material: ${materialDesc}
- Eval Stockfish: ${evalText}
- Mejor jugada: ${bestMoveDesc} (${bestMoveStr})`;

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
                question: question.slice(0, 1600),
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
                actions: []
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

    addAiMessage(question, "ai-user");
    aiChatInput.value = "";

    const thinkingMsg = addAiMessage("Pensando...", "ai-bot ai-thinking");
    aiRuntimeState.inFlight = true;
    aiRuntimeState.lastSentAt = now;

    try {
        const aiResponse = await generateAiResponse(question);
        thinkingMsg.textContent = aiResponse.text;
        thinkingMsg.classList.remove("ai-thinking");
        appendStructuredAiActions(thinkingMsg, aiResponse.actions);
        makeAiActionsClickable(thinkingMsg);
        makeMovesClickable(thinkingMsg);
        makeOpeningMentionsClickable(thinkingMsg);
    } catch {
        thinkingMsg.textContent = "Lo siento, no pude procesar tu pregunta. Int\u00e9ntalo de nuevo.";
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

function getVisibleStudySectionId() {
    const detail = document.querySelector(".study-detail[style*='display: block']");
    return detail && detail.id ? detail.id : null;
}

function serializeAiChatForSession() {
    if (!aiChatMessages) {
        return [];
    }

    return Array.from(aiChatMessages.children)
        .map((node) => {
            const text = node.textContent ? node.textContent.trim() : "";
            if (!text) {
                return null;
            }
            const role = node.classList.contains("ai-user") ? "user" : "bot";
            return {
                role,
                text: text.slice(0, 1200)
            };
        })
        .filter(Boolean)
        .slice(-24);
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
    if (!aiChatMessages || !Array.isArray(history) || history.length === 0) {
        return;
    }

    aiChatMessages.innerHTML = "";
    history.forEach((entry) => {
        if (!entry) return;
        const role = String(entry.role || "bot");
        const text = String(entry.text || "").trim();
        if (!text) return;
        addAiMessage(text, role === "user" ? "ai-user" : "ai-bot");
    });
}

function buildSessionSnapshot() {
    return {
        savedAt: new Date().toISOString(),
        activeTab: getCurrentActiveTabId(),
        studySection: getVisibleStudySectionId(),
        play: {
            fen: playState.game.fen(),
            pgn: playState.game.pgn(),
            history: playState.game.history(),
            playerColor: playState.playerColor,
            botColor: playState.botColor,
            botElo: playState.botElo,
            boardOrientation: playState.board.getOrientation ? playState.board.getOrientation() : playState.playerColor
        },
        explorer: {
            color: el.ecoFilterColor ? el.ecoFilterColor.value : "white",
            popularity: el.ecoFilterPopularity ? Number(el.ecoFilterPopularity.value || 0) : 0,
            success: el.ecoFilterSuccess ? Number(el.ecoFilterSuccess.value || 0) : 0,
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
    writeStored("session.snapshot", buildSessionSnapshot());
}

function scheduleSessionSnapshotSave(delayMs = 260) {
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
    if (el.ecoFilterPopularity && Number.isFinite(explorer.popularity)) {
        el.ecoFilterPopularity.value = String(explorer.popularity);
    }
    if (el.ecoFilterSuccess && Number.isFinite(explorer.success)) {
        el.ecoFilterSuccess.value = String(explorer.success);
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
    clearPlaySelection();

    playState.playerColor = play.playerColor === "black" ? "black" : "white";
    playState.botColor = playState.playerColor === "white" ? "black" : "white";
    playState.botElo = Number.isFinite(play.botElo) ? clamp(Number(play.botElo), 400, 2800) : playState.botElo;

    if (el.playerColor) {
        el.playerColor.value = playState.playerColor;
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
    renderPlayBoard();
    renderPlayMoveList();
}

function restoreSessionAfterInit() {
    const snapshot = sessionRuntimeState.restorePayload;
    if (!snapshot || typeof snapshot !== "object") {
        return;
    }

    restorePlayFromSnapshot(snapshot);

    if (snapshot.ai && Array.isArray(snapshot.ai.chatHistory)) {
        restoreAiChatFromSession(snapshot.ai.chatHistory);
    }

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
        scheduleSessionSnapshotSave(0);
    }, 5000);

    window.setInterval(() => {
        refreshSessionMemoryMetric();
    }, 12000);

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
    if (aiModule && aiModule.logAction) {
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

    restoreSessionPrefilters();

    if (uiModule && uiModule.applyStoredThemes) {
        uiModule.applyStoredThemes();
        if (el.setBoardTheme && uiModule.loadPreference) {
            el.setBoardTheme.value = uiModule.loadPreference("board_theme", el.setBoardTheme.value || "classic");
        }
        if (el.setPieceTheme && uiModule.loadPreference) {
            el.setPieceTheme.value = uiModule.loadPreference("piece_theme", el.setPieceTheme.value || "default");
        }
    }

    bindTabs();
    bindEvents();
    bindAiChat();
    loadOpeningCatalog();
    renderStudyDiagrams();
    setTodayLabel();
    updatePerformanceMetricsView();
    refreshSessionMemoryMetric();
    renderAiActionAudit();
    bindSessionPersistence();

    el.coachDepthValue.textContent = el.coachDepth.value;
    el.analysisDepthValue.textContent = el.analysisDepth.value;

    renderPlayBoard();
    resetAnalysisSummary();

    // Initialize play eval bar
    updatePlayEvalBar({ type: "cp", value: 0 });
    applySettingsToBoard();
    await initOpeningExplorer();
    renderProgressDashboard();
    bindGlobalShortcuts();

    if (hasExplicitDeepLink()) {
        applyStudyDeepLinkFromUrl();
    } else {
        restoreSessionAfterInit();
    }

    scheduleSessionSnapshotSave(0);
}

void init();

