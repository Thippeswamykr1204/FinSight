import { PrismaClient } from "@/generated/hosted";
import { hostedConfig } from "./config";

const globalDb = globalThis as unknown as { hostedPrisma?: PrismaClient };
export function hostedDb() {
  if (!globalDb.hostedPrisma)
    globalDb.hostedPrisma = new PrismaClient({
      datasources: { db: { url: hostedConfig().databaseUrl } },
      log: [],
    });
  return globalDb.hostedPrisma;
}
