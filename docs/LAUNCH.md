# Launch checkpoint, economics and roadmap

## Release status

The current branch is a verified interactive demo milestone. It is suitable for product reviews and demonstrations. It is not the requested revenue-generating hosted SaaS yet. Identity, tenant persistence, billing and live providers remain the critical path.

## Demo release checklist

- [x] Branded responsive app shell and public marketing pages.
- [x] Working finance mutations, import preview, duplicate detection and real file exports.
- [x] Shared integer-money domain and browser persistence.
- [x] Light/dark themes, focus management, reduced-motion support.
- [x] Unit tests, coverage gates, browser lifecycle tests and automated accessibility checks.
- [x] Explicit demo labels and honest provider availability.
- [x] Env template sanitized and legacy API disabled by default.
- [x] SEO metadata, sitemap, robots, Open Graph image, install manifest and offline recovery.
- [ ] Build and run the Docker image with an available daemon.
- [ ] Measure real-device performance and field Core Web Vitals on a deployed preview.

## Commercial launch checklist

- [ ] Workspace-aware schema, migration/backfill, authorization and tenant-isolation tests.
- [ ] Email/password, Google/Apple, magic link, TOTP, passkeys, recovery and device/session controls.
- [ ] Stripe sandbox and live verification; trials, invoices, plan gates, limits and replay-safe webhooks.
- [ ] Bank provider contracts, sandbox/live adapters, reconnect and consent revocation.
- [ ] Transaction rules, recurring scheduling, subscription detection, anomaly model, receipt storage and investments.
- [ ] Multi-currency ledger, dated exchange rates, split transactions and PDF reporting.
- [ ] Household invitations and roles; admin, support impersonation and audited feature flags.
- [ ] Email/push delivery, digest jobs, funnels, referrals, waitlist and invite systems.
- [ ] Versioned public API, scoped keys, cursor pagination, signed outgoing webhooks and OpenAPI contract tests.
- [ ] Data export/deletion across all hosted stores and providers.
- [ ] Tracing, logs, SLO alerts, rate limiting, load tests, CI/CD deployment, IaC, backups and restore exercise.
- [ ] Legal entity/contacts, reviewed terms, privacy notice and provider agreements.

## Pricing hypothesis

Proposed monthly USD pricing: Free $0, Pro $9, Business $24 for five members. Test $79/year Pro and $219/year Business after measuring support and bank-data costs. Free should include manual/CSV usage; bank sync belongs in paid plans because aggregation is a direct recurring cost. Do not advertise unlimited live connections until provider economics are established.

Example Pro unit economics per paying workspace (planning assumptions, not provider quotes):

| Item | Monthly USD |
|---|---:|
| Revenue | 9.00 |
| Payments, assumed 3% + $0.30 | 0.57 |
| Bank data, assumed 2 connections × $0.50 | 1.00 |
| Infrastructure allocation | 0.50 |
| Email/notifications | 0.10 |
| Support allocation | 0.60 |
| Contribution | 6.23 (69%) |

At $1.50 per connection, contribution drops to $4.23 (47%). Obtain contracted pricing, meter active connections, and revisit included limits before launch. Annual billing reduces per-charge fixed fees but does not eliminate usage costs. All estimates exclude payroll, taxes, acquisition, legal, compliance and disputes.

## Scale cost scenarios

Assumptions: registered users, 30% monthly active, 40% of active users bank-connected, two connections each, and a hypothetical $0.25–$1.50 monthly cost per connection. These are workload scenarios; no benchmark or vendor commitment proves these capacities.

| Registered users | MAU | Active bank connections | Compute/CDN | Postgres/backups | Redis/jobs | Storage/email/telemetry | Bank data | Estimated monthly total |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 3,000 | 2,400 | $100–300 | $100–250 | $30–100 | $50–200 | $600–3,600 | **$880–4,450** |
| 100,000 | 30,000 | 24,000 | $500–1,500 | $500–1,500 | $150–500 | $300–1,000 | $6,000–36,000 | **$7,450–40,500** |
| 1,000,000 | 300,000 | 240,000 | $3,000–10,000 | $3,000–12,000 | $1,000–4,000 | $2,000–8,000 | $60,000–360,000 | **$69,000–394,000** |

Bank aggregation dominates these scenarios. Re-estimate with actual active connections, refresh frequency, retention, telemetry sampling, imports per user, support load and paid conversion. A million-user product requires measured capacity planning; the local demo is not evidence of that scale.

## 90-day roadmap

### Days 1–30: identity and a trustworthy ledger
Deliver workspace/user/membership/account models; integer-money migration strategy; repository boundaries; hosted identity with session controls; cross-tenant tests; idempotent transaction APIs and cursor pagination. Keep sample demo data isolated. Establish a threat model, CI, staging and backups before real customer records.

### Days 31–60: paid pilot
Deliver Stripe Checkout/Portal and replay-safe webhooks, entitlements, a bank sandbox adapter, encrypted provider tokens, durable outbox/queue, imported-source deduplication, household roles, notification preferences and transactional email. Instrument activation and reliability. Run a small invited pilot with manual support and audited admin access.

### Days 61–90: controlled launch
Deliver reconnection and reconciliation flows, export/deletion jobs, recurring/subscription detection, category rules, API keys and webhooks, receipt handling and currency support. Run performance, load, accessibility and independent security reviews. Exercise deployment rollback and disaster recovery. Publish reviewed legal pages and launch only after billing and provider operations are proven.

AI-generated insights, advanced investment analysis and referral growth should follow accurate accounting, retention and trust. Their availability should never be simulated by success messages.
