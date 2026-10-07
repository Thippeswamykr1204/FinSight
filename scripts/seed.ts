import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { loadConfig } from "../apps/api/src/config";
import { region, seedState } from "../packages/shared/src/index";
async function main() {
  const config = loadConfig();
  if (config.NODE_ENV === "production")
    throw new Error("The development seed is disabled in production.");
  const client = new MongoClient(config.MONGODB_URI);
  await client.connect();
  const db = client.db(
    new URL(config.MONGODB_URI).pathname.replace(/^\//, "") || "finsight",
  );
  const userId = "seed-user";
  const workspaceId = "seed-workspace";
  const state = seedState(new Date("2026-10-07T00:00:00Z"));
  await db.collection("users").replaceOne(
    { _id: userId },
    {
      _id: userId,
      name: state.name,
      email: "seed@example.test",
      emailVerified: true,
      noticeAccepted: true,
      noticeVersion: "2026-10-05",
      noticeAcceptedAt: new Date(),
    },
    { upsert: true },
  );
  await db.collection("workspaces").replaceOne(
    { _id: workspaceId },
    {
      _id: workspaceId,
      name: "Seed household",
      ownerId: userId,
      currency: region.currency,
      revision: 0,
    },
    { upsert: true },
  );
  await db
    .collection("memberships")
    .replaceOne(
      { workspaceId, userId },
      { _id: randomUUID(), workspaceId, userId, role: "OWNER" },
      { upsert: true },
    );
  console.info(
    JSON.stringify({
      seeded: true,
      user: "seed@example.test",
      accounts: state.accounts.length,
      transactions: state.transactions.length,
    }),
  );
  await client.close();
}
void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
