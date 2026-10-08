import { randomUUID } from "node:crypto";
import { Schema, model } from "mongoose";

const paise = {
  type: Number,
  required: true,
  min: 0,
  max: 100_000_000_000,
} as const;
const timestamps = true;
const id = { type: String, default: () => randomUUID() } as const;

const workspaceSchema = new Schema(
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
transactionSchema.index(
  { workspaceId: 1, recurrenceKey: 1 },
  {
    unique: true,
    partialFilterExpression: { recurrenceKey: { $type: "string" } },
  },
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

const preferencesSchema = new Schema(
  {
    _id: id,
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true, maxlength: 60 },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    locale: { type: String, enum: ["en-IN"], default: "en-IN" },
    notifications: { type: Boolean, default: true },
    dismissed: { type: [String], default: [] },
    onboarded: { type: Boolean, default: false },
    activeWorkspaceId: { type: String, default: null },
    chartMonths: { type: Number, enum: [3, 6, 12], default: 6 },
    scenarioMonths: { type: Number, enum: [3, 6, 12], default: 3 },
  },
  { timestamps },
);
export const UserPreferences = model("UserPreferences", preferencesSchema);

const recurrenceSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    transaction: { type: Schema.Types.Mixed, required: true },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
    },
    nextDue: { type: String, required: true },
    anchorDay: { type: Number, required: true },
    anchorMonth: { type: Number, required: true },
    endDate: { type: String, default: null },
    enabled: { type: Boolean, default: true },
  },
  { timestamps },
);
recurrenceSchema.index({ enabled: 1, nextDue: 1, workspaceId: 1 });
export const RecurringRule = model("RecurringRule", recurrenceSchema);

const reportSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    income: { type: Number, required: true },
    expenses: { type: Number, required: true },
    saved: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps },
);
export const SharedReport = model("SharedReport", reportSchema);

const userOperationSchema = new Schema(
  {
    _id: id,
    userId: { type: String, required: true },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    response: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps },
);
userOperationSchema.index({ userId: 1, key: 1 }, { unique: true });
export const UserOperation = model("UserOperation", userOperationSchema);

const billingAccountSchema = new Schema(
  {
    _id: { type: String, required: true },
    revision: { type: Number, default: 0 },
    profile: { type: String, default: null },
    subscriptionId: { type: String, default: null },
    plan: { type: String, enum: ["pro", "business"], default: null },
    paidPlan: { type: String, enum: ["pro", "business"], default: null },
    status: { type: String, default: "none" },
    currentEnd: { type: Date, default: null },
    paidThrough: { type: Date, default: null },
    cancelAtCycleEnd: { type: Boolean, default: false },
    scheduledPlan: { type: String, enum: ["pro", "business"], default: null },
    recoveryUrl: { type: String, default: null },
    pendingOperationId: { type: String, default: null },
    lastDunningKey: { type: String, default: null },
  },
  { timestamps },
);
billingAccountSchema.index(
  { subscriptionId: 1 },
  {
    unique: true,
    partialFilterExpression: { subscriptionId: { $type: "string" } },
  },
);
export const BillingAccount = model("BillingAccount", billingAccountSchema);

const billingOperationSchema = new Schema(
  {
    _id: id,
    userId: { type: String, required: true },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    action: {
      type: String,
      enum: ["checkout", "change", "cancel"],
      required: true,
    },
    plan: { type: String, enum: ["pro", "business"], default: null },
    subscriptionId: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
    },
    response: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps },
);
billingOperationSchema.index({ userId: 1, key: 1 }, { unique: true });
export const BillingOperation = model(
  "BillingOperation",
  billingOperationSchema,
);
export const BillingSubscription = model(
  "BillingSubscription",
  new Schema(
    {
      _id: { type: String, required: true },
      userId: { type: String, required: true, index: true },
      parties: { type: String, required: true },
    },
    { timestamps },
  ),
);

const webhookSchema = new Schema(
  {
    _id: { type: String, required: true },
    digest: { type: String, required: true },
    event: { type: String, required: true },
    subscriptionId: { type: String, default: null },
  },
  { timestamps },
);
export const BillingWebhook = model("BillingWebhook", webhookSchema);
const invoiceSchema = new Schema(
  {
    _id: id,
    userId: { type: String, required: true, index: true },
    number: { type: String, required: true, unique: true },
    paymentId: { type: String, required: true, unique: true },
    subscriptionId: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    plan: { type: String, enum: ["pro", "business"], required: true },
    testMode: { type: Boolean, required: true },
    base: paise,
    gst: paise,
    total: paise,
    cgst: paise,
    sgst: paise,
    igst: paise,
    // Immutable encrypted supplier/recipient snapshot, separate from editable profile.
    parties: { type: String, required: true },
    retainUntil: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps },
);
invoiceSchema.index({ userId: 1, issuedAt: -1, _id: -1 });
export const BillingInvoice = model("BillingInvoice", invoiceSchema);
export const InvoiceCounter = model(
  "InvoiceCounter",
  new Schema({
    _id: { type: String, required: true },
    value: { type: Number, default: 0 },
  }),
);
const usageSchema = new Schema(
  {
    _id: id,
    workspaceId: { type: String, required: true },
    month: { type: String, required: true },
    transactions: { type: Number, default: 0 },
  },
  { timestamps },
);
usageSchema.index({ workspaceId: 1, month: 1 }, { unique: true });
export const WorkspaceUsage = model("WorkspaceUsage", usageSchema);
