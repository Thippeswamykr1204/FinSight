# FinSight

**Money, with perspective.** India-first personal finance on Next.js, Express,
MongoDB and Redis. Money uses integer paise; dates use Asia/Kolkata, Indian digit
grouping and April–March financial years.

## Local setup

Requires Node.js 22.12+, npm and Docker Compose v2.

```sh
npm ci
npm run env:init
docker compose up --build -d --wait
```

Open `http://localhost:3000/sign-up`. Local verification and invitation email
arrives at `http://localhost:8025`. The API is at `http://localhost:4000`.
Generated `.env` secrets are private and never committed. Named MongoDB volumes
persist through `docker compose down`; `down -v` intentionally erases local data.

## Repository

| Location | Responsibility |
| --- | --- |
| `apps/web` | Next.js App Router, React, Tailwind/Radix UI and same-origin API proxy |
| `apps/api` | Express API, Better Auth, Mongoose, authorization, email worker |
| `packages/shared` | Exact INR arithmetic, calendar, calculators and Zod contracts |
| `tests` | Finance unit tests and Playwright browser checks |

The API supports verified email, passwords, passkeys, TOTP, magic links, sessions,
empty workspaces, role-controlled accounts/transactions/budgets/goals, statement
import, idempotent mutations, invitations, audit events, exports and deletion.
Optional Razorpay subscriptions enforce Free/Pro/Business limits on the server,
with verified paid periods, GST invoices, cancellation and next-cycle plan changes.
Accounts track manually entered balances; goal contributions earmark savings and
do not transfer cash. Calculators are estimates with explicit assumptions.

## Development and verification

```sh
npm run dev             # web
npm run dev:api         # API
npm run dev:hosted      # both
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:api
npm run test:integration
npm run test:coverage
npm run build
npm run test:e2e          # disposable Mongo/Redis/Mailpit; Chromium must be installed
npm audit --audit-level=low
```

The workspace source lives in `apps/web`, with one root lockfile. Runtime API
and worker configuration is validated before listening. See `.env.example` for
variables and [key rotation](docs/KEY_ROTATION.md) for the field-encryption ring.

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) ·
[India domain](docs/INDIA.md) · [Security](docs/SECURITY.md) ·
[Billing](docs/BILLING.md) · [UI parity](docs/PARITY.md) ·
[Deployment](docs/DEPLOYMENT.md) · [Launch verification](docs/LAUNCH_CHECKLIST.md)

## License

[MIT](LICENSE) · Copyright © 2026 Thippeswamy.
