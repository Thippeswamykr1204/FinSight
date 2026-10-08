import { hostname } from "node:os";
import { redis, connectRedis, disconnectRedis } from "./redis";

async function main() {
  await connectRedis();
  const value = await redis().get(`finsight:worker:${hostname()}:heartbeat`);
  const healthy = Boolean(value && Date.now() - Number(value) < 45_000);
  await disconnectRedis();
  process.exitCode = healthy ? 0 : 1;
}
void main().catch(() => {
  process.exitCode = 1;
  redis().disconnect();
});
