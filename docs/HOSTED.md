# Hosted identity and workspaces

## Run locally

With Node 22.12+ and Docker running:

```sh
npm ci
docker compose up --build -d --wait
```

The stack exposes:

- Web: `http://localhost:3000`
- Express API: `http://localhost:4000`
- MongoDB replica set: `mongodb://localhost:27017/finsight?replicaSet=rs0`
- Redis: `redis://localhost:6379`
- Mailpit: `http://localhost:8025` and SMTP on port `1025`

Create an account at `/sign-up`, open the verification message in Mailpit, then sign in and create a workspace. Hosted routes use API-backed MongoDB records. Demo routes remain browser-local and never become a fallback for hosted failures.

If a default host port is occupied, override it without changing the internal service topology:

```sh
FINSIGHT_WEB_PORT=3001 \
FINSIGHT_API_PORT=4001 \
FINSIGHT_MONGO_PORT=27018 \
FINSIGHT_REDIS_PORT=6380 \
FINSIGHT_SMTP_PORT=1026 \
FINSIGHT_SMTP_UI_PORT=8026 \
docker compose up --build -d --wait
```

Compose creates a MongoDB replica set so transaction paths are exercised locally. Named volumes persist until explicitly removed. Stop the stack with `docker compose down`; remove local data only with `docker compose down -v`.

## Implemented identity flows

- Better Auth with the MongoDB adapter.
- Password registration, email verification, sign-in and sign-out.
- Argon2id password hashing configuration.
- Session lookup on protected API requests.
- Password reset and account deletion endpoints.
- MFA/passkey configuration through Better Auth and the passkey package.
- Workspace invitations, owner/admin/editor/viewer roles and membership removal.
- Fresh-session checks for destructive account/workspace operations.

Provider OAuth, production passkey domains, SMTP deliverability and external identity callbacks require provider-console and staging validation before public enablement.

## Schema and financial correctness

MongoDB models live in `apps/api/src/models.ts`. Workspace-scoped collections include users/accounts, memberships, financial accounts, transactions, budgets, goals, invitations, audit events and idempotency keys. Compound indexes include workspace and user boundaries so tenant filters are part of normal query plans.

Finance values use integer minor units. INR workspaces use paise, explicit rounding, `en-IN` formatting, `Asia/Kolkata` dates and April–March financial years. The API does not perform silent FX conversion.

Workspace mutations use MongoDB sessions and transactions where multiple collections must change together. Commands require an `Idempotency-Key`; replayed requests are bound to the authenticated actor and request fingerprint. Audit records are written with the associated mutation.

The one-off `scripts/migrate-postgres-to-mongo.ts` importer reads the legacy PostgreSQL tables and writes MongoDB collections. It is an operator-run migration tool, not a runtime dependency. `scripts/seed.ts` creates fictional local development data only.

## Email delivery and rate limiting

Verification, reset and invitation messages use an encrypted outbox and BullMQ email queue. `apps/api/src/worker.ts` is the durable worker entrypoint. SMTP credentials are injected through environment variables; message bodies are not written to application logs.

Redis provides shared atomic rate-limit primitives. API requests include request IDs, consistent JSON envelopes and structured logs. Configure a trusted proxy only when the ingress overwrites forwarded identity headers and direct origin access is restricted.

## Environment and production boundaries

`.env.example` is the configuration reference. Production must provide explicit MongoDB, Redis and Better Auth secrets, HTTPS origins, the field encryption key, SMTP settings, privacy contact details and grievance officer details. Do not use the local development secret or expose MongoDB/Redis directly to the public internet.

The API exposes `/health` for liveness and `/ready` for dependency readiness. These endpoints do not prove SMTP delivery, backup validity or disaster-recovery readiness. Production requires managed MongoDB replica-set backups/PITR, Redis durability/availability appropriate to the workload, queue monitoring, restore drills and an immutable release process.

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:api
npm run test:integration
npm run build
npm audit --omit=dev --audit-level=high
docker compose up --build -d --wait
curl --fail http://localhost:4000/health
curl --fail http://localhost:4000/ready
curl --fail http://localhost:3000/api/health
```

The current integration suite verifies API route composition. Full authenticated MongoDB/Testcontainers coverage and hosted browser flows remain required before claiming production readiness for all identity, tenant, ledger, queue and data-rights paths.
