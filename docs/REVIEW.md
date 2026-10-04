# FinSight v1 review

## Snapshot

FinSight is a good technical prototype of a personal finance tracker. It already has a useful Prisma schema, dashboard aggregation, transaction CRUD, CSV import, recurring entries, budgets, Redis fallback, and a small set of reusable UI primitives. The product is currently optimized for a single authenticated operator rather than a customer-facing SaaS.

## What is working

- Next.js App Router and TypeScript provide a solid foundation for a modular monolith.
- Prisma models cover the first finance primitives: transactions, budgets, categories, income, and recurring transactions.
- Dashboard aggregation includes cash flow, category breakdown, trends, budget alerts, and a basic financial health score.
- Transactions include search, filtering, pagination, import preview, duplicate detection, editing, deletion, and recurring generation.
- Existing components are small enough to evolve into a proper design system.
- Middleware has a basic session gate and API authentication behavior.

## Weak or missing

### Product and UX

- The visual system is a dark Tailwind starter treatment: no brand point of view, light theme, type scale, responsive app shell, mobile navigation, or cohesive interaction language.
- The home route only redirects to the dashboard, so there is no marketing site, conversion path, pricing story, SEO surface, or public legal content.
- The app has no onboarding, household/workspace model, account connection flow, goals, net worth, subscriptions, forecasts, reports, notification center, command palette, or global search.
- Loading, empty, and error states are inconsistent. The interface mostly exposes raw database failure messages rather than recovery-oriented product states.
- Data visualization is largely static. There are no time-range controls, comparisons, drill-downs, tooltips with context, or motion that helps explain change.
- Mobile and accessibility behavior is not treated as a first-class requirement. The fixed desktop sidebar and header are not an adequate mobile information architecture.

### Architecture and security

- The schema is not tenant-aware. Transactions and budgets have no user, workspace, account, or authorization boundary.
- Authentication is a single shared-password/session flow. OAuth, magic links, MFA, passkeys, session/device management, and recovery are absent.
- There is no billing, plan entitlement layer, usage metering, webhooks, background job system, event log, admin console, or product analytics boundary.
- API responses do not yet present a consistent versioned contract or cursor-pagination strategy; sensitive operations lack an explicit audit trail and idempotency keys.
- Sensitive configuration is represented by live-looking values in `.env.example`; the template should contain placeholders only.
- No CSP/security header policy, threat model, privacy/terms pages, retention/deletion workflow, dependency audit, or operational runbooks are present.
- The current data model uses `Float` for money and has no documented migration path for decimal minor-unit amounts, exchange rates, or transaction partitioning.

### Engineering and delivery

- Dependencies are not installed in the checked-out workspace, so the existing lint, build, and typecheck commands cannot run yet (`next` and `prisma` were not found).
- There are no automated tests, CI pipeline, Docker local environment, health/readiness endpoint, observability setup, or documented backup/recovery plan.
- Demo data exists in the repository but there is no instant demo mode that lets a buyer understand the product without configuring a database.
- The README describes the prototype accurately but does not cover production environment management, launch operations, pricing economics, or a 90-day delivery plan.

## Rebuild direction

Keep the useful finance aggregation and import concepts, but rebuild the experience around a calm, premium “financial operating system” for households. Use a single Next.js modular monolith with a demo-first UI, typed domain boundaries, provider adapters, workspace-scoped data, and a design system that makes trust, clarity, and momentum visible in every state. Ship the high-value product loop first: see the whole picture, understand what changed, take the next action, and build a habit.
