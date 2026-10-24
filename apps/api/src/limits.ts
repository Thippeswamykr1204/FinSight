import RedisModule from "ioredis";
import { loadConfig } from "./config.js";

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

export interface RateLimiter {
  consume(
    key: string,
    max: number,
    windowSeconds: number,
  ): Promise<LimitResult>;
  clear(key: string): Promise<void>;
  close(): Promise<void>;
}

class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  async consume(key: string, max: number, windowSeconds: number) {
    const now = Date.now();
    const current = this.buckets.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowSeconds * 1000 }
        : current;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    return {
      allowed: bucket.count <= max,
      remaining: Math.max(0, max - bucket.count),
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  async clear(key: string) {
    this.buckets.delete(key);
  }

  async close() {}
}

type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  ttl(key: string): Promise<number>;
  del(key: string): Promise<unknown>;
  quit(): Promise<unknown>;
};

class RedisRateLimiter implements RateLimiter {
  constructor(private readonly client: RedisLike) {}

  async consume(key: string, max: number, windowSeconds: number) {
    const redisKey = `finsight:rate:${key}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) await this.client.expire(redisKey, windowSeconds);
    const ttl = Math.max(1, await this.client.ttl(redisKey));
    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      retryAfter: ttl,
    };
  }

  async clear(key: string) {
    await this.client.del(`finsight:rate:${key}`);
  }

  async close() {
    await this.client.quit();
  }
}

let instance: RateLimiter | undefined;

export function getRateLimiter() {
  if (instance) return instance;
  const url = loadConfig().REDIS_URL;
  const RedisConstructor = RedisModule as unknown as new (
    connection: string,
    options: Record<string, unknown>,
  ) => RedisLike;
  instance = url
    ? new RedisRateLimiter(
        new RedisConstructor(url, {
          lazyConnect: false,
          maxRetriesPerRequest: 1,
        }),
      )
    : new MemoryRateLimiter();
  return instance;
}

export async function closeRateLimiter() {
  await instance?.close();
  instance = undefined;
}
