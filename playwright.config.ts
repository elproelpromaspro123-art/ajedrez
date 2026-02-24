import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 90000,
    expect: {
        timeout: 10000
    },
    use: {
        baseURL: "http://127.0.0.1:3000",
        headless: true,
        viewport: { width: 1400, height: 900 },
        trace: "retain-on-failure"
    },
    webServer: {
        command: "npm run build && node dist/index.js",
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    }
});
