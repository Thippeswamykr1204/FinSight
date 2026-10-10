import { describe, expect, it, vi } from "vitest";
import {
  checkMongoTopology,
  checkRedisEviction,
  verifyStores,
} from "./store-checks";

const replicaSet = { command: async () => ({ setName: "rs0" }) };
const standalone = { command: async () => ({ isWritablePrimary: true }) };
const noeviction = {
  config: async () => ["maxmemory-policy", "noeviction"],
};

describe("store topology checks", () => {
  it("accepts a MongoDB replica set", async () => {
    expect((await checkMongoTopology(replicaSet)).status).toBe("ok");
  });

  it("rejects a standalone MongoDB server", async () => {
    const result = await checkMongoTopology(standalone);
    expect(result.status).toBe("error");
    expect(result.code).toBe("MONGODB_NOT_REPLICA_SET");
  });

  it("warns when the MongoDB topology cannot be read", async () => {
    const result = await checkMongoTopology({
      command: async () => {
        throw new Error("not authorized");
      },
    });
    expect(result.status).toBe("warn");
    expect(result.message).not.toContain("not authorized");
  });

  it("accepts the noeviction Redis policy", async () => {
    expect((await checkRedisEviction(noeviction)).status).toBe("ok");
  });

  it("warns about evicting Redis policies", async () => {
    const result = await checkRedisEviction({
      config: async () => ["maxmemory-policy", "allkeys-lru"],
    });
    expect(result.status).toBe("warn");
    expect(result.code).toBe("REDIS_EVICTION_POLICY");
  });

  it("warns instead of failing when CONFIG is disabled", async () => {
    const result = await checkRedisEviction({
      config: async () => {
        throw new Error("ERR unknown command 'CONFIG'");
      },
    });
    expect(result.status).toBe("warn");
    expect(result.code).toBe("REDIS_POLICY_UNVERIFIABLE");
  });
});

describe("verifyStores", () => {
  it("stops a production boot on a standalone MongoDB server", async () => {
    await expect(
      verifyStores({
        database: standalone,
        redis: noeviction,
        production: true,
        log: () => undefined,
      }),
    ).rejects.toThrow(/replica set/);
  });

  it("logs but continues outside production", async () => {
    const log = vi.fn();
    const results = await verifyStores({
      database: standalone,
      redis: noeviction,
      production: false,
      log,
    });
    expect(results).toHaveLength(2);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatchObject({
      event: "store_check",
      store: "mongodb",
      status: "error",
    });
  });

  it("stays quiet when both stores are configured correctly", async () => {
    const log = vi.fn();
    await verifyStores({
      database: replicaSet,
      redis: noeviction,
      production: true,
      log,
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("does not stop a boot for warnings alone", async () => {
    await expect(
      verifyStores({
        database: replicaSet,
        redis: { config: async () => ["maxmemory-policy", "volatile-lru"] },
        production: true,
        log: () => undefined,
      }),
    ).resolves.toHaveLength(2);
  });
});
