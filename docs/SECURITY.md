# Security, privacy and release boundaries

Updated 5 October 2026. Locally verified controls are listed below; independent security review and public-provider operations are not claimed. Report private vulnerabilities through the repository owner's GitHub private vulnerability reporting channel when enabled; otherwise request a private channel without posting credentials or customer records in an issue.

## Data boundaries

- Demo: unencrypted browser local storage, fictional sample data, local export/clear. Browser-profile access is data access. Earlier-currency data is preserved for export and removed by explicit clear.
- Hosted: verified Better Auth identity, database-validated sessions, separate v2 PostgreSQL ledger, no demo fallback. All finance access is workspace-scoped with owner/admin/editor/viewer authorization; composite foreign keys reject cross-tenant accounts. No PostgreSQL RLS claim.
- Legacy: original Float-money single-operator API is disabled. Public hosted boot rejects enabling it. Do not migrate/seed the legacy schema into the hosted ledger.

## Implemented and tested

- Email verification/password reset with session revocation, single-use magic links, confirmed TOTP/recovery codes, user-verified passkeys and device/session controls. Configured second factor cannot be silently bypassed through alternate sign-in.
- Explicit HttpOnly / SameSite=Lax session cookies; Secure for HTTPS origin. Seven-day expiry, ten-minute fresh-session window. Reset/deletion invalidates server sessions; session-cookie caching is disabled.
- Membership resolved server-side, writes locked per workspace with role recheck, idempotency actor/fingerprint binding, optimistic transaction versions and audit events. Safe INR paise storage and additive currency migration; funded legacy currency is explicit/read-only.
- Same-origin financial mutations and Better Auth callback validation. Finance payloads are byte-bounded while streaming to 2 MB, identity to 64 KB. Import rows/files/total records are bounded; text-rendered merchant data and spreadsheet formula escaping protect imports/exports.
- Shared atomic PostgreSQL rate buckets. Identity ingress overwrites its internal client-IP header. Only an explicitly configured proxy-overwritten **single valid IP** is accepted; comma lists, malformed values and empty values fall back to one shared bucket. Direct origin access must be blocked by deployment networking. The repository does not trust arbitrary forwarded headers.
- Nonced script CSP on dynamic hosted/auth pages (`/app`, `/sign-in`, `/sign-up`, `/auth`) with strict-dynamic and no production script `unsafe-inline`/`unsafe-eval`. Inline styles remain for component/chart styles. Public static demo pages permit Next hydration's inline scripts; they must never contain hosted secrets. No financial page/API is cached by the service worker.
- Frame deny/frame-ancestors none, MIME sniffing protection, restricted permissions, referrer policy and production HSTS. Hosted/auth HTML and API envelopes use no-store. Public health/readiness report no secrets or database error details.
- Server-recorded version/time of new signup privacy-notice acceptance; old users have no invented consent history. External OAuth user creation without acceptance is refused. Provider login adapters are configuration-gated and not live-verified.
- Owner-only financial export, personal metadata export without passwords/tokens/MFA secrets, fresh-session explicit-confirmation workspace deletion and account deletion blocked while owning workspaces. Identity cascades erase credentials/devices/membership, addressed email/invitations and actor idempotency records; retained shared audit actors are anonymized. Delivered messages/downloads/backups require processor retention policy.
- AES-256-GCM encrypted outbox bodies, leased at-least-once SMTP delivery, bounded retries, body erasure after success and redacted logs. Production SMTP requires TLS. Worker cleanup expires rate/auth artifacts, 30-day idempotency records, 7-day sent-mail metadata and 30-day exhausted mail.
- Production web and worker entrypoints fail before startup for missing required hosted configuration. Non-root standalone Docker app/worker, read-only Compose filesystems, dropped capabilities, no-new-privileges, loopback-only app ingress and separate release migration job. Worker dependencies are bundled independently of Next's web file tracing.

## Secret handling and rotation

One sanitized `.env.example`; `.env*`, `.local/`, generated clients, build info and tooling lock state are ignored by Git and excluded from Docker context. Neither `.local/` nor `tsconfig.tsbuildinfo` nor `skills-lock.json` was tracked at this checkpoint; stale local build/tooling artifacts were removed. Existing external `.env` values were not overwritten or printed. New local deployment credentials are cryptographically generated with exclusive mode-0600 file creation. Runtime secrets are injected, never passed as Docker build args.

Historical credentials in Git commits remain **exposed** until revoked in their owning database/provider. Repository cleanup cannot revoke an external password, and no administrative provider credentials were supplied for that operation. Before reusing those services: change database/app passwords in their control plane, issue an independent auth secret, revoke sessions and review access. Git-history rewriting is not done without explicit authorization because it affects collaborators and does not substitute for revocation.

Outbox encryption derives from the auth secret. Drain pending mail before planned rotation; emergency rotation invalidates sessions and makes old undelivered messages unreadable, so discard/reissue those links. A versioned managed-key migration is still pending. Rotate SMTP/OAuth independently and never print their values in logs, screenshots, CI artifacts or support tickets.

## Dependency audit boundary

`npm audit --omit=dev --audit-level=high`: zero runtime advisories at local verification. Full `npm audit --audit-level=high` reports **7 high build-tool findings** from the `braces` dependency chain in Tailwind 3 and Next ESLint's fast-glob/micromatch. Registry inspection found current braces 3.0.3 is still affected; even the latest Next ESLint plugin depends on fast-glob. A force upgrade is not a safe one-line remediation.

CI hard-fails on runtime advisories, publishes the full report with an explicit build-tool exception, and still gates format/lint/types/tests/build/browser/container behavior. These tools consume trusted repository file patterns, not uploaded statements. The exception is **not** a clean all-dependency scan: replace/patch the toolchain upstream and reassess by 5 November 2026. No advisory is hidden or converted into a runtime-clean claim.

## Threat model and remaining work

| Threat | Implemented mitigation | Remaining operation |
|---|---|---|
| Account takeover | Verified identity, MFA/passkeys, fresh sessions, shared limits | Actual SMTP/OAuth validation, abuse monitoring and independent review |
| Cross-tenant access | RBAC, scoped queries, composite FK, negative tests | Extend coverage for every new provider/API; assess RLS defense in depth |
| XSS / imports | Nonced hosted scripts, bounded text rendering, CSV escaping | Static-demo inline allowance and style-inline residual risk; scan future attachments |
| CSRF / proxy spoof | Origin validation, sanitized single-IP ingress | Verify the real ingress and block direct origin access |
| Payment or bank forgery | No live integration exposed | Provider approval, signed raw-payload events, replay-safe persistence and revocation |
| Data loss | DB persistence, authorized exports, release migrations | Cloud encrypted PITR, measured restore and rollback drills |
| Deletion / privacy gaps | Primary-store self-service deletion and notice record | Operator grievances/corrections/nomination, processor logs/email and backup expiry |
| Key exposure | Ignored/injected secrets, encrypted outbox | Historical provider revocation and versioned encryption-key rotation |

## India-first compliance scope

Privacy/terms describe demo and hosted processing through the DPDP Act 2023 lens: notice, consent, data-principal rights and grievance channel. Operators must verify notified rules, phased commencement, applicable exemptions, retention and processor arrangements for their launch. India-region app/database/backups are recommended; Vercel Mumbai plus Neon Singapore is not India-only residency. GDPR rights remain relevant where applicable. This code is not a legal opinion, regulated FIU approval, SOC 2 certificate or guaranteed regulatory compliance.

No PAN/CVC, bank password or tax filing is handled. Razorpay plans/GST examples are planned pricing; payment/invoice and live AA adapters need real provider approval/test verification. See [IMPROVEMENTS](IMPROVEMENTS.md), [DEPLOYMENT](DEPLOYMENT.md) and [LAUNCH](LAUNCH.md).
