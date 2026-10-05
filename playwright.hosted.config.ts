import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/hosted",
  outputDir: "test-results/hosted",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3200",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/hosted.mjs serve-test",
    url: "http://localhost:3200/api/health",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
