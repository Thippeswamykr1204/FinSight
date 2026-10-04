# Security and launch controls

## Current trust boundary

FinSight has two explicit data boundaries. Demo routes use unencrypted browser local storage; browser access is data access. Hosted `/app` routes require verified identity and use a separate PostgreSQL schema. Hosted errors never substitute demo records. The local hosted foundation has passed integration tests; public customer launch still requires the operational controls below.

The original PostgreSQL endpoints remain as disabled legacy code. Middleware at `src/middleware.ts` delegates `/api/identity/*` and `/api/v1/*` to their own Node authentication/authorization handlers. Unless `ENABLE_LEGACY_API=true` is explicitly set, all legacy API requests return 503; the liveness endpoint remains public. Enabling legacy access still requires a workspace password and a signing secret of at least 32 characters. Never expose that single-operator mode as a SaaS.

## Implemented controls

- Same-origin API mutation checks for the optional legacy API.
- Better Auth sessions with database validation, verified email, reset revocation, TOTP with confirmed enrollment/single-use recovery, and user-verified passkeys. Magic links and OAuth cannot bypass enabled TOTP.
- Server-resolved workspace membership/RBAC on all financial queries and mutations; writes serialize within the workspace and recheck current permission. Composite DB foreign keys reject cross-workspace account references. Database RLS is not claimed.
- Same-origin finance mutations and Better Auth origin/callback validation; streamed payload limits of 2 MB for finance and 64 KB for identity.
- Atomic shared PostgreSQL rate limits and explicit trusted-ingress IP configuration.
- Integer BIGINT ledger storage, SQL amount/type constraints, optimistic transaction versions, actor-bound idempotency keys and transactional audit records.
- Hashed invitation tokens, single-use email-bound acceptance, role escalation checks, and owner-only financial export.
- Encrypted SMTP outbox bodies, bounded delivery retries, body erasure after delivery and redacted API/worker logging. Key rotation and retention cleanup are not yet automated.
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
| Account takeover | Verified identity, reset revocation, TOTP/recovery, user-verified passkeys, session controls and shared throttling | Real OAuth/SMTP validation, monitoring, independent review and key-rotation operations |
| Cross-tenant reads/writes | Workspace-scoped repositories, role checks, composite DB constraints and isolation tests | Continue negative authorization coverage for each new API; consider RLS defense in depth |
| XSS and malicious imports | Text rendering, validation, file limits, CSP | Strict nonced CSP, attachment scanning and signed downloads |
| Spreadsheet formula injection | Export escapes dangerous formula prefixes | Repeat for all report formats/integrations |
| CSRF | Finance origin gate plus Better Auth validation; foreign-origin rejection tested | Validate real OAuth callbacks at staging ingress |
| Payment forgery/replay | No billing endpoints | Signature verification against raw bytes, unique provider event IDs, durable retries |
| Sensitive logs/secrets | Env templates sanitized, redacted request logs, encrypted outbox/OAuth tokens, local secrets ignored | Rotate historic secrets, secret scanner and versioned managed-key lifecycle |
| Bank token compromise | No bank tokens handled | Envelope encryption, read-only scopes, revocation and access audit |
| Admin abuse | No admin or impersonation system | Explicitly granted support sessions, dual control for sensitive actions, immutable audit trail |
| Data loss | Demo local export; hosted durable database and authorized financial export | Remote backups, PITR, restore drills, availability monitoring |

## Before accepting customer financial data

- [ ] Rotate credentials formerly present in tracked configuration and review access logs.
- [x] Introduce a separate workspace-scoped integer-money model and tenant-safe indexes without migrating the external legacy database.
- [x] Verify current identity, tenant isolation, role denial, idempotency, optimistic conflict and DB constraint boundaries through integration tests.
- [x] Implement shared server/login rate limits and actor-bound idempotent financial commands.
- [ ] Add public API-key hashing/scopes/revocation and negative tests for future endpoints.
- [ ] Encrypt bank tokens and sensitive fields with a versioned key and rotation runbook.
- [ ] Implement signed Stripe webhooks and verify subscription state server-side.
- [ ] Complete upload security, retention/deletion flows, export authorization and vendor data processing agreements.
- [ ] Perform independent security review and restore testing.
- [ ] Remove inline-script CSP allowances or document the assessed residual risk.
- [ ] Resolve or formally assess remaining build-tool advisories; keep runtime audit gated in CI.

## Compliance work

The public legal pages describe the preview only. They are not jurisdiction-complete hosted SaaS terms. Before a commercial launch, establish the legal entity/controller, support/privacy contacts, subprocessors, retention schedule, deletion SLA and incident notification process. For SOC 2 readiness, collect evidence for access reviews, changes, vendor reviews, backups, incident exercises and employee device security. No certification is claimed.

Minimize PCI scope with provider-hosted Checkout/Portal and never store PAN/CVC. GDPR/CCPA account deletion must cover primary data, jobs, search indexes, analytics and contracted providers, with a documented backup expiry policy. Local demo clearing does not fulfill those hosted requirements.
