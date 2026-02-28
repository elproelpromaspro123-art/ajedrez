import { expect, Page, test } from "@playwright/test";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function installWorkerMock(page: Page) {
    await page.addInitScript(() => {
        class MockWorker {
            onmessage: ((event: { data: string }) => void) | null = null;
            onerror: ((event: unknown) => void) | null = null;

            constructor(_url: string) {}

            postMessage(message: string) {
                if (!this.onmessage) return;
                const send = (data: string, delay = 0) => {
                    setTimeout(() => {
                        if (this.onmessage) this.onmessage({ data });
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
    await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                authenticated: true,
                user: { username: "tester_e2e" }
            })
        });
    });

    await page.route("**/api/profile-store", async (route) => {
        if (route.request().method() === "GET") {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    data: {
                        progress: { games: [], activities: [] },
                        lessons: { progressByLesson: {} },
                        profile: {}
                    }
                })
            });
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true })
        });
    });

    await page.route("**/api/profile-store/sync", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true })
        });
    });

    await page.route("**/api/opening-explorer**", async (route) => {
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
                content: "Buena pregunta. Te recomiendo practicar más.",
                actions: []
            })
        });
    });

    await page.route("**/api/parse", async (route) => {
        const body = JSON.parse(route.request().postData() || "{}");
        const pgn = body.pgn || "";
        const positions = [
            { fen: START_FEN, move: null },
            {
                fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                move: { san: "e4", uci: "e2e4" }
            },
            {
                fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
                move: { san: "e5", uci: "e7e5" }
            }
        ];
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ positions })
        });
    });

    await page.route("**/api/report", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                results: {
                    accuracies: { white: 85.2, black: 78.4 },
                    positions: [
                        {
                            fen: START_FEN,
                            classification: null,
                            opening: null,
                            topLines: [
                                {
                                    id: 1,
                                    depth: 12,
                                    moveUCI: "e2e4",
                                    evaluation: { type: "cp", value: 20 }
                                }
                            ]
                        },
                        {
                            fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                            move: { san: "e4", uci: "e2e4" },
                            classification: "best",
                            opening: "Apertura de Peon de Rey",
                            topLines: [
                                {
                                    id: 1,
                                    depth: 12,
                                    moveUCI: "e7e5",
                                    evaluation: { type: "cp", value: 15 }
                                }
                            ]
                        },
                        {
                            fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
                            move: { san: "e5", uci: "e7e5" },
                            classification: "good",
                            opening: null,
                            topLines: [
                                {
                                    id: 1,
                                    depth: 12,
                                    moveUCI: "g1f3",
                                    evaluation: { type: "cp", value: 20 }
                                }
                            ]
                        }
                    ]
                }
            })
        });
    });
}

async function disableComputerBeforeGame(page: Page) {
    await page.evaluate(() => {
        const toggle = document.querySelector<HTMLInputElement>("#set-computer");
        if (!toggle) return;
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

test.beforeEach(async ({ page }) => {
    await installWorkerMock(page);
    await installApiMocks(page);
});

test("analisis completo: pegar PGN, ejecutar, revisar resultados", async ({
    page
}) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/auth-locked/);

    await page.click('[data-tab-target="analysis-section"]');
    await page.click('[data-analysis-target="analysis-input"]');
    await page.locator("#analysis-pgn:visible").fill(
        "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0"
    );
    await page.click("#analysis-run-btn");
    await expect(page.locator("#analysis-status")).toContainText(
        "Analisis completado",
        { timeout: 15000 }
    );
    await expect(page.locator("#analysis-overall-accuracy")).not.toHaveText(
        "--"
    );
});

test("flujo de estudio: navegar categorias y lecciones", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/auth-locked/);

    await page.click('[data-tab-target="study-section"]');
    await page.click('[data-study-target="study-tactics"]');
    await expect(page.locator("#study-tactics")).toBeVisible();

    await page.locator("[data-study-back]:visible").first().click();
    await expect(page.locator("#study-landing")).toBeVisible();
});

test("auth: muestra campos de login y reacciona a sesion", async ({
    page
}) => {
    // Override the session mock to return unauthenticated
    await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ authenticated: false })
        });
    });

    await page.goto("/");
    await expect(page.locator("#auth-guest-panel")).toBeVisible();
    await expect(page.locator("#auth-username")).toBeVisible();
    await expect(page.locator("#auth-password")).toBeVisible();
});

test("perfil: muestra estadisticas y tabla de historial", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/auth-locked/);

    await page.click('[data-tab-target="profile-section"]');
    await expect(page.locator("#profile-games-total")).toBeVisible();
    await expect(page.locator("#profile-winrate")).toBeVisible();
    await expect(page.locator("#profile-estimated-elo")).toBeVisible();
    await expect(page.locator(".profile-history-table")).toBeVisible();
});

test("AI chat: enviar pregunta y recibir respuesta", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/auth-locked/);
    await disableComputerBeforeGame(page);

    await page.click("#play-start-btn");
    await page.click('[data-sidebar-tab="ai-tab"]');
    await page.fill("#ai-chat-input", "Que apertura me recomiendas?");
    await page.click("#ai-chat-send");
    await expect(
        page.locator("#ai-chat-messages .ai-msg.ai-bot").last()
    ).toContainText("Buena pregunta");
});

test("rate limit 429: muestra mensaje con countdown", async ({ page }) => {
    // Override ai-chat to return 429
    await page.route("**/api/ai-chat", async (route) => {
        await route.fulfill({
            status: 429,
            contentType: "application/json",
            body: JSON.stringify({
                message: "Rate limit excedido.",
                retryAfterMs: 5000
            })
        });
    });

    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/auth-locked/);
    await disableComputerBeforeGame(page);

    await page.click("#play-start-btn");
    await page.click('[data-sidebar-tab="ai-tab"]');
    await page.fill("#ai-chat-input", "Test rate limit");
    await page.click("#ai-chat-send");
    await expect(page.locator("#ai-chat-messages")).toContainText(
        "Límite de solicitudes"
    );
});

test("settings modal: se abre y cierra correctamente", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/auth-locked/);

    await page.click("#play-settings-btn");
    await expect(page.locator("#settings-modal")).toBeVisible();
    await page.click("#settings-close-btn");
});
