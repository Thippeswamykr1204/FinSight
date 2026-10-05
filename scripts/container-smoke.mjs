import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { randomBytes, createCipheriv, hkdfSync } from "node:crypto";
import assert from "node:assert/strict";

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.status !== 0)
    throw new Error(
      `${command} failed (${result.status}). ${capture ? result.stderr : "See output above."}`,
    );
  return (
    result.stdout +
    (command === "docker" && args[0] === "logs" ? result.stderr : "")
  ).trim();
}
async function until(check, label) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out: ${label}`);
}
const image = process.env.FINSIGHT_IMAGE || "finsight:local";
const demo = `finsight-demo-smoke-${process.pid}`;
const invalid = `finsight-invalid-smoke-${process.pid}`;
const envPath = `.local/container-smoke-${process.pid}.env`;
const args = [
  "compose",
  "--env-file",
  envPath,
  "-p",
  "finsight-release-smoke",
  "-f",
  "compose.yaml",
  "-f",
  "compose.smoke.yaml",
  "--profile",
  "hosted",
];
try {
  run("docker", [
    "run",
    "-d",
    "--name",
    demo,
    "-p",
    "127.0.0.1:3301:3000",
    image,
  ]);
  await until(
    () =>
      run(
        "docker",
        ["inspect", "--format", "{{.State.Health.Status}}", demo],
        true,
      ) === "healthy",
    "demo container health",
  );
  assert.equal(run("docker", ["exec", demo, "id", "-u"], true), "1000");
  assert.equal(
    (await (await fetch("http://localhost:3301/api/health")).json()).mode,
    "browser-demo",
  );
  console.info(
    "Verified: non-root demo container, Docker healthcheck and HTTP liveness.",
  );
  run("docker", [
    "run",
    "-d",
    "--name",
    invalid,
    "-e",
    "HOSTED_ENABLED=true",
    image,
  ]);
  await until(
    () =>
      run(
        "docker",
        ["inspect", "--format", "{{.State.Status}}", invalid],
        true,
      ) === "exited",
    "fail-fast configuration",
  );
  assert.notEqual(
    run(
      "docker",
      ["inspect", "--format", "{{.State.ExitCode}}", invalid],
      true,
    ),
    "0",
  );
  assert.match(
    run("docker", ["logs", invalid], true),
    /HOSTED_DATABASE_URL|hosted configuration/,
  );
  console.info(
    "Verified: missing hosted production configuration fails at boot.",
  );
  run(process.execPath, [
    "scripts/init-env.mjs",
    "--mode",
    "hosted",
    "--output",
    envPath,
  ]);
  const envText = readFileSync(envPath, "utf8");
  const secret = envText.match(/^BETTER_AUTH_SECRET="([^"]+)"/m)[1];
  run("docker", [
    "build",
    "--target",
    "migrator",
    "-t",
    `${image}-migrator`,
    ".",
  ]);
  run("docker", [...args, "up", "-d", "--wait"]);
  const ready = await (await fetch("http://localhost:3302/api/ready")).json();
  assert.equal(ready.mode, "hosted");
  assert.equal(ready.status, "ready");
  // No identity request is made after insertion: only the standalone worker can deliver this job.
  const key = Buffer.from(
    hkdfSync("sha256", secret, "finsight-email-v1", "outbox-encryption", 32),
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update("Delivery from release worker.", "utf8"),
    cipher.final(),
  ]);
  const envelope = [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
  run("docker", [
    ...args,
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "finsight",
    "-d",
    "finsight",
    "-c",
    `INSERT INTO v2_email_outbox (id, "to", subject, text, "availableAt", "createdAt") VALUES ('worker-smoke', 'worker@example.test', 'Worker smoke', '${envelope}', NOW(), NOW())`,
  ]);
  await until(
    async () =>
      (
        await (
          await fetch(
            "http://localhost:18026/api/v1/search?query=to%3Aworker%40example.test",
          )
        ).json()
      ).messages?.some((mail) => mail.Subject === "Worker smoke"),
    "release worker SMTP delivery",
  );
  const bodyErased = run(
    "docker",
    [
      ...args,
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "finsight",
      "-d",
      "finsight",
      "-tAc",
      `SELECT text = '' AND "sentAt" IS NOT NULL FROM v2_email_outbox WHERE id = 'worker-smoke'`,
    ],
    true,
  );
  assert.equal(bodyErased, "t");
  const base = "http://localhost:3302";
  async function post(path, data, cookie = "") {
    const response = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: base,
        cookie,
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(data),
    });
    assert.ok(response.ok, `${path}: HTTP ${response.status}`);
    return response;
  }
  const address = "container@example.test",
    password = `Smoke-${randomBytes(24).toString("hex")}`;
  await post("/api/identity/sign-up/email", {
    name: "Container smoke",
    email: address,
    password,
    noticeAccepted: true,
    callbackURL: "/sign-in",
  });
  const verificationMail = await until(
    async () =>
      (
        await (
          await fetch(
            "http://localhost:18026/api/v1/search?query=to%3Acontainer%40example.test",
          )
        ).json()
      ).messages?.find((mail) => mail.Subject.includes("Verify")),
    "container verification email",
  );
  const mail = await (
    await fetch(`http://localhost:18026/api/v1/message/${verificationMail.ID}`)
  ).json();
  assert.ok(
    (
      await fetch(
        mail.Text.match(
          /http:\/\/localhost:3302\/api\/identity\/verify-email[^\s]+/,
        )[0],
      )
    ).ok,
  );
  const login = await post("/api/identity/sign-in/email", {
    email: address,
    password,
  });
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const workspace = (
    await (
      await post("/api/v1/workspaces", { name: "Container ledger" }, cookie)
    ).json()
  ).data;
  assert.equal(workspace.currency, "INR");
  const account = (
    await (
      await post(
        `/api/v1/workspaces/${workspace.id}/commands`,
        {
          action: "account.create",
          data: { name: "Savings", type: "Savings", openingBalance: 100000 },
        },
        cookie,
      )
    ).json()
  ).data;
  await post(
    `/api/v1/workspaces/${workspace.id}/commands`,
    {
      action: "transaction.create",
      data: {
        accountId: account.id,
        merchant: "Swiggy",
        amount: 1250,
        date: "2026-10-05",
        type: "expense",
        category: "Dining",
        note: "",
      },
    },
    cookie,
  );
  const overview = (
    await (
      await fetch(`${base}/api/v1/workspaces/${workspace.id}/overview`, {
        headers: { cookie },
      })
    ).json()
  ).data;
  assert.equal(overview.balance, 98750);
  console.info(
    "Verified: container email verification, authenticated INR workspace and reconciled ledger mutation.",
  );
  const dump = spawnSync(
    "docker",
    [
      ...args,
      "exec",
      "-T",
      "postgres",
      "pg_dump",
      "-U",
      "finsight",
      "-Fc",
      "finsight",
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  assert.equal(dump.status, 0, dump.stderr.toString());
  run("docker", [
    ...args,
    "exec",
    "-T",
    "postgres",
    "createdb",
    "-U",
    "finsight",
    "restore_smoke",
  ]);
  const restore = spawnSync(
    "docker",
    [
      ...args,
      "exec",
      "-T",
      "postgres",
      "pg_restore",
      "-U",
      "finsight",
      "--no-owner",
      "-d",
      "restore_smoke",
    ],
    { input: dump.stdout },
  );
  assert.equal(restore.status, 0, restore.stderr.toString());
  assert.equal(
    run(
      "docker",
      [
        ...args,
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "finsight",
        "-d",
        "restore_smoke",
        "-tAc",
        'SELECT count(*) FROM _prisma_migrations WHERE "finished_at" IS NOT NULL',
      ],
      true,
    ),
    "4",
  );
  assert.equal(
    run(
      "docker",
      [
        ...args,
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "finsight",
        "-d",
        "restore_smoke",
        "-tAc",
        "SELECT SUM(amount) FROM v2_ledger_entries",
      ],
      true,
    ),
    "1250",
  );
  console.info(
    "Verified: logical Postgres dump and restore into a separate disposable database.",
  );
  console.info(
    "Verified: fresh hosted migrations, database readiness, worker heartbeat, real SMTP delivery and outbox body erasure.",
  );
} finally {
  spawnSync("docker", ["rm", "-f", demo, invalid], { stdio: "ignore" });
  if (readFileExists(envPath)) {
    spawnSync("docker", [...args, "down", "--volumes"], { stdio: "inherit" });
    unlinkSync(envPath);
  }
}
function readFileExists(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}
