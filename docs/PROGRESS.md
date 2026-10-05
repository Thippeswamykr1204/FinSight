# FinSight — India-first delivery checkpoint

Branch: `feat/india-inr` · Date: 5 October 2026.

## Foundation retained

Next.js 15 / TypeScript / Better Auth / isolated Prisma PostgreSQL v2 ledger. Browser-local demo and hosted `/app` records are separated. Hosted identity includes verified email/password, reset, magic links, TOTP/recovery, passkeys and sessions; workspaces include roles, invitations, idempotent/versioned writes, cursor pagination, audit and encrypted durable SMTP outbox. External OAuth, production SMTP, billing and bank sync have not been live-verified. The Float-money legacy schema/API is disabled and is not the v2 ledger.

## Phase 1 — completed

- One regional contract: INR, en-IN, Asia/Kolkata, integer paise, Indian grouping and lakh/crore compact labels.
- Exact BigInt-backed rupee parsing validates Indian commas, rejects float-style notation and supports explicit half-up paise rounding for calculations.
- DD/MM/YYYY displays, Indian financial-year helpers and demo/hosted FY cash-flow summaries; ISO storage remains stable.
- Demo schema 3 with realistic Indian records. Older local data is preserved for export rather than silently converted; clearing includes the old key.
- Additive migration changes the hosted default to INR. Only financially empty legacy workspaces move to INR; funded legacy currency amounts stay untouched, explicit and read-only. Applied migration was not edited.
- INR labels, chart tooltips/axes, CSV currency/date contract, OFX currency guard, public pricing/FAQ and domain documentation updated. English-only copy is honest about translation status.
- Larger Indian numbers exposed a mobile table overflow; fixed and reverified with the responsive browser checks.

### Verification

Baseline: `npm run check`, 7 demo and 7 hosted production Playwright tests passed before edits.
Phase 1: `npm run check` passes (lint, typecheck, 19 unit tests, coverage 96.11% statements / 95.45% branches, production build). Production Playwright: 7 demo + 9 hosted tests pass, including real SQL migration safety, read-only currency boundary, identity, isolation, accessibility and mobile checks.

## Phase 2 — completed

- Every candidate accepted/rejected with scope and reason in `docs/IMPROVEMENTS.md`; unsupported bank presets, tax assumptions, billing, settlement and investment accounting were not guessed.
- Indian categories, conservative merchant suggestions and strict UPI narration references; all manual Indian account types and persisted/updateable credit-card due reminders.
- EMI amortization with CSV schedule, transparent SIP and goal calculators in demo/hosted shells; seasonal goal suggestions and shareable INR FY report text.
- India-first DPDP notice/terms, server-recorded signup notice acceptance, personal export and real owner/recent-session-controlled workspace/account deletion. Backup/processor retention and legal review remain explicit operator responsibilities.
- 44px controls/coarse-pointer buttons and readable responsive totals; retained lazy charts and recovery-only PWA. Chromium confirms both local Geist and Fraunces fonts render the rupee glyph without fallback.

Verification: `npm run check` passes, 23 unit tests with 96.8% statement coverage; production demo Playwright 9 tests and hosted Playwright 10 tests, including deletion/notice/negative tenant and stale-session cases. The phase 1 passing checkpoint was phase 2's pre-change baseline.

## Phase 3 — completed with explicit external limits

- Consolidated `.env.example`, ignored/excluded local secret/tooling artifacts, mode-0600 fresh local credentials and explicit public hosted boot validation. Historical external credential revocation cannot be done without provider administrative access and remains outstanding.
- One 134 MB standalone app/worker image (local ARM64 measurement), a separate non-root migrator target, production Compose profiles for hosted Postgres/migration/worker and optional Redis. The worker is independently bundled; a Next trace-only CJS dependency failure was discovered and fixed by the actual container smoke.
- Nonced hosted/auth script CSP, explicit cookie attributes, HSTS, validated single-IP proxy handling, database readiness and durable-worker retention cleanup.
- CI covers install, formatting, lint/types, coverage, build, both production browser suites, runtime audit and demo/hosted container smoke; full audit reports its known build-tool exception. GitHub execution is not claimed.
- Source-checked Vercel/Neon and Docker/AWS Mumbai deploy paths include domain/TLS, SMTP, safe migrations, worker, backups, rollback and smoke checks. Neon currently has no Mumbai region; the Vercel/Neon path is explicitly not India-only residency.

Verified locally: `npm run check`, 26 unit tests (including Kolkata/UTC month rollover), 9 demo + 10 hosted production browser tests (including CSP nonce/hydration and HttpOnly/SameSite cookie assertions), non-root demo container health, missing-config boot failure, fresh hosted migration job, app/worker health, real standalone worker SMTP delivery/body erasure, container signup/verification/INR ledger mutation and logical dump/restore with paise totals checked. Caddy configuration validation passed. Runtime audit: zero vulnerabilities. Full audit: 7 high development-only braces-chain findings; documented, not falsely reported as clean. The phase 2 passing checkpoint was the pre-change baseline.

## Next phase

4. Generate real INR screenshots and replace the README with verified commands and honest feature status.

## External / operational limitations

- Historical external credentials require rotation in their owning providers; repository cleanup cannot revoke them.
- No paid checkout, bank connection, AI service, production deployment or legal compliance certification is claimed.
- GitHub CI execution, field performance, backup restore in a real target and commercial/provider approvals require external operations.
- Hindi/Kannada copy, FX conversion, investment valuation/transfer accounting and broad recurring/background scheduling are not implemented.
