import { connectMongo } from "./mongo";
import { startEmailWorker } from "./email";
import { loadConfig } from "./config";

async function main() {
  loadConfig();
  await connectMongo();
  const worker = startEmailWorker();
  const stop = async () => {
    await worker.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
  console.info(
    JSON.stringify({ event: "worker_started", queues: ["finsight-email"] }),
  );
}
void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
