# Security, privacy and release boundaries

Report vulnerabilities through the repository owner's GitHub private vulnerability reporting channel when enabled; otherwise request a private channel without posting credentials or customer records in an issue. The controls below do not replace an independent security review.

## Data boundaries

- Demo: unencrypted browser local storage, fictional sample data, local export/clear. Browser-profile access is data access. Earlier-currency data is preserved for export and removed by explicit clear.
- Hosted: verified Better Auth identity, database-validated sessions, separate v2 PostgreSQL ledger, no demo fallback. All finance access is workspace-scoped with owner/admin/editor/viewer authorization; composite foreign keys reject cross-tenant accounts. No PostgreSQL RLS claim.
- Legacy: original Float-money single-operator API is disabled. Public hosted boot rejects enabling it. Do not migrate/seed the legacy schema into the hosted ledger.

## Application controls

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

The sanitized `.env.example` contains no live credentials. Environment secrets, `.local/`, generated clients, build info and agent tooling are ignored by Git and excluded from Docker context. The optional local generator uses cryptographic randomness and exclusive mode-0600 file creation. Runtime secrets are injected, never passed as Docker build args.

Historical `.env.example` revisions contain an external PostgreSQL password in `DATABASE_URL` / `DIRECT_URL`, a literal `APP_PASSWORD`, and a literal `AUTH_SECRET` (for example commit `01345a1`). Treat them as **exposed**: reset the database role password in its provider, replace the app password and signing secret wherever reused, revoke sessions, and review access. Local test passwords and explicit examples are not provider credentials. No provider-token/private-key literals were identified in the reachable-history scan; this is not a guarantee about external copies or unreachable objects.

Outbox encryption derives from the auth secret. Drain pending mail before planned rotation; emergency rotation invalidates sessions and makes old undelivered messages unreadable, so discard/reissue those links. A versioned managed-key migration is still pending. Rotate SMTP/OAuth independently and never print their values in logs, screenshots, CI artifacts or support tickets.

### Optional history remediation

Rotation comes first. History rewriting changes commit IDs and requires coordination with collaborators and the hosting provider. It is not part of normal cleanup or a substitute for revocation.

Locate the historical paths without printing values:

```sh
git log --all --oneline -- .local skills-lock.json '*.tsbuildinfo' coverage dist test-results
git grep -l -E '(DATABASE_URL|DIRECT_URL|APP_PASSWORD|AUTH_SECRET)=' 01345a1 -- .env.example
```

If the owner chooses to scrub history, install `git-filter-repo` with sensitive-data-removal support. Create a protected `finsight-redactions.txt` outside Git with one `literal:EXPOSED_VALUE==>REMOVED` line for **each actual revoked value**; the uppercase label is an instruction, not the value to match. Do not commit that file. From its parent directory:

```sh
git clone --mirror https://github.com/Thippeswamykr1204/FinSight.git FinSight-scrub.git
git -C FinSight-scrub.git filter-repo --sensitive-data-removal --replace-text ../finsight-redactions.txt --invert-paths --path .env --path .env.local --path .env.production --path .local/ --path skills-lock.json --path-glob '*.tsbuildinfo' --path coverage/ --path dist/ --path test-results/ --path playwright-report/
```

Inspect every rewritten ref and credential match locally. Preserve the sanitized examples; replacing their old secret values is preferable to deleting the templates. Arrange remote publication and cached-commit removal separately with the repository owner/GitHub, then have collaborators re-clone and delete the redaction file. These commands are provided for an owner decision; history is not rewritten by this cleanup.

## Dependency audit boundary

Runtime advisories are gated with `npm audit --omit=dev --audit-level=high`. Full `npm audit --audit-level=high` reports **7 high build-tool findings** from the `braces` dependency chain in the pinned Tailwind 3 and Next ESLint toolchain. Run both scans when dependencies change. A force upgrade includes breaking toolchain changes and needs separate validation.

CI hard-fails on runtime advisories, publishes the full report with an explicit build-tool exception, and still gates format/lint/types/tests/build/browser/container behavior. These tools consume trusted repository file patterns, not uploaded statements. The exception is **not** a clean all-dependency scan: replace/patch the toolchain upstream and reassess by 5 November 2026. No advisory is hidden or converted into a runtime-clean claim.

## Threat model and remaining work

| Threat                  | Implemented mitigation                                         | Remaining operation                                                                  |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Account takeover        | Verified identity, MFA/passkeys, fresh sessions, shared limits | Actual SMTP/OAuth validation, abuse monitoring and independent review                |
| Cross-tenant access     | RBAC, scoped queries, composite FK, negative tests             | Extend coverage for every new provider/API; assess RLS defense in depth              |
| XSS / imports           | Nonced hosted scripts, bounded text rendering, CSV escaping    | Static-demo inline allowance and style-inline residual risk; scan future attachments |
| CSRF / proxy spoof      | Origin validation, sanitized single-IP ingress                 | Verify the real ingress and block direct origin access                               |
| Payment or bank forgery | No live integration exposed                                    | Provider approval, signed raw-payload events, replay-safe persistence and revocation |
| Data loss               | DB persistence, authorized exports, release migrations         | Cloud encrypted PITR, measured restore and rollback drills                           |
| Deletion / privacy gaps | Primary-store self-service deletion and notice record          | Operator grievances/corrections/nomination, processor logs/email and backup expiry   |
| Key exposure            | Ignored/injected secrets, encrypted outbox                     | Historical provider revocation and versioned encryption-key rotation                 |

## India-first compliance scope

Privacy/terms describe demo and hosted processing through the DPDP Act 2023 lens: notice, consent, data-principal rights and grievance channel. Operators must verify notified rules, phased commencement, applicable exemptions, retention and processor arrangements for their launch. India-region app/database/backups are recommended; Vercel Mumbai plus Neon Singapore is not India-only residency. GDPR rights remain relevant where applicable. This code is not a legal opinion, regulated FIU approval, SOC 2 certificate or guaranteed regulatory compliance.

No PAN/CVC, bank password or tax filing is handled. Razorpay plans/GST examples are planned pricing; payment/invoice and live AA adapters need provider approval and sandbox verification. See [decisions](DECISIONS.md), [deployment](DEPLOYMENT.md) and [the roadmap](../README.md#roadmap).
