import { createApp } from "./app";
import { loadConfig } from "./config";
import { connectDatabase, disconnectDatabase } from "./db";
import { getDb } from "./mongo";
import { connectRedis, disconnectRedis, redis } from "./redis";
import { verifyStores } from "./store-checks";
import { startMonitoring, captureFailure, flushMonitoring } from "./monitoring";

async function main() {
  const config = loadConfig();
  startMonitoring();
  await connectDatabase();
  await connectRedis();
  await verifyStores({
    database: getDb(),
    redis: redis(),
    production: config.NODE_ENV === "production",
  });
  const app = createApp();
  const server = app.listen(config.API_PORT, config.API_HOST, () => {
    console.info(
      JSON.stringify({
        event: "api_started",
        host: config.API_HOST,
        port: config.API_PORT,
      }),
    );
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, 30_000).unref();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeIdleConnections();
    });
    await disconnectRedis();
    await disconnectDatabase();
    await flushMonitoring();
    clearTimeout(deadline);
    console.info(JSON.stringify({ event: "api_stopped" }));
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
}

void main().catch(async (error: Error) => {
  console.error(error.message);
  captureFailure(error);
  await disconnectRedis().catch(() => undefined);
  await disconnectDatabase().catch(() => undefined);
  await flushMonitoring();
  process.exitCode = 1;
});
