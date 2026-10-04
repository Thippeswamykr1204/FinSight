# FinSight v2 — exact continuation checkpoint

**Branch:** `rebuild/v2`

**Date:** October 4, 2026

**Status:** working, verified product-demo milestone. The full revenue-generating SaaS request is **not complete**. Hosted identity, tenant isolation and billing are the next implementation phase.

## Completed and committed

1. **Review and plan** (`88585ff`): repository review, design direction, stack decisions, target architecture and numbered phases.
2. **Foundation** (`01345a1`): initial premium shell, design tokens, marketing direction and metadata. Later core work replaced first-pass inert interactions with working behavior.
3. **Product core** (`d9c56e8`): rebuilt UI with real browser-local persistence, dashboard calculations, transaction CRUD, CSV/OFX import preview and duplicate detection, real CSV/JSON downloads, monthly budgets, goal creation/contributions, manual accounts, financial-health explanation and cash-flow scenarios. Includes onboarding, preferences, command palette, notification read state, mobile navigation, light/dark mode, public marketing/pricing/features/FAQ/legal pages, PWA assets and offline recovery.
4. **Delivery checkpoint**: README, deployment/runbooks, threat model/security checklist, pricing/unit economics, scale cost scenarios, 90-day roadmap, Docker/Compose and CI verification workflow. This is support for the demo milestone, not completion of production phases 3–5.

## What is running

- `npm run dev` starts Next.js with Turbopack at `http://localhost:3000` after dependency installation.
- `npm run build` and `npm run start` run the production-mode demo without a database.
- Sample records seed relative to the current month. All new product data is browser-local and explicitly marked as demo data.
- Public `/api/health` returns liveness JSON. Other API routes are legacy and disabled by default (503).
- `.env.example` is sanitized. The existing local `.env` was not overwritten and must not be used for unreviewed migrations or seeding.

## Current source boundaries

- `src/lib/finance/model.ts`: Zod schemas, integer-money parsing/formatting, seed, balances, monthly summaries and chart history.
- `src/lib/finance/import-export.ts`: CSV/OFX parsing, bounded import, deduplication, CSV formula protection and file downloads.
- `src/components/finance/provider.tsx`: validated local state, persistence, notifications and reset.
- `src/components/finance/primitives.tsx`: Radix focus-trapped modal, form field/error, empty state and page heading.
- `src/components/layout/app-shell.tsx`: sidebar/mobile navigation, command palette, derived notifications, theme.
- `src/app/`: complete demo screens and public pages. `src/app/api` retains original single-operator endpoints as disabled reference code.
- `src/middleware.ts`: correctly placed API gate. The original root middleware was not being applied alongside `src/app`; browser security tests caught and fixed this.
- `prisma/schema.prisma`: **still the legacy two-model schema**. It is not tenant-safe and its money columns still use Float. Do not present it as the v2 persistence layer.

## Verified checks

- ESLint: no warnings/errors.
- TypeScript: passes.
- Next production build: passes; no database request is made to render the new finance screens.
- Financial domain/import tests: 10 passing; coverage 95% statements, 94.94% branches, 95.74% functions, 95.3% lines for `src/lib/finance`.
- Legacy signing-boundary tests: 3 passing; verify configuration, tampering, expiry and key rotation. Total unit tests: **13 passing**.
- Development Chromium suite: six product/security/accessibility tests pass.
- Production Chromium suite: seven tests pass, including PWA manifest/PNG assets and offline recovery without financial-page caching.
- Automated axe checks pass for all 15 public/product screens in light mode and the mobile dashboard in dark mode; responsive checks found no horizontal overflow at 390px.
- Desktop/mobile screenshots were captured and reviewed. Final production screenshot smoke test reported zero browser errors.
- `npm audit --omit=dev --audit-level=high`: **zero runtime advisories** at verification.
- `docker compose config --quiet`: passes. Container image build/run remains **unverified**: Docker CLI exists, but its daemon is unavailable. An attempt to start Docker Desktop timed out; the subsequent daemon check still failed.

These checks do not establish a manual WCAG audit, field Core Web Vitals, million-user capacity, or production compliance.

## Resolved issues worth knowing

- Next upgraded from vulnerable 14.1.3 to 15.5.27; patched PostCSS/esbuild resolutions; Vitest upgraded to 5 with Node 22 types.
- Removed obsolete dark-only forms, charts, navigation, hooks and inert demo-success behavior.
- Financial UI now derives totals from one ledger instead of displaying unrelated fixed figures.
- Login no longer implies working hosted authentication. Pricing no longer implies active paid checkout. Account screens do not claim a live bank connection.
- Retained legacy API fails closed unless explicitly enabled and configured.
- Contrast issues in active navigation and muted text were fixed against axe results.
- Webpack dev produced intermittent cold-start invalid-token/hydration failures. Turbopack dev passed the full suite; production-mode checks and screenshot smoke test also passed.
- Service worker caches only recovery assets and icons, not financial content.

## Exact next phase: hosted identity and tenant-safe persistence

1. Establish an isolated **local test database**. Never migrate the database referenced by the existing `.env` automatically. Start Docker if available and add a database profile with fresh development credentials.
2. Add v2 Prisma models and migrations for users, workspaces, memberships/roles, sessions/auth factors, accounts, integer/decimal-money ledger entries, budgets and goals. Scope finance indexes and unique keys by workspace. Keep legacy tables intact until a documented conversion/backfill has been tested.
3. Implement real hosted authentication using a maintained auth library/provider verified against the installed Next version. Complete email/password, Google/Apple adapters, magic links, MFA, passkeys, recovery and session revocation with explicit configured/unconfigured states.
4. Implement a server-side principal/workspace context, RBAC enforcement and tenant-scoped repository boundaries. Add cross-workspace denial tests, CSRF tests and session tests before connecting UI mutations.
5. Introduce `/api/v1` contracts with validation, consistent errors, cursor pagination and idempotency keys. Keep the demo an explicitly separate mode; never fallback from a hosted error to sample records.
6. Wire hosted finance screens to the repository/API boundary. Verify all current browser workflows against the database, including imports, retries and deletion.
7. Then implement Stripe checkout/portal/invoices/trials, raw-body signed webhooks, unique provider events, durable entitlement updates and server-enforced limits. Validate in Stripe test mode before a paid launch.
8. Continue the remaining checklist in `docs/LAUNCH.md`: bank adapters, background jobs/outbox, email/push, admin/audit, receipts/splits/currency/rules/recurring, API keys/outgoing webhooks, telemetry, IaC, load tests and commercial policies.

## Outstanding operational items

- Rotate credentials formerly present in tracked `.env.example`; sanitizing the current file does not remove them from Git history.
- Build/run the Docker image when the daemon is available. CI configuration exists but has not been executed on GitHub.
- Development/build-only glob dependencies still have upstream `braces` advisories; production audit is clean. Review replacement of Tailwind 3/ESLint tooling before claiming an all-dependency clean scan.
- Hosted billing/auth/bank/email credentials and provider contracts will be required for end-to-end live verification. No real provider call was fabricated.
- OpenTelemetry, metrics, Redis rate limiting, queues, admin impersonation, Terraform, production deployment, backups and disaster recovery are specified in docs but not implemented.
- i18n is limited to regional number/date formatting; copy translation and RTL layouts remain unimplemented.
- Currency conversion, recurring scheduler, subscription detector, receipt uploads, split expenses and detailed investment holdings remain unimplemented.

## Resume commands

```sh
git status --short --branch
npm run dev
npm run lint
npm run typecheck
npm run test:coverage
npm run build
E2E_PRODUCTION=1 npm run test:e2e
```

Run production browser tests after the production build; do not start the dev server concurrently against the same `.next` directory. Continue on `rebuild/v2`, commit verified phases, and update this file when the next checkpoint is reached.
