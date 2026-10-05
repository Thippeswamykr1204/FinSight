# India-focused product decisions

Evaluated 5 October 2026. Accept means implemented within the scope described, not a claim of live external approval. The phase 1 verification checkpoint is the unchanged phase 2 baseline.

| Candidate | Decision | Reason / delivered scope |
|---|---|---|
| Indian categories | Accept | The complete proposed set fits existing budgets/imports; older categories remain valid for existing records. |
| Merchant/UPI auto-categorization | Accept | Conservative, reviewable suggestions for known merchants; explicit categories win and generic UPI is never guessed as a spending purpose. |
| HDFC CSV preset | Reject | No authentic, versioned bank fixture is available to prove header/date/debit-credit semantics. |
| SBI CSV preset | Reject | Statement layouts vary by export channel; generic mapping must not masquerade as verified support. |
| ICICI CSV preset | Reject | Accurate debit/credit/reversal handling needs representative bank fixtures. |
| Axis CSV preset | Reject | No verified format fixture; users can normalize to the documented generic CSV contract. |
| Kotak CSV preset | Reject | No verified format fixture; guessing bank-specific column semantics risks wrong money. |
| UPI reference parsing | Accept | Strict 12-digit references in known UPI narration patterns are retained in import notes. |
| Indian account types | Accept | All proposed types are manual ledger containers, explicitly without investment valuation or statutory projections. |
| Credit-card due reminders | Accept | A user-maintained next due date gives useful in-app reminders and can be updated/cleared; it does not infer payment status or deliver push/email. |
| Persistent EMI/loan tracker | Reject | Outstanding-principal reconciliation, lender rate changes and prepayments need a fuller liabilities/transfer ledger. |
| EMI amortization calculator | Accept | Fixed-rate reducing-balance estimate with rounded paise schedule, adjusted final payment and actual CSV download. |
| SIP/goal calculator | Accept | Transparent month-end investment assumptions and no-return savings targets help planning without suggesting guaranteed returns. |
| Section 80C/80D tracking | Reject | Cash categories cannot determine legal deduction eligibility, payer/dependent conditions or tax-regime applicability. |
| Old/new tax regime estimate | Reject | A trustworthy FY 2026–27 estimate needs verified legislation and a full taxpayer eligibility model; no slabs or limits are hardcoded. |
| Advance-tax reminders | Reject | Liability and installment eligibility are unknown; indiscriminate tax deadlines would be misleading. |
| GST-aware tagging | Reject | Input-credit eligibility, supply location and invoices are not modeled; a simple tag would imply unsupported tax accounting. |
| Expense splits / UPI pay intents | Reject | Settlement balances, reversals and counterparties are not modeled; a payment link alone is not a correct split ledger. |
| Festival/seasonal budgeting | Accept | Diwali, school fees, wedding and family festival travel suggestions reuse the real goal flow; users choose dates and amounts. |
| INR pricing + GST | Accept | Planned rupee prices and 18% GST illustrative totals are explicit; checkout is not live. |
| Razorpay integration | Reject for this release | Merchant approval and test credentials are absent; a documented integration plan is more honest than unverified checkout. |
| Account Aggregator readiness | Accept, interface/docs only | Provider-neutral consent/fetch/revoke/webhook contracts prepare the boundary without claiming licensed FIU status or live bank sync. |
| DPDP notice and rights | Accept | India-first notice, grievance configuration, real personal export and recent-sign-in/owner-controlled deletion improve control; legal review and processor retention remain operator duties. |
| India data residency | Accept as deployment plan | Recommend Mumbai app/database/backups and document every processor; code cannot enforce an operator's hosting choices. |
| Low-end Android / 4G | Accept targeted improvements | Existing lazy charts/offline recovery are retained; controls and coarse-pointer buttons reach 44px, number layouts are responsive; no field performance claim. |
| Offline financial write cache | Reject | Shared-device privacy and hosted conflict handling outweigh unverified offline mutation behavior; recovery assets alone are cached. |
| Readable rupee typography | Accept | Indian grouping, tabular values, responsive large totals and browser/font checks validate the existing local fonts. |
| WhatsApp-friendly report text | Accept | Native share/copy produces a concise INR FY summary with no merchant details; the user chooses its destination. |
| Hindi/Kannada UI | Reject for this release | Unreviewed copy would not meet the requirement for real translation quality; English (India) only. |

## Billing integration plan — not live

Razorpay merchant onboarding and test keys come first. Add provider-event, customer/subscription, tax-invoice and entitlement models through migrations. Checkout order creation must be owner-authorized and use server-derived paise amounts. Verify checkout/payment and webhook signatures over the raw payload, persist unique events, reconcile replays/out-of-order refunds and mandate failures, and enforce plan limits server-side. Test UPI, cards, netbanking and supported recurring mandate flows against real sandbox events; support cancellation, refund policy, GST invoice fields and paid-entitlement rollback before enabling a CTA. No Stripe or Razorpay success is simulated.

## Rights / retention boundary

Hosted personal export omits authentication secrets and other members' records; owners export their financial workspace separately. Owners can permanently delete a workspace; deleting an account is blocked while it owns workspaces. Deletion cascades identity credentials/devices and membership, removes addressed outbox/invitations and actor idempotency records, and anonymizes retained shared audit identity. Opaque, unlinked auth verification tokens expire naturally; already delivered messages, exported files, processor logs and encrypted backups require operator policy. Grievances, corrections and nomination need the published operator channel. This is implementation support for rights, not a compliance certification.
