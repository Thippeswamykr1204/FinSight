# FinSight v2 build plan

## Product thesis

FinSight is a calm financial operating system for people who want the confidence of knowing what changed, what is safe to spend, and what to do next. The product should feel like a clear morning briefing rather than a spreadsheet: dense where it earns attention, quiet everywhere else.

## Design direction

- **Signature:** the “Pulse” ribbon — a thin, animated current-month cash-flow line that appears in the shell and dashboard, connecting the headline balance to the detail below.
- **Palette:** ink `#101416`, canvas `#F5F7F6`, cloud `#EEF2F0`, signal mint `#B8F2D0`, cobalt `#4C6FFF`, ember `#F18D63`, and muted sage `#7A8B84`.
- **Type:** Geist for utility and body copy; Fraunces for a restrained editorial display voice on marketing/empty-state moments; tabular numerals for financial data.
- **Layout:** wide breathing room, high-contrast scorecards, asymmetrical dashboard split, compact dense rows for money movement, and a mobile bottom rail.
- **Motion:** one orchestrated entry reveal, chart draw-in, number tween, deliberate hover lift, and reduced-motion fallbacks.

## Stack choice

- **Web:** Next.js 15.5.27 App Router + React 18 + TypeScript. The vulnerable v14 baseline was upgraded. Server-rendered marketing and an interactive product shell stay in one deployable unit. Turbopack is used for development after the webpack dev server produced an intermittent cold-start hydration failure.
- **Styling:** Tailwind CSS plus CSS variables in a local design-token layer. This is faster to evolve than a third-party theme and keeps the signature visual language owned by FinSight.
- **Data:** The demo uses a Zod-validated, browser-persisted ledger with integer minor-unit amounts. Hosted workspaces use a separate v2 Prisma/PostgreSQL schema with BIGINT money, tenant-scoped indexes and composite account foreign keys. The old schema remains behind a disabled legacy API; its external database has not been migrated. Hosted errors never silently fall back to sample data.
- **Charts:** Recharts for accessible responsive charts with custom wrappers and tooltip content.
- **Validation:** Zod at API boundaries and shared TypeScript domain types.
- **Jobs/rate limits:** shared atomic PostgreSQL rate buckets and an encrypted durable email outbox with leased workers are implemented. Redis caching, bank/webhook jobs, retention cleanup and digests remain future work.
- **Identity:** Better Auth 1.7.7 supplies verified email/password, reset, magic links, TOTP/recovery, passkeys and session controls. Google/Apple are configuration-gated and await external provider verification. SMTP is tested with Mailpit. Stripe, bank aggregation and web push remain pending.
- **Quality:** ESLint, TypeScript strict mode, Vitest domain tests with coverage thresholds, Playwright demo/hosted flows, axe accessibility checks, security headers, and liveness checks. Standalone Docker build/run is verified; CI configuration exists but has not run on GitHub.

## Architecture

```mermaid
flowchart LR
  Browser[Web + PWA client] --> Next[Next.js App Router]
  Next --> Marketing[Marketing / SEO]
  Next --> Shell[Workspace shell]
  Next --> API[Versioned API routes]
  API --> Domain[Domain modules]
  Domain --> Auth[Identity + sessions]
  Domain --> Finance[Finance + insights]
  Domain --> Billing[Plans + Stripe adapter]
  Domain --> Connect[Bank + CSV/OFX adapters]
  Domain --> Notify[Email + push + in-app]
  Domain --> Admin[Admin + audit]
  Domain --> DB[(PostgreSQL primary)]
  Domain --> Cache[(Redis cache / rate limit)]
  Domain --> Jobs[Background jobs / events]
  Jobs --> Providers[Stripe / banks / email]
  Next --> Telemetry[Structured logs + metrics + tracing]
```

## Target folder tree

```text
src/
  app/
    (marketing)/       landing, pricing, features, FAQ, legal
    (auth)/             login, signup, verify, recovery
    (app)/              dashboard, transactions, budgets, goals, insights
    (settings)/         profile, security, billing, connections, data
    admin/              users, subscriptions, flags, audits
    api/v1/             versioned public/internal API
  components/
    app-shell/          sidebar, mobile rail, command palette, notifications
    charts/             chart primitives and tooltip patterns
    finance/            account, transaction, budget, goal views
    marketing/          sections, pricing, social proof, FAQ
    ui/                 buttons, cards, inputs, dialogs, data states
  lib/
    domain/             finance, workspaces, entitlements, notifications
    adapters/            auth, bank, stripe, email, storage
    db/                  Prisma client, repositories, seed helpers
    security/            headers, audit, rate limit, encryption
    analytics/           events, funnels, attribution
  types/                shared domain and API types
prisma/                 schema, migrations, seed data
docs/                   review, plan, progress, security, operations
infra/                  Docker, CI, Terraform starter configuration
```

## Phases

- [x] **Phase 0 — Baseline review:** inspect the repository, record strengths/gaps, and capture the initial toolchain failure caused by missing installed dependencies.
- [x] **Phase 1 — Foundation:** install dependencies, establish a clean design-token layer, introduce the responsive app shell, metadata, error/loading states, PWA assets, and public route structure.
- [x] **Phase 2 — Product core:** rebuild dashboard, transactions, budgets, insights, goals, net worth, and forecast surfaces with shared persistent demo state, real CSV/OFX import/export, interactive chart ranges, filters, reduced-motion support, keyboard support, and mobile layouts. Verified in development and production-mode Chromium; 10 unit tests and 6 end-to-end tests pass. This is a working demo milestone, not a hosted SaaS launch.
- [ ] **Phase 3 — Activation and monetization:** demo activation flows and hosted identity/workspace foundations are implemented. Remaining: Stripe checkout/portal/webhooks, trials, entitlements and paid usage enforcement, live OAuth/bank provider verification, and hosted deletion.
  - [x] **3A — Hosted foundation:** separate v2 Postgres schema, verified email/password auth, recovery, magic links, confirmed TOTP, recovery codes, user-verified passkeys, session controls, workspace roles/invitations, tenant-scoped finance API/UI, cursor pagination, audit records and idempotent writes. Google/Apple adapters are configured conditionally; their external flows still require provider credentials and validation. Real local SMTP delivery uses an encrypted durable outbox.
  - [ ] **3B — Revenue and providers:** Stripe Checkout/Portal/webhooks, entitlements, billing UI and trials; external provider test/live verification; bank adapters and hosted deletion.
- [ ] **Phase 4 — SaaS readiness:** security headers, legacy API isolation, liveness, versioned session API, audit records, owner-authorized financial export, shared rate limits, durable email outbox, verified Docker/Compose, CI configuration and runbooks are present. Remaining: admin/support tooling, other event workers, deletion, API keys/outgoing webhooks/OpenAPI, observability, Terraform, managed backups and deployed-environment validation.
- [ ] **Phase 5 — Verification and launch:** lint, typecheck, financial-domain coverage, production build, 7 demo and 7 hosted integration/browser tests, automated accessibility/responsive checks and container health smoke pass. README, deployment/security docs, progress, launch checklist, economics, cost scenarios and roadmap are written. Full launch remains blocked on phases 3–4, live provider verification, independent security/accessibility review, capacity tests and field performance measurements.

## Definition of done

Every completed phase must leave the app runnable with `npm run dev`, have complete files without placeholder implementations, preserve demo mode, and include a commit with a clear phase message. Unbuilt production integrations stay clearly marked as pending in this plan; demo interactions must not claim successful billing, bank syncing, email delivery, or hosted persistence.

## Current implemented tree

```text
src/app/                     public pages and finance routes
src/app/app/                 authenticated hosted workspace routes
src/app/api/identity/        Better Auth handlers
src/app/api/v1/              tenant-scoped finance/membership API
src/components/finance/      persistent provider, accessible forms, lazy chart
src/components/hosted/       auth, workspaces, finance and security screens
src/components/layout/       responsive shell, command palette, PWA registration
src/components/marketing/    shared public navigation and footer
src/lib/finance/             validated ledger, seed, calculations, CSV/OFX parser
src/lib/hosted/              identity, RBAC, repository, rate limits and email
src/lib/                     retained legacy API helpers
src/middleware.ts            disabled-by-default legacy API gate
tests/unit/                  domain and import/export invariants
tests/e2e/                   browser workflows, accessibility, API gate checks
tests/hosted/                real identity, tenant isolation, DB and browser tests
prisma/hosted/               separate v2 schema and migration
scripts/                     isolated hosted setup and email worker
public/                      service worker and offline recovery page
```
