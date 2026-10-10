# Security

See the root [vulnerability-reporting policy](../SECURITY.md) for private reports.

## Controls

- Better Auth verifies sessions server-side; private finance routes resolve the
  principal from cookies, never a caller-provided user ID.
- Workspace membership and role checks scope queries and mutations. Replica-set
  transactions serialize related ledger, idempotency and audit writes.
- Zod validates financial values, dates, commands and import limits. Money is
  bounded integer paise. CSV exports escape spreadsheet formulas.
- Verified email, passkeys, confirmed TOTP, recovery codes, magic links and session
  controls support account security. Destructive actions require a recent session.
- Cookies are HttpOnly/SameSite, with Secure enabled on HTTPS. Origin checks, CSP,
  frame denial, no-sniff, HSTS and request IDs protect the HTTP boundary.
- Redis rate limits are shared between API instances. A failed limiter cannot
  authorize a financial request.
- Email bodies are encrypted with a dedicated AES-GCM key; logs redact cookies,
  passwords and tokens. Delivered bodies are cleared and outbox retention is bounded.
- Personal export excludes password hashes, authentication tokens and MFA secrets.
  Deletion affects the primary store; downloaded exports, delivered email and
  retained backups follow their respective retention policies.
- Razorpay webhooks authenticate the exact raw bytes before parsing. Browser
  checkout results cannot grant membership; provider ownership, captured INR
  amount and paid period are verified. Duplicate event/payment IDs cannot create
  duplicate invoices. Uncertain checkout creation remains reserved for reconciliation.
- Billing profiles and immutable invoice/subscription party snapshots use separate
  authenticated field purposes. Account deletion anonymizes retained invoice links;
  encrypted accounting records retain their eight-year TTL policy.
- Optional server monitoring disables payload collection and replaces exception
  messages. It does not collect browser financial telemetry. Trusted proxy addresses
  are explicitly allowlisted; incoming client-IP identity headers are overwritten.

## Secrets

The API and worker require explicit generated `BETTER_AUTH_SECRET` and
`FIELD_ENCRYPTION_KEY` in every environment. Known auth defaults, zero keys and
malformed encryption keys fail boot. Compose requires `.env` and has no secret
fallback. `npm run env:init` uses cryptographic randomness and exclusive `0600`
file creation. Runtime secrets are not Docker build arguments.

See [KEY_ROTATION](KEY_ROTATION.md) for retained-key decryption and rotation.
Rotate mail and identity-provider credentials independently. Keep environment
files, build output, coverage and browser traces outside release source/images.

## Operations

Use HTTPS domains, restricted MongoDB/Redis networking, a managed replica set,
encrypted backups, monitored queue delivery and a real transactional mail provider.
Validate callback domains and production sender deliverability in the deployed
environment. Operator privacy and grievance contacts are required for public boot.
No bank credentials or card PAN/CVC are collected by FinSight.

## Known limitations

- Pages that are pre-rendered at build time (marketing, legal and calculator
  pages) cannot receive a per-request nonce, so their Content Security Policy keeps
  `script-src 'unsafe-inline'`. These pages render no user-supplied content. The
  authenticated application and sign-in routes use a nonce-based policy.
- The shared-report page (`/reports/[token]`) is rendered per request but is not
  yet covered by the nonce-based policy. It renders only numeric totals and dates
  returned by the API, escaped by React. Moving it to the nonce policy is planned
  and needs browser verification.
- Deployments behind serverless web hosting cannot allowlist the web tier's
  addresses, so per-client rate limits require a private-network topology. See
  [DEPLOYMENT](DEPLOYMENT.md#proxy-trust-and-rate-limits).
- ESLint 8 is end-of-life. It has no known vulnerability that affects the shipped
  application, and migrating to the current major version is tracked as maintenance.