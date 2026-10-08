import { createHash } from "node:crypto";
import { z } from "zod";
import {
  billingProfileSchema,
  effectivePlan,
  financialYear,
  localDate,
  plans,
  taxBreakdown,
  type BillingProfile,
  type BillingSummary,
  type BillingInvoice as Invoice,
  type CheckoutSession,
  type PaidPlan,
  type checkoutVerification,
} from "@finsight/shared";
import {
  BillingAccount,
  BillingInvoice,
  BillingOperation,
  BillingSubscription,
  BillingWebhook,
  InvoiceCounter,
  Membership,
  Transaction,
  Workspace,
  WorkspaceUsage,
} from "./models";
import { atomic, nativeOptions } from "./repositories/unit-of-work";
import { getDb } from "./mongo";
import { loadConfig } from "./config";
import { decryptSecret, encryptSecret } from "./encryption";
import { queueEmail } from "./email";
import { HttpError } from "./http";
import type { Principal } from "./principal";
import {
  billingEnabled,
  fetchSubscription,
  localPlan,
  paymentSchema,
  providerInvoiceSchema,
  providerPlan,
  ProviderError,
  razorpay,
  subscriptionSchema,
  validateProviderPlan,
  verifySignature,
  type ProviderSubscription,
} from "./razorpay";

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const terminal = (status: string) =>
  ["cancelled", "completed", "expired"].includes(status);
const testMode = () =>
  Boolean(loadConfig().RAZORPAY_KEY_ID?.startsWith("rzp_test_"));
const checkoutResult = (id: string, plan: PaidPlan): CheckoutSession => ({
  subscriptionId: id,
  plan,
  keyId: loadConfig().RAZORPAY_KEY_ID!,
  testMode: testMode(),
});
function safeRecoveryUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["rzp.io", "razorpay.com", "api.razorpay.com"].includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
async function lockUser(actor: Principal) {
  const user = await getDb()
    .collection("users")
    .findOneAndUpdate(
      { _id: actor.userId as never },
      { $inc: { billingRevision: 1 } },
      nativeOptions(),
    );
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
  if (!user || !session)
    throw new HttpError(401, "SESSION_REVOKED", "Sign in again.");
}
export async function saveBillingProfile(
  actor: Principal,
  profile: BillingProfile,
) {
  return atomic(async () => {
    await lockUser(actor);
    const account = await BillingAccount.findOneAndUpdate(
      { _id: actor.userId },
      { $inc: { revision: 1 } },
      { upsert: true, new: true },
    );
    if (
      account.pendingOperationId ||
      (account.subscriptionId && !terminal(account.status))
    )
      throw new HttpError(
        409,
        "BILLING_PROFILE_LOCKED",
        "Billing details are fixed for the current subscription. Cancel it before changing the details for a new subscription.",
      );
    account.profile = encryptSecret(
      JSON.stringify(billingProfileSchema.parse(profile)),
      `billing-profile:${actor.userId}`,
    );
    await account.save();
    return profile;
  });
}

export async function billingSummary(
  actor: Principal,
): Promise<BillingSummary> {
  const account = await BillingAccount.findById(actor.userId).lean();
  const invoices = await BillingInvoice.find(
    { userId: actor.userId },
    { parties: 0 },
  )
    .sort({ issuedAt: -1, _id: -1 })
    .limit(100)
    .lean();
  return {
    enabled: billingEnabled(),
    testMode: testMode(),
    plan: effectivePlan(account),
    profile: account?.profile
      ? billingProfileSchema.parse(
          JSON.parse(
            decryptSecret(account.profile, `billing-profile:${actor.userId}`),
          ),
        )
      : null,
    pendingOperation: Boolean(account?.pendingOperationId),
    subscription: account?.subscriptionId
      ? {
          id: account.subscriptionId,
          plan: account.plan as PaidPlan,
          status: account.status,
          paidThrough: account.paidThrough?.toISOString() ?? null,
          currentEnd: account.currentEnd?.toISOString() ?? null,
          cancelAtCycleEnd: account.cancelAtCycleEnd,
          scheduledPlan: account.scheduledPlan as PaidPlan | null,
          recoveryUrl: account.recoveryUrl ?? null,
        }
      : null,
    invoices: invoices.map(
      ({
        _id,
        __v,
        userId,
        createdAt,
        updatedAt,
        parties,
        retainUntil,
        ...invoice
      }) => ({
        ...invoice,
        id: String(_id),
        plan: invoice.plan as PaidPlan,
        issuedAt: invoice.issuedAt.toISOString(),
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
      }),
    ),
  };
}
export async function billingInvoice(
  actor: Principal,
  id: string,
): Promise<Invoice> {
  const invoice = await BillingInvoice.findOne({
    _id: id,
    userId: actor.userId,
  }).lean();
  if (!invoice) throw new HttpError(404, "NOT_FOUND", "Invoice not found.");
  const {
    _id,
    __v,
    userId,
    parties,
    createdAt,
    updatedAt,
    retainUntil,
    ...values
  } = invoice;
  return {
    ...values,
    id: String(_id),
    plan: values.plan as PaidPlan,
    issuedAt: values.issuedAt.toISOString(),
    periodStart: values.periodStart.toISOString(),
    periodEnd: values.periodEnd.toISOString(),
    ...JSON.parse(
      decryptSecret(parties, `billing-invoice:${invoice.paymentId}`),
    ),
  };
}

async function reserve(
  actor: Principal,
  key: string,
  action: "checkout" | "change" | "cancel",
  plan?: PaidPlan,
) {
  if (!billingEnabled())
    throw new HttpError(
      503,
      "BILLING_DISABLED",
      "Paid memberships are not available on this installation.",
    );
  if (!actor.fresh)
    throw new HttpError(
      403,
      "FRESH_SESSION_REQUIRED",
      "Sign in again before changing your subscription.",
    );
  return atomic(async () => {
    await lockUser(actor);
    const account = await BillingAccount.findOneAndUpdate(
      { _id: actor.userId },
      { $inc: { revision: 1 } },
      { upsert: true, new: true },
    );
    const fingerprint = hash(JSON.stringify({ action, plan: plan ?? null }));
    const previous = await BillingOperation.findOne({
      userId: actor.userId,
      key,
    });
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This key was used for another billing request.",
        );
      if (previous.status === "succeeded")
        return { operation: previous, repeat: true };
      if (previous.status === "failed")
        throw new HttpError(
          409,
          "BILLING_REQUEST_FAILED",
          "This request was rejected by the provider. Start a new request after reviewing your subscription.",
        );
      throw new HttpError(
        409,
        "BILLING_PENDING",
        "This request is awaiting confirmation. Refresh billing to reconcile it.",
      );
    }
    if (account.pendingOperationId)
      throw new HttpError(
        409,
        "BILLING_PENDING",
        "Another billing request is awaiting confirmation. Refresh billing first.",
      );
    if (action === "checkout") {
      if (!account.profile)
        throw new HttpError(
          422,
          "BILLING_PROFILE_REQUIRED",
          "Save your billing details before subscribing.",
        );
      if (
        account.subscriptionId &&
        (!terminal(account.status) || effectivePlan(account) !== "free")
      )
        throw new HttpError(
          409,
          "SUBSCRIPTION_EXISTS",
          "Manage your existing subscription. Start a new one after its paid period ends.",
        );
    } else {
      if (!account.subscriptionId || terminal(account.status))
        throw new HttpError(
          409,
          "NO_SUBSCRIPTION",
          "There is no renewable subscription to change.",
        );
      if (
        action === "change" &&
        (!["authenticated", "active"].includes(account.status) ||
          account.cancelAtCycleEnd ||
          account.scheduledPlan ||
          account.plan === plan)
      )
        throw new HttpError(
          409,
          "SUBSCRIPTION_CHANGE_UNAVAILABLE",
          "This subscription cannot change plans in its current state. Refresh billing or cancel it first.",
        );
    }
    const operation = await BillingOperation.create({
      userId: actor.userId,
      key,
      fingerprint,
      action,
      plan: plan ?? null,
      subscriptionId: action === "checkout" ? null : account.subscriptionId,
    });
    account.pendingOperationId = operation.id;
    await account.save();
    return { operation, repeat: false };
  });
}

async function finish(operationId: string, subscription: ProviderSubscription) {
  return atomic(async () => {
    const operation = await BillingOperation.findById(operationId);
    if (!operation)
      throw new HttpError(
        409,
        "BILLING_OPERATION_MISSING",
        "The billing request no longer exists.",
      );
    if (operation.status === "succeeded") return operation.response;
    const account = await BillingAccount.findOneAndUpdate(
      { _id: operation.userId, pendingOperationId: operationId },
      { $inc: { revision: 1 } },
      { new: true },
    );
    if (!account)
      throw new HttpError(
        409,
        "BILLING_CONFLICT",
        "Refresh billing before continuing.",
      );
    const plan = localPlan(subscription.plan_id);
    if (subscription.quantity !== 1)
      throw new HttpError(
        502,
        "BILLING_QUANTITY_MISMATCH",
        "The provider subscription quantity does not match the membership.",
      );
    if (operation.action === "checkout") {
      if (
        subscription.notes.finsightOperationId !== operationId ||
        subscription.notes.finsightUserId !== operation.userId ||
        plan !== operation.plan
      )
        throw new HttpError(
          502,
          "BILLING_OWNERSHIP_MISMATCH",
          "The provider subscription does not match this request.",
        );
      const profile = JSON.parse(
        decryptSecret(account.profile!, `billing-profile:${operation.userId}`),
      );
      const user = await getDb()
        .collection("users")
        .findOne({ _id: operation.userId as never }, nativeOptions());
      if (!user)
        throw new HttpError(
          409,
          "BILLING_USER_MISSING",
          "The account no longer exists.",
        );
      const config = loadConfig();
      const parties = {
        recipient: { ...profile, email: String(user.email) },
        supplier: {
          name: config.BILLING_BUSINESS_NAME,
          address: config.BILLING_BUSINESS_ADDRESS,
          gstin: config.BILLING_GSTIN,
          stateCode: config.BILLING_STATE_CODE,
          sac: config.BILLING_SAC,
        },
      };
      await BillingSubscription.updateOne(
        { _id: subscription.id },
        {
          $setOnInsert: {
            userId: operation.userId,
            parties: encryptSecret(
              JSON.stringify(parties),
              `billing-subscription:${subscription.id}`,
            ),
          },
        },
        { upsert: true },
      );
      account.subscriptionId = subscription.id;
      account.plan = plan;
      account.status = subscription.status;
      account.currentEnd = subscription.current_end
        ? new Date(subscription.current_end * 1000)
        : null;
      account.cancelAtCycleEnd = false;
      account.scheduledPlan = null;
      account.recoveryUrl = safeRecoveryUrl(subscription.short_url);
      operation.response = checkoutResult(
        subscription.id,
        operation.plan as PaidPlan,
      );
    } else {
      if (
        subscription.id !== operation.subscriptionId ||
        subscription.id !== account.subscriptionId
      )
        throw new HttpError(
          409,
          "BILLING_CONFLICT",
          "The subscription changed during this request.",
        );
      if (operation.action === "cancel") account.cancelAtCycleEnd = true;
      else account.scheduledPlan = operation.plan;
      operation.response = { confirmed: true };
    }
    account.pendingOperationId = null;
    await account.save();
    operation.subscriptionId = subscription.id;
    operation.status = "succeeded";
    await operation.save();
    return operation.response;
  });
}
async function reject(operationId: string) {
  await atomic(async () => {
    const operation = await BillingOperation.findOneAndUpdate(
      { _id: operationId, status: "pending" },
      { status: "failed" },
    );
    if (operation)
      await BillingAccount.updateOne(
        { _id: operation.userId, pendingOperationId: operationId },
        { $set: { pendingOperationId: null }, $inc: { revision: 1 } },
      );
  });
}
async function applyOperation(operation: {
  action: string;
  plan?: string | null;
  subscriptionId?: string | null;
  userId: string;
  _id: string;
}) {
  if (operation.action === "checkout") {
    await validateProviderPlan(operation.plan as PaidPlan);
    return razorpay("subscriptions", subscriptionSchema, "POST", {
      plan_id: providerPlan(operation.plan as PaidPlan),
      total_count: 120,
      quantity: 1,
      customer_notify: true,
      expire_by: Math.floor(Date.now() / 1000) + 86_400,
      notes: {
        finsightUserId: operation.userId,
        finsightOperationId: operation._id,
      },
    });
  }
  const current = await fetchSubscription(operation.subscriptionId!);
  if (operation.action === "cancel")
    return terminal(current.status)
      ? current
      : razorpay(
          `subscriptions/${current.id}/cancel`,
          subscriptionSchema,
          "POST",
          {
            cancel_at_cycle_end: Boolean(
              current.current_end && current.current_end * 1000 > Date.now(),
            ),
          },
        );
  if (current.has_scheduled_changes) {
    const scheduled = await razorpay(
      `subscriptions/${current.id}/retrieve_scheduled_changes`,
      subscriptionSchema,
    );
    if (localPlan(scheduled.plan_id) === operation.plan) return current;
    throw new HttpError(
      409,
      "BILLING_CHANGE_CONFLICT",
      "A different provider plan change is already scheduled.",
    );
  }
  if (localPlan(current.plan_id) === operation.plan) return current;
  await validateProviderPlan(operation.plan as PaidPlan);
  return razorpay(`subscriptions/${current.id}`, subscriptionSchema, "PATCH", {
    plan_id: providerPlan(operation.plan as PaidPlan),
    schedule_change_at: "cycle_end",
    customer_notify: true,
  });
}
export async function changeBilling(
  actor: Principal,
  key: string,
  action: "checkout" | "change" | "cancel",
  plan?: PaidPlan,
) {
  const { operation, repeat } = await reserve(actor, key, action, plan);
  if (repeat) return operation.response;
  try {
    return await finish(operation.id, await applyOperation(operation));
  } catch (error) {
    if (
      (error instanceof ProviderError && error.definitive) ||
      (error instanceof HttpError && error.code === "BILLING_PLAN_MISMATCH")
    )
      await reject(operation.id);
    throw error;
  }
}

export async function reconcileOperation(userId: string) {
  const account = await BillingAccount.findById(userId).lean();
  if (!account?.pendingOperationId) return;
  const operation = await BillingOperation.findById(account.pendingOperationId);
  if (!operation || operation.status !== "pending") return;
  // Allow the initiating request to finish before a reconciler examines it.
  if (Date.now() - operation.createdAt.getTime() < 30_000) return;
  if (operation.action !== "checkout") {
    await finish(operation.id, await applyOperation(operation));
    return;
  }
  const from = Math.floor(operation.createdAt.getTime() / 1000) - 60;
  for (let skip = 0; skip < 1_000; skip += 100) {
    const page = await razorpay(
      `subscriptions?from=${from}&count=100&skip=${skip}`,
      z.object({ items: z.array(subscriptionSchema) }),
    );
    const subscription = page.items.find(
      (item) =>
        item.notes.finsightOperationId === operation.id &&
        item.notes.finsightUserId === userId,
    );
    if (subscription) {
      await finish(operation.id, subscription);
      return;
    }
    if (page.items.length < 100) break;
  }
  // A missing result does not prove that an interrupted create failed. Keep the
  // durable reservation rather than creating a second chargeable subscription.
}

type Charge = {
  payment: z.infer<typeof paymentSchema>;
  invoice: z.infer<typeof providerInvoiceSchema>;
  plan: PaidPlan;
};
async function fetchCharges(
  subscriptionId: string,
  paymentId?: string,
): Promise<Charge[]> {
  const invoices: z.infer<typeof providerInvoiceSchema>[] = [];
  if (paymentId) {
    const payment = await razorpay(
      `payments/${encodeURIComponent(paymentId)}`,
      paymentSchema,
    );
    if (payment.invoice_id)
      invoices.push(
        await razorpay(
          `invoices/${encodeURIComponent(payment.invoice_id)}`,
          providerInvoiceSchema,
        ),
      );
  } else {
    // A FinSight subscription has at most 120 cycles. Paginate both pages.
    for (let skip = 0; skip < 200; skip += 100) {
      const page = await razorpay(
        `invoices?subscription_id=${encodeURIComponent(subscriptionId)}&count=100&skip=${skip}`,
        z.object({ items: z.array(providerInvoiceSchema) }),
      );
      invoices.push(...page.items);
      if (page.items.length < 100) break;
    }
  }
  const charges: Charge[] = [];
  for (const invoice of invoices) {
    if (invoice.subscription_id !== subscriptionId)
      throw new HttpError(
        502,
        "PAYMENT_OWNERSHIP_MISMATCH",
        "The payment does not belong to this subscription.",
      );
    if (
      invoice.status !== "paid" ||
      !invoice.payment_id ||
      (await BillingInvoice.exists({ paymentId: invoice.payment_id }))
    )
      continue;
    const payment = await razorpay(
      `payments/${encodeURIComponent(invoice.payment_id)}`,
      paymentSchema,
    );
    if (
      payment.id !== invoice.payment_id ||
      payment.invoice_id !== invoice.id ||
      payment.status !== "captured" ||
      payment.currency !== "INR" ||
      invoice.currency !== "INR" ||
      payment.amount !== invoice.amount ||
      payment.amount_refunded !== 0
    )
      continue;
    const plan = (["pro", "business"] as const).find(
      (value) => plans[value].total === payment.amount,
    );
    // Small mandate-authorisation payments are not membership payments.
    if (!plan) continue;
    if (
      !invoice.billing_start ||
      !invoice.billing_end ||
      invoice.billing_end <= invoice.billing_start
    )
      throw new HttpError(
        502,
        "BILLING_PERIOD_MISSING",
        "The paid invoice has no valid billing period.",
      );
    charges.push({ payment, invoice, plan });
  }
  return charges;
}
async function persistCharges(
  userId: string,
  subscriptionId: string,
  charges: Charge[],
) {
  const source = await BillingSubscription.findOne({
    _id: subscriptionId,
    userId,
  }).lean();
  if (!source)
    throw new HttpError(
      409,
      "BILLING_OWNERSHIP_MISMATCH",
      "This subscription is not linked to the account.",
    );
  const parties: Pick<Invoice, "supplier" | "recipient"> = JSON.parse(
    decryptSecret(source.parties, `billing-subscription:${subscriptionId}`),
  );
  for (const charge of charges) {
    if (await BillingInvoice.exists({ paymentId: charge.payment.id })) continue;
    const issuedAt = new Date(charge.payment.created_at * 1000);
    const fy = financialYear(issuedAt)
      .label.replace(/[^0-9]/g, "")
      .slice(-4);
    const counter = await InvoiceCounter.findOneAndUpdate(
      { _id: `${testMode() ? "test" : "live"}:${fy}` },
      { $inc: { value: 1 } },
      { upsert: true, new: true },
    );
    const number = `${testMode() ? "T" : "F"}${fy}/${String(counter.value).padStart(6, "0")}`;
    const values = taxBreakdown(
      charge.plan,
      parties.supplier.stateCode,
      parties.recipient.stateCode,
    );
    const retainUntil = new Date(issuedAt);
    retainUntil.setUTCFullYear(retainUntil.getUTCFullYear() + 8);
    await BillingInvoice.create({
      userId,
      number,
      paymentId: charge.payment.id,
      subscriptionId,
      plan: charge.plan,
      testMode: testMode(),
      issuedAt,
      retainUntil,
      periodStart: new Date(charge.invoice.billing_start! * 1000),
      periodEnd: new Date(charge.invoice.billing_end! * 1000),
      ...values,
      parties: encryptSecret(
        JSON.stringify(parties),
        `billing-invoice:${charge.payment.id}`,
      ),
    });
    await queueEmail(
      parties.recipient.email,
      `FinSight ${plans[charge.plan].name} payment received`,
      `${testMode() ? "TEST MODE — no live payment.\n\n" : ""}Payment received: INR ${(values.total / 100).toFixed(2)}, including 18% GST. Tax invoice ${number} is available at ${loadConfig().WEB_ORIGIN}/billing. Your billing period ends ${new Date(charge.invoice.billing_end! * 1000).toISOString()}.`,
    );
  }
}

async function syncSubscription(
  userId: string,
  subscriptionId: string,
  event?: { id: string; digest: string; name: string },
  paymentId?: string,
) {
  const before = await BillingAccount.findById(userId).lean();
  if (!before || before.subscriptionId !== subscriptionId) return;
  const current = await fetchSubscription(subscriptionId);
  const plan = localPlan(current.plan_id);
  if (current.quantity !== 1)
    throw new HttpError(
      502,
      "BILLING_QUANTITY_MISMATCH",
      "The subscription quantity does not match the membership.",
    );
  const scheduled = current.has_scheduled_changes
    ? localPlan(
        (
          await razorpay(
            `subscriptions/${subscriptionId}/retrieve_scheduled_changes`,
            subscriptionSchema,
          )
        ).plan_id,
      )
    : null;
  const charges = await fetchCharges(subscriptionId, paymentId);
  await atomic(async () => {
    if (event) {
      const previous = await BillingWebhook.findById(event.id).lean();
      if (previous) {
        if (previous.digest !== event.digest)
          throw new HttpError(
            409,
            "WEBHOOK_CONFLICT",
            "The event identifier was reused for another payload.",
          );
        return;
      }
    }
    // Compare the revision taken BEFORE provider reads. A concurrent sync must
    // refetch canonical provider state instead of committing a stale snapshot.
    const account = await BillingAccount.findOneAndUpdate(
      { _id: userId, subscriptionId, revision: before.revision },
      { $inc: { revision: 1 } },
      { new: true },
    );
    if (!account)
      throw new HttpError(
        503,
        "BILLING_SYNC_CONFLICT",
        "Billing changed during refresh. Try again.",
      );
    await persistCharges(userId, subscriptionId, charges);
    const latest = await BillingInvoice.findOne({ userId, subscriptionId })
      .sort({ periodEnd: -1 })
      .lean();
    account.plan = plan;
    account.status = current.status;
    account.currentEnd = current.current_end
      ? new Date(current.current_end * 1000)
      : null;
    account.scheduledPlan = scheduled;
    account.recoveryUrl = safeRecoveryUrl(current.short_url);
    if (latest) {
      account.paidPlan = latest.plan;
      account.paidThrough = latest.periodEnd;
    }
    const dunningKey = `${subscriptionId}:${current.current_start}:${current.status}`;
    if (
      ["pending", "halted"].includes(current.status) &&
      account.lastDunningKey !== dunningKey
    ) {
      const user = await getDb()
        .collection("users")
        .findOne({ _id: userId as never }, nativeOptions());
      if (user)
        await queueEmail(
          String(user.email),
          "Your FinSight renewal needs attention",
          `Your membership payment could not be collected. Open ${loadConfig().WEB_ORIGIN}/billing to review the subscription and use the provider's secure payment link. Your records remain available. Paid features continue only through the period already paid for; afterward Free limits apply.`,
        );
      account.lastDunningKey = dunningKey;
    }
    if (current.status === "active") account.lastDunningKey = null;
    await account.save();
    if (event)
      await BillingWebhook.create({
        _id: event.id,
        digest: event.digest,
        event: event.name,
        subscriptionId,
      });
  });
}
export async function refreshBilling(actor: Principal) {
  if (billingEnabled()) {
    await reconcileOperation(actor.userId);
    const account = await BillingAccount.findById(actor.userId).lean();
    if (account?.subscriptionId)
      await syncSubscription(actor.userId, account.subscriptionId);
  }
  return billingSummary(actor);
}
export async function verifyCheckout(
  actor: Principal,
  input: z.infer<typeof checkoutVerification>,
) {
  const account = await BillingAccount.findById(actor.userId).lean();
  if (
    !account?.subscriptionId ||
    input.razorpay_subscription_id !== account.subscriptionId ||
    !loadConfig().RAZORPAY_KEY_SECRET ||
    !verifySignature(
      `${input.razorpay_payment_id}|${account.subscriptionId}`,
      input.razorpay_signature,
      loadConfig().RAZORPAY_KEY_SECRET!,
    )
  )
    throw new HttpError(
      400,
      "INVALID_PAYMENT_SIGNATURE",
      "The checkout response could not be verified.",
    );
  await syncSubscription(
    actor.userId,
    account.subscriptionId,
    undefined,
    input.razorpay_payment_id,
  );
  return billingSummary(actor);
}
export async function resumeCheckout(actor: Principal) {
  const account = await BillingAccount.findById(actor.userId).lean();
  if (
    !account?.subscriptionId ||
    account.status !== "created" ||
    account.pendingOperationId ||
    !billingEnabled()
  )
    throw new HttpError(
      409,
      "CHECKOUT_UNAVAILABLE",
      "There is no unfinished checkout to resume.",
    );
  return checkoutResult(account.subscriptionId, account.plan as PaidPlan);
}
const webhookBody = z.object({
  event: z.string().max(100),
  payload: z.object({
    subscription: z
      .object({
        entity: z.object({ id: z.string().regex(/^sub_[A-Za-z0-9]+$/) }),
      })
      .optional(),
    payment: z
      .object({
        entity: z.object({ id: z.string().regex(/^pay_[A-Za-z0-9]+$/) }),
      })
      .optional(),
  }),
});
async function acknowledgeWebhook(
  id: string,
  digest: string,
  event: string,
  subscriptionId?: string,
) {
  let record;
  try {
    record = await BillingWebhook.findOneAndUpdate(
      { _id: id },
      {
        $setOnInsert: { digest, event, subscriptionId: subscriptionId ?? null },
      },
      { upsert: true, new: true },
    ).lean();
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    record = await BillingWebhook.findById(id).lean();
  }
  if (!record || record.digest !== digest)
    throw new HttpError(
      409,
      "WEBHOOK_CONFLICT",
      "The event identifier was reused for another payload.",
    );
}
export async function processBillingWebhook(
  raw: Buffer,
  signature: string | undefined,
  id: string | undefined,
) {
  const config = loadConfig();
  if (!billingEnabled())
    throw new HttpError(503, "BILLING_DISABLED", "Billing is disabled.");
  if (!id || !/^[A-Za-z0-9_-]{8,128}$/.test(id))
    throw new HttpError(
      400,
      "INVALID_WEBHOOK_ID",
      "A valid event identifier is required.",
    );
  if (
    ![
      config.RAZORPAY_WEBHOOK_SECRET,
      config.RAZORPAY_WEBHOOK_PREVIOUS_SECRET,
    ].some((secret) => secret && verifySignature(raw, signature, secret))
  )
    throw new HttpError(
      400,
      "INVALID_WEBHOOK_SIGNATURE",
      "The webhook signature is invalid.",
    );
  const digest = hash(raw);
  const previous = await BillingWebhook.findById(id).lean();
  if (previous) {
    if (previous.digest !== digest)
      throw new HttpError(
        409,
        "WEBHOOK_CONFLICT",
        "The event identifier was reused for another payload.",
      );
    return { received: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_JSON", "The event is not valid JSON.");
  }
  const event = webhookBody.parse(parsed);
  const subscriptionId = event.payload.subscription?.entity.id;
  if (!event.event.startsWith("subscription.") || !subscriptionId) {
    await acknowledgeWebhook(id, digest, event.event);
    return { received: true };
  }
  let source = await BillingSubscription.findById(subscriptionId).lean();
  if (!source) {
    const current = await fetchSubscription(subscriptionId);
    const operation = await BillingOperation.findOne({
      _id: current.notes.finsightOperationId,
      userId: current.notes.finsightUserId,
      action: "checkout",
      status: "pending",
    });
    if (operation) {
      await finish(operation.id, current);
      source = await BillingSubscription.findById(subscriptionId).lean();
    }
  }
  if (source)
    await syncSubscription(
      source.userId,
      subscriptionId,
      { id, digest, name: event.event },
      event.payload.payment?.entity.id,
    );
  // Ignore subscriptions not created by this application, including deliveries
  // for deleted accounts, while durably acknowledging the event.
  if (!(await BillingWebhook.exists({ _id: id })))
    await acknowledgeWebhook(id, digest, event.event, subscriptionId);
  return { received: true };
}

export async function userEntitlements(userId: string) {
  const account = await BillingAccount.findById(userId).lean();
  const plan = effectivePlan(account);
  return { plan, ...plans[plan] };
}
export async function workspaceEntitlements(workspaceId: string) {
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) throw new HttpError(404, "NOT_FOUND", "Workspace not found.");
  return {
    ...(await userEntitlements(workspace.ownerId)),
    ownerId: workspace.ownerId,
  };
}
export async function requireWorkspaceFeature(
  workspaceId: string,
  feature: "recurring" | "reports" | "audit",
) {
  const entitlement = await workspaceEntitlements(workspaceId);
  if (!entitlement[feature])
    throw new HttpError(
      403,
      "PLAN_REQUIRED",
      `${feature === "audit" ? "Business" : "Pro or Business"} membership is required for this feature. Manage membership in Billing.`,
    );
}
export async function assertPlanWrite(workspaceId: string, actorId: string) {
  const entitlement = await workspaceEntitlements(workspaceId);
  const owned = await Workspace.find({ ownerId: entitlement.ownerId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(entitlement.workspaces)
    .lean();
  if (!owned.some((workspace) => String(workspace._id) === workspaceId))
    throw new HttpError(
      403,
      "WORKSPACE_PLAN_LIMIT",
      "This workspace is read-only under the owner's current membership. Export or delete it, or upgrade in Billing.",
    );
  if (actorId !== entitlement.ownerId) {
    const permitted = await Membership.find({
      workspaceId,
      role: { $ne: "OWNER" },
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(Math.max(1, entitlement.members - 1))
      .lean();
    if (
      entitlement.members === 1 ||
      !permitted.some((member) => member.userId === actorId)
    )
      throw new HttpError(
        403,
        "MEMBER_PLAN_LIMIT",
        "Your shared access is read-only under the owner's current membership.",
      );
  }
  return entitlement;
}
export async function reserveTransactions(workspaceId: string, count: number) {
  if (!count) return;
  const entitlement = await workspaceEntitlements(workspaceId);
  const month = localDate().slice(0, 7);
  const usage = await WorkspaceUsage.findOne({ workspaceId, month });
  const used =
    usage?.transactions ??
    (await Transaction.countDocuments({
      workspaceId,
      createdAt: { $gte: new Date(`${month}-01T00:00:00+05:30`) },
    }));
  if (used + count > entitlement.monthlyTransactions)
    throw new HttpError(
      403,
      "MONTHLY_TRANSACTION_LIMIT",
      `${entitlement.name} allows ${entitlement.monthlyTransactions.toLocaleString("en-IN")} new transactions per workspace each calendar month. Upgrade or try next month. Deleted entries still count.`,
    );
  await WorkspaceUsage.updateOne(
    { workspaceId, month },
    { $set: { transactions: used + count } },
    { upsert: true },
  );
}

export async function reconcileBilling() {
  if (!billingEnabled()) return;
  const pending = await BillingAccount.find({
    pendingOperationId: { $type: "string" },
  })
    .limit(20)
    .lean();
  for (const account of pending) {
    try {
      await reconcileOperation(String(account._id));
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "billing_reconciliation_failed",
          code: error instanceof HttpError ? error.code : "DATABASE_ERROR",
        }),
      );
    }
  }
}
