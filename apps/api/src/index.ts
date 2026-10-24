import { createServer } from "node:http";
import { createApp } from "./app.js";
import { closeDatabase, connectDatabase } from "./db.js";
import { closeRateLimiter } from "./limits.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
await connectDatabase();
const server = createServer(createApp());
server.listen(config.API_PORT, config.API_HOST, () => {
  console.log(
    JSON.stringify({
      level: "info",
      service: "finsight-api",
      port: config.API_PORT,
      environment: config.NODE_ENV,
    }),
  );
});

async function shutdown(signal: string) {
  console.log(
    JSON.stringify({
      level: "info",
      signal,
      message: "Graceful shutdown started",
    }),
  );
  server.close(async () => {
    await closeRateLimiter();
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
