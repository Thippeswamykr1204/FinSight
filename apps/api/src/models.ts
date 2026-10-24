import { randomUUID } from "node:crypto";
import { Schema, model } from "mongoose";

const id = { type: String, default: () => randomUUID() } as const;
const timestamps = true;

const userSchema = new Schema(
  {
    _id: id,
    emailHash: { type: String, required: true, unique: true, index: true },
    emailCiphertext: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    passwordHash: { type: String, required: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    activeWorkspaceId: { type: String, default: null },
    privacyAcceptedAt: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps },
);

const workspaceSchema = new Schema(
  {
    _id: id,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    ownerId: { type: String, required: true, index: true },
  },
  { timestamps },
);
workspaceSchema.index({ ownerId: 1, createdAt: 1, _id: 1 });

const membershipSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ["OWNER", "EDITOR", "VIEWER"], required: true },
  },
  { timestamps },
);
membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, createdAt: 1, _id: 1 });

const accountSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: {
      type: String,
      required: true,
      enum: [
        "Savings",
        "Current",
        "Credit card",
        "Cash",
        "UPI wallet",
        "Fixed deposit",
        "Investments",
        "Loan",
      ],
    },
    openingBalance: {
      type: Number,
      required: true,
      min: -100_000_000_000,
      max: 100_000_000_000,
    },
  },
  { timestamps },
);
accountSchema.index({ workspaceId: 1, createdAt: 1, _id: 1 });

const transactionSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    accountId: { type: String, required: true },
    merchant: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 1, max: 100_000_000_000 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, maxlength: 40 },
    note: { type: String, default: "", maxlength: 500 },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps },
);
transactionSchema.index({ workspaceId: 1, date: -1, _id: -1 });
transactionSchema.index({ workspaceId: 1, category: 1, date: -1, _id: -1 });
transactionSchema.index({ workspaceId: 1, accountId: 1, date: -1, _id: -1 });

const budgetSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true },
    category: { type: String, required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    limit: { type: Number, required: true, min: 1, max: 100_000_000_000 },
  },
  { timestamps },
);
budgetSchema.index({ workspaceId: 1, category: 1, month: 1 }, { unique: true });
budgetSchema.index({ workspaceId: 1, month: 1 });

const goalSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 80 },
    target: { type: Number, required: true, min: 1, max: 100_000_000_000 },
    saved: {
      type: Number,
      required: true,
      min: 0,
      max: 100_000_000_000,
      default: 0,
    },
    due: { type: String, required: true },
  },
  { timestamps },
);
goalSchema.index({ workspaceId: 1, due: 1, _id: 1 });

const recurringSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true },
    accountId: { type: String, required: true },
    merchant: { type: String, required: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 1 },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, maxlength: 40 },
    frequency: { type: String, enum: ["monthly", "yearly"], required: true },
    nextDate: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps },
);
recurringSchema.index({ workspaceId: 1, enabled: 1, nextDate: 1 });

const auditSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, default: null },
    actorId: { type: String, required: true },
    action: { type: String, required: true, maxlength: 80 },
    resourceId: { type: String, default: null },
    requestId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps },
);
auditSchema.index({ workspaceId: 1, createdAt: -1, _id: -1 });

const refreshSchema = new Schema(
  {
    _id: id,
    userId: { type: String, required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
    userAgent: { type: String, default: "" },
  },
  { timestamps },
);
refreshSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const idempotencySchema = new Schema(
  {
    _id: id,
    scope: { type: String, required: true },
    actorId: { type: String, required: true },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    state: { type: String, enum: ["pending", "completed"], default: "pending" },
    response: { type: Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps },
);
idempotencySchema.index({ scope: 1, actorId: 1, key: 1 }, { unique: true });
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const invitationSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true },
    emailHash: { type: String, required: true },
    emailCiphertext: { type: String, required: true },
    role: { type: String, enum: ["EDITOR", "VIEWER"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps },
);
invitationSchema.index({ workspaceId: 1, emailHash: 1, acceptedAt: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const User = model("User", userSchema);
export const Workspace = model("Workspace", workspaceSchema);
export const Membership = model("Membership", membershipSchema);
export const Account = model("Account", accountSchema);
export const Transaction = model("Transaction", transactionSchema);
export const Budget = model("Budget", budgetSchema);
export const Goal = model("Goal", goalSchema);
export const RecurringRule = model("RecurringRule", recurringSchema);
export const AuditEvent = model("AuditEvent", auditSchema);
export const RefreshSession = model("RefreshSession", refreshSchema);
export const IdempotencyRecord = model("IdempotencyRecord", idempotencySchema);
export const Invitation = model("Invitation", invitationSchema);
