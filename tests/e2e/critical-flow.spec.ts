import { expect, Page, test } from "@playwright/test";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function installWorkerMock(page: Page) {
    await page.addInitScript(() => {
        class MockWorker {
            onmessage: ((event: { data: string }) => void) | null = null;
            onerror: ((event: unknown) => void) | null = null;

            constructor(_url: string) {}

            postMessage(message: string) {
                if (!this.onmessage) {
                    return;
                }

                const send = (data: string, delay = 0) => {
                    setTimeout(() => {
                        if (this.onmessage) {
                            this.onmessage({ data });
                        }
                    }, delay);
                };

                if (message === "uci") {
                    send("uciok");
                    return;
                }
                if (message === "isready") {
                    send("readyok");
                    return;
                }
                if (message.startsWith("go ")) {
                    send("info depth 12 multipv 1 score cp 20 pv e2e4", 5);
                    send("bestmove e2e4", 8);
                }
            }

            terminate() {}
        }

        Object.defineProperty(window, "Worker", {
            configurable: true,
            writable: true,
            value: MockWorker
        });
    });
}

async function installApiMocks(page: Page) {
    await page.route("**/api/opening-explorer**", async (route) => {
        const url = new URL(route.request().url());
        const fen = url.searchParams.get("fen") || "startpos";
        const isRoot = fen === "startpos" || fen.startsWith(START_FEN);

        if (!isRoot) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    fen,
                    white: 0,
                    draws: 0,
                    black: 0,
                    opening: null,
                    moves: []
                })
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                fen: START_FEN,
                white: 12000,
                draws: 1600,
                black: 9800,
                opening: { eco: "A00", name: "Posicion inicial" },
                moves: [
                    {
                        uci: "e2e4",
                        san: "e4",
                        white: 5200,
                        draws: 600,
                        black: 4000,
                        averageRating: 1820,
                        opening: { eco: "C20", name: "Apertura de Peon de Rey" }
                    },
                    {
                        uci: "d2d4",
                        san: "d4",
                        white: 4100,
                        draws: 700,
                        black: 3600,
                        averageRating: 1810,
                        opening: { eco: "D00", name: "Apertura de Peon de Dama" }
                    }
                ]
            })
        });
    });

    await page.route("**/api/ai-chat", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                content: "Te recomiendo abrir el estudio para repasar el plan.",
                actions: [
                    {
                        type: "open_study",
                        label: "Abrir estudio",
                        argument: ""
                    }
                ]
            })
        });
    });
}

async function disableComputerBeforeGame(page: Page) {
    await page.evaluate(() => {
        const toggle = document.querySelector<HTMLInputElement>("#set-computer");
        if (!toggle) {
            return;
        }
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

test.beforeEach(async ({ page }) => {
    await installWorkerMock(page);
    await installApiMocks(page);
});

test("flujo critico: jugar -> analizar -> estudio -> IA -> guardado", async ({ page }) => {
    await page.goto("/");
    await disableComputerBeforeGame(page);

    await page.click("#play-start-btn");
    await page.click('#play-board .square[data-square="e2"]');
    await page.click('#play-board .square[data-square="e4"]');
    await expect(page.locator("#play-move-list")).toContainText("e4");

    await page.click('[data-tab-target="analysis-section"]');
    await page.fill("#analysis-pgn", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0");
    await page.click("#analysis-run-btn");
    await expect(page.locator("#analysis-status")).toContainText("Analisis completado");

    await page.click('[data-tab-target="study-section"]');
    await page.click('[data-study-target="study-openings"]');
    await expect(page.locator("#eco-tree .eco-row").first()).toBeVisible();
    await page.click("#eco-tree .eco-row");
    await expect(page.locator("#eco-detail-title")).toContainText("Apertura");

    await page.click('[data-tab-target="play-section"]');
    await page.click('[data-sidebar-tab="ai-tab"]');
    await page.fill("#ai-chat-input", "Que debo estudiar ahora?");
    await page.click("#ai-chat-send");

    const actionChip = page.locator(".ai-action-chip", { hasText: "Abrir estudio" }).first();
    await expect(actionChip).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await actionChip.click();
    await expect(page.locator('[data-tab-target="study-section"]')).toHaveClass(/is-active/);
    await expect(page.locator("#ai-action-audit")).toContainText("open_study");

    const progressActivities = await page.evaluate(() => {
        const raw = localStorage.getItem("ajedrez_app_storage");
        if (!raw) return 0;
        const parsed = JSON.parse(raw);
        const activities = parsed?.data?.progress?.activities;
        return Array.isArray(activities) ? activities.length : 0;
    });
    expect(progressActivities).toBeGreaterThan(0);
});

test("recupera sesion: tablero, historial, filtros ECO y chat IA", async ({ page }) => {
    await page.goto("/");
    await disableComputerBeforeGame(page);

    await page.click("#play-start-btn");
    await page.click('#play-board .square[data-square="e2"]');
    await page.click('#play-board .square[data-square="e4"]');
    await expect(page.locator("#play-move-list")).toContainText("e4");

    await page.click('[data-tab-target="study-section"]');
    await page.click('[data-study-target="study-openings"]');
    await page.selectOption("#eco-filter-color", "black");
    await page.fill("#eco-search", "e4");
    await page.fill("#eco-filter-popularity", "20");
    await page.fill("#eco-filter-success", "40");

    await page.click('[data-tab-target="play-section"]');
    await page.click('[data-sidebar-tab="ai-tab"]');
    await page.fill("#ai-chat-input", "Guardame esta sesion");
    await page.click("#ai-chat-send");
    await expect(page.locator("#ai-chat-messages")).toContainText("Guardame esta sesion");

    await page.waitForTimeout(700);
    await page.reload();

    await expect(page.locator("#play-move-list")).toContainText("e4");

    await page.click('[data-tab-target="study-section"]');
    await expect(page.locator("#eco-filter-color")).toHaveValue("black");
    await expect(page.locator("#eco-search")).toHaveValue("e4");
    await expect(page.locator("#eco-filter-popularity")).toHaveValue("20");
    await expect(page.locator("#eco-filter-success")).toHaveValue("40");

    await page.click('[data-tab-target="play-section"]');
    await page.click('[data-sidebar-tab="ai-tab"]');
    await expect(page.locator("#ai-chat-messages")).toContainText("Guardame esta sesion");
});
