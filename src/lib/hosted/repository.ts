import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/hosted";
import { hostedDb } from "./db";
import { authorize, type Permission } from "./authorization";
import { HttpError, type Principal } from "./http";
import type { FinanceCommand } from "./contracts";
import { localDate } from "@/lib/finance/model";
import { fingerprint as importFingerprint } from "@/lib/finance/import-export";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const plain = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_key, field) =>
      typeof field === "bigint" ? Number(field) : field,
    ),
  ) as Prisma.InputJsonObject;

export async function workspaceWrite<T>(
  actor: Principal,
  workspaceId: string,
  permission: Permission,
  operation: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return hostedDb().$transaction(
    async (db) => {
      // Serialize writes within a household, not globally. Recheck role after lock.
      await db.$queryRaw`SELECT id FROM v2_workspaces WHERE id = ${workspaceId} FOR UPDATE`;
      await authorize(actor, workspaceId, permission, db);
      return operation(db);
    },
    { timeout: 15000 },
  );
}

export async function createWorkspace(
  actor: Principal,
  name: string,
  requestId: string,
) {
  return hostedDb().$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM v2_users WHERE id = ${actor.userId} FOR UPDATE`;
    if (
      (await db.workspaceMember.count({
        where: { userId: actor.userId, role: "OWNER" },
      })) >= 5
    )
      throw new HttpError(
        422,
        "WORKSPACE_LIMIT",
        "You can own up to five workspaces.",
      );
    return db.workspace.create({
      data: {
        name,
        members: { create: { userId: actor.userId, role: "OWNER" } },
        audit: {
          create: {
            actorId: actor.userId,
            action: "workspace.created",
            requestId,
          },
        },
      },
      select: { id: true, name: true, currency: true },
    });
  });
}

async function existingAccount(
  db: Prisma.TransactionClient,
  workspaceId: string,
  accountId: string,
) {
  if (
    !(await db.financialAccount.findFirst({
      where: { workspaceId, id: accountId },
    }))
  )
    throw new HttpError(
      404,
      "ACCOUNT_NOT_FOUND",
      "Account not found in this workspace.",
    );
}
async function entryCapacity(
  db: Prisma.TransactionClient,
  workspaceId: string,
  adding: number,
) {
  if ((await db.ledgerEntry.count({ where: { workspaceId } })) + adding > 10000)
    throw new HttpError(
      422,
      "ENTRY_LIMIT",
      "This release supports up to 10,000 transactions per workspace.",
    );
}
function conflict(count: number) {
  if (count !== 1)
    throw new HttpError(
      409,
      "STALE_VERSION",
      "This record changed or was removed. Refresh before trying again.",
    );
}

export async function executeCommand(
  actor: Principal,
  workspaceId: string,
  key: string,
  command: FinanceCommand,
  requestId: string,
) {
  return workspaceWrite(actor, workspaceId, "write", async (db) => {
    const fingerprint = digest(JSON.stringify(command));
    const previous = await db.idempotentWrite.findUnique({
      where: { workspaceId_key: { workspaceId, key } },
    });
    if (previous) {
      if (
        previous.actorId !== actor.userId ||
        previous.fingerprint !== fingerprint
      )
        throw new HttpError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This idempotency key was used for a different request.",
        );
      return previous.response;
    }
    let result: unknown;
    let resourceId: string | undefined;
    switch (command.action) {
      case "account.create": {
        if (
          (await db.financialAccount.count({ where: { workspaceId } })) >= 100
        )
          throw new HttpError(
            422,
            "ACCOUNT_LIMIT",
            "You can track up to 100 accounts in this workspace.",
          );
        const account = await db.financialAccount.create({
          data: { workspaceId, ...command.data },
        });
        result = account;
        resourceId = account.id;
        break;
      }
      case "transaction.create": {
        await existingAccount(db, workspaceId, command.data.accountId);
        await entryCapacity(db, workspaceId, 1);
        const entry = await db.ledgerEntry.create({
          data: {
            workspaceId,
            ...command.data,
            date: new Date(command.data.date),
          },
        });
        result = entry;
        resourceId = entry.id;
        break;
      }
      case "transaction.update": {
        await existingAccount(db, workspaceId, command.data.accountId);
        const updated = await db.ledgerEntry.updateMany({
          where: { workspaceId, id: command.id, version: command.version },
          data: {
            ...command.data,
            date: new Date(command.data.date),
            version: { increment: 1 },
            importKey: null,
          },
        });
        conflict(updated.count);
        result = { id: command.id, version: command.version + 1 };
        resourceId = command.id;
        break;
      }
      case "transaction.delete": {
        const removed = await db.ledgerEntry.deleteMany({
          where: { workspaceId, id: command.id, version: command.version },
        });
        conflict(removed.count);
        result = { deleted: true };
        resourceId = command.id;
        break;
      }
      case "transaction.import": {
        for (const accountId of new Set(
          command.rows.map((row) => row.accountId),
        ))
          await existingAccount(db, workspaceId, accountId);
        const keys = command.rows.map((row) => digest(importFingerprint(row)));
        const seen = new Set(
          (
            await db.ledgerEntry.findMany({
              where: { workspaceId, importKey: { in: keys } },
              select: { importKey: true },
            })
          ).map((row) => row.importKey),
        );
        // Also match manually entered rows, keeping CSV/OFX fallback idempotent.
        const dates = command.rows.map((row) => row.date).sort();
        const existing = await db.ledgerEntry.findMany({
          where: {
            workspaceId,
            accountId: {
              in: [...new Set(command.rows.map((row) => row.accountId))],
            },
            date: { gte: new Date(dates[0]), lte: new Date(dates.at(-1)!) },
          },
        });
        const manual = new Set(
          existing.map((row) =>
            digest(
              importFingerprint({
                ...row,
                amount: Number(row.amount),
                date: row.date.toISOString().slice(0, 10),
                type: row.type as "income" | "expense",
                category:
                  row.category as (typeof command.rows)[number]["category"],
              }),
            ),
          ),
        );
        const rows = command.rows.filter((row, index) => {
          const key = keys[index];
          if (seen.has(key) || manual.has(key)) return false;
          seen.add(key);
          return true;
        });
        await entryCapacity(db, workspaceId, rows.length);
        await db.ledgerEntry.createMany({
          data: rows.map((row) => ({
            ...row,
            workspaceId,
            date: new Date(row.date),
            importKey: digest(importFingerprint(row)),
          })),
        });
        result = {
          imported: rows.length,
          duplicates: command.rows.length - rows.length,
        };
        break;
      }
      case "budget.set": {
        const budget = await db.budgetPlan.upsert({
          where: {
            workspaceId_category_month: {
              workspaceId,
              category: command.data.category,
              month: command.data.month,
            },
          },
          create: { workspaceId, ...command.data },
          update: { limit: command.data.limit },
        });
        result = budget;
        resourceId = budget.id;
        break;
      }
      case "budget.delete": {
        const deleted = await db.budgetPlan.deleteMany({
          where: { workspaceId, id: command.id },
        });
        if (!deleted.count)
          throw new HttpError(404, "BUDGET_NOT_FOUND", "Budget not found.");
        result = { deleted: true };
        resourceId = command.id;
        break;
      }
      case "goal.create": {
        if ((await db.savingsGoal.count({ where: { workspaceId } })) >= 100)
          throw new HttpError(
            422,
            "GOAL_LIMIT",
            "You can track up to 100 goals in this workspace.",
          );
        const goal = await db.savingsGoal.create({
          data: {
            workspaceId,
            ...command.data,
            due: new Date(command.data.due),
          },
        });
        result = goal;
        resourceId = goal.id;
        break;
      }
      case "goal.contribute": {
        const goal = await db.savingsGoal.findFirst({
          where: { workspaceId, id: command.id },
        });
        if (!goal)
          throw new HttpError(404, "GOAL_NOT_FOUND", "Goal not found.");
        if (goal.saved + BigInt(command.amount) > goal.target)
          throw new HttpError(
            422,
            "GOAL_EXCEEDED",
            "Contribution exceeds the amount remaining.",
          );
        result = await db.savingsGoal.update({
          where: { id: goal.id },
          data: { saved: { increment: command.amount } },
        });
        resourceId = goal.id;
        break;
      }
    }
    await db.workspace.update({
      where: { id: workspaceId },
      data: { revision: { increment: 1 } },
    });
    await db.auditEvent.create({
      data: {
        workspaceId,
        actorId: actor.userId,
        action: command.action,
        resourceId,
        requestId,
      },
    });
    const response = plain(result);
    await db.idempotentWrite.create({
      data: { workspaceId, key, actorId: actor.userId, fingerprint, response },
    });
    return response;
  });
}

export async function overview(actor: Principal, workspaceId: string) {
  const membership = await authorize(actor, workspaceId);
  const db = hostedDb();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const month = start.toISOString().slice(0, 7);
  const [
    accounts,
    groupedAccounts,
    groupedCurrent,
    budgets,
    goals,
    members,
    history,
  ] = await Promise.all([
    db.financialAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    }),
    db.ledgerEntry.groupBy({
      by: ["accountId", "type"],
      where: { workspaceId },
      _sum: { amount: true },
    }),
    db.ledgerEntry.groupBy({
      by: ["category", "type"],
      where: { workspaceId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    db.budgetPlan.findMany({
      where: { workspaceId, month },
      orderBy: { category: "asc" },
    }),
    db.savingsGoal.findMany({
      where: { workspaceId },
      orderBy: { due: "asc" },
    }),
    db.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        userId: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.$queryRaw<
      Array<{ month: string; income: bigint; expenses: bigint }>
    >`SELECT TO_CHAR(date, 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::bigint AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::bigint AS expenses
      FROM v2_ledger_entries WHERE "workspaceId" = ${workspaceId} AND date >= ${new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))} AND date < ${end}
      GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY month`,
  ]);
  const balances = accounts.map((account) => ({
    ...account,
    balance: groupedAccounts
      .filter((group) => group.accountId === account.id)
      .reduce(
        (total, group) =>
          total +
          (group.type === "income" ? 1n : -1n) * (group._sum.amount ?? 0n),
        account.openingBalance,
      ),
  }));
  return {
    workspace: membership.workspace,
    role: membership.role,
    accounts: balances,
    income: groupedCurrent
      .filter((group) => group.type === "income")
      .reduce((sum, group) => sum + (group._sum.amount ?? 0n), 0n),
    expenses: groupedCurrent
      .filter((group) => group.type === "expense")
      .reduce((sum, group) => sum + (group._sum.amount ?? 0n), 0n),
    balance: balances.reduce((sum, account) => sum + account.balance, 0n),
    budgets: budgets.map((budget) => ({
      ...budget,
      spent:
        groupedCurrent.find(
          (group) =>
            group.category === budget.category && group.type === "expense",
        )?._sum.amount ?? 0n,
    })),
    goals,
    members,
    history,
  };
}

export async function entries(
  actor: Principal,
  workspaceId: string,
  params: URLSearchParams,
) {
  await authorize(actor, workspaceId);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25)));
  if (!Number.isInteger(limit))
    throw new HttpError(422, "INVALID_LIMIT", "Use an integer page limit.");
  const search = (params.get("search") ?? "").slice(0, 120);
  const category = params.get("category");
  let after: { id: string; date: Date } | undefined;
  const filterKey = digest(JSON.stringify({ workspaceId, search, category }));
  if (params.get("cursor")) {
    try {
      const cursor = JSON.parse(
        Buffer.from(params.get("cursor")!, "base64url").toString("utf8"),
      );
      if (
        cursor.filter !== filterKey ||
        typeof cursor.id !== "string" ||
        cursor.id.length > 100 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(cursor.date) ||
        Number.isNaN(Date.parse(cursor.date))
      )
        throw new Error();
      after = { id: cursor.id, date: new Date(cursor.date) };
    } catch {
      throw new HttpError(
        400,
        "INVALID_CURSOR",
        "The page cursor does not match this query.",
      );
    }
  }
  const rows = await hostedDb().ledgerEntry.findMany({
    where: {
      workspaceId,
      ...(search
        ? { merchant: { contains: search, mode: "insensitive" } }
        : {}),
      ...(category ? { category } : {}),
      ...(after
        ? {
            OR: [
              { date: { lt: after.date } },
              { date: after.date, id: { lt: after.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  const last = data.at(-1);
  return {
    items: data.map((row) => ({
      ...row,
      date: row.date.toISOString().slice(0, 10),
    })),
    nextCursor:
      hasMore && last
        ? Buffer.from(
            JSON.stringify({
              filter: filterKey,
              date: last.date.toISOString().slice(0, 10),
              id: last.id,
            }),
          ).toString("base64url")
        : null,
  };
}
