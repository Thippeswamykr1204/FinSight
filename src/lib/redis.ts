import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

let redisUnavailable = false;

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 200,
    retryStrategy: () => null,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

redis.on("error", () => {
  redisUnavailable = true;
});

export const CACHE_TTL = {
  DASHBOARD: 60, // 1 minute
  TRANSACTIONS: 30, // 30 seconds
  BUDGETS: 120, // 2 minutes
} as const;

export async function getCache<T>(key: string): Promise<T | null> {
  if (redisUnavailable) return null;
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    redisUnavailable = true;
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttl: number,
): Promise<void> {
  if (redisUnavailable) return;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    redisUnavailable = true;
    // Fail silently — cache is non-critical
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (redisUnavailable) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    redisUnavailable = true;
    // Fail silently
  }
}
