import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import {
  Account as AccountContract,
  accountInput,
  budgetInput,
  cashFlow,
  categories,
  goalInput,
  localDate,
  recurrenceInput,
  summarize,
  transactionInput,
  type Transaction as TransactionContract,
} from "@finsight/shared";
import {
  Account,
  AuditEvent,
  Budget,
  Goal,
  IdempotencyRecord,
  Invitation,
  Membership,
  RecurringRule,
  Transaction,
  User,
  Workspace,
} from "./models.js";
import { HttpError } from "./http.js";
import type { Principal } from "./middleware.js";
import {
  decryptField,
  digest,
  encryptField,
  hashPassword,
  newOpaqueToken,
  verifyPassword,
} from "./security.js";

function serialize<T extends Record<string, unknown> | null>(value: T) {
  if (!value) return null;
  const { _id, ...rest } = value;
  delete (rest as Record<string, unknown>).__v;
  return { ...rest, id: String(_id) } as Omit<T, "_id" | "__v"> & {
    id: string;
  };
}

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function idempotent<T>(
  scope: string,
  actorId: string,
  key: string | undefined,
  input: unknown,
  work: () => Promise<T>,
) {
  if (!key) return work();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(key))
    throw new HttpError(
      422,
      "INVALID_IDEMPOTENCY_KEY",
      "Use an Idempotency-Key between 8 and 128 characters.",
    );
  const hash = fingerprint(input);
  const existing = await IdempotencyRecord.findOne({
    scope,
    actorId,
    key,
  }).lean();
  if (existing) {
    if (existing.fingerprint !== hash)
      throw new HttpError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This key was already used for another request.",
      );
    if (existing.state === "completed") return existing.response as T;
    if (existing.expiresAt <= new Date()) {
      await IdempotencyRecord.deleteOne({
        _id: existing._id,
        state: "pending",
      });
      return idempotent(scope, actorId, key, input, work);
    }
    throw new HttpError(
      409,
      "IDEMPOTENCY_IN_PROGRESS",
      "That request is already being processed. Retry with the same key shortly.",
    );
  }
  let reservation;
  try {
    reservation = await IdempotencyRecord.create({
      scope,
      actorId,
      key,
      fingerprint: hash,
      state: "pending",
      response: null,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new HttpError(
        409,
        "IDEMPOTENCY_IN_PROGRESS",
        "That request is already being processed. Retry with the same key shortly.",
      );
    throw error;
  }
  try {
    const result = await work();
    await IdempotencyRecord.updateOne(
      { _id: reservation._id, fingerprint: hash, state: "pending" },
      {
        $set: {
          state: "completed",
          response: result,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    );
    return result;
  } catch (error) {
    await IdempotencyRecord.deleteOne({
      _id: reservation._id,
      state: "pending",
    });
    throw error;
  }
}

async function audit(
  actorId: string,
  action: string,
  requestId: string,
  workspaceId?: string,
  resourceId?: string,
) {
  await AuditEvent.create({
    actorId,
    action,
    requestId,
    workspaceId: workspaceId ?? null,
    resourceId: resourceId ?? null,
  });
}

export async function createUser(
  input: {
    name: string;
    email: string;
    password: string;
    privacyAccepted: boolean;
  },
  requestId: string,
) {
  if (!input.privacyAccepted)
    throw new HttpError(
      422,
      "PRIVACY_REQUIRED",
      "Accept the privacy notice before creating an account.",
    );
  const email = input.email.trim().toLowerCase();
  const emailHash = digest(email);
  if (await User.exists({ emailHash, deletedAt: null }))
    throw new HttpError(
      409,
      "EMAIL_IN_USE",
      "An account with that email already exists.",
    );
  if (input.password.length < 12 || input.password.length > 128)
    throw new HttpError(
      422,
      "WEAK_PASSWORD",
      "Use a password between 12 and 128 characters.",
    );
  const user = await User.create({
    name: input.name.trim(),
    emailHash,
    emailCiphertext: encryptField(email),
    passwordHash: await hashPassword(input.password),
    privacyAcceptedAt: new Date(),
  });
  await audit(String(user._id), "account.created", requestId);
  return { id: String(user._id), email, name: user.name };
}

export async function authenticateUser(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await User.findOne({
    emailHash: digest(email),
    deletedAt: null,
  });
  if (!user || !(await verifyPassword(user.passwordHash, password)))
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  return {
    id: String(user._id),
    email: decryptField(user.emailCiphertext),
    name: user.name,
  };
}

export async function getUser(actor: Principal) {
  const user = await User.findOne({
    _id: actor.userId,
    deletedAt: null,
  }).lean();
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "Account not found.");
  return {
    id: String(user._id),
    email: decryptField(user.emailCiphertext),
    name: user.name,
    theme: user.theme,
    activeWorkspaceId: user.activeWorkspaceId,
  };
}

export async function updateUser(
  actor: Principal,
  input: {
    name?: string;
    theme?: "light" | "dark";
    activeWorkspaceId?: string | null;
  },
) {
  if (input.activeWorkspaceId) {
    const member = await Membership.exists({
      workspaceId: input.activeWorkspaceId,
      userId: actor.userId,
    });
    if (!member)
      throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
  }
  const user = await User.findOneAndUpdate(
    { _id: actor.userId, deletedAt: null },
    { $set: input },
    { new: true },
  ).lean();
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "Account not found.");
  return {
    name: user.name,
    theme: user.theme,
    activeWorkspaceId: user.activeWorkspaceId,
  };
}

export async function listWorkspaces(actor: Principal) {
  const memberships = await Membership.find({ userId: actor.userId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(100)
    .lean();
  const workspaces = await Workspace.find({
    _id: { $in: memberships.map((membership) => membership.workspaceId) },
  }).lean();
  const byId = new Map(
    workspaces.map((workspace) => [String(workspace._id), workspace]),
  );
  return memberships.map((membership) => ({
    role: membership.role,
    workspace: serialize(
      byId.get(membership.workspaceId) as unknown as Record<string, unknown>,
    ),
  }));
}

export async function createWorkspace(
  actor: Principal,
  name: string,
  requestId: string,
  key?: string,
) {
  return idempotent(
    "workspace.create",
    actor.userId,
    key,
    { name },
    async () => {
      const session = await mongoose.startSession();
      try {
        let result: { id: string; name: string; currency: string } | undefined;
        await session.withTransaction(async () => {
          const createdRows = await Workspace.create(
            [{ name: name.trim(), ownerId: actor.userId, currency: "INR" }],
            { session },
          );
          const workspace = createdRows[0];
          if (!workspace)
            throw new HttpError(
              500,
              "WORKSPACE_CREATE_FAILED",
              "Workspace could not be created.",
            );
          await Membership.create(
            [
              {
                workspaceId: String(workspace._id),
                userId: actor.userId,
                role: "OWNER",
              },
            ],
            { session },
          );
          await User.updateOne(
            { _id: actor.userId },
            { $set: { activeWorkspaceId: String(workspace._id) } },
            { session },
          );
          await AuditEvent.create(
            [
              {
                actorId: actor.userId,
                action: "workspace.created",
                requestId,
                workspaceId: String(workspace._id),
              },
            ],
            { session },
          );
          result = {
            id: String(workspace._id),
            name: workspace.name,
            currency: workspace.currency,
          };
        });
        if (!result)
          throw new HttpError(
            500,
            "WORKSPACE_CREATE_FAILED",
            "Workspace could not be created.",
          );
        return result;
      } finally {
        await session.endSession();
      }
    },
  );
}

async function assertAccount(workspaceId: string, accountId: string) {
  const account = await Account.findOne({ _id: accountId, workspaceId }).lean();
  if (!account)
    throw new HttpError(
      404,
      "ACCOUNT_NOT_FOUND",
      "Account not found in this workspace.",
    );
  return account;
}

export async function overview(workspaceId: string) {
  const month = localDate().slice(0, 7);
  const [
    workspace,
    accounts,
    budgets,
    goals,
    recent,
    monthly,
    balanceGroups,
    monthSpending,
  ] = await Promise.all([
    Workspace.findById(workspaceId).lean(),
    Account.find({ workspaceId })
      .sort({ createdAt: 1, _id: 1 })
      .limit(100)
      .lean(),
    Budget.find({ workspaceId, month: localDate().slice(0, 7) })
      .sort({ category: 1 })
      .limit(100)
      .lean(),
    Goal.find({ workspaceId }).sort({ due: 1, _id: 1 }).limit(100).lean(),
    Transaction.find({ workspaceId })
      .sort({ date: -1, _id: -1 })
      .limit(8)
      .lean(),
    Transaction.aggregate([
      { $match: { workspaceId } },
      {
        $group: {
          _id: { month: { $substr: ["$date", 0, 7] }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
      { $limit: 24 },
    ]),
    Transaction.aggregate([
      { $match: { workspaceId } },
      {
        $group: {
          _id: "$accountId",
          income: {
            $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
          },
          expense: {
            $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
          },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: { workspaceId, type: "expense", date: { $regex: `^${month}` } },
      },
      { $group: { _id: "$category", spent: { $sum: "$amount" } } },
    ]),
  ]);
  if (!workspace)
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
  const balanceByAccount = new Map(
    balanceGroups.map(
      (group: { _id: string; income: number; expense: number }) => [
        group._id,
        group.income - group.expense,
      ],
    ),
  );
  const normalizedAccounts = accounts.map((account) => ({
    ...serialize(account as unknown as Record<string, unknown>),
    balance:
      account.openingBalance + (balanceByAccount.get(String(account._id)) ?? 0),
  })) as unknown as AccountContract[];
  const totals = monthly.filter(
    (row: { _id: { month: string } }) => row._id.month === month,
  );
  const income = totals
    .filter((row: { _id: { type: string } }) => row._id.type === "income")
    .reduce((sum: number, row: { total: number }) => sum + row.total, 0);
  const expenses = totals
    .filter((row: { _id: { type: string } }) => row._id.type === "expense")
    .reduce((sum: number, row: { total: number }) => sum + row.total, 0);
  const normalizedTransactions = recent.map((row) =>
    serialize(row as unknown as Record<string, unknown>),
  ) as unknown as TransactionContract[];
  const spendByCategory = new Map(
    monthSpending.map((row: { _id: string; spent: number }) => [
      row._id,
      row.spent,
    ]),
  );
  const budgetRows = budgets.map((budget) => ({
    id: String(budget._id),
    category: budget.category,
    month: budget.month,
    limit: budget.limit,
    spent: spendByCategory.get(budget.category) ?? 0,
  }));
  const saved = income - expenses;
  const savingRate = income ? Math.round((saved / income) * 100) : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      40 +
        Math.min(35, Math.max(-30, savingRate)) +
        (budgetRows.length ? 15 : 0) -
        budgetRows.filter((budget) => budget.spent > budget.limit).length * 8 +
        (income > 0 ? 10 : 0),
    ),
  );
  return {
    workspace: {
      id: String(workspace._id),
      name: workspace.name,
      currency: workspace.currency,
    },
    accounts: normalizedAccounts,
    budgets: budgetRows,
    goals: goals.map((goal) => ({
      id: String(goal._id),
      name: goal.name,
      target: goal.target,
      saved: goal.saved,
      due: goal.due,
    })),
    recent: normalizedTransactions,
    totals: {
      income,
      expenses,
      saved,
      savingRate,
      score,
      remaining: budgetRows.reduce(
        (sum, budget) => sum + budget.limit - budget.spent,
        0,
      ),
      balance: normalizedAccounts.reduce(
        (sum, account) => sum + account.balance,
        0,
      ),
    },
    trend: monthly.map(
      (row: { _id: { month: string; type: string }; total: number }) => ({
        month: row._id.month,
        type: row._id.type,
        total: row.total,
      }),
    ),
  };
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return undefined;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { date: string; id: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date) || !parsed.id)
      throw new Error();
    return parsed;
  } catch {
    throw new HttpError(422, "INVALID_CURSOR", "That page cursor is invalid.");
  }
}

export async function listTransactions(
  workspaceId: string,
  input: { limit: number; cursor?: string; category?: string; search?: string },
) {
  const filter: Record<string, unknown> = { workspaceId };
  if (input.category && categories.includes(input.category as never))
    filter.category = input.category;
  if (input.search)
    filter.merchant = {
      $regex: input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  const cursor = decodeCursor(input.cursor);
  if (cursor)
    filter.$or = [
      { date: { $lt: cursor.date } },
      { date: cursor.date, _id: { $lt: cursor.id } },
    ];
  const rows = await Transaction.find(filter)
    .sort({ date: -1, _id: -1 })
    .limit(Math.min(100, input.limit) + 1)
    .lean();
  const hasMore = rows.length > input.limit;
  const items = rows
    .slice(0, input.limit)
    .map((row) => serialize(row as unknown as Record<string, unknown>));
  const last = rows[input.limit - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? Buffer.from(
            JSON.stringify({ date: last.date, id: String(last._id) }),
          ).toString("base64url")
        : null,
  };
}

export async function createTransaction(
  workspaceId: string,
  actor: Principal,
  input: unknown,
  requestId: string,
  key?: string,
) {
  const data = transactionInput.parse(input);
  return idempotent(
    `transaction.create:${workspaceId}`,
    actor.userId,
    key,
    data,
    async () => {
      await assertAccount(workspaceId, data.accountId);
      const count = await Transaction.countDocuments({ workspaceId });
      if (count >= 100_000)
        throw new HttpError(
          422,
          "TRANSACTION_LIMIT",
          "This workspace has reached its supported transaction limit.",
        );
      const row = await Transaction.create({ workspaceId, ...data });
      await audit(
        actor.userId,
        "transaction.created",
        requestId,
        workspaceId,
        String(row._id),
      );
      return serialize(row.toObject() as unknown as Record<string, unknown>);
    },
  );
}

export async function updateTransaction(
  workspaceId: string,
  actor: Principal,
  id: string,
  version: number,
  input: unknown,
  requestId: string,
) {
  const data = transactionInput.parse(input);
  await assertAccount(workspaceId, data.accountId);
  const row = await Transaction.findOneAndUpdate(
    { _id: id, workspaceId, version },
    { $set: data, $inc: { version: 1 } },
    { new: true, runValidators: true },
  ).lean();
  if (!row)
    throw new HttpError(
      409,
      "STALE_VERSION",
      "This transaction changed. Refresh before saving again.",
    );
  await audit(actor.userId, "transaction.updated", requestId, workspaceId, id);
  return serialize(row as unknown as Record<string, unknown>);
}

export async function deleteTransaction(
  workspaceId: string,
  actor: Principal,
  id: string,
  version: number,
  requestId: string,
) {
  const deleted = await Transaction.findOneAndDelete({
    _id: id,
    workspaceId,
    version,
  });
  if (!deleted)
    throw new HttpError(
      409,
      "STALE_VERSION",
      "This transaction changed. Refresh before deleting again.",
    );
  await audit(actor.userId, "transaction.deleted", requestId, workspaceId, id);
  return { deleted: true };
}

export async function listAccounts(workspaceId: string) {
  const accounts = await Account.find({ workspaceId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(100)
    .lean();
  const balances = await Transaction.aggregate([
    { $match: { workspaceId } },
    {
      $group: {
        _id: "$accountId",
        income: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        expense: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
      },
    },
  ]);
  const byId = new Map(
    balances.map((row: { _id: string; income: number; expense: number }) => [
      row._id,
      row.income - row.expense,
    ]),
  );
  return accounts.map((account) => ({
    id: String(account._id),
    name: account.name,
    type: account.type,
    openingBalance: account.openingBalance,
    balance: account.openingBalance + (byId.get(String(account._id)) ?? 0),
  }));
}

export async function createAccount(
  workspaceId: string,
  actor: Principal,
  input: unknown,
  requestId: string,
  key?: string,
) {
  const data = accountInput.parse(input);
  return idempotent(
    `account.create:${workspaceId}`,
    actor.userId,
    key,
    data,
    async () => {
      if ((await Account.countDocuments({ workspaceId })) >= 100)
        throw new HttpError(
          422,
          "ACCOUNT_LIMIT",
          "This workspace supports up to 100 accounts.",
        );
      const row = await Account.create({ workspaceId, ...data });
      await audit(
        actor.userId,
        "account.created",
        requestId,
        workspaceId,
        String(row._id),
      );
      return { id: String(row._id), ...data, balance: data.openingBalance };
    },
  );
}

export async function deleteAccount(
  workspaceId: string,
  actor: Principal,
  id: string,
  requestId: string,
) {
  if (await Transaction.exists({ workspaceId, accountId: id }))
    throw new HttpError(
      409,
      "ACCOUNT_HAS_TRANSACTIONS",
      "Move or delete its transactions before removing this account.",
    );
  const result = await Account.deleteOne({ _id: id, workspaceId });
  if (!result.deletedCount)
    throw new HttpError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
  await audit(actor.userId, "account.deleted", requestId, workspaceId, id);
  return { deleted: true };
}

export async function listBudgets(workspaceId: string) {
  const month = localDate().slice(0, 7);
  const [budgets, spending] = await Promise.all([
    Budget.find({ workspaceId })
      .sort({ month: -1, category: 1 })
      .limit(500)
      .lean(),
    Transaction.aggregate([
      {
        $match: { workspaceId, type: "expense", date: { $regex: `^${month}` } },
      },
      { $group: { _id: "$category", spent: { $sum: "$amount" } } },
    ]),
  ]);
  const spent = new Map(
    spending.map((row: { _id: string; spent: number }) => [row._id, row.spent]),
  );
  return budgets.map((budget) => ({
    id: String(budget._id),
    category: budget.category,
    month: budget.month,
    limit: budget.limit,
    spent: spent.get(budget.category) ?? 0,
  }));
}

export async function saveBudget(
  workspaceId: string,
  actor: Principal,
  input: unknown,
  requestId: string,
  key?: string,
) {
  const data = budgetInput.parse(input);
  return idempotent(
    `budget.save:${workspaceId}`,
    actor.userId,
    key,
    data,
    async () => {
      const row = await Budget.findOneAndUpdate(
        { workspaceId, category: data.category, month: data.month },
        { $set: data, $setOnInsert: { workspaceId } },
        { new: true, upsert: true, runValidators: true },
      ).lean();
      await audit(
        actor.userId,
        "budget.saved",
        requestId,
        workspaceId,
        String(row?._id),
      );
      return { id: String(row?._id), ...data, spent: 0 };
    },
  );
}

export async function deleteBudget(
  workspaceId: string,
  actor: Principal,
  id: string,
  requestId: string,
) {
  const result = await Budget.deleteOne({ _id: id, workspaceId });
  if (!result.deletedCount)
    throw new HttpError(404, "BUDGET_NOT_FOUND", "Budget not found.");
  await audit(actor.userId, "budget.deleted", requestId, workspaceId, id);
  return { deleted: true };
}

export async function listGoals(workspaceId: string) {
  return (
    await Goal.find({ workspaceId }).sort({ due: 1, _id: 1 }).limit(100).lean()
  ).map((goal) => ({
    id: String(goal._id),
    name: goal.name,
    target: goal.target,
    saved: goal.saved,
    due: goal.due,
  }));
}

export async function createGoal(
  workspaceId: string,
  actor: Principal,
  input: unknown,
  requestId: string,
  key?: string,
) {
  const data = goalInput.parse(input);
  return idempotent(
    `goal.create:${workspaceId}`,
    actor.userId,
    key,
    data,
    async () => {
      if ((await Goal.countDocuments({ workspaceId })) >= 100)
        throw new HttpError(
          422,
          "GOAL_LIMIT",
          "This workspace supports up to 100 goals.",
        );
      const goal = await Goal.create({ workspaceId, ...data, saved: 0 });
      await audit(
        actor.userId,
        "goal.created",
        requestId,
        workspaceId,
        String(goal._id),
      );
      return { id: String(goal._id), ...data, saved: 0 };
    },
  );
}

export async function contributeGoal(
  workspaceId: string,
  actor: Principal,
  id: string,
  amount: number,
  requestId: string,
  key?: string,
) {
  return idempotent(
    `goal.contribute:${workspaceId}:${id}`,
    actor.userId,
    key,
    { amount },
    async () => {
      if (!Number.isSafeInteger(amount) || amount <= 0)
        throw new HttpError(
          422,
          "INVALID_AMOUNT",
          "Enter a positive whole paise amount.",
        );
      const goal = await Goal.findOneAndUpdate(
        {
          _id: id,
          workspaceId,
          $expr: { $lte: [{ $add: ["$saved", amount] }, "$target"] },
        },
        { $inc: { saved: amount } },
        { new: true },
      ).lean();
      if (!goal)
        throw new HttpError(
          422,
          "GOAL_LIMIT",
          "That contribution is more than the amount remaining.",
        );
      await audit(actor.userId, "goal.contributed", requestId, workspaceId, id);
      return {
        id: String(goal._id),
        name: goal.name,
        target: goal.target,
        saved: goal.saved,
        due: goal.due,
      };
    },
  );
}

export async function listRecurring(workspaceId: string) {
  return (
    await RecurringRule.find({ workspaceId })
      .sort({ nextDate: 1, _id: 1 })
      .limit(100)
      .lean()
  ).map((row) => ({
    id: String(row._id),
    accountId: row.accountId,
    merchant: row.merchant,
    amount: row.amount,
    type: row.type,
    category: row.category,
    frequency: row.frequency,
    nextDate: row.nextDate,
    enabled: row.enabled,
  }));
}

export async function createRecurring(
  workspaceId: string,
  actor: Principal,
  input: unknown,
  requestId: string,
  key?: string,
) {
  const data = recurrenceInput.parse(input);
  await assertAccount(workspaceId, data.accountId);
  return idempotent(
    `recurring.create:${workspaceId}`,
    actor.userId,
    key,
    data,
    async () => {
      const row = await RecurringRule.create({ workspaceId, ...data });
      await audit(
        actor.userId,
        "recurring.created",
        requestId,
        workspaceId,
        String(row._id),
      );
      return { id: String(row._id), ...data, enabled: true };
    },
  );
}

export async function recordRecurring(
  workspaceId: string,
  actor: Principal,
  id: string,
  requestId: string,
  key?: string,
) {
  return idempotent(
    `recurring.record:${workspaceId}:${id}`,
    actor.userId,
    key,
    {},
    async () => {
      const session = await mongoose.startSession();
      try {
        let result: unknown;
        await session.withTransaction(async () => {
          const rule = await RecurringRule.findOne({
            _id: id,
            workspaceId,
            enabled: true,
          })
            .session(session)
            .lean();
          if (!rule)
            throw new HttpError(
              404,
              "RECURRING_NOT_FOUND",
              "Recurring rule is disabled or missing.",
            );
          const transactionRows = await Transaction.create(
            [
              {
                workspaceId,
                accountId: rule.accountId,
                merchant: rule.merchant,
                amount: rule.amount,
                type: rule.type,
                category: rule.category,
                date: rule.nextDate,
                note: "Recorded from recurring rule",
              },
            ],
            { session },
          );
          const transaction = transactionRows[0];
          if (!transaction)
            throw new HttpError(
              500,
              "TRANSACTION_CREATE_FAILED",
              "Recurring transaction could not be recorded.",
            );
          const date = new Date(`${rule.nextDate}T12:00:00.000Z`);
          if (rule.frequency === "monthly")
            date.setUTCMonth(date.getUTCMonth() + 1);
          else date.setUTCFullYear(date.getUTCFullYear() + 1);
          const nextDate = date.toISOString().slice(0, 10);
          await RecurringRule.updateOne(
            { _id: id, workspaceId },
            { $set: { nextDate } },
            { session },
          );
          await AuditEvent.create(
            [
              {
                actorId: actor.userId,
                action: "recurring.recorded",
                requestId,
                workspaceId,
                resourceId: id,
              },
            ],
            { session },
          );
          result = { transactionId: String(transaction._id), nextDate };
        });
        return result;
      } finally {
        await session.endSession();
      }
    },
  );
}

export async function workspaceInsights(workspaceId: string) {
  const [accounts, transactions, budgets] = await Promise.all([
    listAccounts(workspaceId),
    Transaction.find({ workspaceId })
      .sort({ date: -1, _id: -1 })
      .limit(10_000)
      .lean(),
    Budget.find({ workspaceId }).limit(500).lean(),
  ]);
  const normalized = transactions.map((row) =>
    serialize(row as unknown as Record<string, unknown>),
  ) as unknown as TransactionContract[];
  const summary = summarize(
    accounts as AccountContract[],
    normalized,
    budgets.map((row) => ({
      id: String(row._id),
      category: row.category,
      month: row.month,
      limit: row.limit,
      spent: 0,
    })) as never[],
  );
  const categoriesSummary = await Transaction.aggregate([
    { $match: { workspaceId, type: "expense" } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
    { $limit: 12 },
  ]);
  return {
    summary,
    cashFlow: cashFlow(normalized, 6),
    categories: categoriesSummary.map(
      (row: { _id: string; total: number }) => ({
        category: row._id,
        total: row.total,
      }),
    ),
  };
}

export async function exportWorkspace(
  workspaceId: string,
  actor: Principal,
  requestId: string,
) {
  const [workspace, accounts, transactions, budgets, goals, recurring] =
    await Promise.all([
      Workspace.findById(workspaceId).lean(),
      Account.find({ workspaceId }).limit(100).lean(),
      Transaction.find({ workspaceId })
        .sort({ date: 1, _id: 1 })
        .limit(100_000)
        .lean(),
      Budget.find({ workspaceId }).limit(500).lean(),
      Goal.find({ workspaceId }).limit(100).lean(),
      RecurringRule.find({ workspaceId }).limit(100).lean(),
    ]);
  if (!workspace)
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
  await audit(actor.userId, "workspace.exported", requestId, workspaceId);
  return {
    format: "finsight-workspace-v1",
    exportedAt: new Date().toISOString(),
    money: { currency: "INR", encoding: "integer-minor-units", scale: 100 },
    truncated: transactions.length >= 100_000,
    workspace: { id: String(workspace._id), name: workspace.name },
    accounts: accounts.map((row) =>
      serialize(row as unknown as Record<string, unknown>),
    ),
    transactions: transactions.map((row) =>
      serialize(row as unknown as Record<string, unknown>),
    ),
    budgets: budgets.map((row) =>
      serialize(row as unknown as Record<string, unknown>),
    ),
    goals: goals.map((row) =>
      serialize(row as unknown as Record<string, unknown>),
    ),
    recurring: recurring.map((row) =>
      serialize(row as unknown as Record<string, unknown>),
    ),
  };
}

export async function deleteWorkspace(
  workspaceId: string,
  actor: Principal,
  confirmation: string,
  requestId: string,
) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    ownerId: actor.userId,
  }).lean();
  if (!workspace)
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
  if (confirmation !== `DELETE ${workspace.name}`)
    throw new HttpError(
      422,
      "CONFIRMATION_REQUIRED",
      "Type DELETE followed by the exact workspace name.",
    );
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Promise.all([
        Account.deleteMany({ workspaceId }, { session }),
        Transaction.deleteMany({ workspaceId }, { session }),
        Budget.deleteMany({ workspaceId }, { session }),
        Goal.deleteMany({ workspaceId }, { session }),
        RecurringRule.deleteMany({ workspaceId }, { session }),
        Invitation.deleteMany({ workspaceId }, { session }),
        Membership.deleteMany({ workspaceId }, { session }),
        AuditEvent.create(
          [
            {
              actorId: actor.userId,
              action: "workspace.deleted",
              requestId,
              workspaceId,
            },
          ],
          { session },
        ),
      ]);
      await Workspace.deleteOne({ _id: workspaceId }, { session });
      await User.updateMany(
        { activeWorkspaceId: workspaceId },
        { $set: { activeWorkspaceId: null } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return { deleted: true };
}

export async function exportUser(actor: Principal, requestId: string) {
  const [user, memberships, workspaces] = await Promise.all([
    User.findById(actor.userId).lean(),
    Membership.find({ userId: actor.userId }).limit(100).lean(),
    listWorkspaces(actor),
  ]);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "Account not found.");
  await audit(actor.userId, "account.exported", requestId);
  return {
    format: "finsight-personal-data-v1",
    exportedAt: new Date().toISOString(),
    profile: {
      id: String(user._id),
      name: user.name,
      email: decryptField(user.emailCiphertext),
      privacyAcceptedAt: user.privacyAcceptedAt,
    },
    memberships,
    workspaces,
  };
}

export async function deleteUser(
  actor: Principal,
  confirmation: string,
  requestId: string,
) {
  if (confirmation !== "DELETE MY ACCOUNT")
    throw new HttpError(
      422,
      "CONFIRMATION_REQUIRED",
      "Type DELETE MY ACCOUNT to continue.",
    );
  const owned = await Membership.exists({
    userId: actor.userId,
    role: "OWNER",
  });
  if (owned)
    throw new HttpError(
      409,
      "OWNED_WORKSPACES",
      "Delete or transfer owned workspaces before deleting your account.",
    );
  await Membership.deleteMany({ userId: actor.userId });
  await Invitation.deleteMany({ emailHash: digest(actor.email) });
  await User.findByIdAndUpdate(actor.userId, {
    $set: {
      deletedAt: new Date(),
      emailCiphertext: encryptField(`deleted-${randomUUID()}@invalid.local`),
      name: "Deleted account",
      passwordHash: await hashPassword(randomUUID()),
    },
  });
  await audit(actor.userId, "account.deleted", requestId);
  return { deleted: true };
}

export async function listMembers(workspaceId: string) {
  const rows = await Membership.find({ workspaceId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(100)
    .lean();
  const users = await User.find({
    _id: { $in: rows.map((row) => row.userId) },
  }).lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return rows.map((row) => ({
    userId: row.userId,
    role: row.role,
    name: byId.get(row.userId)?.name ?? "Member",
    email: byId.get(row.userId)
      ? decryptField(byId.get(row.userId)!.emailCiphertext)
      : "",
  }));
}

export async function inviteMember(
  workspaceId: string,
  actor: Principal,
  input: { email: string; role: "EDITOR" | "VIEWER" },
  requestId: string,
  key?: string,
) {
  const email = input.email.trim().toLowerCase();
  return idempotent(
    `member.invite:${workspaceId}`,
    actor.userId,
    key,
    { email, role: input.role },
    async () => {
      const token = newOpaqueToken();
      const invite = await Invitation.findOneAndUpdate(
        { workspaceId, emailHash: digest(email), acceptedAt: null },
        {
          $set: {
            emailCiphertext: encryptField(email),
            role: input.role,
            tokenHash: digest(token),
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
          $setOnInsert: { workspaceId, emailHash: digest(email) },
        },
        { upsert: true, new: true },
      ).lean();
      await audit(
        actor.userId,
        "member.invited",
        requestId,
        workspaceId,
        String(invite?._id),
      );
      return {
        id: String(invite?._id),
        email,
        role: input.role,
        inviteToken: token,
        expiresAt: invite?.expiresAt,
      };
    },
  );
}

export async function acceptInvite(
  actor: Principal,
  token: string,
  requestId: string,
) {
  const invite = await Invitation.findOne({
    tokenHash: digest(token),
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!invite || invite.emailHash !== digest(actor.email))
    throw new HttpError(
      404,
      "INVITATION_NOT_FOUND",
      "That invitation is invalid, expired, or belongs to another email.",
    );
  await Membership.updateOne(
    { workspaceId: invite.workspaceId, userId: actor.userId },
    { $setOnInsert: { _id: randomUUID(), role: invite.role } },
    { upsert: true },
  );
  await Invitation.updateOne(
    { _id: invite._id, acceptedAt: null },
    { $set: { acceptedAt: new Date() } },
  );
  await audit(actor.userId, "member.joined", requestId, invite.workspaceId);
  return { workspaceId: invite.workspaceId };
}
