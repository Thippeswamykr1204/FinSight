import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3100";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  reporter: "list",
  webServer:
    process.env.E2E_BASE_URL && process.env.E2E_REUSE_SERVER === "1"
      ? undefined
      : {
          command: process.env.E2E_PRODUCTION
            ? `npm run start -- --port ${port}`
            : `npm run dev -- --port ${port}`,
          url: `${baseURL}/api/health`,
          reuseExistingServer: false,
          timeout: 120000,
        },
});
