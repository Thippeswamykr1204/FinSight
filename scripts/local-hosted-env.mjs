import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

export function localHostedEnv({ test = false, port = 3000 } = {}) {
  mkdirSync(".local", { recursive: true });
  const path = test ? ".local/test-auth-secret" : ".local/hosted-auth-secret";
  if (!existsSync(path))
    writeFileSync(path, randomBytes(48).toString("base64url"), {
      mode: 0o600,
      flag: "wx",
    });
  return {
    ...process.env,
    HOSTED_ENABLED: "true",
    HOSTED_LOCAL: "true",
    ENABLE_LEGACY_API: "false",
    HOSTED_DATABASE_URL: test
      ? "postgresql://finsight_test:test_database_only@127.0.0.1:55433/finsight_hosted_test"
      : "postgresql://finsight_local:local_development_only@127.0.0.1:55432/finsight_hosted_local",
    BETTER_AUTH_SECRET: readFileSync(path, "utf8").trim(),
    BETTER_AUTH_URL: `http://localhost:${port}`,
    NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "11025",
    EMAIL_FROM: "FinSight Local <hello@finsight.local>",
    NEXT_TELEMETRY_DISABLED: "1",
    TRUSTED_IP_HEADER: test ? "x-test-forwarded-ip" : "",
  };
}

export function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    const stop = () => child.kill("SIGTERM");
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    child.once("error", reject);
    child.once("exit", (code) => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with ${code}`));
    });
  });
}
