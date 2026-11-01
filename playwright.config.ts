import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 4 : 8,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next dev -p 3102",
    url: "http://127.0.0.1:3102/api/health",
    env: {
      NOTEPAD_BFF_SECRET: "test-bff-secret",
      SHARE_TOKEN_SECRET: "test-auth-secret",
      TURSO_DATABASE_URL: "file:test-results/notepad-e2e.db",
      TURSO_AUTH_TOKEN: "",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
