import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["../../tests/unit/{finance,india,planning}.test.ts"] } });
