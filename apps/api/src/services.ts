import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  financialYear,
  localDate,
  periodTotals,
  region,
  emptyState,
  stateSchema,
  nextOccurrence,
  preferencesInput,
  recurrenceInput,
  reportInput,
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
  UserPreferences,
  UserOperation,
  RecurringRule,
  SharedReport,
  BillingAccount,
  BillingOperation,
  BillingSubscription,
  BillingInvoice,
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
import type { z } from "zod";
import { model } from "mongoose";
import { rateKey, redis } from "./redis";
import {
  userEntitlements,
  workspaceEntitlements,
  assertPlanWrite,
  reserveTransactions,
  requireWorkspaceFeature,
} from "./billing";

export const digest = (value: unknown) =>
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
  key: string,
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
    const fingerprint = digest({ action: "workspace.create", name });
    const previous = await UserOperation.findOne({
      userId: actor.userId,
      key,
    }).lean();
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This key was used for another request.",
        );
      return previous.response;
    }
    const entitlement = await userEntitlements(actor.userId);
    if (
      (await Membership.countDocuments({
        userId: actor.userId,
        role: "OWNER",
      })) >= entitlement.workspaces
    )
      throw new HttpError(
        422,
        "CONFLICT",
        `${entitlement.name} allows ${entitlement.workspaces} owned workspace${entitlement.workspaces === 1 ? "" : "s"}. Manage membership in Billing.`,
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
    const response = serialize(workspace.toObject());
    await UserOperation.create({
      userId: actor.userId,
      key,
      fingerprint,
      response,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    });
    return response;
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
    if (!["transaction.delete", "budget.delete"].includes(command.action))
      await assertPlanWrite(workspaceId, actor.userId);
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
        await reserveTransactions(workspaceId, 1);
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
        if (rows.length) await reserveTransactions(workspaceId, rows.length);
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
        if (
          await Budget.exists({
            workspaceId,
            category: command.data.category,
            month: command.data.month,
          })
        )
          throw new HttpError(
            409,
            "CONFLICT",
            "A budget for this category already exists this month.",
          );
        if ((await Budget.countDocuments({ workspaceId })) >= 500)
          throw new HttpError(
            422,
            "LIMIT",
            "This workspace supports up to 500 category budgets.",
          );
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
      case "budget.update": {
        const duplicate = await Budget.exists({
          workspaceId,
          _id: { $ne: command.id },
          category: command.data.category,
          month: command.data.month,
        });
        if (duplicate)
          throw new HttpError(
            409,
            "CONFLICT",
            "This category already has a budget this month.",
          );
        const budget = await Budget.findOneAndUpdate(
          { _id: command.id, workspaceId },
          { $set: command.data },
          { new: true, runValidators: true },
        ).lean();
        if (!budget) throw new HttpError(404, "NOT_FOUND", "Budget not found.");
        result = serialize(budget);
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
    history: transactions.map(serialize),
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
  key: string,
) {
  return workspaceWrite(actor, workspaceId, "members", async () => {
    const member = await authorize(actor, workspaceId, "members");
    const fingerprint = digest({ action: "member.invite", email, role });
    const previous = await IdempotencyKey.findOne({ workspaceId, key }).lean();
    if (previous) {
      if (
        previous.actorId !== actor.userId ||
        previous.fingerprint !== fingerprint
      )
        throw new HttpError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This key was used for another request.",
        );
      return previous.response;
    }
    if (role === "ADMIN" && member.role !== "OWNER")
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Only an owner can invite an administrator.",
      );
    const entitlement = await workspaceEntitlements(workspaceId);
    const pending = await Invitation.countDocuments({
      workspaceId,
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
      email: { $ne: email },
    });
    if (
      (await Membership.countDocuments({ workspaceId })) + pending >=
      entitlement.members
    )
      throw new HttpError(
        422,
        "CONFLICT",
        `${entitlement.name} allows ${entitlement.members} workspace member${entitlement.members === 1 ? "" : "s"}, including the owner and pending invitations. Manage membership in Billing.`,
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
      `${actor.name} invited you to ${workspace?.name} as ${role.toLowerCase()}.\n\nSign in with ${email}, then open:\n${loadConfig().WEB_ORIGIN}/invitations?token=${token}\n\nThis invitation expires in 3 days.`,
      workspaceId,
    );
    const result = {
      id: invitation.id,
      email,
      role,
      expiresAt: invitation.expiresAt,
    };
    await IdempotencyKey.create({
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

export async function acceptInvitation(
  actor: Principal,
  token: string,
  requestId: string,
) {
  return atomic(async () => {
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
    const workspace = await Workspace.findOneAndUpdate(
      { _id: invitation.workspaceId },
      { $inc: { revision: 1 } },
    ).lean();
    if (!workspace)
      throw new HttpError(404, "NOT_FOUND", "Workspace not found.");
    const inviter = await Membership.findOne({
      workspaceId: invitation.workspaceId,
      userId: invitation.inviterId,
    }).lean();
    if (
      !inviter ||
      !["OWNER", "ADMIN"].includes(inviter.role) ||
      (invitation.role === "ADMIN" && inviter.role !== "OWNER")
    )
      throw new HttpError(
        404,
        "INVITATION_REVOKED",
        "The invitation is no longer authorized.",
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
    const entitlement = await workspaceEntitlements(invitation.workspaceId);
    if (
      (await Membership.countDocuments({
        workspaceId: invitation.workspaceId,
      })) >= entitlement.members
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
  });
}

export async function removeMember(
  actor: Principal,
  workspaceId: string,
  userId: string,
  requestId: string,
) {
  return workspaceWrite(actor, workspaceId, "members", async () => {
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
  });
}

export async function preferences(actor: Principal) {
  const row = await UserPreferences.findOne({ userId: actor.userId }).lean();
  return {
    ...emptyState(actor.name.slice(0, 60)),
    activeWorkspaceId: null,
    ...serialize(row),
  };
}

export async function savePreferences(
  actor: Principal,
  input: z.infer<typeof preferencesInput>,
) {
  return atomic(async () => {
    const user = await getDb()
      .collection("users")
      .findOneAndUpdate(
        { _id: actor.userId as never },
        { $inc: { preferencesRevision: 1 } },
        nativeOptions(),
      );
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in again.");
    if (input.activeWorkspaceId)
      await authorize(actor, input.activeWorkspaceId);
    const old = await UserPreferences.findOne({ userId: actor.userId }).lean();
    const values = preferencesInput.strip().parse({
      name: actor.name.slice(0, 60),
      theme: "light",
      locale: "en-IN",
      notifications: true,
      dismissed: [],
      onboarded: false,
      chartMonths: 6,
      scenarioMonths: 3,
      activeWorkspaceId: null,
      ...old,
      ...input,
    });
    await UserPreferences.updateOne(
      { userId: actor.userId },
      { $set: values },
      { upsert: true, runValidators: true },
    );
    if (input.name)
      await getDb()
        .collection("users")
        .updateOne(
          { _id: actor.userId as never },
          { $set: { name: input.name } },
          nativeOptions(),
        );
    return values;
  });
}

export async function financeState(actor: Principal, workspaceId: string) {
  return atomic(async () => {
    const member = await authorize(actor, workspaceId);
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace)
      throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    const accounts = await FinancialAccount.find({ workspaceId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    const transactions = await Transaction.find({ workspaceId })
      .sort({ date: -1, _id: -1 })
      .lean();
    const budgets = await Budget.find({ workspaceId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    const goals = await Goal.find({ workspaceId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    const prefs = await preferences(actor);
    return {
      workspace: serialize(workspace),
      role: member.role,
      state: stateSchema.parse({
        ...prefs,
        accounts: accounts.map(serialize),
        transactions: transactions.map(serialize),
        budgets: budgets.map(serialize),
        goals: goals.map(serialize),
      }),
    };
  });
}

export async function createRecurrence(
  actor: Principal,
  workspaceId: string,
  input: z.infer<typeof recurrenceInput>,
  requestId: string,
  key: string,
) {
  return workspaceWrite(actor, workspaceId, "write", async () => {
    const fingerprint = digest({ action: "recurring.create", input });
    const previous = await IdempotencyKey.findOne({ workspaceId, key }).lean();
    if (previous) {
      if (
        previous.actorId !== actor.userId ||
        previous.fingerprint !== fingerprint
      )
        throw new HttpError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This key was used for another request.",
        );
      return previous.response;
    }
    await assertAccount(workspaceId, input.transaction.accountId);
    await assertPlanWrite(workspaceId, actor.userId);
    await requireWorkspaceFeature(workspaceId, "recurring");
    if ((await RecurringRule.countDocuments({ workspaceId })) >= 100)
      throw new HttpError(
        422,
        "LIMIT",
        "This workspace supports up to 100 recurring rules.",
      );
    const rule = await RecurringRule.create({
      ...input,
      workspaceId,
      actorId: actor.userId,
      anchorDay: Number(input.nextDue.slice(8, 10)),
      anchorMonth: Number(input.nextDue.slice(5, 7)),
    });
    await AuditEvent.create({
      workspaceId,
      actorId: actor.userId,
      action: "recurring.created",
      resourceId: rule.id,
      requestId,
    });
    const result = serialize(rule.toObject());
    await IdempotencyKey.create({
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

export async function runRecurrences(today = localDate()) {
  const rules = await RecurringRule.find({
    enabled: true,
    nextDue: { $lte: today },
  })
    .sort({ nextDue: 1 })
    .limit(100)
    .lean();
  for (const candidate of rules) {
    await atomic(async () => {
      const workspace = await Workspace.findOneAndUpdate(
        { _id: candidate.workspaceId },
        { $inc: { revision: 1 } },
      ).lean();
      const rule = await RecurringRule.findOne({
        _id: candidate._id,
        enabled: true,
        nextDue: { $lte: today },
      }).lean();
      if (!workspace || !rule) return;
      const creator = await Membership.findOne({
        workspaceId: rule.workspaceId,
        userId: rule.actorId,
      }).lean();
      if (
        !creator ||
        creator.role === "VIEWER" ||
        (rule.endDate && rule.nextDue > rule.endDate)
      ) {
        await RecurringRule.updateOne({ _id: rule._id }, { enabled: false });
        return;
      }
      await assertAccount(rule.workspaceId, rule.transaction.accountId);
      if (
        (await Transaction.countDocuments({ workspaceId: rule.workspaceId })) >=
        10000
      ) {
        await RecurringRule.updateOne({ _id: rule._id }, { enabled: false });
        return;
      }
      try {
        await assertPlanWrite(rule.workspaceId, rule.actorId);
        await requireWorkspaceFeature(rule.workspaceId, "recurring");
        await reserveTransactions(rule.workspaceId, 1);
      } catch (error) {
        if (error instanceof HttpError && error.status === 403) return;
        throw error;
      }
      const recurrenceKey = `${rule._id}:${rule.nextDue}`;
      await Transaction.updateOne(
        { workspaceId: rule.workspaceId, recurrenceKey },
        {
          $setOnInsert: {
            _id: randomUUID(),
            ...rule.transaction,
            workspaceId: rule.workspaceId,
            date: rule.nextDue,
            recurrenceKey,
            version: 1,
          },
        },
        { upsert: true, runValidators: true },
      );
      const nextDue = nextOccurrence(
        rule.nextDue,
        rule.frequency as "daily" | "weekly" | "monthly" | "yearly",
        rule.anchorDay,
        rule.anchorMonth,
      );
      await RecurringRule.updateOne(
        { _id: rule._id },
        { nextDue, enabled: !rule.endDate || nextDue <= rule.endDate },
      );
      await AuditEvent.create({
        workspaceId: rule.workspaceId,
        actorId: rule.actorId,
        action: "recurring.recorded",
        resourceId: String(rule._id),
        requestId: recurrenceKey,
      });
    });
  }
}

export async function createReport(
  actor: Principal,
  workspaceId: string,
  input: z.infer<typeof reportInput>,
  requestId: string,
) {
  return workspaceWrite(actor, workspaceId, "read", async () => {
    await requireWorkspaceFeature(workspaceId, "reports");
    const transactions = await Transaction.find({
      workspaceId,
      date: { $gte: input.start, $lte: input.end },
    }).lean();
    const totals = periodTotals(transactions, input.start, input.end);
    const token = randomBytes(32).toString("base64url");
    const report = await SharedReport.create({
      workspaceId,
      actorId: actor.userId,
      tokenHash: digest(token),
      ...input,
      ...totals,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    });
    await AuditEvent.create({
      workspaceId,
      actorId: actor.userId,
      action: "report.shared",
      resourceId: report.id,
      requestId,
    });
    return {
      id: report.id,
      url: `${loadConfig().WEB_ORIGIN}/reports/${token}`,
      expiresAt: report.expiresAt,
      ...input,
      ...totals,
    };
  });
}

export async function exportWorkspace(
  actor: Principal,
  workspaceId: string,
  requestId: string,
) {
  return workspaceWrite(actor, workspaceId, "owner", async () => {
    const workspace = await Workspace.findById(workspaceId).lean();
    const accounts = await FinancialAccount.find({ workspaceId }).lean();
    const transactions = await Transaction.find({ workspaceId }).lean();
    const budgets = await Budget.find({ workspaceId }).lean();
    const goals = await Goal.find({ workspaceId }).lean();
    const recurring = await RecurringRule.find({ workspaceId }).lean();
    await AuditEvent.create({
      workspaceId,
      actorId: actor.userId,
      action: "workspace.exported",
      requestId,
    });
    return {
      format: "finsight-workspace-v1",
      exportedAt: new Date().toISOString(),
      money: {
        encoding: "integer-minor-units",
        scale: 100,
        currency: workspace?.currency,
        minorUnit: "paise",
      },
      workspace: {
        workspace: serialize(workspace),
        accounts: accounts.map(serialize),
        transactions: transactions.map(serialize),
        budgets: budgets.map(serialize),
        goals: goals.map(serialize),
        recurring: recurring.map(serialize),
      },
    };
  });
}

export async function deleteWorkspace(
  actor: Principal,
  workspaceId: string,
  confirmation: string,
) {
  if (!actor.fresh)
    throw new HttpError(
      403,
      "FRESH_SESSION_REQUIRED",
      "Sign in again before deleting a workspace.",
    );
  return workspaceWrite(actor, workspaceId, "owner", async () => {
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace || confirmation !== `DELETE ${workspace.name}`)
      throw new HttpError(
        422,
        "CONFIRMATION",
        "Type DELETE followed by the exact workspace name.",
      );
    for (const name of [
      "FinancialAccount",
      "Transaction",
      "Budget",
      "Goal",
      "AuditEvent",
      "IdempotencyKey",
      "Invitation",
      "Membership",
      "RecurringRule",
      "SharedReport",
      "WorkspaceUsage",
    ])
      await model(name).deleteMany({ workspaceId });
    await getDb()
      .collection("email_outbox")
      .deleteMany({ workspaceId }, nativeOptions());
    await UserPreferences.updateMany(
      { activeWorkspaceId: workspaceId },
      { activeWorkspaceId: null },
    );
    await Workspace.deleteOne({ _id: workspaceId });
    return { deleted: true };
  });
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
  const result = await atomic(async () => {
    const user = await getDb()
      .collection("users")
      .findOneAndUpdate(
        { _id: actor.userId as never },
        { $inc: { workspaceWriteRevision: 1 } },
        nativeOptions(),
      );
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in again.");
    const session = await getDb()
      .collection("sessions")
      .findOne(
        {
          _id: actor.sessionId as never,
          userId: actor.userId,
          expiresAt: { $gt: new Date() },
        },
        nativeOptions(),
      );
    if (!session) throw new HttpError(401, "SESSION_REVOKED", "Sign in again.");
    const billing = await BillingAccount.findById(actor.userId).lean();
    if (
      billing?.pendingOperationId ||
      (billing?.subscriptionId &&
        !["cancelled", "completed", "expired"].includes(billing.status))
    )
      throw new HttpError(
        409,
        "SUBSCRIPTION_ACTIVE",
        "Cancel your subscription and wait for cancellation to complete before deleting your account.",
      );
    if (
      await Membership.countDocuments({ userId: actor.userId, role: "OWNER" })
    )
      throw new HttpError(
        409,
        "OWNED_WORKSPACES",
        "Export and delete your owned workspaces before deleting your account.",
      );
    await Membership.deleteMany({ userId: actor.userId });
    await Invitation.deleteMany({
      $or: [{ email: actor.email.toLowerCase() }, { inviterId: actor.userId }],
    });
    await UserPreferences.deleteOne({ userId: actor.userId });
    await UserOperation.deleteMany({ userId: actor.userId });
    await BillingAccount.deleteOne({ _id: actor.userId });
    await BillingOperation.deleteMany({ userId: actor.userId });
    await BillingSubscription.deleteMany({ userId: actor.userId });
    await BillingInvoice.updateMany(
      { userId: actor.userId },
      { userId: `deleted:${randomUUID()}` },
    );
    await IdempotencyKey.deleteMany({ actorId: actor.userId });
    await SharedReport.deleteMany({ actorId: actor.userId });
    await RecurringRule.updateMany(
      { actorId: actor.userId },
      { enabled: false, actorId: "deleted-user" },
    );
    for (const collection of ["sessions", "accounts", "twoFactors", "passkeys"])
      await getDb()
        .collection(collection)
        .deleteMany({ userId: actor.userId as never }, nativeOptions());
    await getDb()
      .collection("email_outbox")
      .deleteMany({ to: actor.email.toLowerCase() }, nativeOptions());
    await getDb()
      .collection("users")
      .deleteOne({ _id: actor.userId as never }, nativeOptions());
    await AuditEvent.updateMany(
      { actorId: actor.userId },
      { actorId: "deleted-user" },
    );
    return { deleted: true };
  });
  await redis()
    .del(rateKey(`api:${actor.userId}`))
    .catch(() => undefined);
  return result;
}
