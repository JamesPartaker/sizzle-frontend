import { defineConfig, devices } from "@playwright/test";
const liveApi = process.env.VITE_AUTH_SOURCE === "api" || process.env.VITE_ASSET_SOURCE === "api";
const port = process.env.VITE_ASSET_SOURCE === "api" ? 4180 : liveApi ? 4179 : 4173;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: `pnpm --filter @sizzle/restaurant dev --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI && !liveApi,
  },
});
