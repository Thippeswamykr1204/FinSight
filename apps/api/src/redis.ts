import { createHash } from "node:crypto";
import Redis from "ioredis";
import { loadConfig } from "./config";
let instance: Redis | undefined;
export function redis() {
  return (instance ??= new Redis(loadConfig().REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  }));
}
export const rateKey = (identifier: string) =>
  `finsight:rate:${createHash("sha256").update(identifier).digest("hex")}`;
export async function consumeLimit(
  identifier: string,
  rule: { window: number; max: number },
) {
  const result = (await redis().eval(
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}",
    1,
    rateKey(identifier),
    rule.window,
  )) as [number, number];
  return {
    allowed: result[0] <= rule.max,
    retryAfter: result[0] > rule.max ? Math.max(1, result[1]) : null,
  };
}
export async function connectRedis() {
  if (redis().status === "wait") await redis().connect();
  await redis().ping();
}

export async function redisReady() {
  try {
    await redis().ping();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectRedis() {
  if (!instance) return;
  const connection = instance;
  instance = undefined;
  if (["wait", "end"].includes(connection.status)) connection.disconnect();
  else await connection.quit().catch(() => connection.disconnect());
}
