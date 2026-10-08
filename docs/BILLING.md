# Membership billing

Billing belongs to the paying user and covers that user's owned workspaces. A workspace uses its owner's entitlement, never the caller's subscription.

| Plan | Monthly base | GST 18% | Monthly total | Owned workspaces | Members/workspace | New transactions/workspace/calendar month |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Free | ₹0 | ₹0 | ₹0 | 1 | 1 | 100 |
| Pro | ₹299 | ₹53.82 | ₹352.82 | 3 | 2 | 10,000 |
| Business | ₹799 | ₹143.82 | ₹942.82 | 5 | 5 | 10,000 |

The owner and pending invitations count toward member seats. All ledgers retain at most 10,000 transactions. Deleted transactions still count toward the month's allowance; deduplicated import rows do not. Calendar months use Asia/Kolkata. Pro/Business enable recurring rules and shared reports; Business enables workspace audit history. Exports, record removal, security controls and account deletion are available independently of paid features. After downgrade, the oldest allowed workspaces remain writable; excess workspaces and member seats become read-only. Existing data is retained.

## Configure Razorpay

Leave all billing variables blank for Free-only operation. A partial configuration fails startup. Set the complete group documented in `.env.example` on the API and worker; the web discovers availability from the API and needs no payment secrets.

1. Generate Razorpay **test** API credentials and a distinct random webhook secret.
2. Create two **monthly, interval 1, INR** plans with quantity 1: Pro **35282 paise** and Business **94282 paise**. These amounts already include GST. Do not add an upfront fee or provider tax on top. The API validates the actual provider plan before creation/change.
3. Set the plan IDs, API credentials, webhook secret, legal supplier name/address/GSTIN/state code and operator-confirmed six-digit SAC. GSTIN checksum/state are validated. No invented supplier identity is supplied by this repository.
4. Configure a publicly reachable HTTPS webhook at `/api/v1/billing/webhook` on the API (or the same path through Next.js). Subscribe to all `subscription.*` events listed in Razorpay's dashboard. The raw-body endpoint is mounted before JSON parsing and authenticates `X-Razorpay-Signature` before using payload data.
5. Use a real fresh account: save its billing details, open Standard Checkout, make a Razorpay test payment, wait for signed events, and verify membership and a **test receipt**. Test receipts are explicitly not tax invoices. Do not treat mandate-authorisation alone as a paid month.
6. Validate another cycle, payment failure/retry, next-cycle plan change, cancellation, duplicate event delivery and invoice download before switching to live credentials and separately created live plans. UPI/e-mandate subscriptions cannot change plans in place; cancel and start a new subscription after the paid period ends.

## Payment integrity

- No browser result grants an entitlement. Checkout verification uses the server-owned subscription ID and `payment_id|subscription_id` HMAC. The API fetches provider subscription, invoice and captured-payment records and checks ownership, INR amount and a valid billing period.
- A successful full monthly payment creates an immutable local GST invoice and activates only its paid period. Same-state supply splits GST into CGST 9% + SGST 9%; interstate supply uses IGST 18%. Supplier/recipient snapshots are AES-256-GCM encrypted and separate from the editable profile. Details are fixed for the subscription.
- Webhooks use a unique provider event ID plus a raw-body digest. Reused IDs with different payloads are rejected. Invoice payment IDs and financial-year invoice numbers are unique. Provider state is fetched afresh; revision comparisons prevent stale or reordered snapshots from overwriting concurrent updates.
- Mutations reserve an actor-bound, payload-bound durable operation before calling Razorpay. Provider mutations never run inside retryable database transactions. An uncertain **create** is never automatically recreated; the worker searches provider subscriptions for the persisted operation ID. If a missing response cannot be resolved automatically, the reservation stays pending for operator reconciliation instead of risking a duplicate mandate. Replayed change/cancel actions target the same subscription. Failed definitive provider requests require a new operation key.
- Plan changes apply at `cycle_end`, without local proration. Cancellation uses cycle end when a cycle exists and immediate cancellation for unfinished checkout. Razorpay handles the mandate and renewal notices; encrypted outbox emails provide invoices and dunning guidance. Failed renewal never extends paid access.
- Subscriptions are capped at 120 monthly cycles. A new mandate is required afterward.

## Retention and deletion

Account deletion requires completed provider cancellation and no unresolved operation. Workspace deletion does not cancel user billing. Tax invoice snapshots remain for eight years from issue under the documented operator accounting policy; account links are replaced by a random deletion identifier. Contact the operator for corrections, statutory retention exceptions and refunds. Cancellation does not itself refund captured payments.

For webhook-secret rotation, configure `RAZORPAY_WEBHOOK_PREVIOUS_SECRET` while older events can still be retried, then remove it after the provider retry window. Field-encryption rotation also covers billing profiles and invoice/subscription snapshots; see [KEY_ROTATION.md](KEY_ROTATION.md).

Provider documentation: [integration and checkout verification](https://razorpay.com/docs/payments/subscriptions/integration-guide/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [next-cycle updates](https://razorpay.com/docs/api/payments/subscriptions/update-subscription/), [cancellation](https://razorpay.com/docs/api/payments/subscriptions/cancel-subscription/).

## Google OAuth

Set both Google credentials on the API. Register `${WEB_ORIGIN}/api/identity/callback/google` as the exact authorized redirect URI in Google Cloud. New accounts start from Sign up, explicitly accept the notice/terms, and request sign-up; acceptance is carried in Better Auth's authenticated OAuth state. Implicit sign-up and automatic email-based account linking are disabled. Authenticator-enabled accounts must use password + authenticator or a passkey. Apple has been removed. The provider round trip requires an operator's Google project and a real Google account; local credential-free checks cannot establish provider success.
