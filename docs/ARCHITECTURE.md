# Architecture

```text
Browser → apps/web (Next.js) → apps/api (Express) → MongoDB replica set
                                               → Redis
                                               → encrypted email outbox
Worker (BullMQ) → SMTP
               → scheduled recurring transactions / Razorpay reconciliation
```

`apps/web` owns presentation and proxies `/api/v1` and `/api/identity` to the API.
It has no database credentials or database client. `apps/api` owns identity,
workspace authorization and persistence. `packages/shared` owns the India finance
domain and runtime schemas. npm workspaces use one root lockfile.

Workspace-scoped models use string IDs, compound indexes, integer paise and ISO
calendar dates. Writes use MongoDB replica-set transactions, a workspace revision
lock, server-resolved membership, actor/payload-bound idempotency and audit events.
Finance commands validate account ownership inside the transaction. Owner,
admin, editor and viewer privileges are enforced by the API.

Better Auth uses MongoDB sessions, Argon2id password hashing, email verification,
TOTP, passkeys and magic links. Redis stores atomic shared rate-limit counters;
BullMQ schedules deliveries whose payloads contain only outbox IDs. Email bodies
use AES-256-GCM with a separate rotatable key ring. Financial responses and HTML
are not stored by the recovery-only service worker.

The web and API have separate production images. The worker runs the API image
with its worker entrypoint. `/health` is liveness; `/ready` checks dependencies.
Local Compose includes a MongoDB replica set, Redis and Mailpit.

Subscriptions belong to the payer; owned workspace permissions use that owner's
verified paid period. Integer-paise prices/taxes and limits live in shared billing
schemas. Durable actor/payload-bound operation reservations precede provider calls,
which execute outside retryable Mongo transactions. Raw signed webhooks are mounted
before JSON parsing. Captured payments create immutable encrypted invoice snapshots;
canonical provider reads and account revisions protect against stale events.
See [BILLING](BILLING.md) for the lifecycle and accounting contract.

The worker records a hostname-bound heartbeat in Redis, runs recurrence and billing
reconciliation independently, and drains active jobs before closing owned resources.
Readiness checks probe MongoDB/Redis, while SMTP delivery is verified separately.
Optional server monitoring excludes financial/request payloads. Production Compose
uses managed stores; Render/Railway manifests share the same build and entrypoints.
