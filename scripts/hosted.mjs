import { localHostedEnv, run } from "./local-hosted-env.mjs";
import { spawn } from "node:child_process";

const mode = process.argv[2] || "dev";
if (!["dev", "test", "setup", "serve-test"].includes(mode))
  throw new Error("Use dev, test, setup or serve-test.");
const test = ["test", "serve-test"].includes(mode);
const env = localHostedEnv({ test, port: test ? 3200 : 3000 });
if (mode !== "serve-test") {
  await run(
    "docker",
    [
      "compose",
      "-f",
      "compose.hosted.yaml",
      ...(test ? ["--profile", "test"] : []),
      "up",
      "-d",
      "--wait",
      test ? "postgres-test" : "postgres",
      "mailpit",
    ],
    env,
  );
  await run("npm", ["run", "db:generate"], env);
  await run("npm", ["run", "db:hosted:migrate"], env);
}
if (mode === "test")
  await run(
    "npx",
    [
      "playwright",
      "test",
      "--config",
      "playwright.hosted.config.ts",
      ...process.argv.slice(3),
    ],
    env,
  );
if (mode === "dev" || mode === "serve-test") {
  const worker = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/email-worker.ts"],
    { env, stdio: "inherit" },
  );
  try {
    await run(
      "npm",
      [
        "run",
        process.env.E2E_PRODUCTION === "1" && test ? "start" : "dev",
        "--",
        "--port",
        test ? "3200" : "3000",
      ],
      env,
    );
  } finally {
    worker.kill("SIGTERM");
  }
}
