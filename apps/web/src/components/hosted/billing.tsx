"use client";

import Link from "next/link";
import Script from "next/script";
import { useRef, useState } from "react";
import { Check, Download, RefreshCw } from "lucide-react";
import {
  billingProfileSchema,
  indianStates,
  money,
  plans,
  type BillingSummary,
  type BillingInvoice,
  type CheckoutSession,
  type PaidPlan,
} from "@finsight/shared";
import {
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/components/finance/provider";
import { api, ApiError } from "@/lib/hosted/client";

type CheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};
type RazorpayConstructor = new (options: {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { email: string; name: string };
  theme: { color: string };
  handler: (result: CheckoutResponse) => void;
  modal: { ondismiss: () => void };
}) => {
  open: () => void;
  on: (event: "payment.failed", listener: () => void) => void;
};
declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function Billing({
  initial,
  email,
  nonce,
}: {
  initial: BillingSummary;
  email: string;
  nonce?: string;
}) {
  const { notice } = useFinance();
  const [billing, setBilling] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const keys = useRef(new Map<string, string>());
  const subscription = billing.subscription;
  const renewable =
    subscription &&
    !["cancelled", "completed", "expired"].includes(subscription.status);
  const profileLocked = Boolean(renewable || billing.pendingOperation);
  const errorText = (caught: unknown) =>
    caught instanceof Error
      ? caught.message
      : "The request could not be completed.";
  async function refresh(provider = false) {
    setBilling(
      await api<BillingSummary>(
        provider ? "/billing/refresh" : "/billing",
        provider ? { method: "POST", body: {} } : undefined,
      ),
    );
  }
  async function action(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }
  async function mutation<T>(path: string, body: unknown) {
    const fingerprint = JSON.stringify({ path, body });
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const result = await api<T>(path, { method: "POST", body, key });
      keys.current.delete(fingerprint);
      return result;
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status >= 400 &&
        caught.status < 500 &&
        !["BILLING_PENDING", "BILLING_SYNC_CONFLICT"].includes(caught.code)
      )
        keys.current.delete(fingerprint);
      throw caught;
    }
  }
  async function checkout(plan: PaidPlan, resume = false) {
    setBusy(true);
    setError("");
    try {
      if (!window.Razorpay || !checkoutReady)
        throw new Error(
          "Secure checkout is still loading. Check your connection and try again.",
        );
      const session = resume
        ? await api<CheckoutSession>("/billing/checkout")
        : await mutation<CheckoutSession>("/billing/checkout", { plan });
      await refresh();
      const modal = new window.Razorpay({
        key: session.keyId,
        subscription_id: session.subscriptionId,
        name: "FinSight",
        description: `${plans[session.plan].name} · ${money(plans[session.plan].total)}/month including 18% GST`,
        prefill: { email, name: billing.profile?.name ?? "" },
        theme: { color: "#178457" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            notice(
              "Checkout closed. You can complete it later or cancel the unfinished subscription.",
            );
          },
        },
        handler: (result) => {
          void action(async () => {
            setBilling(
              await api<BillingSummary>("/billing/verify", {
                method: "POST",
                body: result,
              }),
            );
            notice(
              "Checkout verified. Membership activates when the provider confirms the full monthly payment.",
            );
          });
        },
      });
      modal.on("payment.failed", () => {
        setError(
          "The payment was not completed. Retry in secure checkout or cancel the unfinished subscription.",
        );
        setBusy(false);
      });
      modal.open();
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {billing.enabled && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          nonce={nonce}
          onReady={() => setCheckoutReady(true)}
          onError={() =>
            setError(
              "Secure checkout could not load. Check your connection and refresh this page.",
            )
          }
        />
      )}
      <PageHeading
        eyebrow="Your membership"
        title="A plan for your next chapter."
        description="Membership, secure payments, and GST invoices for your owned workspaces."
      >
        <Button
          variant="outline"
          loading={busy}
          onClick={() => void action(() => refresh(true))}
        >
          <RefreshCw size={15} className="mr-2" /> Refresh billing
        </Button>
      </PageHeading>
      <FormError error={error} />
      {billing.testMode && (
        <p role="status" className="surface p-4 text-sm">
          Razorpay test mode. Checkout uses test payments; test invoices are not
          tax documents.
        </p>
      )}
      {!billing.enabled && (
        <p role="status" className="surface p-4 text-sm">
          This installation offers Free membership. Paid checkout is
          unavailable.
        </p>
      )}
      <section className="surface space-y-4 p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">
            {plans[billing.plan].name} membership
          </h3>
          <span className="text-sm text-[var(--ink-soft)]">
            {subscription?.status ?? "No subscription"}
          </span>
        </div>
        <p className="text-sm leading-7 text-[var(--ink-soft)]">
          {plans[billing.plan].workspaces} owned workspace
          {plans[billing.plan].workspaces === 1 ? "" : "s"} ·{" "}
          {plans[billing.plan].members} member
          {plans[billing.plan].members === 1 ? "" : "s"} per workspace ·{" "}
          {plans[billing.plan].monthlyTransactions.toLocaleString("en-IN")} new
          transactions per workspace each calendar month.
        </p>
        {subscription?.paidThrough && (
          <p className="text-sm">
            Paid access through{" "}
            {new Date(subscription.paidThrough).toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              dateStyle: "long",
            })}
            .
          </p>
        )}
        {subscription?.cancelAtCycleEnd && renewable && (
          <p className="text-sm">
            Cancellation confirmed. Renewal stops at the end of the current
            cycle. Paid access continues through the period already paid for.
          </p>
        )}
        {subscription?.scheduledPlan && (
          <p className="text-sm">
            {plans[subscription.scheduledPlan].name} is scheduled for your next
            billing cycle.
          </p>
        )}
        {billing.pendingOperation && (
          <p role="status" className="text-sm">
            A billing request is awaiting provider confirmation. Refresh billing
            to reconcile it. An interrupted checkout creation is held for
            reconciliation to prevent duplicate subscriptions.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {subscription?.status === "created" && (
            <Button
              disabled={busy || !checkoutReady || billing.pendingOperation}
              onClick={() => void checkout(subscription.plan, true)}
            >
              Complete checkout
            </Button>
          )}
          {subscription?.recoveryUrl &&
            ["pending", "halted"].includes(subscription.status) && (
              <Button asChild>
                <a
                  href={subscription.recoveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Update payment with Razorpay
                </a>
              </Button>
            )}
          {renewable && !subscription.cancelAtCycleEnd && (
            <Button
              variant="outline"
              disabled={busy || billing.pendingOperation}
              onClick={() => setCancelOpen(true)}
            >
              Cancel subscription
            </Button>
          )}
        </div>
      </section>
      <form
        className="surface space-y-5 p-7"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void action(async () => {
            const parsed = billingProfileSchema.safeParse(
              Object.fromEntries(form),
            );
            if (!parsed.success)
              throw new Error(
                parsed.error.issues.map((issue) => issue.message).join(" "),
              );
            await api("/billing/profile", {
              method: "PATCH",
              body: parsed.data,
            });
            await refresh();
            notice("Billing details saved.");
          });
        }}
      >
        <h3 className="text-lg font-semibold">Billing details</h3>
        <p className="text-sm leading-7 text-[var(--ink-soft)]">
          Details are fixed for a subscription and copied to each tax invoice.
          Add a GSTIN only if you are registered. Your state determines CGST +
          SGST or IGST.
        </p>
        <fieldset
          disabled={busy || profileLocked || !billing.enabled}
          className="grid gap-5 sm:grid-cols-2"
        >
          <Field label="Billing name">
            <input
              className="control px-3"
              name="name"
              defaultValue={billing.profile?.name ?? ""}
              required
              maxLength={120}
              autoComplete="organization"
            />
          </Field>
          <Field label="GSTIN (optional)">
            <input
              className="control px-3 uppercase"
              name="gstin"
              defaultValue={billing.profile?.gstin ?? ""}
              maxLength={15}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Billing address">
              <textarea
                className="control min-h-20 p-3"
                name="address"
                defaultValue={billing.profile?.address ?? ""}
                required
                maxLength={500}
                autoComplete="street-address"
              />
            </Field>
          </div>
          <Field label="City">
            <input
              className="control px-3"
              name="city"
              defaultValue={billing.profile?.city ?? ""}
              required
              maxLength={80}
              autoComplete="address-level2"
            />
          </Field>
          <Field label="PIN code">
            <input
              className="control px-3"
              name="postalCode"
              defaultValue={billing.profile?.postalCode ?? ""}
              required
              inputMode="numeric"
              pattern="[1-9][0-9]{5}"
              maxLength={6}
              autoComplete="postal-code"
            />
          </Field>
          <Field label="State or union territory">
            <select
              className="control px-3"
              name="stateCode"
              defaultValue={billing.profile?.stateCode ?? ""}
              required
              autoComplete="address-level1"
            >
              <option value="" disabled>
                Choose a state
              </option>
              {Object.entries(indianStates).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
        <Button
          type="submit"
          loading={busy}
          disabled={profileLocked || !billing.enabled}
        >
          Save billing details
        </Button>
      </form>
      {billing.enabled && (
        <div className="grid gap-5 sm:grid-cols-2">
          {(["pro", "business"] as const).map((plan) => (
            <section
              key={plan}
              className={`surface flex flex-col p-7 ${plan === "pro" ? "border-[#178457] ring-1 ring-[#178457]" : ""}`}
            >
              <h3 className="text-xl font-semibold">{plans[plan].name}</h3>
              <p className="mt-6 text-4xl font-semibold tracking-[-.06em]">
                {money(plans[plan].total)}
                <span className="text-sm font-normal tracking-normal text-[var(--ink-soft)]">
                  {" "}
                  / month
                </span>
              </p>
              <p className="mt-3 text-xs text-[var(--ink-soft)]">
                {money(plans[plan].base)} + {money(plans[plan].gst)} GST (18%).
                Charged monthly.
              </p>
              <ul className="my-7 space-y-4 text-sm text-[var(--ink-soft)]">
                {[
                  `${plans[plan].workspaces} owned workspaces`,
                  `${plans[plan].members} members per workspace`,
                  "10,000 new transactions/month; 10,000 retained per workspace",
                  "Recurring rules and shared reports",
                  ...(plan === "business"
                    ? ["Role-based team access and audit history"]
                    : []),
                ].map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-[#167852]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto"
                disabled={
                  busy ||
                  billing.pendingOperation ||
                  !billing.profile ||
                  (Boolean(renewable) &&
                    (!subscription ||
                      !["active", "authenticated"].includes(
                        subscription.status,
                      ) ||
                      subscription.plan === plan ||
                      Boolean(subscription.scheduledPlan) ||
                      subscription.cancelAtCycleEnd)) ||
                  (!renewable && billing.plan !== "free") ||
                  (!renewable && !checkoutReady)
                }
                onClick={() => {
                  if (renewable)
                    void action(async () => {
                      await mutation("/billing/change", { plan });
                      await refresh(true);
                      notice(
                        `${plans[plan].name} scheduled for the next billing cycle.`,
                      );
                    });
                  else void checkout(plan);
                }}
              >
                {renewable
                  ? `Change to ${plans[plan].name} next cycle`
                  : `Subscribe to ${plans[plan].name}`}
              </Button>
            </section>
          ))}
        </div>
      )}
      <section className="surface p-7">
        <h3 className="text-lg font-semibold">Invoices</h3>
        {!billing.invoices.length ? (
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            Invoices appear after a verified full monthly payment.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--line)]">
            {billing.invoices.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {item.number}
                    {item.testMode ? " · Test" : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    {new Date(item.issuedAt).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    · {money(item.total)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void action(async () =>
                      setInvoice(
                        await api<BillingInvoice>(
                          `/billing/invoices/${item.id}`,
                        ),
                      ),
                    )
                  }
                >
                  View invoice
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs leading-6 text-[var(--ink-soft)]">
        No bank credentials or payment-card details are stored by FinSight.
        Razorpay handles checkout and recurring mandates. Plan changes apply at
        the next cycle; cancel before renewal. A subscription ends after 120
        monthly cycles. Exports and deletion remain available on every plan.{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
      <FinanceDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel your subscription?"
        description={
          subscription?.currentEnd
            ? "Stop renewal at the end of the current billing cycle. Paid access continues through the period already paid for. Your records remain available under Free limits."
            : "Cancel this unfinished subscription immediately. No new payment or renewal will be initiated."
        }
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setCancelOpen(false)}
          >
            Keep subscription
          </Button>
          <Button
            variant="destructive"
            loading={busy}
            onClick={() =>
              void action(async () => {
                await mutation("/billing/cancel", {});
                await refresh(true);
                setCancelOpen(false);
                notice("Subscription cancellation confirmed.");
              })
            }
          >
            Confirm cancellation
          </Button>
        </div>
      </FinanceDialog>
      <FinanceDialog
        open={Boolean(invoice)}
        onClose={() => setInvoice(null)}
        title={invoice?.testMode ? "Test payment receipt" : "Tax invoice"}
        description="Immutable payment and billing details. Download the invoice as an HTML document and use your browser's Print → Save as PDF."
      >
        {invoice && (
          <div className="space-y-4 text-sm">
            <p className="font-semibold">
              {invoice.number} ·{" "}
              {new Date(invoice.issuedAt).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </p>
            <p>
              {invoice.supplier.name}
              <br />
              {invoice.supplier.address}
              <br />
              GSTIN: {invoice.supplier.gstin} · SAC: {invoice.supplier.sac}
            </p>
            <p>
              {invoice.recipient.name}
              <br />
              {invoice.recipient.address}, {invoice.recipient.city}{" "}
              {invoice.recipient.postalCode}
              <br />
              Place of supply:{" "}
              {
                indianStates[
                  invoice.recipient.stateCode as keyof typeof indianStates
                ]
              }{" "}
              ({invoice.recipient.stateCode})
              {invoice.recipient.gstin && (
                <>
                  <br />
                  GSTIN: {invoice.recipient.gstin}
                </>
              )}
            </p>
            <p>
              {plans[invoice.plan].name} membership ·{" "}
              {new Date(invoice.periodStart).toLocaleDateString("en-IN")}–
              {new Date(invoice.periodEnd).toLocaleDateString("en-IN")}
            </p>
            <dl className="grid grid-cols-2 gap-2">
              <dt>Taxable value</dt>
              <dd className="text-right">{money(invoice.base)}</dd>
              {invoice.igst ? (
                <>
                  <dt>IGST 18%</dt>
                  <dd className="text-right">{money(invoice.igst)}</dd>
                </>
              ) : (
                <>
                  <dt>CGST 9%</dt>
                  <dd className="text-right">{money(invoice.cgst)}</dd>
                  <dt>SGST 9%</dt>
                  <dd className="text-right">{money(invoice.sgst)}</dd>
                </>
              )}
              <dt className="font-semibold">Total paid</dt>
              <dd className="text-right font-semibold">
                {money(invoice.total)}
              </dd>
            </dl>
            <p className="break-all text-xs">
              Payment: {invoice.paymentId} · Subscription:{" "}
              {invoice.subscriptionId}
              <br />
              Reverse charge: No. Electronically generated invoice.
            </p>
            <Button variant="outline" onClick={() => downloadInvoice(invoice)}>
              <Download size={15} className="mr-2" /> Download invoice
            </Button>
          </div>
        )}
      </FinanceDialog>
    </div>
  );
}
function downloadInvoice(invoice: BillingInvoice) {
  const escape = (value: string | number) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character]!,
    );
  const party = (name: string, address: string, gstin: string) =>
    `<p><strong>${escape(name)}</strong><br>${escape(address)}${gstin ? `<br>GSTIN: ${escape(gstin)}` : ""}</p>`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(invoice.number)}</title><style>body{font:16px/1.6 system-ui;max-width:800px;margin:40px auto;padding:24px}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #ccc}td:last-child{text-align:right}@media print{body{margin:0}}</style><h1>${invoice.testMode ? "TEST RECEIPT — NOT A TAX INVOICE" : "Tax invoice"}</h1><p>${escape(invoice.number)} · ${escape(invoice.issuedAt)}<br>Currency: INR</p>${party(invoice.supplier.name, invoice.supplier.address, invoice.supplier.gstin)}<p>SAC: ${escape(invoice.supplier.sac)}</p><h2>Bill to</h2>${party(invoice.recipient.name, `${invoice.recipient.address}, ${invoice.recipient.city} ${invoice.recipient.postalCode}`, invoice.recipient.gstin)}<p>${escape(invoice.recipient.email)}<br>Place of supply: ${escape(indianStates[invoice.recipient.stateCode as keyof typeof indianStates])} (${escape(invoice.recipient.stateCode)})</p><p>${plans[invoice.plan].name} membership · Quantity: 1<br>${escape(invoice.periodStart)}–${escape(invoice.periodEnd)}</p><table><tr><th>Taxable value</th><td>${escape(money(invoice.base))}</td></tr>${invoice.igst ? `<tr><th>IGST 18%</th><td>${escape(money(invoice.igst))}</td></tr>` : `<tr><th>CGST 9%</th><td>${escape(money(invoice.cgst))}</td></tr><tr><th>SGST 9%</th><td>${escape(money(invoice.sgst))}</td></tr>`}<tr><th>Total paid</th><td>${escape(money(invoice.total))}</td></tr></table><p>Payment: ${escape(invoice.paymentId)}<br>Subscription: ${escape(invoice.subscriptionId)}<br>Reverse charge: No.<br>Electronically generated invoice. Use Print → Save as PDF to retain a PDF copy.</p></html>`;
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.number.replace(/\//g, "-")}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
