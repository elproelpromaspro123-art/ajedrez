(function initPlayModule(global) {
    function applyBoardAndPieceTheme(boardTheme, pieceTheme) {
        if (global.ReportModules && global.ReportModules.ui) {
            global.ReportModules.ui.applyBoardTheme(boardTheme);
            global.ReportModules.ui.applyPieceTheme(pieceTheme);
            return;
        }

        document.body.dataset.boardTheme = boardTheme || "classic";
        document.body.dataset.pieceTheme = pieceTheme || "default";
    }

    global.ReportModules = global.ReportModules || {};
    global.ReportModules.play = {
        applyBoardAndPieceTheme
    };
})(window);
