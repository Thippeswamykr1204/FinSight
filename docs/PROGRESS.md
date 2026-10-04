# FinSight v2 — exact continuation checkpoint

**Branch:** `rebuild/v2`

**Date:** October 4, 2026

**Status:** verified product demo plus phase 3A hosted identity and tenant-safe persistence. The full revenue-generating SaaS request is **not complete**. Stripe billing and server-enforced paid entitlements are the next implementation phase.

## Completed and committed

1. **Review and plan** (`88585ff`): repository review, design direction, stack decisions, target architecture and numbered phases.
2. **Foundation** (`01345a1`): initial premium shell, design tokens, marketing direction and metadata. Later core work replaced first-pass inert interactions with working behavior.
3. **Product core** (`d9c56e8`): rebuilt UI with real browser-local persistence, dashboard calculations, transaction CRUD, CSV/OFX import preview and duplicate detection, real CSV/JSON downloads, monthly budgets, goal creation/contributions, manual accounts, financial-health explanation and cash-flow scenarios. Includes onboarding, preferences, command palette, notification read state, mobile navigation, light/dark mode, public marketing/pricing/features/FAQ/legal pages, PWA assets and offline recovery.
4. **Delivery checkpoint** (`024a3af`): README, deployment/runbooks, threat model/security checklist, pricing/unit economics, scale cost scenarios, 90-day roadmap, Docker/Compose and CI verification workflow.
5. **Hosted foundation (this checkpoint)**: isolated v2 Postgres schema and SQL constraints; verified email/password, reset, magic links, TOTP/recovery, passkeys and sessions; workspace roles/invitations; versioned finance APIs with idempotency, optimistic concurrency, cursor pagination and audit records; real hosted UI, authorized financial export, shared rate limits and encrypted durable SMTP outbox. Google/Apple adapters are configuration-gated; external provider flows are not live-verified.

## What is running

- `npm run dev` generates both Prisma clients and starts the no-configuration demo with Turbopack at `http://localhost:3000`.
- `npm run dev:hosted` starts isolated Postgres/Mailpit, generates clients, deploys only the hosted migration, and runs the email worker plus app. Create an account at `/sign-up` and read verification mail at `http://localhost:18025`.
- `npm run build` and `npm run start` run the production artifact; hosted routes activate only with the hosted environment configured.
- Demo routes seed fictional records relative to the current month and store them locally. `/app` uses authenticated database records and never falls back to the demo.
- Public `/api/health` returns liveness JSON and selected mode, not dependency readiness. `/api/identity/*` and `/api/v1/*` use their own authentication/authorization. Legacy endpoints remain disabled by default (503).
- Local hosted dependencies use Compose project `finsight-hosted-local`: development Postgres on loopback 55432, a separate test database on 55433, Mailpit SMTP on 11025 and inbox on 18025. Generated local secrets live in ignored `.local/` with mode 0600.
- `.env.example` is sanitized and `.env.hosted.example` defines the new configuration. The existing `.env` was not overwritten; its external legacy database was not migrated or seeded.

## Current source boundaries

- `src/lib/finance/model.ts`: Zod schemas, integer-money parsing/formatting, seed, balances, monthly summaries and chart history.
- `src/lib/finance/import-export.ts`: CSV/OFX parsing, bounded import, deduplication, CSV formula protection and file downloads.
- `src/components/finance/provider.tsx`: validated local state, persistence, notifications and reset.
- `src/components/finance/primitives.tsx`: Radix focus-trapped modal, form field/error, empty state and page heading.
- `src/components/layout/app-shell.tsx`: sidebar/mobile navigation, command palette, derived notifications, theme.
- `src/components/layout/product-provider.tsx`: separates demo state from hosted routes.
- `src/components/hosted/`: auth, workspace list/board, invitations, private shell and security settings.
- `src/lib/hosted/`: Better Auth, configuration, sessions/principals, RBAC, bounded HTTP contracts, repository, encryption, SMTP delivery and rate limits.
- `src/app/app/`: protected hosted pages; `/sign-in`, `/sign-up` and `/auth/*` are identity screens.
- `src/app/api/identity/` and `src/app/api/v1/`: hosted identity and session-authenticated workspace/finance APIs. Original single-operator routes remain disabled reference code.
- `src/middleware.ts`: correctly placed legacy gate; hosted handlers enforce their own boundaries in the Node runtime.
- `prisma/schema.prisma`: unchanged legacy two-model Float-money schema; never use it as the v2 persistence layer.
- `prisma/hosted/schema.prisma` and migration `20261004093923_identity_and_ledger`: separate v2 identity/ledger schema, BIGINT money, workspace indexes and composite account FK. Applied to isolated dev/test databases only.
- `src/generated/hosted/`: ignored generated Prisma client; `npm run db:generate` generates both clients.
- `scripts/hosted.mjs`, `local-hosted-env.mjs`, `email-worker.ts`: local environment/dependency lifecycle and durable delivery worker. See `docs/HOSTED.md` and `docs/API.md`.

## Verified checks

- Prettier and ESLint: pass with no warnings/errors. Generated Prisma output is excluded from formatting/linting.
- TypeScript: passes with ES2022 and nonincremental checks.
- Next production build: passes; it generates both Prisma clients without needing a database connection. Hosted pages are dynamic; demo pages remain prerendered.
- Financial domain/import tests: 10 passing; coverage 95% statements, 94.94% branches, 95.74% functions, 95.3% lines for `src/lib/finance`.
- Legacy signing-boundary tests: 3 passing; verify configuration, tampering, expiry and key rotation. Total unit tests: **13 passing**.
- Production demo Chromium suite: **7 passing**, including PWA manifest/PNG assets and offline recovery without financial-page caching.
- Hosted HTTP/database/browser suite: **7 passing in production mode** against real isolated Postgres and SMTP. Includes email verification, password reset/session revocation, single-use magic/recovery links, confirmed MFA/no bypass, virtual-authenticator passkey registration/login/removal, payload/origin/rate limits, tenant and role denials, idempotent concurrent replay, stale versions, cursor scope, audit records and direct DB constraint rejection.
- Hosted browser lifecycle verifies workspace/account/transaction persistence, budget recalculation, goal contributions, export, accessibility and mobile layout. Development hosted runs also exercised these flows during implementation.
- Demo axe checks pass for all 15 public/product screens in light mode and the mobile dashboard in dark mode; responsive checks found no horizontal overflow at 390px. Hosted browser checks likewise pass axe/mobile assertions and report no page errors.
- Prior demo desktop/mobile screenshots were captured and reviewed; production screenshot smoke reported zero browser errors.
- `npm audit --omit=dev --audit-level=high`: **zero runtime advisories** at verification.
- Docker daemon is now available. Standalone image build, healthy container startup and `/api/health` smoke pass. The smoke used `FINSIGHT_PORT=3300` because another process owned port 3000; its temporary web container was stopped afterward. The default Compose artifact is the demo, not a fully provisioned hosted deployment.
- GitHub quality workflow now includes both production browser suites. Its configuration exists; a GitHub-hosted run is not claimed.

These checks do not establish a manual WCAG audit, field Core Web Vitals, million-user capacity, or production compliance.

## Resolved issues worth knowing

- Next upgraded from vulnerable 14.1.3 to 15.5.27; patched PostCSS/esbuild resolutions; Vitest upgraded to 5 with Node 22 types.
- Removed obsolete dark-only forms, charts, navigation, hooks and inert demo-success behavior.
- Financial UI now derives totals from one ledger instead of displaying unrelated fixed figures.
- Hosted sign-in now works when configured; unconfigured deployments give an explicit setup state. Pricing does not imply active paid checkout; accounts do not imply live bank connectivity.
- Retained legacy API fails closed unless explicitly enabled and configured.
- Contrast issues in active navigation and muted text were fixed against axe results.
- Webpack dev produced intermittent cold-start invalid-token/hydration failures. Turbopack dev passed the full suite; production-mode checks and screenshot smoke test also passed.
- Service worker caches only recovery assets and icons, not financial content.
- Better Auth requires Zod 4; legacy validation imports `zod/v3` to preserve the previous error-map contract. Node/React/Prisma remain compatible with the retained framework.
- A standalone email worker prevents cold-start delivery delays; post-response delivery remains an opportunistic supplement. Outbox bodies are encrypted and erased after successful SMTP delivery.
- TOTP enrollment requires a credential password, avoiding lockouts for passwordless users whose alternate sign-in would otherwise bypass the second factor. Such users can establish a password through reset first.
- Identity and financial bodies are byte-bounded while streaming, including requests without Content-Length. Trusted client IP requires explicit sanitized-ingress configuration.
- Prisma generation precedes dev/check/build so a fresh checkout does not depend on an accidentally retained custom generated client.

## Exact next phase: billing and server-enforced entitlements

1. Add workspace billing/subscription/provider-event models through a new hosted migration; retain the existing financial data and isolation boundaries.
2. Establish Free/Pro/Business plan contracts from `docs/LAUNCH.md`, with explicit server-side limits and a usage/entitlement service. The current 5-workspace/20-member/100-account/100-goal/10,000-transaction bounds are protective release limits, not paid subscriptions.
3. Implement Stripe Checkout, customer Portal, invoices and trial handling through owner-authorized routes. Keep provider configuration failures explicit and do not fabricate a completed payment.
4. Verify webhooks against raw bytes, persist unique provider events, handle replays/out-of-order delivery, and update entitlements durably. Test negative authorization/signature cases and quota/concurrency boundaries.
5. Add a billing/usage surface to the hosted UI and wire planned pricing CTAs only to real configured checkout. Verify the flows in Stripe test mode before a paid launch; actual provider credentials have not been supplied yet.
6. Continue the launch checklist: external OAuth/SMTP verification, bank adapters, hosted deletion, broader background jobs, admin/support tools, receipts/splits/FX/rules/recurring, API keys/outgoing webhooks/OpenAPI, telemetry, IaC, load tests and commercial policies.

## Outstanding operational items

- Rotate credentials formerly present in tracked `.env.example`; sanitizing the current file does not remove them from Git history.
- CI configuration exists but has not been executed on GitHub. The Docker demo image has been built and run locally; hosted deployment/worker provisioning is still an operator task.
- Development/build-only glob dependencies still have upstream `braces` advisories; production audit is clean. Review replacement of Tailwind 3/ESLint tooling before claiming an all-dependency clean scan.
- Billing/OAuth/bank/production-email credentials and provider contracts are required for external verification. Local auth/database/SMTP are real and tested; external provider success is not claimed.
- OpenTelemetry, central metrics, broader event queues, admin impersonation, Terraform, production deployment, backups and disaster recovery remain pending. Rate limits already use shared Postgres counters; transactional email already has a leased durable outbox.
- Retention cleanup for expired rate buckets, idempotency records, auth artifacts and sent/failed mail is not scheduled yet. Outbox encryption currently derives from the auth secret; versioned key rotation remains future work.
- Hosted owner export covers financial records. Full data-subject export/deletion across identity, jobs and providers is not implemented.
- i18n is limited to regional number/date formatting; copy translation and RTL layouts remain unimplemented.
- Currency conversion, recurring scheduler, subscription detector, receipt uploads, split expenses and detailed investment holdings remain unimplemented.

## Resume commands

```sh
git status --short --branch
npm run dev
npm run dev:hosted
npm run db:generate
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
E2E_PRODUCTION=1 npm run test:e2e
E2E_PRODUCTION=1 npm run test:hosted
npm audit --omit=dev --audit-level=high
```

The dev commands above are alternatives, not a sequential script: use one server at a time. Run production browser tests after the production build; do not run dev concurrently against the same `.next` directory. Hosted tests use port 3200 and Docker; demo tests use 3100. Continue on `rebuild/v2`, commit verified phases, and update this file at each checkpoint.
