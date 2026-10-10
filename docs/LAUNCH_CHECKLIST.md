# Launch verification

## Locally verified, 7 October 2026

- Generated secrets, strict configuration and authenticated field-key rotation.
- Shared finance/billing unit tests, API tests and disposable replica-set integration.
- Actual signup, worker-delivered email, empty onboarding, persisted finance,
  imports, budgets/goals, Free restrictions, export/deletion, password reset,
  session revocation and one-time links through Playwright.
- Competing recurrence workers produce one record; expiry pauses jobs; monthly
  anchors survive February; shared report totals are immutable, private and revocable.
- Full dependency audit has zero known vulnerabilities; CI does not ignore audit.
- API/web Docker builds and six healthy local Compose services; real fresh empty
  account/workspace verified through the containerized web/API/worker.
- Replica-set logical dump/restore, collection-count comparison and four-purpose
  resumable rekey/decryption after removal of the old runtime key.
- Render/Railway configuration validated against current provider JSON schemas.

Visual review guidance is in [Visual QA](VISUAL_QA.md). Local testing does
not establish hosted-provider success or whole-image zero drift against changed copy.

## Operator-dependent release checks

| Remaining check         | Required configuration and verification                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Razorpay test lifecycle | Real test credentials, complete supplier identity/SAC and exact INR plans; checkout plus signed captured-payment events, invoice, renewal/failure recovery, next-cycle change, cancel, duplicate/reordered delivery and unresolved-operation recovery. |
| Google round trip       | Google project credentials, exact redirect URI and real account; explicit signup consent, existing-user sign-in, disabled implicit signup/linking and MFA enforcement.                                                                                 |
| Environment preflight   | `npm run preflight -- --env-file <production env file>` reports zero failures; every warning is reviewed and accepted.                                                                                                                                 |
| Hosted infrastructure   | Actual HTTPS domains, authenticated managed replica set/Redis, private networking, verified proxy allowlist, readiness/restart/shutdown and multi-instance limits at the real ingress.                                                                 |
| SMTP and monitoring     | Verified sender/DNS/deliverability, failed-job/old-outbox alerts, external readiness/heartbeat alerts, and an actual redacted Sentry test event if enabled.                                                                                            |
| Managed recovery        | Provider snapshot/PITR retention and recovery targets; a staging restore with escrowed keys and readable tenant exports/invoices.                                                                                                                      |
| Operator notice         | Actual legal identity, privacy/grievance contacts, processor regions/retention and reviewed billing/refund/rights processes.                                                                                                                           |

Keep the deployment Free-only until the payment-provider lifecycle has been
verified. Record the release revision/image digest, environment, check results and
private evidence location. Credentials, cookies, backups and traces are never release source.