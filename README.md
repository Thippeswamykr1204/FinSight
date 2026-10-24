# FinSight

FinSight is a private, India-first personal finance workspace for recording accounts, money moves, budgets, goals, recurring records, and the signals that follow from them. It uses exact integer paise for money and starts every workspace empty.

The product is a real MERN application:

- **MongoDB + Mongoose** for durable, indexed workspace data.
- **Express + Node.js + TypeScript** for a stateless API.
- **React + Vite + TypeScript** for the responsive web application.
- **Vitest, Supertest, Playwright, ESLint, and TypeScript** for automated checks.

## What is included

- Password accounts with Argon2id hashing.
- Fifteen-minute access tokens and rotating thirty-day refresh sessions in HTTP-only cookies.
- Same-origin checks, double-submit CSRF protection, secure cookies, security headers, locked-down CORS, request IDs, rate limiting, and structured request logs.
- AES-256-GCM field encryption for email addresses and invitation addresses.
- Workspaces with owner, editor, and viewer access.
- Accounts, transactions, CSV import, cursor-based transaction pagination, version-checked transaction edits, budgets, goals, contributions, recurring records, insights, calculators, exports, invitations, and destructive data-rights flows.
- Light and dark themes, responsive navigation, keyboard-visible focus, reduced-motion support, route-level code splitting, skeleton states, and a recovery-only service worker that never caches API responses or financial pages.

## Local setup

Requirements: Node.js 22.12 or newer and npm. Docker is not required.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. When `MONGODB_URI` is empty, the API starts a temporary single-node MongoDB replica set through `mongodb-memory-server`; this keeps local development lightweight and allows transaction tests without a local database installation. The first run can download a MongoDB binary. Local records are temporary.

For a persistent local database, set `MONGODB_URI` in `.env` to a MongoDB connection string. Copy `.env.example` and generate secrets before using anything beyond local development:

```sh
cp .env.example .env
openssl rand -base64 32
openssl rand -hex 32
```

The first value is suitable for `JWT_SECRET`; the second is suitable for `FIELD_ENCRYPTION_KEY`.

## Commands

| Command             | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `npm ci`            | Install the locked dependency graph.                           |
| `npm run dev`       | Run the API and Vite web application together.                 |
| `npm run build`     | Build the shared package, API, and web application.            |
| `npm run typecheck` | Typecheck every TypeScript package.                            |
| `npm run lint`      | Run ESLint with warnings treated as failures.                  |
| `npm test -- --run` | Run unit and API integration tests.                            |
| `npm run test:e2e`  | Run Playwright browser flows when both services are available. |

## Architecture

```text
Browser / installed PWA
        │ HTTPS, cookies, CSRF header
        ▼
React + Vite static site
        │ JSON API
        ▼
Stateless Express API ─────── optional Redis-compatible rate-limit store
        │
        ▼
MongoDB replica set / Atlas free cluster
```

The browser owns presentation and never receives database credentials. The API owns authentication, authorization, validation, money rules, idempotency, audit events, and persistence. The shared package owns pure financial calculations and runtime input schemas.

There is no in-process session state. Access tokens are verified on every request, refresh sessions are persisted and rotated, and workspace membership is resolved from MongoDB for every resource access. Write endpoints accept an `Idempotency-Key` and bind the stored response to the authenticated actor and request fingerprint.

The API uses bounded reads: transaction lists use a compound date/id cursor, dashboard queries use aggregation, list endpoints cap their result windows, and exports state when the transaction export cap is reached. Money is stored in integer minor units; no API accepts a floating-point currency amount as a persisted value.

## Environment variables

See `.env.example` for the complete list.

| Variable                | Required          | Purpose                                                                        |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `NODE_ENV`              | Public deployment | `production` enables strict secret and HTTPS checks.                           |
| `WEB_ORIGIN`            | Public deployment | Exact HTTPS origin allowed by CORS and origin checks.                          |
| `MONGODB_URI`           | Public deployment | Authenticated MongoDB connection string.                                       |
| `JWT_SECRET`            | Public deployment | Signing key for short-lived access tokens.                                     |
| `FIELD_ENCRYPTION_KEY`  | Public deployment | 32-byte hex key for AES-256-GCM fields.                                        |
| `REDIS_URL`             | Optional          | Redis-compatible shared rate-limit store. Memory limiting is used when absent. |
| `TRUST_PROXY`           | Optional          | Set to `true` only when the host's proxy chain is trusted.                     |
| `COOKIE_DOMAIN`         | Optional          | Shared cookie domain when the web and API use sibling subdomains.              |
| `PRIVACY_CONTACT_EMAIL` | Public deployment | Operator contact published in operational material.                            |
| `VITE_API_URL`          | Web build         | Public API origin, for example `https://api.example.com`.                      |

## Free deployment from dashboards

This application is designed for a no-Docker launch using a MongoDB Atlas Free cluster, a free static-site host, and a free Node web-service host. Free hosts sleep, have memory and bandwidth limits, and should be treated as a launch environment rather than an availability promise. Do not enable paid backup or add billing details while setting up a free-only deployment.

### 1. Create MongoDB

1. Create a MongoDB Atlas project and choose the **Free** cluster option.
2. Create a database user with a long random password.
3. Add the API host's outbound address to the network access list. For a first public test, use the narrowest range your host documents; do not leave broad access in place for a real launch.
4. Create a database named `finsight` and copy the driver connection string.

### 2. Deploy the API

Create a Node web service from the repository with these dashboard values:

- Build command: `npm ci && npm run build`
- Start command: `npm run start --workspace @finsight/api`
- Root directory: repository root
- Health path: `/health`

Set `NODE_ENV=production`, `WEB_ORIGIN` to the final static-site URL, `MONGODB_URI`, `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, and `PRIVACY_CONTACT_EMAIL`. The service must expose the host-provided `PORT`; the API reads `PORT` when `API_PORT` is not present.

After deployment, confirm `/health` returns `status: ok` and `/ready` returns `status: ready` before connecting the web site.

### 3. Deploy the web application

Create a static site from the same repository:

- Build command: `npm ci && npm run build`
- Publish directory: `apps/web/dist`
- Environment variable: `VITE_API_URL` set to the API's HTTPS origin

Configure the host's rewrite rule so unknown paths serve `index.html`; React Router owns client-side routes. Set the API's `WEB_ORIGIN` again if the static host assigns a new URL.

### 4. Verify the free deployment

1. Open the static site in a private browser window.
2. Register a test account, accept the privacy notice, create a workspace, add an account, and record an income and expense.
3. Confirm the dashboard balance, transaction list, budget progress, export download, and dark theme.
4. Confirm the API rejects requests from a different browser origin and that the browser has no financial data in local storage.
5. Keep a copy of the generated secrets outside the repository. Never paste them into an issue, screenshot, log, or commit.

## Scaling path

The code path remains the same while capacity changes:

1. Replace the free MongoDB deployment with a larger replica set and keep the same `MONGODB_URI` contract. Review the existing compound indexes against real query telemetry.
2. Set `REDIS_URL` to a managed Redis-compatible store so rate limits are shared by every API instance.
3. Run multiple stateless API instances behind an HTTPS load balancer. No session affinity is required.
4. Move the static site to a CDN and keep `VITE_API_URL` pointed at the API hostname.
5. Add a queue implementation behind the recurring/export interface for high-volume email, imports, and scheduled work. The current free deployment deliberately has no worker requirement.
6. Move large exports to object storage with signed, short-lived download URLs. Keep the existing authorization and audit step in the API.
7. Add read replicas or precomputed aggregates only after query telemetry shows the need. Keep dashboard calculations in aggregation pipelines rather than loading a workspace ledger into process memory.
8. Partition operational concerns by workspace and retention policy, add centralized logs and metrics, and rehearse backup restoration before serving high-value data.

## Security and operations

Read [the security notes](docs/SECURITY.md), [the deployment guide](docs/DEPLOYMENT.md), and [the key-rotation procedure](docs/KEY_ROTATION.md). The operator is responsible for HTTPS, secret custody, MongoDB network policy, backups, incident response, privacy contacts, retention rules, and the legal notices required by the regions served.

## Decisions

- The product is India-first: INR, integer paise, `en-IN` formatting, ISO dates, and Asia/Kolkata display conventions.
- Signup does not require SMTP. This keeps a free deployment usable without an outbound mail dependency; invitations are returned as one-time tokens for the operator to deliver through an approved channel.
- Recurring records are user-triggered in the free deployment. Nothing silently writes to the ledger from an in-process timer.
- Bank aggregation, payment billing, and investment advice are not claimed. The ledger is manually maintained and calculators are labeled as assumptions.
- The service worker caches only recovery assets. Offline financial writes are not queued or presented as saved.

## License

MIT. See [LICENSE](LICENSE).
