import { expect, test } from "@playwright/test";

test("visual smoke: capturas de secciones principales", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    const sections = [
        { tab: "[data-tab-target='play-section']", name: "play" },
        { tab: "[data-tab-target='analysis-section']", name: "analysis" },
        { tab: "[data-tab-target='study-section']", name: "study" },
        { tab: "[data-tab-target='profile-section']", name: "profile" }
    ];

    for (const section of sections) {
        await page.click(section.tab);
        await page.waitForTimeout(200);
        const buffer = await page.screenshot({ fullPage: true });
        expect(buffer.length).toBeGreaterThan(12_000);
        await test.info().attach(`visual-${section.name}.png`, {
            body: buffer,
            contentType: "image/png"
        });
    }
});
