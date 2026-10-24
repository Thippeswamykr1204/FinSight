import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    coverage: { provider: "v8", reporter: ["text", "html"] },
  },
});
