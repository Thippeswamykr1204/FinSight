import { randomUUID, createHash } from "node:crypto";
import { Client as PgClient } from "pg";
import { MongoClient } from "mongodb";
import { parseArgs } from "node:util";

type LegacyRow = Record<string, unknown>;
const { values } = parseArgs({
  options: {
    confirm: { type: "boolean", default: false },
    dryRun: { type: "boolean", default: false },
  },
});
const pgUrl = process.env.LEGACY_POSTGRES_URL;
const mongoUrl = process.env.MONGODB_URI;
if (!pgUrl || !mongoUrl)
  throw new Error("Set LEGACY_POSTGRES_URL and MONGODB_URI for the migration.");
if (!values.confirm)
  throw new Error(
    "This is a one-off data migration. Re-run with --confirm after taking a backup.",
  );

const stableId = (prefix: string, value: unknown) =>
  createHash("sha256")
    .update(`${prefix}:${String(value)}`)
    .digest("hex")
    .slice(0, 32);
const rows = async (client: PgClient, table: string) =>
  (await client.query(`SELECT * FROM ${table}`)).rows as LegacyRow[];
const number = (value: unknown, label: string) => {
  const parsed = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isSafeInteger(parsed) || Math.abs(parsed) > 100_000_000_000)
    throw new Error(`${label} is outside the supported integer-paise range.`);
  return parsed;
};

async function main() {
  const pg = new PgClient({
    connectionString: pgUrl,
    application_name: "finsight-postgres-to-mongo",
  });
  const mongo = new MongoClient(mongoUrl);
  await pg.connect();
  await mongo.connect();
  const db = mongo.db(
    new URL(mongoUrl).pathname.replace(/^\//, "") || "finsight",
  );
  const report = {
    users: 0,
    workspaces: 0,
    memberships: 0,
    accounts: 0,
    transactions: 0,
    budgets: 0,
    goals: 0,
    skipped: [] as string[],
  };
  try {
    const users = await rows(pg, "v2_users");
    const workspaces = await rows(pg, "v2_workspaces");
    const memberships = await rows(pg, "v2_workspace_members");
    const accounts = await rows(pg, "v2_financial_accounts");
    const entries = await rows(pg, "v2_ledger_entries");
    const budgets = await rows(pg, "v2_budget_plans");
    const goals = await rows(pg, "v2_savings_goals");
    if (values.dryRun) {
      console.info(
        JSON.stringify({
          dryRun: true,
          sourceCounts: {
            users: users.length,
            workspaces: workspaces.length,
            memberships: memberships.length,
            accounts: accounts.length,
            transactions: entries.length,
            budgets: budgets.length,
            goals: goals.length,
          },
        }),
      );
      return;
    }
    const userDocs = users.map((row) => ({
      _id: String(row.id),
      name: row.name,
      email: String(row.email).toLowerCase(),
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      noticeAccepted: row.noticeAccepted ?? false,
      noticeVersion: row.noticeVersion ?? "",
      noticeAcceptedAt: row.noticeAcceptedAt ?? null,
    }));
    await db.collection("users").bulkWrite(
      userDocs.map((document) => ({
        replaceOne: {
          filter: { _id: document._id },
          replacement: document,
          upsert: true,
        },
      })),
    );
    report.users = userDocs.length;
    for (const workspace of workspaces) {
      const workspaceId = String(workspace.id);
      const currency = String(workspace.currency ?? "INR");
      if (!["INR", "USD"].includes(currency)) {
        report.skipped.push(`workspace:${workspaceId}:unsupported currency`);
        continue;
      }
      await db.collection("workspaces").replaceOne(
        { _id: workspaceId },
        {
          _id: workspaceId,
          name: workspace.name,
          currency,
          revision: Number(workspace.revision ?? 0),
          ownerId: String(
            memberships.find(
              (row) => row.workspaceId === workspace.id && row.role === "OWNER",
            )?.userId ?? "",
          ),
        },
        { upsert: true },
      );
      report.workspaces++;
    }
    await db.collection("memberships").bulkWrite(
      memberships.map((row) => ({
        replaceOne: {
          filter: {
            _id: stableId("membership", `${row.workspaceId}:${row.userId}`),
          },
          replacement: {
            _id: stableId("membership", `${row.workspaceId}:${row.userId}`),
            workspaceId: String(row.workspaceId),
            userId: String(row.userId),
            role: String(row.role),
            createdAt: row.createdAt,
            updatedAt: row.createdAt,
          },
          upsert: true,
        },
      })),
    );
    report.memberships = memberships.length;
    await db.collection("financial_accounts").bulkWrite(
      accounts.map((row) => ({
        replaceOne: {
          filter: { _id: String(row.id) },
          replacement: {
            _id: String(row.id),
            workspaceId: String(row.workspaceId),
            name: row.name,
            type: row.type,
            openingBalance: number(row.openingBalance, `account:${row.id}`),
            dueDate: row.dueDate ?? null,
            createdAt: row.createdAt,
            updatedAt: row.createdAt,
          },
          upsert: true,
        },
      })),
    );
    report.accounts = accounts.length;
    await db.collection("transactions").bulkWrite(
      entries.map((row) => ({
        replaceOne: {
          filter: { _id: String(row.id) },
          replacement: {
            _id: String(row.id),
            workspaceId: String(row.workspaceId),
            accountId: String(row.accountId),
            merchant: row.merchant,
            amount: number(row.amount, `transaction:${row.id}`),
            date: String(row.date).slice(0, 10),
            type: row.type,
            category: row.category,
            note: row.note ?? "",
            importKey: row.importKey ?? null,
            version: Number(row.version ?? 1),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
          upsert: true,
        },
      })),
    );
    report.transactions = entries.length;
    await db.collection("budgets").bulkWrite(
      budgets.map((row) => ({
        replaceOne: {
          filter: { _id: String(row.id) },
          replacement: {
            _id: String(row.id),
            workspaceId: String(row.workspaceId),
            category: row.category,
            month: row.month,
            limit: number(row.limit, `budget:${row.id}`),
          },
          upsert: true,
        },
      })),
    );
    report.budgets = budgets.length;
    await db.collection("goals").bulkWrite(
      goals.map((row) => ({
        replaceOne: {
          filter: { _id: String(row.id) },
          replacement: {
            _id: String(row.id),
            workspaceId: String(row.workspaceId),
            name: row.name,
            target: number(row.target, `goal:${row.id}`),
            saved: number(row.saved ?? 0, `goal:${row.id}:saved`),
            due: String(row.due).slice(0, 10),
          },
          upsert: true,
        },
      })),
    );
    report.goals = goals.length;
    console.info(JSON.stringify({ event: "postgres_import_complete", report }));
  } finally {
    await pg.end();
    await mongo.close();
  }
}
void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
