
const Chess = window.Chess;

if (!Chess) {
    throw new Error("Chess library failed to load.");
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
    book: "Teoría",
    forced: "Forzada"
};

const CLASSIFICATION_SYMBOL = {
    brilliant: "!!",
    great: "!",
    best: "★",
    excellent: "●",
    good: "",
    inaccuracy: "?!",
    mistake: "?",
    blunder: "??",
    book: "≡",
    forced: "⊕"
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
    playNewGameBtn: document.querySelector("#play-new-game-btn"),

    botPreset: document.querySelector("#bot-preset"),
    botCustomElo: document.querySelector("#bot-custom-elo"),
    playerColor: document.querySelector("#player-color"),
    coachDepth: document.querySelector("#coach-depth"),
    coachDepthValue: document.querySelector("#coach-depth-value"),
    coachMessage: document.querySelector("#coach-message"),

    assistLegal: document.querySelector("#assist-legal"),
    assistLastMove: document.querySelector("#assist-lastmove"),
    assistCoachAuto: document.querySelector("#assist-coach-auto"),
    assistCoordinates: document.querySelector("#assist-coordinates"),
    assistSound: document.querySelector("#assist-sound"),
    assistAutoPromotion: document.querySelector("#assist-autopromo"),

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
        this.orientation = options.orientation || "white";
        this.interactive = Boolean(options.interactive);
        this.showCoordinates = options.showCoordinates !== false;
        this.currentFen = "8/8/8/8/8/8/8/8 w - - 0 1";
        this.squareMap = new Map();
        this.onSquareClick = null;

        if (!this.root) {
            throw new Error("Board root not found.");
        }

        this.root.addEventListener("click", (event) => {
            if (!this.interactive || !this.onSquareClick) {
                return;
            }

            const target = event.target.closest(".square");
            if (!target) {
                return;
            }

            const square = target.dataset.square;
            if (square) {
                this.onSquareClick(square);
            }
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
            squareEl.innerHTML = "";
            squareEl.classList.remove("occupied");

            const piece = map.get(square);
            if (!piece) {
                return;
            }

            squareEl.classList.add("occupied");

            const img = document.createElement("img");
            img.src = PIECE_IMAGE[piece];
            img.alt = piece;
            img.draggable = false;
            squareEl.appendChild(img);
        });
    }

    clearHighlights() {
        this.squareMap.forEach((squareEl) => {
            squareEl.classList.remove("selected", "legal", "legal-capture", "last-from", "last-to", "hint-from", "hint-to");
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
    audioElement.play().catch(() => {});
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

    const game = new Chess(fen);
    const move = game.move(parsed);
    return move ? move.san : uciMove;
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
    if (!el.evalBar || !el.evalFill) {
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

    el.evalFill.style.height = `${whitePercent}%`;

    if (el.evalLabelWhite && el.evalLabelBlack) {
        const evalText = formatEval(evaluation);
        if (!evaluation || evaluation.value >= 0) {
            el.evalLabelWhite.textContent = evalText;
            el.evalLabelBlack.textContent = "";
        } else {
            el.evalLabelBlack.textContent = evalText;
            el.evalLabelWhite.textContent = "";
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
    sessionId: 0
};

function getPlaySettings() {
    return {
        showLegal: el.assistLegal.checked,
        showLastMove: el.assistLastMove.checked,
        autoCoach: el.assistCoachAuto.checked,
        showCoordinates: el.assistCoordinates.checked,
        sound: el.assistSound.checked,
        autoPromotion: el.assistAutoPromotion.checked
    };
}

function setCoachMessage(message) {
    el.coachMessage.textContent = message;
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

function formatGameOver(game) {
    if (game.isCheckmate()) {
        const winner = game.turn() === "w" ? "Negras" : "Blancas";
        return `Jaque mate — ganan ${winner}.`;
    }

    if (game.isStalemate()) {
        return "Tablas por ahogado.";
    }

    if (game.isThreefoldRepetition()) {
        return "Tablas por repetición.";
    }

    if (game.isInsufficientMaterial()) {
        return "Tablas por material insuficiente.";
    }

    if (game.isDraw()) {
        return "Tablas.";
    }

    return "Partida finalizada.";
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

    if (playState.selectedSquare) {
        playState.board.highlightSquares([playState.selectedSquare], "selected");

        if (settings.showLegal) {
            playState.board.highlightLegalMoves(playState.legalTargets, playState.game.fen());
        }
    }

    renderPlayMoves();
    renderPlayStatus();
}

function clearPlaySelection() {
    playState.selectedSquare = null;
    playState.legalTargets = [];
}

function currentBotElo() {
    const custom = parseInt(el.botCustomElo.value || "", 10);
    if (Number.isFinite(custom)) {
        return clamp(custom, 400, 2800);
    }

    return clamp(parseInt(el.botPreset.value, 10), 400, 2800);
}

async function maybeAutoCoach() {
    if (!getPlaySettings().autoCoach) {
        return;
    }

    if (playState.game.isGameOver()) {
        return;
    }

    const turn = sideFromTurn(playState.game.turn());
    if (turn !== playState.playerColor) {
        return;
    }

    await requestCoachHint(true);
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

        const result = await evaluateWithStockfish({
            fen: playState.game.fen(),
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

        playState.lastMove = move;
        playState.hintMove = null;
        clearPlaySelection();
        playMoveSound(move);

        renderPlayBoard();

        await maybeAutoCoach();
    } catch {
        setCoachMessage("No se pudo obtener jugada del bot. Intenta nueva partida.");
    } finally {
        if (localSession === playState.sessionId) {
            playState.thinking = false;
            renderPlayStatus();
        }
    }
}

async function requestCoachHint(isAuto = false) {
    if (playState.thinking || playState.coaching) {
        return;
    }

    if (playState.game.isGameOver()) {
        setCoachMessage("La partida terminó. Inicia una nueva para seguir entrenando.");
        return;
    }

    const turn = sideFromTurn(playState.game.turn());
    if (turn !== playState.playerColor) {
        if (!isAuto) {
            setCoachMessage("La pista aparece cuando es tu turno.");
        }
        return;
    }

    playState.coaching = true;
    const localSession = playState.sessionId;
    const fen = playState.game.fen();

    if (!isAuto) {
        setCoachMessage("Calculando pista...");
    }

    try {
        const depth = clamp(parseInt(el.coachDepth.value, 10), 8, 20);

        const result = await evaluateWithStockfish({
            fen,
            depth,
            multipv: 2,
            movetime: 1200
        });

        if (localSession !== playState.sessionId) {
            return;
        }

        const bestParsed = parseUciMove(result.bestMove);
        playState.hintMove = bestParsed ? { from: bestParsed.from, to: bestParsed.to } : null;

        const bestLine = result.lines[0];
        const secondLine = result.lines[1];

        const bestSan = uciToSanFromFen(fen, result.bestMove);
        const evalText = bestLine ? formatEval(bestLine.evaluation) : "--";

        let message = `Mejor jugada: ${bestSan} (eval ${evalText}).`;

        if (secondLine) {
            const alt = uciToSanFromFen(fen, secondLine.moveUCI);
            message += ` Alternativa: ${alt}.`;
        }

        setCoachMessage(message);
        renderPlayBoard();
    } catch {
        setCoachMessage("No se pudo calcular la pista del entrenador.");
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

    playState.lastMove = move;
    playState.hintMove = null;
    clearPlaySelection();
    playMoveSound(move);
    renderPlayBoard();

    if (playState.game.isGameOver()) {
        renderPlayStatus();
        return;
    }

    await playBotMove();
}

function startNewGame() {
    playState.sessionId += 1;
    playState.game = new Chess();

    const chosenColor = el.playerColor.value === "random"
        ? (Math.random() < 0.5 ? "white" : "black")
        : el.playerColor.value;

    playState.playerColor = chosenColor;
    playState.botColor = chosenColor === "white" ? "black" : "white";
    playState.botElo = currentBotElo();
    playState.lastMove = null;
    playState.hintMove = null;
    playState.thinking = false;
    clearPlaySelection();

    playState.board.setOrientation(playState.playerColor);
    renderPlayBoard();

    setCoachMessage(`Partida nueva. Bot configurado en ${playState.botElo} ELO.`);

    playBotMove();
}

function undoPlayMove() {
    if (playState.thinking) {
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
    renderPlayBoard();
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
    el.analysisMoveMeta.textContent = "No hay análisis cargado.";
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
        item.textContent = "Sin líneas disponibles en esta posición.";
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
        el.analysisMoveMeta.textContent = "Posición inicial";
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
            throw new Error("No se detectaron posiciones válidas en el PGN.");
        }

        const depth = clamp(parseInt(el.analysisDepth.value, 10), 8, 20);

        for (let i = 0; i < positions.length; i += 1) {
            if (localRunId !== analysisState.runId) {
                return;
            }

            const progress = Math.round((i / positions.length) * 100);
            el.analysisProgress.value = progress;
            setAnalysisStatus(`Evaluando posición ${i + 1} de ${positions.length}...`);

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

        setAnalysisStatus("Análisis completado.");
    } catch (error) {
        setAnalysisStatus(error instanceof Error ? error.message : "Error inesperado en el análisis.");
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

function bindEvents() {
    playState.board.onSquareClick = onPlaySquareClick;

    el.playStartBtn.addEventListener("click", startNewGame);
    el.playNewGameBtn.addEventListener("click", startNewGame);
    el.playHintBtn.addEventListener("click", () => requestCoachHint(false));
    el.playUndoBtn.addEventListener("click", undoPlayMove);

    el.playFlipBtn.addEventListener("click", () => {
        playState.board.setOrientation(playState.board.getOrientation() === "white" ? "black" : "white");
        renderPlayBoard();
    });

    [
        el.assistLegal,
        el.assistLastMove,
        el.assistCoachAuto,
        el.assistCoordinates,
        el.assistSound,
        el.assistAutoPromotion
    ].forEach((input) => {
        input.addEventListener("change", () => {
            renderPlayBoard();
        });
    });

    el.coachDepth.addEventListener("input", () => {
        el.coachDepthValue.textContent = el.coachDepth.value;
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
}

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
    renderStudyDiagrams();
    setTodayLabel();

    el.coachDepthValue.textContent = el.coachDepth.value;
    el.analysisDepthValue.textContent = el.analysisDepth.value;

    renderPlayBoard();
    resetAnalysisSummary();
}

init();
