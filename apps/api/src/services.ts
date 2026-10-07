import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  financialYear,
  localDate,
  periodTotals,
  region,
} from "@finsight/shared";
import {
  AuditEvent,
  Budget,
  FinancialAccount,
  Goal,
  IdempotencyKey,
  Invitation,
  Membership,
  Transaction,
  Workspace,
} from "./models";
import { getDb } from "./mongo";
import {
  atomic,
  membership,
  nativeOptions,
  workspaceWrite,
} from "./repositories/unit-of-work";
import { queueEmail } from "./email";
import { loadConfig } from "./config";
import { fingerprint as importFingerprint } from "@finsight/shared";
import { HttpError } from "./http";
import type { FinanceCommand } from "./contracts";
import type { Principal } from "./principal";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const serialize = (value: any): any =>
  value == null
    ? value
    : {
        ...value,
        id: String(value._id ?? value.id),
        _id: undefined,
        __v: undefined,
      };

export async function authorize(
  actor: Principal,
  workspaceId: string,
  permission: "read" | "write" | "members" | "owner" = "read",
) {
  return membership(actor, workspaceId, permission);
}

export async function listWorkspaces(actor: Principal) {
  const members = await Membership.find({ userId: actor.userId })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  const workspaces = await Workspace.find({
    _id: { $in: members.map((member) => member.workspaceId) },
  }).lean();
  const byId = new Map(
    workspaces.map((workspace) => [String(workspace._id), workspace]),
  );
  return members.map((member) => ({
    role: member.role,
    workspace: serialize(byId.get(String(member.workspaceId))),
  }));
}

export async function createWorkspace(
  actor: Principal,
  name: string,
  requestId: string,
) {
  return atomic(async () => {
    const user = await getDb()
      .collection("users")
      .findOneAndUpdate(
        { _id: actor.userId as never },
        { $inc: { workspaceWriteRevision: 1 } },
        nativeOptions(),
      );
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in again.");
    if (
      (await Membership.countDocuments({
        userId: actor.userId,
        role: "OWNER",
      })) >= 5
    )
      throw new HttpError(
        422,
        "CONFLICT",
        "You can own up to five workspaces.",
      );
    const workspace = await Workspace.create({
      _id: randomUUID(),
      name,
      currency: region.currency,
      ownerId: actor.userId,
    });
    await Membership.create({
      _id: randomUUID(),
      workspaceId: workspace._id,
      userId: actor.userId,
      role: "OWNER",
    });
    await AuditEvent.create({
      _id: randomUUID(),
      workspaceId: workspace._id,
      actorId: actor.userId,
      action: "workspace.created",
      requestId,
    });
    return serialize(workspace.toObject());
  });
}

async function assertAccount(workspaceId: string, accountId: string) {
  const account = await FinancialAccount.findOne({
    _id: accountId,
    workspaceId,
  }).lean();
  if (!account)
    throw new HttpError(
      404,
      "NOT_FOUND",
      "Account not found in this workspace.",
    );
  return account;
}

export async function executeCommand(
  actor: Principal,
  workspaceId: string,
  key: string,
  command: FinanceCommand,
  requestId: string,
) {
  return workspaceWrite(actor, workspaceId, "write", async () => {
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace)
      throw new HttpError(404, "NOT_FOUND", "Workspace not found.");
    if (workspace.currency !== region.currency)
      throw new HttpError(
        409,
        "LEGACY_CURRENCY_READ_ONLY",
        "This legacy currency ledger is read-only. Export it and create an INR workspace; amounts have not been converted.",
      );
    const fingerprint = digest(command);
    const previous = await IdempotencyKey.findOne({ workspaceId, key }).lean();
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
    let result: any;
    let resourceId: string | undefined;
    switch (command.action) {
      case "account.create": {
        if ((await FinancialAccount.countDocuments({ workspaceId })) >= 100)
          throw new HttpError(
            422,
            "CONFLICT",
            "You can track up to 100 accounts in this workspace.",
          );
        const account = await FinancialAccount.create({
          _id: randomUUID(),
          workspaceId,
          ...command.data,
        });
        result = serialize(account.toObject());
        resourceId = account.id;
        break;
      }
      case "account.reminder": {
        await assertAccount(workspaceId, command.id);
        const account = await FinancialAccount.findOneAndUpdate(
          { _id: command.id, workspaceId },
          { dueDate: command.dueDate },
          { new: true },
        ).lean();
        result = serialize(account);
        resourceId = command.id;
        break;
      }
      case "transaction.create": {
        await assertAccount(workspaceId, command.data.accountId);
        if ((await Transaction.countDocuments({ workspaceId })) >= 10_000)
          throw new HttpError(
            422,
            "CONFLICT",
            "This workspace has reached its transaction limit.",
          );
        const entry = await Transaction.create({
          _id: randomUUID(),
          workspaceId,
          ...command.data,
        });
        result = serialize(entry.toObject());
        resourceId = entry.id;
        break;
      }
      case "transaction.update": {
        await assertAccount(workspaceId, command.data.accountId);
        const entry = await Transaction.findOneAndUpdate(
          { _id: command.id, workspaceId, version: command.version },
          { ...command.data, $inc: { version: 1 }, importKey: null },
          { new: true },
        ).lean();
        if (!entry)
          throw new HttpError(
            409,
            "STALE_VERSION",
            "This record changed or was removed. Refresh before trying again.",
          );
        result = serialize(entry);
        resourceId = command.id;
        break;
      }
      case "transaction.delete": {
        const entry = await Transaction.findOneAndDelete({
          _id: command.id,
          workspaceId,
          version: command.version,
        });
        if (!entry)
          throw new HttpError(
            409,
            "STALE_VERSION",
            "This record changed or was removed. Refresh before trying again.",
          );
        result = { deleted: true };
        resourceId = command.id;
        break;
      }
      case "transaction.import": {
        for (const accountId of new Set(
          command.rows.map((row) => row.accountId),
        ))
          await assertAccount(workspaceId, accountId);
        const dates = command.rows.map((row) => row.date).sort();
        const existing = await Transaction.find({
          workspaceId,
          accountId: {
            $in: [...new Set(command.rows.map((row) => row.accountId))],
          },
          date: { $gte: dates[0], $lte: dates.at(-1)! },
        }).lean();
        const seen = new Set(
          existing.map((row) => importFingerprint(row as never)),
        );
        const rows = command.rows.filter((row) => {
          const fingerprint = importFingerprint(row);
          if (seen.has(fingerprint)) return false;
          seen.add(fingerprint);
          return true;
        });
        if (
          (await Transaction.countDocuments({ workspaceId })) + rows.length >
          10_000
        )
          throw new HttpError(
            422,
            "ENTRY_LIMIT",
            "This release supports up to 10,000 transactions per workspace.",
          );
        if (rows.length)
          await Transaction.insertMany(
            rows.map((row) => ({
              _id: randomUUID(),
              workspaceId,
              ...row,
              importKey: digest(importFingerprint(row)),
            })),
          );
        result = {
          imported: rows.length,
          duplicates: command.rows.length - rows.length,
        };
        break;
      }
      case "budget.set": {
        const budget = await Budget.findOneAndUpdate(
          {
            workspaceId,
            category: command.data.category,
            month: command.data.month,
          },
          {
            $set: { limit: command.data.limit },
            $setOnInsert: {
              _id: randomUUID(),
              workspaceId,
              category: command.data.category,
              month: command.data.month,
            },
          },
          { upsert: true, new: true, runValidators: true },
        ).lean();
        result = serialize(budget);
        resourceId = String(budget?._id);
        break;
      }
      case "budget.delete": {
        const deleted = await Budget.findOneAndDelete({
          _id: command.id,
          workspaceId,
        });
        if (!deleted)
          throw new HttpError(404, "NOT_FOUND", "Budget not found.");
        result = { deleted: true };
        resourceId = command.id;
        break;
      }
      case "goal.create": {
        if ((await Goal.countDocuments({ workspaceId })) >= 100)
          throw new HttpError(
            422,
            "CONFLICT",
            "You can track up to 100 goals in this workspace.",
          );
        const goal = await Goal.create({
          _id: randomUUID(),
          workspaceId,
          ...command.data,
          saved: 0,
        });
        result = serialize(goal.toObject());
        resourceId = goal.id;
        break;
      }
      case "goal.contribute": {
        const goal = await Goal.findOne({
          _id: command.id,
          workspaceId,
        }).lean();
        if (!goal) throw new HttpError(404, "NOT_FOUND", "Goal not found.");
        if (goal.saved + command.amount > goal.target)
          throw new HttpError(
            422,
            "CONFLICT",
            "Contribution exceeds the amount remaining.",
          );
        const updated = await Goal.findOneAndUpdate(
          { _id: command.id, workspaceId },
          { $inc: { saved: command.amount } },
          { new: true },
        ).lean();
        result = serialize(updated);
        resourceId = command.id;
        break;
      }
    }
    await AuditEvent.create({
      _id: randomUUID(),
      workspaceId,
      actorId: actor.userId,
      action: command.action,
      resourceId,
      requestId,
    });
    await IdempotencyKey.create({
      _id: randomUUID(),
      workspaceId,
      key,
      actorId: actor.userId,
      fingerprint,
      response: result,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    });
    return result;
  });
}

export async function overview(actor: Principal, workspaceId: string) {
  const member = await authorize(actor, workspaceId);
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) throw new HttpError(404, "NOT_FOUND", "Workspace not found.");
  const [accounts, transactions, budgets, goals, members] = await Promise.all([
    FinancialAccount.find({ workspaceId })
      .sort({ createdAt: 1, _id: 1 })
      .lean(),
    Transaction.find({ workspaceId }).lean(),
    Budget.find({ workspaceId, month: localDate().slice(0, 7) }).lean(),
    Goal.find({ workspaceId }).sort({ due: 1 }).lean(),
    Membership.find({ workspaceId }).sort({ createdAt: 1, _id: 1 }).lean(),
  ]);
  const balances = accounts.map((account) => ({
    ...serialize(account),
    balance:
      account.openingBalance +
      transactions
        .filter((entry) => entry.accountId === account._id)
        .reduce(
          (sum, entry) =>
            sum + (entry.type === "income" ? entry.amount : -entry.amount),
          0,
        ),
  }));
  const month = localDate().slice(0, 7);
  const monthRows = transactions.filter((entry) =>
    entry.date.startsWith(month),
  );
  const income = monthRows
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = monthRows
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const fy = financialYear();
  const fyTotals = periodTotals(
    transactions.map((entry) => ({
      date: entry.date,
      type: entry.type,
      amount: entry.amount,
    })),
    fy.start,
    fy.end,
  );
  const users = await getDb()
    .collection("users")
    .find(
      { _id: { $in: members.map((entry) => entry.userId) as never[] } },
      { projection: { name: 1, email: 1 } },
    )
    .toArray();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  return {
    workspace: serialize(workspace),
    role: member.role,
    accounts: balances,
    income,
    expenses,
    balance: balances.reduce((sum, account) => sum + account.balance, 0),
    budgets: budgets.map((budget) => ({
      ...serialize(budget),
      spent: monthRows
        .filter(
          (entry) =>
            entry.type === "expense" && entry.category === budget.category,
        )
        .reduce((sum, entry) => sum + entry.amount, 0),
    })),
    goals: goals.map(serialize),
    members: members.map((entry) => ({
      userId: entry.userId,
      role: entry.role,
      user: {
        name: String(usersById.get(entry.userId)?.name ?? "Member"),
        email: String(usersById.get(entry.userId)?.email ?? ""),
      },
    })),
    history: [],
    financialYear: { ...fy, ...fyTotals },
  };
}

export async function entries(
  actor: Principal,
  workspaceId: string,
  options: {
    limit: number;
    search: string;
    category?: string;
    cursor?: string;
  },
) {
  await authorize(actor, workspaceId);
  const filter: Record<string, unknown> = { workspaceId };
  if (options.category) filter.category = options.category;
  if (options.search)
    filter.merchant = {
      $regex: options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  if (options.cursor) {
    const decoded = JSON.parse(
      Buffer.from(options.cursor, "base64url").toString("utf8"),
    ) as { date: string; id: string };
    filter.$or = [
      { date: { $lt: decoded.date } },
      { date: decoded.date, _id: { $lt: decoded.id } },
    ];
  }
  const rows = await Transaction.find(filter)
    .sort({ date: -1, _id: -1 })
    .limit(options.limit + 1)
    .lean();
  const hasMore = rows.length > options.limit;
  const data = rows.slice(0, options.limit);
  const last = data.at(-1);
  return {
    items: data.map(serialize),
    nextCursor:
      hasMore && last
        ? Buffer.from(
            JSON.stringify({ date: last.date, id: last._id }),
          ).toString("base64url")
        : null,
  };
}

export async function inviteMember(
  actor: Principal,
  workspaceId: string,
  email: string,
  role: "ADMIN" | "EDITOR" | "VIEWER",
  requestId: string,
) {
  const member = await authorize(actor, workspaceId, "members");
  if (role === "ADMIN" && member.role !== "OWNER")
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only an owner can invite an administrator.",
    );
  if ((await Membership.countDocuments({ workspaceId })) >= 20)
    throw new HttpError(
      422,
      "CONFLICT",
      "This workspace supports up to 20 members.",
    );
  const existing = await getDb()
    .collection("users")
    .findOne({ email }, nativeOptions());
  if (
    existing &&
    (await Membership.exists({ workspaceId, userId: String(existing._id) }))
  )
    throw new HttpError(409, "CONFLICT", "This person is already a member.");
  const token = randomBytes(32).toString("base64url");
  await Invitation.deleteMany({ workspaceId, email, acceptedAt: null });
  const invitation = await Invitation.create({
    _id: randomUUID(),
    workspaceId,
    email,
    role,
    inviterId: actor.userId,
    tokenHash: digest(token),
    expiresAt: new Date(Date.now() + 3 * 86_400_000),
  });
  await AuditEvent.create({
    _id: randomUUID(),
    workspaceId,
    actorId: actor.userId,
    action: "member.invited",
    resourceId: invitation.id,
    requestId,
  });
  const workspace = await Workspace.findOne({ _id: workspaceId }).lean();
  await queueEmail(
    email,
    "You are invited to a FinSight workspace",
    `${actor.name} invited you to ${workspace?.name} as ${role.toLowerCase()}.\n\nSign in with ${email}, then open:\n${loadConfig().WEB_ORIGIN}/app/invitations?token=${token}\n\nThis invitation expires in 3 days.`,
    workspaceId,
  );
  return { id: invitation.id, email, role, expiresAt: invitation.expiresAt };
}

export async function acceptInvitation(
  actor: Principal,
  token: string,
  requestId: string,
) {
  const invitation = await Invitation.findOne({
    tokenHash: digest(token),
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!invitation || invitation.email !== actor.email.toLowerCase())
    throw new HttpError(
      404,
      "NOT_FOUND",
      "Invitation is invalid, expired, already used, or belongs to another email.",
    );
  const accepted = await Invitation.findOneAndUpdate(
    { _id: invitation.id, acceptedAt: null, expiresAt: { $gt: new Date() } },
    { acceptedAt: new Date() },
    { new: true },
  );
  if (!accepted)
    throw new HttpError(
      409,
      "CONFLICT",
      "This invitation has already been used.",
    );
  if (
    (await Membership.countDocuments({
      workspaceId: invitation.workspaceId,
    })) >= 20
  )
    throw new HttpError(
      422,
      "CONFLICT",
      "This workspace has reached its member limit.",
    );
  await Membership.updateOne(
    { workspaceId: invitation.workspaceId, userId: actor.userId },
    { $setOnInsert: { _id: randomUUID(), role: invitation.role } },
    { upsert: true },
  );
  await AuditEvent.create({
    _id: randomUUID(),
    workspaceId: invitation.workspaceId,
    actorId: actor.userId,
    action: "member.joined",
    requestId,
  });
  return { workspaceId: invitation.workspaceId };
}

export async function removeMember(
  actor: Principal,
  workspaceId: string,
  userId: string,
  requestId: string,
) {
  const caller = await authorize(actor, workspaceId, "members");
  const target = await Membership.findOne({ workspaceId, userId }).lean();
  if (!target) throw new HttpError(404, "NOT_FOUND", "Member not found.");
  if (
    target.role === "OWNER" ||
    (target.role === "ADMIN" && caller.role !== "OWNER")
  )
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only the owner can remove an administrator. Owners cannot be removed.",
    );
  await Membership.deleteOne({ workspaceId, userId });
  await Invitation.deleteMany({
    workspaceId,
    inviterId: userId,
    acceptedAt: null,
  });
  await AuditEvent.create({
    _id: randomUUID(),
    workspaceId,
    actorId: actor.userId,
    action: "member.removed",
    resourceId: userId,
    requestId,
  });
  return { removed: true };
}

export async function deleteAccount(actor: Principal, confirmation: string) {
  if (!actor.fresh)
    throw new HttpError(
      403,
      "FRESH_SESSION_REQUIRED",
      "Sign in again before deleting your account.",
    );
  if (confirmation !== "DELETE MY ACCOUNT")
    throw new HttpError(
      422,
      "CONFIRMATION",
      "Type DELETE MY ACCOUNT to continue.",
    );
  if (await Membership.countDocuments({ userId: actor.userId, role: "OWNER" }))
    throw new HttpError(
      409,
      "OWNED_WORKSPACES",
      "Export and delete your owned workspaces before deleting your account.",
    );
  await Promise.all([
    Membership.deleteMany({ userId: actor.userId }),
    Invitation.deleteMany({ email: actor.email.toLowerCase() }),
    getDb()
      .collection("sessions")
      .deleteMany({ userId: actor.userId as never }),
    getDb()
      .collection("account")
      .deleteMany({ userId: actor.userId as never }),
    getDb()
      .collection("accounts")
      .deleteMany({ userId: actor.userId as never }),
    getDb()
      .collection("twoFactors")
      .deleteMany({ userId: actor.userId as never }),
    getDb()
      .collection("passkeys")
      .deleteMany({ userId: actor.userId as never }),
    getDb()
      .collection("verifications")
      .deleteMany({ identifier: { $in: [actor.userId, actor.email] } }),
    getDb()
      .collection("users")
      .deleteOne({ _id: actor.userId as never }),
  ]);
  await AuditEvent.updateMany(
    { actorId: actor.userId },
    { actorId: "deleted-user" },
  );
  return { deleted: true };
}
