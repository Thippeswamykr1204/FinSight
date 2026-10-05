import { build } from "esbuild";

await build({
  entryPoints: ["scripts/email-worker.ts"],
  outfile: "dist/email-worker.cjs",
  bundle: true,
  platform: "node",
  target: "node22",
  // Bundle worker dependencies: Next's file tracing covers only the web's import conditions.
  plugins: [
    {
      name: "hosted-prisma-runtime",
      setup(build) {
        build.onResolve({ filter: /^@\/generated\/hosted$/ }, () => ({
          path: "../src/generated/hosted",
          external: true,
        }));
      },
    },
  ],
});
await build({
  entryPoints: ["src/lib/hosted/config.ts"],
  outfile: "dist/config.cjs",
  bundle: true,
  platform: "node",
  target: "node22",
});
