import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/finance/*.ts"],
      exclude: [],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
