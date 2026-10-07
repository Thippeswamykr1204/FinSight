# FinSight audit — Phase 0

Reviewed 7 October 2026. This is the pre-migration assessment, not a production certification. All authored application, component, domain, route, test, script, schema/migration, configuration and documentation files were reviewed. Dependencies and generated clients were inventoried rather than treated as authored source. The supplied folder has no `.git` metadata: the presence of generated files cannot establish whether they were committed.

## Strengths

- Approved visual system: local Geist/Fraunces fonts, consistent mint/cobalt/ember tokens, Radix dialogs, surface/button hover effects, route-entry animation, light/dark demo themes, mobile navigation and purposeful empty states.
- The India domain (`src/lib/finance`) is cohesive and tested: integer paise, BigInt decimal parsing, bounded amounts, Indian grouping, lakh/crore, Kolkata dates, April–March FY, explicit calculator rounding, CSV/OFX preview, currency rejection, deduplication and spreadsheet-formula escaping.
- Hosted mode uses real verified identities and empty workspaces, never sample-data fallback. Four roles, invitations, audit, fresh-session deletion, personal/workspace export, optimistic transaction versions and actor/payload-bound finance idempotency already exist.
- PostgreSQL writes serialize per workspace, recheck membership and commit audit/idempotency with ledger writes. Composite account foreign keys prevent cross-workspace references.
- Better Auth provides email verification/reset, magic links, confirmed TOTP/recovery, user-verified passkeys and session revocation. MFA-enabled identities cannot silently use magic links/OAuth to bypass the second factor.
- Hosted/auth scripts receive nonce CSP; cookies are HttpOnly/SameSite; financial responses are no-store. PWA caches recovery assets only. SMTP outbox bodies use AES-GCM and are erased after delivery.
- Existing tests cover money/date rules, import edge cases, calculators, tenant isolation, optimistic conflicts, MFA/passkeys, deletion and selected axe/mobile flows. Container/backup smoke tooling exists.

## Findings

| Priority | Finding and evidence | Required remediation |
| --- | --- | --- |
| P0 | Hosted UI imports database/auth/authorization directly (`src/app/app/layout.tsx`, `app/page.tsx`, `workspaces/[id]/page.tsx`). Hosted Next API routes contain business/persistence logic. | Database-free Next web; independently deployable Express API with routes/controllers/services/repositories. |
| P0 | Runtime audit on 7 October reports high `source-map-js` GHSA-68fv-2mgg-jv7q. README's zero-runtime-findings claim is stale. | Update compatible dependency and lockfile; rerun both audits. |
| P0 | Mongo, Redis hosted coordination, BullMQ, MERN CI/container topology and migration importer are absent. | Implement and verify against a replica set, Redis and SMTP. |
| P1 | Mongo has no composite foreign keys. Removing PostgreSQL without replacing transactional reference checks would weaken tenant isolation. | Session-bound repository scope, workspace revision write serialization, transactional account validation and negative/concurrency tests. |
| P1 | Workspace export authorizes outside its RepeatableRead transaction; revocation can race export. Overview performs multiple non-snapshot reads. | Reauthorize inside a consistent snapshot; serialize sensitive exports with membership changes. |
| P1 | Invitation acceptance checks token validity but does not reauthorize the inviter at acceptance. Demotion/removal leaves outstanding grant capability. | Record inviter; revoke invitations on role removal/demotion; recheck grant authority. |
| P1 | Account deletion deletes literal `api:${userId}` rate key, while `consumeLimit` stores SHA-256 hashes. Verification cleanup also uses literal identifiers despite hashed identifiers being configured. | Use common key derivation; track verification ownership and invalidate all applicable auth artifacts. |
| P1 | Password hashing uses provider default, not explicit Argon2id. Sessions renew expiry but no application-level rotating refresh/reuse-revocation guarantee is demonstrated. | Explicit Argon2id with compatible legacy verifier; test session rotation/replay/revocation. |
| P1 | Outbox encryption key derives from auth secret; rotation makes old pending mail unreadable. Financial descriptions and names are plaintext. | Versioned dedicated field-encryption keys with authenticated context; migration and rotation tests. |
| P1 | No production metrics/error hooks; unexpected failures mapped to 503 without diagnostic cause. | Redacted pino diagnostics, request/queue correlation, Sentry-ready hooks, health/queue metrics. |
| P1 | Body/schema validation is good for commands but route IDs and query parameters are not uniformly Zod-parsed; audit returns latest 100 only. | Validate params/query/headers/body, stable pagination and OpenAPI. |
| P1 | Idempotency is limited to finance commands. Workspace creation/invites can duplicate on retries. | Extend durable actor-bound keys to retryable commands and outbox events. |
| P1 | Service has hard per-workspace caps but no measured millions-user capacity or load test. Overview scans/aggregates entire ledger repeatedly and FY entries are pulled into JS. | Indexed Mongo aggregations, revision-keyed cache with auth checked first, bounds, load/restore tests and measured capacity. |
| P2 | Global provider initializes demo state even on marketing pages. Demo summaries repeatedly scan state. Client API generics are unchecked casts. | Preserve visuals; lazy data boundary and runtime response validation. |
| P2 | Restored JSON checks individual shapes but not cross-account references, duplicate IDs/budgets or saved<=target; update enforces only some invariants. | Validate full restored state integrity without silently deleting user storage. |
| P2 | Demo update closes over render state; rapid writes or concurrent tabs can lose updates. | Functional updates/current state reference and deliberate cross-tab synchronization. |
| P2 | Demo account balance accepts `0`/`0.00`, but not `0.0`; hosted signed parser differs. | One shared signed-paise parser at data boundaries. |
| P2 | Hosted shell is light-only, has no bottom nav, theme toggle, palette or desktop collapse. Large full INR values and header controls can overflow small widths. | Record baseline honestly; responsive-only enhancements must use existing design language and be screenshot-reviewed. |
| P2 | `viewport-fit=cover` is absent; safe-area handling is bottom-nav-only. Coarse-pointer rule does not cover all links. | Required viewport/device matrix, safe-area and touch-target verification. |
| P2 | Robots excludes some private demo paths but not all. Reset/MFA pages inherit indexable root metadata. | Private-page noindex and complete robots list. |

## Dead/legacy code and artifact inventory

- Disabled single-user API: `src/app/api/auth`, `budgets`, `dashboard`, `transactions` (including recurring generator/import). It remains compiled despite `ENABLE_LEGACY_API=false`.
- Legacy support: `src/lib/auth.ts`, `prisma.ts`, `redis.ts`, `dashboard.ts`, `csv.ts`, `report.ts`, `validations.ts`, legacy types and most helpers in `utils.ts`. Retain the used `cn` helper.
- `prisma/schema.prisma` stores Float rupees and has an extra category-only budget uniqueness constraint. Legacy seed clears all records and generates random samples; unsuitable for hosted production.
- `prisma/hosted` is active, not dead until replaced. Remove schemas/migrations only after preserving the old shape in importer mapping/fixtures.
- `src/generated/hosted` contains generated runtime/declarations/schema and a Darwin ARM native binary. Ignored by `.gitignore`, present locally, required by current build; remove after cutover.
- Existing worker/build/start/container scripts and Compose files are PostgreSQL-specific and need replacement after MERN validation.
- Unused icon imports and redundant passthrough layouts exist. Do not remove screens or alter styles as cleanup.
- `.next`, `dist`, `node_modules`, coverage/test outputs and local secret files are artifacts, not product source. Do not ship them in source or Docker context.

## Missing verification / production blockers

No Supertest/Mongo integration, BullMQ retry tests, OpenAPI verification, full viewport visual snapshots, WebKit/Android checks, Lighthouse budgets, sustained load tests or actual cloud PITR drill exists. Existing hosted tests depend on Prisma and SQL constraints and must be translated to equivalent Mongo invariants, not removed to obtain green results. Billing/bank sync are explicitly planned in approved copy; there is no real checkout or live AA adapter. Preserve that truthful boundary.

The inherited SECURITY document describes historically exposed credentials; this folder has no Git history to independently verify or revoke them. No real credential values were printed or copied during this review. Deployment requires operator-injected credentials and contacts, not fake production defaults.

## Baseline checks

| Command | 7 October result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass: 26 tests / 5 files |
| `npm run build` | Pass: Next production + Prisma generation + email worker |
| `npm audit --omit=dev --audit-level=high` | Fail: one high source-map-js advisory |

An initial runner invocation added Jest's unsupported `--runInBand`; Vitest rejected the flag before execution. The correct `npm test` subsequently passed. Browser, Docker and visual results must be recorded separately as they are executed; existing screenshots are not evidence of a new run. Install/build can regenerate ignored artifacts but Phase 0 makes no application source changes.
