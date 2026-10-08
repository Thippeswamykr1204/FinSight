import { connectMongo, disconnectMongo, mongoReady } from "./mongo";
import { startEmailWorker } from "./email";
import { loadConfig } from "./config";
import { runRecurrences } from "./services";
import { connectRedis, disconnectRedis, redis } from "./redis";
import { reconcileBilling } from "./billing";
import { hostname } from "node:os";
import { startMonitoring, captureFailure, flushMonitoring } from "./monitoring";

async function main() {
  loadConfig();
  startMonitoring();
  await connectMongo();
  await connectRedis();
  const worker = startEmailWorker();
  const heartbeatKey = `finsight:worker:${hostname()}:heartbeat`;
  const heartbeat = async () => {
    if (mongoReady() && worker.running())
      await redis().set(heartbeatKey, String(Date.now()), "EX", 45);
  };
  await heartbeat();
  const heartbeatTimer = setInterval(
    () => void heartbeat().catch(captureFailure),
    10_000,
  );
  let active = false;
  const schedule = async () => {
    if (active) return;
    active = true;
    try {
      for (const [name, run] of [
        ["recurrence", runRecurrences],
        ["billing", reconcileBilling],
      ] as const) {
        try {
          await run();
        } catch (error) {
          captureFailure(error);
          console.error(
            JSON.stringify({
              event: `${name}_failed`,
              message:
                error instanceof Error
                  ? error.message
                  : "Scheduled operation failed",
            }),
          );
        }
      }
    } finally {
      active = false;
    }
  };
  const timer = setInterval(() => void schedule(), 15_000);
  void schedule();
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 30_000).unref();
    clearInterval(timer);
    clearInterval(heartbeatTimer);
    while (active) await new Promise((resolve) => setTimeout(resolve, 100));
    await worker.close();
    await redis().del(heartbeatKey);
    await disconnectRedis();
    await disconnectMongo();
    await flushMonitoring();
    clearTimeout(deadline);
    console.info(JSON.stringify({ event: "worker_stopped" }));
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(
      signal,
      () =>
        void stop().catch((error) => {
          captureFailure(error);
          process.exitCode = 1;
        }),
    );
  console.info(
    JSON.stringify({ event: "worker_started", queues: ["finsight-email"] }),
  );
}
void main().catch(async (error: Error) => {
  console.error(error.message);
  captureFailure(error);
  await disconnectRedis().catch(() => undefined);
  await disconnectMongo().catch(() => undefined);
  await flushMonitoring();
  process.exitCode = 1;
});
