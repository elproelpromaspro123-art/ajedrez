
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

const el = {
    tabs: Array.from(document.querySelectorAll(".tab-btn")),
    panels: Array.from(document.querySelectorAll(".panel")),

    lastUpdateLabel: document.querySelector("#last-update-label"),

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

async function evaluateWithStockfish(options) {
    try {
        return await runStockfishInternal(options, ENGINE_PRIMARY);
    } catch {
        return runStockfishInternal(options, ENGINE_FALLBACK);
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
    previewMove: null,       // {from, to} for visual preview highlight
    pendingConfirmMove: null, // {from, to, san, promotion} awaiting yes/no
    computerTopLines: [],    // latest engine top lines for computer panel
    moveHistory: [],         // persistent move history until new game
    startTime: null,         // track game duration
    endgameShown: false
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
        moveComments: el.setMoveComments ? el.setMoveComments.checked : true
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

function setCoachMessage(message) {
    if (el.coachMessage) {
        el.coachMessage.textContent = message;
    }
    if (el.coachHistoryContainer) {
        const msgEl = document.createElement("p");
        msgEl.style.fontSize = "0.88rem";
        msgEl.style.margin = "4px 0";
        msgEl.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        msgEl.style.paddingBottom = "4px";
        msgEl.textContent = message;
        el.coachHistoryContainer.appendChild(msgEl);
        el.coachHistoryContainer.scrollTop = el.coachHistoryContainer.scrollHeight;
    }
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

function showMoveBadge(classification, sideLabel = "", detail = "") {
    if (!el.playMoveBadge) return;
    el.playMoveBadge.className = `move-badge ${classification.key}`;
    const detailText = detail ? ` \u2022 ${detail}` : "";
    el.playMoveBadge.textContent = `${classification.icon} ${sideLabel ? `${sideLabel}: ` : ""}${classification.label}${detailText}`;
    el.playMoveBadge.style.display = "inline-flex";
    // re-trigger animation
    el.playMoveBadge.style.animation = "none";
    void el.playMoveBadge.offsetHeight;
    el.playMoveBadge.style.animation = "";
}

function hideMoveBadge() {
    if (el.playMoveBadge) el.playMoveBadge.style.display = "none";
}

function decorateMoveSpan(span, isPlayerMove, classificationKey) {
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
        decorateMoveSpan(wSpan, playerIsWhite, wCls);

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
            decorateMoveSpan(bSpan, !playerIsWhite, bCls);
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

function detectOpening(history) {
    for (const opening of OPENING_BOOK) {
        if (opening.moves.length > history.length) continue;
        let match = true;
        for (let i = 0; i < opening.moves.length; i++) {
            if (history[i] !== opening.moves[i]) { match = false; break; }
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

function isLikelyBookMove(history, san) {
    if (history.length > 16) return { isBook: false, name: null };
    const BOOK_MOVES_BASIC = new Set([
        "e4", "d4", "Nf3", "c4", "g3", "b3", "f4", "Nc3", "e3", "d3", "b4", "c3",
        "e5", "d5", "Nf6", "c5", "g6", "e6", "c6", "d6", "b6", "Nc6", "f5",
        "Bb5", "Bc4", "Be2", "Bd3", "Bg2", "Bb2", "Bf4", "Bg5", "Be7", "Bb4", "Bc5", "Bb7",
        "O-O", "O-O-O", "a3", "a6", "h3", "h6", "Re1", "Qe2", "Qd2", "Qb3"
    ]);
    const isBook = BOOK_MOVES_BASIC.has(san);
    const name = isBook ? (detectOpening(history) || detectOpeningByBestPrefix(history)) : null;
    return { isBook, name };
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
        const bookResult = isLikelyBookMove(historyAtMove, move.san);
        const bookMove = bookResult.isBook && cpLoss < 30;

        // Classify and save to the exact move index
        const cls = classifyMove(cpLoss, bookMove);
        playState.moveClassifications[moveIndex] = cls.key;
        renderPlayMoveList();

        const bookDetail = cls.key === "book" && bookResult.name ? bookResult.name : "";

        if (isPlayerMove) {
            showMoveBadge(cls, "Tu jugada", bookDetail);
            setCoachMessage(buildCoachComment(cls, move, evalAfter, bookResult.name));
        } else {
            showMoveBadge(cls, "Rival", bookDetail);
            const baseComment = buildCoachComment(cls, move, evalAfter, bookResult.name);
            setCoachMessage(`\ud83e\udd16 Rival \u2022 ${baseComment} \u2022 Tu turno.`);
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

        const opening = detectOpening(playState.game.history()) || "Sin apertura detectada";
        const totalPly = playState.game.history().length;
        const totalMoves = Math.ceil(totalPly / 2);
        const durationText = formatDurationFromStart();

        if (el.endgameTitle) el.endgameTitle.textContent = title;
        if (el.endgameReason) el.endgameReason.textContent = reason;
        if (el.endgameWinner) el.endgameWinner.textContent = winner;
        if (el.endgameDuration) el.endgameDuration.textContent = durationText;
        if (el.endgameMoves) el.endgameMoves.textContent = String(totalMoves);
        if (el.endgameOpening) el.endgameOpening.textContent = opening;

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
}

function cancelMoveConfirmation() {
    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    if (el.moveConfirmBar) {
        el.moveConfirmBar.classList.remove("visible");
    }
    renderPlayBoard();
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
    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    playState.computerTopLines = [];
    playState.moveHistory = [];
    playState.startTime = null;
    playState.endgameShown = false;
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
    playState.previewMove = null;
    playState.pendingConfirmMove = null;
    playState.computerTopLines = [];
    playState.moveHistory = [];
    playState.startTime = Date.now();
    playState.endgameShown = false;
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
            el.analysisMoveMeta.appendChild(document.createTextNode(` | Apertura: ${position.opening}`));
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
        el.analysisOpening.textContent = openingPosition ? openingPosition.opening : "Sin apertura detectada";

        fillClassificationTable(analysisState.report.classifications);
        renderAnalysisPosition();

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
        });
    });
}

/* ===== Event Binding ===== */

function applySettingsToBoard() {
    const s = getPlaySettings();
    playState.board.setCoordinatesVisible(s.showCoordinates);

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
        el.setSound, el.setAutoPromo
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

    // Study section navigation
    document.querySelectorAll("[data-study-target]").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-study-target");
            const landing = document.getElementById("study-landing");
            const detail = document.getElementById(target);
            if (landing) landing.style.display = "none";
            if (detail) {
                detail.style.display = "block";
                detail.style.animation = "reveal 0.3s ease";
            }
        });
    });

    document.querySelectorAll("[data-study-back]").forEach(btn => {
        btn.addEventListener("click", () => {
            const landing = document.getElementById("study-landing");
            document.querySelectorAll(".study-detail").forEach(d => d.style.display = "none");
            if (landing) {
                landing.style.display = "";
                landing.style.animation = "reveal 0.3s ease";
            }
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
    return div;
}

/* Make SAN moves in AI bot messages clickable */
function makeMovesClickable(msgEl) {
    if (!msgEl) return;
    const text = msgEl.textContent;
    // Match chess SAN patterns like Nf3, e4, Bxe5+, O-O, O-O-O, etc.
    const sanRegex = /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O|O-O)\b/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = sanRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const san = match[1];
        const span = document.createElement("span");
        span.className = "clickable-move";
        span.textContent = san;
        span.title = `Clic para previsualizar: ${sanToSpanish(san)}`;
        span.addEventListener("click", () => {
            // Try to parse the SAN move and show preview
            try {
                const game = new Chess(playState.game.fen());
                const move = game.move(san);
                if (move) {
                    showMoveConfirmation(move.from, move.to, move.san, move.promotion);
                }
            } catch { /* invalid move in current position */ }
        });
        parts.push(span);
        lastIndex = sanRegex.lastIndex;
    }
    if (parts.length > 0) {
        if (lastIndex < text.length) {
            parts.push(document.createTextNode(text.slice(lastIndex)));
        }
        msgEl.textContent = "";
        parts.forEach(p => msgEl.appendChild(p));
    }
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

async function generateAiResponse(question, thinkingMsg) {
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

    const systemPrompt = `Eres un asistente de ajedrez conciso y directo para la webapp Ajedrez Lab.

REGLAS:
1. Se BREVE y DIRECTO. Maximo 3-4 oraciones.
2. Cuando sugieras un movimiento, siempre menciona el nombre de la pieza en espanol (Peon, Caballo, Alfil, Torre, Dama, Rey) seguido de la notacion.
3. Ejemplo: "Mueve el Caballo a f3 (Nf3)" o "Juega Peon a e4 (e4)".
4. Si te piden ayuda, da la mejor jugada con el nombre de la pieza y una razon corta.
5. Responde en espanol.
6. Usa simbolos visuales de forma moderada para claridad: "\u2022", "\u2192", "\u2713", "\u26A0".

Contexto de la partida:
- Fase: ${phase} | Turno: ${turn} | Jugada #${moveNum}
- Ultimas jugadas: ${history.slice(-8).join(" ")}
- Material: ${materialDesc}
- Eval Stockfish: ${evalText}
- Mejor jugada: ${bestMoveDesc} (${bestMoveStr})`;

    try {
        const response = await fetch("/api/ai-chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                systemPrompt,
                question: question.slice(0, 1600)
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.message || `API Error: ${response.status}`);
        }

        const content = typeof payload.content === "string" ? payload.content.trim() : "";
        if (!content) {
            throw new Error("Respuesta vacia del asistente IA.");
        }

        thinkingMsg.textContent = content;
        if (aiChatMessages) aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    } catch (err) {
        thinkingMsg.textContent = "Lo siento, fallo la conexion con mi motor principal de IA.";
        console.error("AI chat error:", err);
    }
}

async function handleAiChat() {
    if (!aiChatInput || !aiChatMessages) return;
    const question = aiChatInput.value.trim();
    if (!question) return;

    addAiMessage(question, "ai-user");
    aiChatInput.value = "";

    const thinkingMsg = addAiMessage("Pensando...", "ai-bot ai-thinking");

    try {
        await generateAiResponse(question, thinkingMsg);
        thinkingMsg.classList.remove("ai-thinking");
        // Make chess moves in the response clickable
        makeMovesClickable(thinkingMsg);
    } catch {
        thinkingMsg.textContent = "Lo siento, no pude procesar tu pregunta. Int\u00e9ntalo de nuevo.";
        thinkingMsg.classList.remove("ai-thinking");
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

function init() {
    bindTabs();
    bindEvents();
    bindAiChat();
    renderStudyDiagrams();
    setTodayLabel();

    el.coachDepthValue.textContent = el.coachDepth.value;
    el.analysisDepthValue.textContent = el.analysisDepth.value;

    renderPlayBoard();
    resetAnalysisSummary();

    // Initialize play eval bar
    updatePlayEvalBar({ type: "cp", value: 0 });
}

init();

