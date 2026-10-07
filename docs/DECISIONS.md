# Engineering and product decisions

## MERN migration decisions — 7 October 2026

These decisions govern the requested migration; existing PostgreSQL decisions below describe the baseline until cutover. See [ARCHITECTURE](ARCHITECTURE.md), [AUDIT](AUDIT.md) and [PARITY](PARITY.md).

1. **UI lock:** retain every route/component/class/copy/animation. Change data adapters and measured responsive defects only. Unsupported baseline features (hosted theme/palette, paid billing, bank sync) are recorded honestly; do not fake them.
2. **npm monorepo:** Next/React in `apps/web`, Express layered API/worker in `apps/api`, tested India logic/contracts in `packages/shared`. Keep one lockfile and root scripts. Mechanical moves precede behavioral refactoring.
3. **Same-origin API proxy:** preserve `/api/v1` and `/api/identity` URLs. Next renders API-fetched data and owns no database/auth-server/business logic. Preserve passkey RP/origin and cookie behavior; strict API origin/CORS gates remain.
4. **Mongo replica set:** require transactions and workspace revision write serialization. Replace SQL FK constraints with transactional account-reference checks and negative tests; never imply Mongo has composite foreign keys.
5. **Better Auth Mongo:** preserve existing plugins/MFA bypass restrictions and notice hooks. Explicit Argon2id for new hashes, compatibility verifier for imported hashes. Keep immediate revocation; prove session rotation/replay rather than merely renaming renewal.
6. **Redis/BullMQ:** rate limits fail closed; cache optional/non-authoritative. Durable Mongo outbox commits with business writes and queues only IDs. Deterministic jobs, at-least-once semantics, bounded retries/body erasure and cleanup.
7. **Encryption:** dedicated versioned keys separate from auth secret, AES-GCM authenticated field context; preserve legacy-envelope compatibility during migration. Never store secrets in public env, request logs or exports.
8. **Importer:** preserve IDs, dates, paise, funded USD/read-only and genuine consent. Dry-run/reconcile/checkpoint; invalidate old sessions/links on cutover. No automatic source deletion or FX guessing.
9. **Corrections:** fix hashed rate/verification cleanup, authorization/export race, outstanding invitation authority, restored-demo integrity and signed-zero parsing at data boundaries; add regression coverage and document actual outcome.
10. **Proof over claims:** preserve existing security tests in equivalent Mongo form; required visual/device/Lighthouse/container checks must execute before completion. A config file is not evidence of green CI, OWASP certification, million-user capacity or a cloud restore.
11. **Local boot:** one-command Compose uses generated persisted local secrets, Mongo replica set, Redis and Mailpit. Public boot requires real injected secrets/SMTP/operator metadata and HTTPS; no development seed or fake credentials in hosted production.


## Built

| Decision                                                                   | Why                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| INR integer paise, exact decimal parsing and explicit rounding             | Avoid floating-point money errors and ambiguous currency conversion.                              |
| Kolkata dates, Indian grouping and April–March reports                     | Match the calendar and notation used by Indian households.                                        |
| Separate browser demo and authenticated PostgreSQL ledger                  | Let visitors explore fictional data without disguising failed server reads.                       |
| Tenant-scoped RBAC, composite foreign keys and versioned/idempotent writes | Enforce authorization and protect retries or concurrent edits.                                    |
| Generic CSV/OFX preview with conservative merchant rules                   | Keep source data reviewable; an explicit category wins and generic UPI is not a spending purpose. |
| Manual Indian account types and card due dates                             | Support useful tracking without claiming bank sync, payment detection or investment valuation.    |
| EMI/SIP/goal calculators and seasonal goal suggestions                     | Provide planning with visible assumptions; EMI schedules are downloadable estimates.              |
| Primary-store export/deletion and recorded signup notice                   | Give users real controls while keeping processor/backup retention explicit.                       |
| Encrypted durable email outbox and separate worker                         | Recover delivery across process failures; erase delivered bodies and bound retries.               |
| Recovery-only PWA, local fonts and lazy charts                             | Limit sensitive caching and external dependencies while supporting responsive use.                |

## Deliberately rejected or deferred

| Candidate                                                               | Reason                                                                                    |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| HDFC, SBI, ICICI, Axis and Kotak statement presets                      | Authentic versioned fixtures are needed to prove debit/credit/reversal semantics.         |
| Persistent loan tracker, transfers and investment valuation             | Principal changes, prepayments and asset reconciliation need a fuller ledger.             |
| 80C/80D, tax-regime estimates, advance-tax reminders and GST accounting | Categories alone cannot establish taxpayer eligibility or invoice/input-credit treatment. |
| Expense splits and UPI payment intents                                  | Settlement balances, counterparties and reversals are not modeled.                        |
| Offline financial writes                                                | Hosted conflicts and shared-device privacy need an explicit synchronization design.       |
| Hindi/Kannada UI                                                        | Reviewed translations are required before offering another language.                      |
| Live Razorpay checkout and bank aggregation                             | Merchant/FIU eligibility, approvals, credentials and sandbox verification come first.     |

## Integration boundaries

Planned pricing is ₹299 Pro / ₹799 Business per month, plus illustrative 18% GST. No checkout or paid entitlements exist. A billing implementation needs server-derived paise amounts, signed raw-body events, unique event persistence, replay/out-of-order reconciliation and server-enforced limits.

The [Account Aggregator interface](ACCOUNT_AGGREGATOR.md) has no registered adapter. Goal contributions earmark existing savings; they do not transfer money or increase net worth. Funded legacy USD workspaces remain explicit/read-only rather than being relabeled as INR.

Primary-store deletion removes identity credentials, membership and addressed jobs, and anonymizes retained shared audit actors. Delivered messages, downloaded exports, processor logs and backups require operator retention policy. See [security](SECURITY.md) and [the roadmap](../README.md#roadmap).
