import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure" },
  webServer: [
    { command: "npm run dev:api", port: 4000, reuseExistingServer: true },
    { command: "npm run dev:web", port: 5173, reuseExistingServer: true },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
