# Launch checkpoint, economics and roadmap

## Release status

The current branch contains an India-first interactive demo, real hosted identity/tenant persistence, planning tools, notice acceptance and self-service primary-store data rights. Production containers, release migrations, worker/CI and two source-checked deploy runbooks are present and locally exercised. Public deployment, historical provider credential revocation, legal/retention operations and billing/provider approvals remain the commercial launch boundary.

## Demo release checklist

- [x] Branded responsive app shell and public marketing pages.
- [x] Working finance mutations, import preview, duplicate detection and real file exports.
- [x] Shared integer-money domain and browser persistence.
- [x] Light/dark themes, focus management, reduced-motion support.
- [x] Unit tests, coverage gates, browser lifecycle tests and automated accessibility checks.
- [x] Explicit demo labels and honest provider availability.
- [x] Env template sanitized and legacy API disabled by default.
- [x] SEO metadata, sitemap, robots, Open Graph image, install manifest and offline recovery.
- [x] Build and run the standalone Docker image with a healthy liveness response.
- [ ] Measure real-device performance and field Core Web Vitals on a deployed preview.

## Commercial launch checklist

- [x] Separate v2 workspace schema/migration, integer-money constraints, RBAC and tenant-isolation tests. Legacy conversion/backfill is a separate migration project.
- [x] Verified email/password, magic links, TOTP/recovery, passkeys and session controls against isolated Postgres/SMTP dependencies.
- [ ] Google/Apple live provider verification and production SMTP deliverability. Adapters/configuration gates are present.
- [ ] Razorpay test-mode and live verification; trials, GST invoices, plan gates, mandates and replay-safe webhooks.
- [ ] Bank provider contracts, sandbox/live adapters, reconnect and consent revocation.
- [ ] Transaction rules, recurring scheduling, subscription detection, anomaly model, receipt storage and investments.
- [ ] Multi-currency ledger, dated exchange rates, split transactions and PDF reporting.
- [x] Household invitations, owner/admin/editor/viewer roles and financial audit records.
- [ ] Admin/support impersonation and audited feature flags.
- [x] Durable encrypted transactional email outbox, leased/retrying worker and local SMTP delivery.
- [ ] Push delivery, digests, funnels, referrals, waitlist and production email operations.
- [x] Versioned session-authenticated API, cursor pagination, bounded payloads, shared rate limits and idempotent finance mutations.
- [ ] Scoped public API keys, signed outgoing webhooks and OpenAPI contract tests.
- [x] Owner-authorized hosted financial JSON export.
- [x] Personal export, owner-controlled workspace deletion and fresh-session account deletion across primary identity/ledger stores.
- [ ] Operator grievance/correction/nomination process, processor logs/email and encrypted-backup deletion/expiry.
- [x] Non-root demo/hosted Docker delivery, release migration job, bundled email worker, CI gates and local container smoke.
- [ ] Public deploy, tracing/central logs, SLO alerts, load tests, IaC and a target-region PITR restore exercise.
- [ ] Legal entity/contacts, reviewed terms, privacy notice and provider agreements.

## Pricing hypothesis

Proposed monthly INR pricing: Free ₹0, Pro ₹299 and Business ₹799 for five members, plus 18% GST where applicable (₹352.82 / ₹942.82 totals). Pricing is planned; no checkout or active paid entitlements exist. Obtain provider quotes and validate demand before fixing annual pricing. Manual/CSV usage remains the foundation; do not advertise live bank connections until contracts, consent and economics are established.

Example Pro unit economics per paying workspace (planning assumptions, not provider quotes):

| Item | Monthly INR, excluding GST |
|---|---:|
| Revenue | ₹299 |
| Payments, illustrative 2% + GST on fee | ₹7.06 |
| Bank data | Unquoted; not live |
| Infrastructure allocation | ₹35 |
| Email/notifications | ₹5 |
| Support allocation | ₹50 |
| Contribution before bank-data cost | ₹201.94 (68%) |

These are planning assumptions, not Razorpay quotes or an exchange-rate conversion of the earlier plan. Obtain contracted fees, meter usage and revisit included limits before launch. Estimates exclude payroll, acquisition, legal, compliance and disputes. Collected GST is not product revenue.

## Scale cost scenarios

Assumptions: 30% monthly active users, manual/CSV ledger use, no live bank aggregation. No benchmark or vendor commitment proves these capacities. Budget separately for regulated aggregation after provider discovery.

| Registered users | MAU | Illustrative monthly infrastructure budget (INR) |
|---:|---:|---:|
| 10,000 | 3,000 | ₹25,000–75,000 |
| 100,000 | 30,000 | ₹1,50,000–4,00,000 |
| 1,000,000 | 300,000 | ₹8,00,000–25,00,000 |

Re-estimate with measured retention, queries per active user, telemetry sampling, imports, support load and paid conversion. A million-user product requires measured capacity planning; local verification is not evidence of that scale.

## 90-day roadmap

### Days 1–30: identity and a trustworthy ledger
Deliver workspace/user/membership/account models; integer-money migration strategy; repository boundaries; hosted identity with session controls; cross-tenant tests; idempotent transaction APIs and cursor pagination. Keep sample demo data isolated. Establish a threat model, CI, staging and backups before real customer records.

### Days 31–60: paid pilot
Deliver verified Razorpay checkout and replay-safe webhooks, GST invoicing and entitlements after credentials and merchant approval. Account Aggregator readiness does not imply licensed operation. Instrument activation and reliability. Run a small invited pilot with manual support and audited admin access.

### Days 61–90: controlled launch
Deliver reconnection and reconciliation flows, export/deletion jobs, recurring/subscription detection, category rules, API keys and webhooks, receipt handling and currency support. Run performance, load, accessibility and independent security reviews. Exercise deployment rollback and disaster recovery. Publish reviewed legal pages and launch only after billing and provider operations are proven.

AI-generated insights, advanced investment analysis and referral growth should follow accurate accounting, retention and trust. Their availability should never be simulated by success messages.
