export type StoreCheckResult = {
  store: "mongodb" | "redis";
  status: "ok" | "warn" | "error";
  code: string;
  message: string;
};

export type MongoCommandRunner = {
  command(command: Record<string, unknown>): Promise<Record<string, unknown>>;
};

export type RedisConfigReader = {
  config(action: "GET", parameter: string): Promise<unknown>;
};

/**
 * Ledger writes use multi-document transactions, which MongoDB only supports
 * on a replica set (a single-node replica set is sufficient).
 */
export async function checkMongoTopology(
  database: MongoCommandRunner,
): Promise<StoreCheckResult> {
  try {
    const hello = await database.command({ hello: 1 });
    if (typeof hello.setName === "string" && hello.setName.length > 0)
      return {
        store: "mongodb",
        status: "ok",
        code: "MONGODB_REPLICA_SET",
        message: "MongoDB is running as a replica set.",
      };
    return {
      store: "mongodb",
      status: "error",
      code: "MONGODB_NOT_REPLICA_SET",
      message:
        "MongoDB must run as a replica set because ledger writes use transactions.",
    };
  } catch {
    return {
      store: "mongodb",
      status: "warn",
      code: "MONGODB_TOPOLOGY_UNKNOWN",
      message: "MongoDB topology could not be verified.",
    };
  }
}

/**
 * BullMQ keys must never be evicted. Managed providers often block CONFIG, so
 * an unreadable policy is reported as a warning rather than a failure.
 */
export async function checkRedisEviction(
  client: RedisConfigReader,
): Promise<StoreCheckResult> {
  try {
    const reply = await client.config("GET", "maxmemory-policy");
    const policy =
      Array.isArray(reply) && typeof reply[1] === "string"
        ? reply[1]
        : undefined;
    if (policy === "noeviction")
      return {
        store: "redis",
        status: "ok",
        code: "REDIS_NOEVICTION",
        message: "Redis eviction policy is noeviction.",
      };
    if (policy)
      return {
        store: "redis",
        status: "warn",
        code: "REDIS_EVICTION_POLICY",
        message: `Redis maxmemory-policy is "${policy}"; set it to "noeviction" so queued jobs and rate limits are never evicted.`,
      };
  } catch {
    // CONFIG is commonly disabled on managed Redis; fall through.
  }
  return {
    store: "redis",
    status: "warn",
    code: "REDIS_POLICY_UNVERIFIABLE",
    message:
      'Redis maxmemory-policy could not be read; confirm it is "noeviction" in the provider console.',
  };
}

export type VerifyStoresOptions = {
  database: MongoCommandRunner;
  redis: RedisConfigReader;
  production: boolean;
  log?: (entry: Record<string, unknown>) => void;
};

const defaultLog = (entry: Record<string, unknown>) =>
  console.warn(JSON.stringify(entry));

/**
 * Logs every non-ok result. In production a failed check stops the process so
 * a misconfigured deployment never reports ready.
 */
export async function verifyStores({
  database,
  redis,
  production,
  log = defaultLog,
}: VerifyStoresOptions): Promise<StoreCheckResult[]> {
  const results = await Promise.all([
    checkMongoTopology(database),
    checkRedisEviction(redis),
  ]);
  for (const result of results)
    if (result.status !== "ok")
      log({
        event: "store_check",
        store: result.store,
        status: result.status,
        code: result.code,
        message: result.message,
      });
  const failure = results.find((result) => result.status === "error");
  if (failure && production) throw new Error(failure.message);
  return results;
}
