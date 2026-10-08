import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { plans, type PaidPlan } from "@finsight/shared";
import { loadConfig } from "./config";
import { HttpError } from "./http";

const timestamp = z.number().int().nonnegative().nullable();
export const subscriptionSchema = z.object({
  id: z.string().regex(/^sub_[A-Za-z0-9]+$/),
  plan_id: z.string(),
  status: z.enum([
    "created",
    "authenticated",
    "active",
    "pending",
    "halted",
    "cancelled",
    "completed",
    "expired",
    "paused",
  ]),
  current_start: timestamp,
  current_end: timestamp,
  quantity: z.number().int(),
  notes: z
    .union([z.record(z.string(), z.string()), z.array(z.unknown())])
    .transform((value) => (Array.isArray(value) ? {} : value)),
  short_url: z.string().nullable().optional(),
  has_scheduled_changes: z.boolean().optional(),
  customer_id: z.string().nullable().optional(),
});
export type ProviderSubscription = z.infer<typeof subscriptionSchema>;
export const paymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  invoice_id: z.string().nullable(),
  amount_refunded: z.number().int().nonnegative().default(0),
  created_at: z.number().int(),
});
export const providerInvoiceSchema = z.object({
  id: z.string(),
  subscription_id: z.string().nullable(),
  payment_id: z.string().nullable(),
  currency: z.string(),
  amount: z.number().int(),
  status: z.string(),
  billing_start: timestamp.optional(),
  billing_end: timestamp.optional(),
  line_items: z
    .array(
      z.object({
        item_id: z.string().nullable().optional(),
        amount: z.number().int(),
      }),
    )
    .default([]),
});

export function verifySignature(
  message: string | Buffer,
  signature: string | undefined,
  secret: string,
) {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    createHmac("sha256", secret).update(message).digest(),
    Buffer.from(signature, "hex"),
  );
}
export function billingEnabled() {
  return Boolean(loadConfig().RAZORPAY_KEY_ID);
}
export function providerPlan(plan: PaidPlan) {
  const config = loadConfig();
  if (!config.RAZORPAY_KEY_ID)
    throw new HttpError(
      503,
      "BILLING_DISABLED",
      "Paid memberships are not available on this installation.",
    );
  return (
    plan === "pro"
      ? config.RAZORPAY_PRO_PLAN_ID
      : config.RAZORPAY_BUSINESS_PLAN_ID
  )!;
}
export function localPlan(id: string): PaidPlan {
  const config = loadConfig();
  if (id === config.RAZORPAY_PRO_PLAN_ID) return "pro";
  if (id === config.RAZORPAY_BUSINESS_PLAN_ID) return "business";
  throw new HttpError(
    502,
    "BILLING_PLAN_MISMATCH",
    "The provider subscription uses an unrecognized plan.",
  );
}
export class ProviderError extends HttpError {
  constructor(
    public readonly definitive: boolean,
    status: number,
    message: string,
  ) {
    super(status, "PAYMENT_PROVIDER_ERROR", message);
  }
}
// Never automatically retry mutations: an interrupted create may have succeeded.
export async function razorpay<T extends z.ZodType>(
  path: string,
  schema: T,
  method = "GET",
  body?: unknown,
): Promise<z.infer<T>> {
  const config = loadConfig();
  if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET)
    throw new HttpError(
      503,
      "BILLING_DISABLED",
      "Paid memberships are not available on this installation.",
    );
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ProviderError(
      false,
      503,
      "The payment provider did not confirm the request. Refresh billing to reconcile it before trying again.",
    );
  }
  if (!response.ok) {
    // Do not log or echo provider bodies: they can contain personal/payment data.
    throw new ProviderError(
      response.status >= 400 && response.status < 500,
      response.status === 400 ? 422 : 503,
      response.status === 400
        ? "The provider could not apply this change. UPI and e-mandate subscriptions require cancellation and a new subscription to change plans."
        : "The payment provider is temporarily unavailable. Refresh billing before trying again.",
    );
  }
  const result = schema.safeParse(await response.json().catch(() => null));
  if (!result.success)
    throw new ProviderError(
      false,
      502,
      "The payment provider returned an unexpected response. Refresh billing to reconcile the request.",
    );
  return result.data;
}
export const fetchSubscription = (id: string) =>
  razorpay(`subscriptions/${encodeURIComponent(id)}`, subscriptionSchema);
export async function validateProviderPlan(plan: PaidPlan) {
  const result = await razorpay(
    `plans/${providerPlan(plan)}`,
    z.object({
      period: z.string(),
      interval: z.number(),
      item: z.object({ amount: z.number(), currency: z.string() }),
    }),
  );
  if (
    result.period !== "monthly" ||
    result.interval !== 1 ||
    result.item.currency !== "INR" ||
    result.item.amount !== plans[plan].total
  )
    throw new HttpError(
      503,
      "BILLING_PLAN_MISMATCH",
      "The monthly INR plan price does not match the published GST-inclusive price.",
    );
}
