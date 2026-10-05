# Engineering and product decisions

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
