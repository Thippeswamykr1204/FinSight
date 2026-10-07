import { randomUUID } from "node:crypto";
import { Schema, model, type InferSchemaType } from "mongoose";

const paise = {
  type: Number,
  required: true,
  min: 0,
  max: 100_000_000_000,
} as const;
const timestamps = true;
const id = { type: String, default: randomUUID } as const;

export const workspaceSchema = new Schema(
  {
    _id: id,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    currency: {
      type: String,
      required: true,
      enum: ["INR", "USD"],
      default: "INR",
    },
    revision: { type: Number, required: true, default: 0 },
    ownerId: { type: String, required: true, index: true },
  },
  { timestamps },
);
workspaceSchema.index({ createdAt: 1, _id: 1 });

export const membershipSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
      required: true,
    },
  },
  { timestamps },
);
membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, createdAt: 1, _id: 1 });

export const accountSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, required: true, maxlength: 30 },
    openingBalance: {
      type: Number,
      required: true,
      min: -100_000_000_000,
      max: 100_000_000_000,
    },
    dueDate: { type: String, default: null },
  },
  { timestamps },
);
accountSchema.index({ workspaceId: 1, createdAt: 1, _id: 1 });

export const transactionSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    merchant: { type: String, required: true, trim: true, maxlength: 120 },
    amount: paise,
    date: { type: String, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, maxlength: 40 },
    note: { type: String, default: "", maxlength: 500 },
    importKey: { type: String, default: null },
    version: { type: Number, required: true, default: 1 },
    recurrenceKey: { type: String, default: null },
  },
  { timestamps },
);
transactionSchema.index({ workspaceId: 1, date: -1, _id: -1 });
transactionSchema.index({ workspaceId: 1, category: 1, date: 1 });
transactionSchema.index({ workspaceId: 1, accountId: 1, date: 1 });
transactionSchema.index(
  { workspaceId: 1, importKey: 1 },
  { unique: true, partialFilterExpression: { importKey: { $type: "string" } } },
);

export const budgetSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    limit: { type: Number, required: true, min: 1, max: 100_000_000_000 },
  },
  { timestamps },
);
budgetSchema.index({ workspaceId: 1, category: 1, month: 1 }, { unique: true });
budgetSchema.index({ workspaceId: 1, month: 1 });

export const goalSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 80 },
    target: { type: Number, required: true, min: 1, max: 100_000_000_000 },
    saved: { type: Number, required: true, min: 0, max: 100_000_000_000 },
    due: { type: String, required: true },
  },
  { timestamps },
);
goalSchema.index({ workspaceId: 1, due: 1 });

export const auditSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    action: { type: String, required: true },
    resourceId: { type: String, default: null },
    requestId: { type: String, required: true },
  },
  { timestamps },
);
auditSchema.index({ workspaceId: 1, createdAt: -1, _id: -1 });

export const idempotencySchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true },
    key: { type: String, required: true },
    actorId: { type: String, required: true },
    fingerprint: { type: String, required: true },
    response: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps },
);
idempotencySchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export const invitationSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["ADMIN", "EDITOR", "VIEWER"], required: true },
    inviterId: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps },
);
invitationSchema.index({ workspaceId: 1, email: 1, acceptedAt: 1 });

export const Workspace = model("Workspace", workspaceSchema);
export const Membership = model("Membership", membershipSchema);
export const FinancialAccount = model("FinancialAccount", accountSchema);
export const Transaction = model("Transaction", transactionSchema);
export const Budget = model("Budget", budgetSchema);
export const Goal = model("Goal", goalSchema);
export const AuditEvent = model("AuditEvent", auditSchema);
export const IdempotencyKey = model("IdempotencyKey", idempotencySchema);
export const Invitation = model("Invitation", invitationSchema);

export type WorkspaceDocument = InferSchemaType<typeof workspaceSchema>;
