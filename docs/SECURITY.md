# Security and launch controls

## Current trust boundary

FinSight v2 is a local demo. Its finance records live in unencrypted browser local storage. Its calculations, validation, CSV/OFX parsing, and exports run in the browser. Browser access is data access; this is unsuitable for sensitive data on shared devices.

The original PostgreSQL endpoints remain as disabled legacy code, not a production multi-tenant API. Middleware is correctly located at `src/middleware.ts`. Unless `ENABLE_LEGACY_API=true` is explicitly set, all legacy API requests return 503; the health endpoint remains public. Enabling legacy access still requires a workspace password and a signing secret of at least 32 characters. Never expose that single-operator mode as a SaaS.

## Implemented controls

- Same-origin API mutation checks for the optional legacy API.
- HMAC session verification using Web Crypto verification instead of string comparison; no fallback to the app password as a signing secret.
- Frame restrictions, MIME sniffing protection, referrer policy, permissions policy, and a same-origin CSP.
- CSP currently permits inline scripts/styles to support Next static rendering. A nonce-based strict CSP is required before hosted sensitive-data launch.
- React-rendered text; no raw HTML insertion for merchant names or imported values.
- Zod validation and integer minor units in the new finance domain.
- Import limits: 2 MB, 1,000 rows per statement, 10,000 total demo transactions; no silent partial imports.
- CSV formula-prefix protection and proper field quoting.
- Scoped duplicate detection by account, date, amount, direction and merchant.
- Focus-trapped dialogs, readable errors, confirmation for transaction deletion and data clearing.
- Demo financial pages and API responses are not stored by the service worker.
- Runtime dependency audit: zero advisories at the recorded verification. Build-tool dependencies still contain upstream `braces`/glob-chain advisories; those tools only receive trusted repository file patterns. Replace or patch the toolchain before a fully clean all-dependency scan is claimed.

## Threat model

| Threat | Current treatment | Remaining production work |
|---|---|---|
| Account takeover | No hosted accounts exist | Managed identity, secure recovery, MFA/passkeys, revocation, session/device audit |
| Cross-tenant reads/writes | Legacy API disabled; local workspace only | Workspace-scoped repositories and DB constraints/RLS; authorization tests for every mutation |
| XSS and malicious imports | Text rendering, validation, file limits, CSP | Strict nonced CSP, attachment scanning and signed downloads |
| Spreadsheet formula injection | Export escapes dangerous formula prefixes | Repeat for all report formats/integrations |
| CSRF | Same-origin mutation gate | Bind to hosted session model and provider callbacks |
| Payment forgery/replay | No billing endpoints | Signature verification against raw bytes, unique provider event IDs, durable retries |
| Sensitive logs/secrets | Env template sanitized; no provider secrets required | Rotate historic secrets, secret scanner, PII redaction, field encryption with managed key lifecycle |
| Bank token compromise | No bank tokens handled | Envelope encryption, read-only scopes, revocation and access audit |
| Admin abuse | No admin or impersonation system | Explicitly granted support sessions, dual control for sensitive actions, immutable audit trail |
| Data loss | Explicit local-only storage and manual export | Remote backups, PITR, restore drills, availability monitoring |

## Before accepting customer financial data

- [ ] Rotate credentials formerly present in tracked configuration and review access logs.
- [ ] Replace the legacy data model; use workspace-scoped integer/decimal money and tenant-safe indexes.
- [ ] Complete authorization, cross-tenant and session security tests.
- [ ] Implement server rate limits, login throttling, API key hashing/scopes/revocation, idempotent mutations.
- [ ] Encrypt bank tokens and sensitive fields with a versioned key and rotation runbook.
- [ ] Implement signed Stripe webhooks and verify subscription state server-side.
- [ ] Complete upload security, retention/deletion flows, export authorization and vendor data processing agreements.
- [ ] Perform independent security review and restore testing.
- [ ] Remove inline-script CSP allowances or document the assessed residual risk.
- [ ] Resolve or formally assess remaining build-tool advisories; keep runtime audit gated in CI.

## Compliance work

The public legal pages describe the preview only. They are not jurisdiction-complete hosted SaaS terms. Before a commercial launch, establish the legal entity/controller, support/privacy contacts, subprocessors, retention schedule, deletion SLA and incident notification process. For SOC 2 readiness, collect evidence for access reviews, changes, vendor reviews, backups, incident exercises and employee device security. No certification is claimed.

Minimize PCI scope with provider-hosted Checkout/Portal and never store PAN/CVC. GDPR/CCPA account deletion must cover primary data, jobs, search indexes, analytics and contracted providers, with a documented backup expiry policy. Local demo clearing does not fulfill those hosted requirements.
