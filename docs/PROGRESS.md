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

## Next phases

2. Evaluate each India-focused improvement; document every accept/reject and verify accepted work.
3. Consolidate environment, production containers/CI/security, deploy runbooks and container smoke verification.
4. Generate real INR screenshots and replace the README with verified commands and honest feature status.

## External / operational limitations

- Historical external credentials require rotation in their owning providers; repository cleanup cannot revoke them.
- No paid checkout, bank connection, AI service, production deployment or legal compliance certification is claimed.
- GitHub CI execution, field performance, backup restore in a real target and commercial/provider approvals require external operations.
- Hindi/Kannada copy, FX conversion, investment valuation/transfer accounting and broad recurring/background scheduling are not implemented.
