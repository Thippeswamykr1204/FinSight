import { createApp } from "./app";
import { loadConfig } from "./config";
import { connectDatabase } from "./db";
import { connectRedis } from "./redis";

async function main() {
  const config = loadConfig();
  await connectDatabase();
  await connectRedis();
  const app = createApp();
  app.listen(config.API_PORT, config.API_HOST, () => {
    console.info(
      JSON.stringify({
        event: "api_started",
        host: config.API_HOST,
        port: config.API_PORT,
      }),
    );
  });
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
