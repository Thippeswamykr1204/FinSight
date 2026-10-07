import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@finsight\/shared\/(.*)$/,
        replacement: fileURLToPath(
          new URL("./packages/shared/src/$1", import.meta.url),
        ),
      },
      {
        find: "@finsight/shared",
        replacement: fileURLToPath(
          new URL("./packages/shared/src/index.ts", import.meta.url),
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/finance/*.ts", "packages/shared/src/finance/*.ts"],
      exclude: ["**/*.d.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
