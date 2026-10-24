import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  plugins: [react()],
  server: { host: "0.0.0.0", port: 5173 },
  build: { outDir: "dist", sourcemap: false, target: "es2022" },
});
