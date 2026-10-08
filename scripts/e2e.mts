import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}
async function ready(url: string, process?: ChildProcess) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (process?.exitCode != null)
      throw new Error(`Service exited before readiness: ${url}`);
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {
      /* Service is starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Service did not become ready: ${url}`);
}
const containers: StartedTestContainer[] = [];
const children: ChildProcess[] = [];
async function stop() {
  for (const child of children.reverse()) {
    if (child.exitCode != null) continue;
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    if (child.exitCode == null) child.kill("SIGKILL");
  }
  await Promise.all(containers.map((container) => container.stop()));
}
try {
  const env = { ...process.env };
  if (!(env.E2E_BASE_URL && env.E2E_REUSE_SERVER === "1")) {
    const mongo = await new GenericContainer("mongo:8")
      .withCommand(["mongod", "--replSet", "rs0", "--bind_ip_all"])
      .withExposedPorts(27017)
      .start();
    containers.push(mongo);
    const initiated = await mongo.exec([
      "mongosh",
      "--quiet",
      "--eval",
      "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]});for(let i=0;i<200;i++){if(db.hello().isWritablePrimary)break;sleep(100);}if(!db.hello().isWritablePrimary)quit(1);",
    ]);
    if (initiated.exitCode)
      throw new Error("Replica-set initialization failed.");
    const redis = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .start();
    containers.push(redis);
    const mail = await new GenericContainer("axllent/mailpit:v1.27")
      .withExposedPorts(1025, 8025)
      .start();
    containers.push(mail);
    const apiPort = await freePort();
    const webPort = env.E2E_PORT || String(await freePort());
    const origin = `http://127.0.0.1:${webPort}`;
    Object.assign(env, {
      NODE_ENV: "production",
      TRUSTED_PROXY: "loopback",
      HOSTED_LOCAL: "true",
      E2E_PORT: webPort,
      E2E_PRODUCTION: "1",
      E2E_BASE_URL: origin,
      API_PORT: String(apiPort),
      API_ORIGIN: `http://127.0.0.1:${apiPort}`,
      API_URL: `http://127.0.0.1:${apiPort}`,
      API_HOST: "127.0.0.1",
      WEB_ORIGIN: origin,
      NEXT_PUBLIC_APP_URL: origin,
      MONGODB_URI: `mongodb://${mongo.getHost()}:${mongo.getMappedPort(27017)}/e2e?replicaSet=rs0&directConnection=true`,
      REDIS_URL: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
      BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
      FIELD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      FIELD_ENCRYPTION_PREVIOUS_KEYS: "[]",
      SMTP_HOST: mail.getHost(),
      SMTP_PORT: String(mail.getMappedPort(1025)),
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      EMAIL_FROM: "FinSight E2E <test@example.test>",
      E2E_MAILPIT_URL: `http://${mail.getHost()}:${mail.getMappedPort(8025)}`,
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      RAZORPAY_WEBHOOK_SECRET: "",
      RAZORPAY_WEBHOOK_PREVIOUS_SECRET: "",
      RAZORPAY_PRO_PLAN_ID: "",
      RAZORPAY_BUSINESS_PLAN_ID: "",
      BILLING_BUSINESS_NAME: "",
      BILLING_BUSINESS_ADDRESS: "",
      BILLING_GSTIN: "",
      BILLING_STATE_CODE: "",
      BILLING_SAC: "",
    });
    const api = spawn(
      process.execPath,
      ["--import", "tsx", "apps/api/src/index.ts"],
      { env, stdio: "inherit" },
    );
    children.push(api);
    const worker = spawn(
      process.execPath,
      ["--import", "tsx", "apps/api/src/worker.ts"],
      { env, stdio: "inherit" },
    );
    children.push(worker);
    await ready(`${env.API_URL}/ready`, api);
    await ready(`${env.E2E_MAILPIT_URL}/api/v1/messages`, worker);
  } else if (!env.E2E_MAILPIT_URL)
    throw new Error(
      "Reusing a server requires E2E_MAILPIT_URL for actual verification email delivery.",
    );
  const browser = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    { env, stdio: "inherit" },
  );
  children.push(browser);
  const result = await new Promise<number>((resolve) =>
    browser.once("exit", (code) => resolve(code ?? 1)),
  );
  process.exitCode = result;
} finally {
  await stop();
}
