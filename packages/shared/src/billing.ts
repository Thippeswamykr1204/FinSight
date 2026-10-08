import { z } from "zod";

export const plans = {
  free: {
    name: "Free",
    base: 0,
    gst: 0,
    total: 0,
    workspaces: 1,
    members: 1,
    monthlyTransactions: 100,
    recurring: false,
    reports: false,
    audit: false,
  },
  pro: {
    name: "Pro",
    base: 29_900,
    gst: 5_382,
    total: 35_282,
    workspaces: 3,
    members: 2,
    monthlyTransactions: 10_000,
    recurring: true,
    reports: true,
    audit: false,
  },
  business: {
    name: "Business",
    base: 79_900,
    gst: 14_382,
    total: 94_282,
    workspaces: 5,
    members: 5,
    monthlyTransactions: 10_000,
    recurring: true,
    reports: true,
    audit: true,
  },
} as const;
export const planSchema = z.enum(["free", "pro", "business"]);
export const paidPlanSchema = z.enum(["pro", "business"]);
export type Plan = z.infer<typeof planSchema>;
export type PaidPlan = z.infer<typeof paidPlanSchema>;

export const indianStates = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
} as const;
export const stateCodeSchema = z
  .string()
  .refine(
    (value) => value in indianStates,
    "Choose an Indian state or union territory.",
  );

export function validGstin(value: string) {
  if (
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value) ||
    !(value.slice(0, 2) in indianStates)
  )
    return false;
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let index = 0; index < 14; index++) {
    const product = alphabet.indexOf(value[index]) * (index % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return alphabet[(36 - (sum % 36)) % 36] === value[14];
}
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(validGstin, "Enter a valid GSTIN, including its check digit.");
export const billingProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(80),
    postalCode: z
      .string()
      .regex(/^[1-9][0-9]{5}$/, "Enter a six-digit Indian PIN code."),
    stateCode: stateCodeSchema,
    gstin: z.union([z.literal(""), gstinSchema]).default(""),
  })
  .strict()
  .refine((value) => !value.gstin || value.gstin.startsWith(value.stateCode), {
    path: ["gstin"],
    message: "GSTIN must match the billing state.",
  });
export type BillingProfile = z.infer<typeof billingProfileSchema>;
export const checkoutInput = z.object({ plan: paidPlanSchema }).strict();
export const checkoutVerification = z
  .object({
    razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
    razorpay_subscription_id: z.string().regex(/^sub_[A-Za-z0-9]+$/),
    razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export function taxBreakdown(
  plan: PaidPlan,
  supplierState: string,
  recipientState: string,
): {
  base: number;
  gst: number;
  total: number;
  cgst: number;
  sgst: number;
  igst: number;
} {
  const price = plans[plan];
  const local = supplierState === recipientState;
  return {
    base: price.base,
    gst: price.gst,
    total: price.total,
    cgst: local ? price.gst / 2 : 0,
    sgst: local ? price.gst / 2 : 0,
    igst: local ? 0 : price.gst,
  };
}
export function effectivePlan(
  account: {
    paidPlan?: string | null;
    paidThrough?: Date | string | null;
  } | null,
  now = new Date(),
): Plan {
  return account?.paidThrough &&
    new Date(account.paidThrough) > now &&
    paidPlanSchema.safeParse(account.paidPlan).success
    ? (account.paidPlan as PaidPlan)
    : "free";
}
export type CheckoutSession = {
  subscriptionId: string;
  keyId: string;
  plan: PaidPlan;
  testMode: boolean;
};
export type BillingInvoice = ReturnType<typeof taxBreakdown> & {
  id: string;
  number: string;
  paymentId: string;
  subscriptionId: string;
  issuedAt: string;
  periodStart: string;
  periodEnd: string;
  plan: PaidPlan;
  testMode: boolean;
  supplier: {
    name: string;
    address: string;
    gstin: string;
    stateCode: string;
    sac: string;
  };
  recipient: BillingProfile & { email: string };
};
export type BillingSummary = {
  enabled: boolean;
  testMode: boolean;
  plan: Plan;
  profile: BillingProfile | null;
  subscription: {
    id: string;
    plan: PaidPlan;
    status: string;
    paidThrough: string | null;
    currentEnd: string | null;
    cancelAtCycleEnd: boolean;
    scheduledPlan: PaidPlan | null;
    recoveryUrl: string | null;
  } | null;
  pendingOperation: boolean;
  invoices: Omit<BillingInvoice, "supplier" | "recipient">[];
};
