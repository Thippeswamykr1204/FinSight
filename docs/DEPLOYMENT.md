# Deployment

FinSight deploys as three application processes backed by MongoDB and Redis:

```text
Browser -> Next.js web -> Express API -> MongoDB replica set
                                      -> Redis
                                      -> BullMQ email worker -> SMTP
```

The browser demo does not require a database. Hosted mode uses the API exclusively and must never fall back to demo data.

## Local Compose

Requirements: Node 22.12+, Docker Engine and Docker Compose 2.20+.

```sh
npm ci
docker compose up --build -d --wait
curl --fail http://localhost:4000/health
curl --fail http://localhost:4000/ready
curl --fail http://localhost:3000/api/health
```

Compose starts:

- `web`: standalone Next.js image on port `3000`.
- `api`: Express/Mongoose API on port `4000`.
- `worker`: BullMQ email worker using the API image.
- `mongo`: MongoDB 8 with replica set `rs0`.
- `redis`: Redis 7.
- `mailpit`: local SMTP sink and UI on ports `1025` and `8025`.

The default values are local-only development values. Volumes are named and survive container removal. Use `docker compose down -v` only when intentionally deleting local MongoDB/Redis data.

If default ports are occupied, override host ports while retaining internal service URLs:

```sh
FINSIGHT_WEB_PORT=3001 \
FINSIGHT_API_PORT=4001 \
FINSIGHT_MONGO_PORT=27018 \
FINSIGHT_REDIS_PORT=6380 \
FINSIGHT_SMTP_PORT=1026 \
FINSIGHT_SMTP_UI_PORT=8026 \
NEXT_PUBLIC_APP_URL=http://localhost:3001 \
API_ORIGIN=http://localhost:4001 \
WEB_ORIGIN=http://localhost:3001 \
docker compose up --build -d --wait
```

## Production configuration

Copy `.env.example` into a protected deployment secret store. Production must replace every local default, including:

- `BETTER_AUTH_SECRET` with a high-entropy secret.
- `FIELD_ENCRYPTION_KEY` with a managed 32-byte hexadecimal key.
- `MONGODB_URI` pointing to a TLS-enabled MongoDB replica set.
- `REDIS_URL` pointing to an authenticated, private Redis deployment.
- `API_ORIGIN`, `WEB_ORIGIN` and `NEXT_PUBLIC_APP_URL` using the real HTTPS origins.
- `HOSTED_LOCAL=false` and `NODE_ENV=production`.
- SMTP credentials, sender identity, privacy contact and grievance officer details.

Do not expose MongoDB or Redis publicly. The Compose file publishes them to loopback for local development; production operators should remove those host bindings or enforce equivalent network policy. Use managed MongoDB backups/PITR and a Redis deployment with an availability/durability policy appropriate to rate limits and queues.

Production configuration validation rejects missing MongoDB/Redis/auth secrets, non-HTTPS public origins, local hosted mode on public hosts, missing privacy contacts and incomplete SMTP credentials.

## Images and process commands

Build the web image and API/worker image from the same commit:

```sh
docker build -f Dockerfile.web -t finsight-web:$GIT_SHA .
docker build -f Dockerfile.api -t finsight-api:$GIT_SHA .
```

The web image starts with `node server.js`. The API image starts with `node apps/api/dist/index.js`. Run the worker image with:

```sh
node apps/api/dist/worker.js
```

Keep web, API and worker releases immutable and update them together. The worker requires the same MongoDB, Redis, Better Auth, field-encryption and SMTP configuration as the API.

## Migration and seed

The normal runtime has no PostgreSQL dependency. The one-off legacy importer is:

```sh
MONGODB_URI='mongodb://...' \
LEGACY_POSTGRES_URL='postgres://...' \
npm run db:migrate:postgres-to-mongo
```

Review counts, workspace ownership, integer minor-unit values and currency fields before enabling hosted traffic. The importer is not a recurring deployment step. Use `npm run db:seed` only for fictional local development data.

## Release verification

Run these checks on the release commit:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:api
npm run test:integration
npm run build
npm audit --omit=dev --audit-level=high
npx playwright install chromium
E2E_PRODUCTION=1 npm run test:e2e
docker compose config
docker compose up --build -d --wait
curl --fail http://localhost:4000/health
curl --fail http://localhost:4000/ready
curl --fail http://localhost:3000/api/health
docker compose down -v
```

Before opening public signup, exercise signup, verification, sign-in, reset, MFA/passkey, workspace creation, role denial, transaction idempotency, export, invitation, account deletion, queue delivery and backup restore against staging MongoDB/Redis. Verify that tenant IDs are enforced in both read and write paths.

## Operations

Monitor API latency/error rate, MongoDB pool and transaction failures, Redis availability, queue depth/age/failures, email delivery, readiness status, rate-limit rejects and audit write failures. Alert on worker restarts and exhausted jobs.

Back up MongoDB with encryption and test restores into an isolated replica set. Retain the field-encryption key material needed to read protected outbox data. Keep release images and configuration versioned so rollback remains schema-compatible. Do not use destructive resets or delete volumes during a normal release.

The quality workflow runs install, formatting, lint, typecheck, unit/API/integration tests, coverage, audit, build, Playwright and Compose health smoke checks. Deployment promotion remains a separate operator-controlled action.
