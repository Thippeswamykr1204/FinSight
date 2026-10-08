# Deployment

FinSight runs Next.js web, Express API and a BullMQ email worker with a MongoDB
replica set and Redis. The source roots are `apps/web`, `apps/api` and
`packages/shared`; build from the repository root with one lockfile.

## Local Docker

```sh
npm ci
npm run env:init
docker compose up --build -d --wait
curl --fail http://localhost:4000/health
curl --fail http://localhost:4000/ready
curl --fail http://localhost:3000/api/ready
```

Web runs at port 3000, API at 4000 and local mail at 8025. Compose requires `.env`;
the initializer creates unique secrets. MongoDB/Redis host bindings are loopback
only. Named volumes survive `docker compose down`. Use `down -v` only to erase
local data intentionally.

## Production configuration

Inject `NODE_ENV=production`, `HOSTED_LOCAL=false`, HTTPS `WEB_ORIGIN`,
`API_ORIGIN` and `NEXT_PUBLIC_APP_URL`, explicit `MONGODB_URI`, `REDIS_URL`,
`BETTER_AUTH_SECRET`, `FIELD_ENCRYPTION_KEY`, SMTP settings, sender identity,
privacy email and grievance officer. Keep secrets in the deployment secret manager.
See `.env.example` and [KEY_ROTATION](KEY_ROTATION.md).

Use authenticated MongoDB/Redis with TLS on public/network-crossing connections;
restrict ingress to the application network. MongoDB needs replica-set transactions
and permission to create the application's indexes. Set Redis's eviction policy to
`noeviction` for BullMQ. `HOSTED_LOCAL=true` is restricted to loopback web origins.

Build both images from the same release and set the public URL **at build time**:

```sh
docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" -t finsight-web .
docker build -f Dockerfile.api -t finsight-api .
```

Web starts `node apps/web/server.js`, API starts `node apps/api/dist/index.js`,
and worker starts `node apps/api/dist/worker.js`. Images run as an unprivileged
user. Container health checks use dependency readiness; worker health checks a
hostname-bound Redis heartbeat with a 45-second expiry. API/worker drain work on
SIGTERM with a 30-second deadline; deployment manifests allow 35 seconds. Monitor
worker heartbeat separately from actual SMTP delivery and scheduled-job failures.

## Production Compose / HTTPS

`compose.production.yaml` runs only web/API/worker against your managed stores and
real SMTP. Populate a private `.env` with the production configuration above,
including real privacy/grievance contacts. It does not provision local stores/mail.

```sh
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml up --build -d --wait
docker compose -f compose.production.yaml ps
```

Web binds to loopback; API is private to the Compose network. Terminate HTTPS with
the hosting platform or `ops/Caddyfile` on the host, setting `FINSIGHT_DOMAIN` to
your actual DNS name and `FINSIGHT_PORT` to the web's host port. Publish only HTTPS.
Use the same public web origin for `WEB_ORIGIN` and `NEXT_PUBLIC_APP_URL`.
`API_ORIGIN` identifies the canonical API endpoint; the Next.js proxy can carry
the payment webhook at `/api/v1/billing/webhook` on the public web origin.

`TRUSTED_PROXY` is an Express address/subnet allowlist, not a Boolean/hop count.
The HTTPS ingress must overwrite untrusted forwarded headers. Trust only the
verified ingress/web proxy peers or a private application subnet with no direct
public API access. The API derives the auth-limiter address from `request.ip` and
overwrites caller-supplied `X-Finsight-Client-IP`. Validate spoofed header requests
at the actual platform boundary. Leaving the allowlist blank is conservative but
groups proxied callers under the proxy address for rate limiting.

## Render

`render.yaml` declares three Docker services in Singapore with readiness probes,
35-second shutdown windows and deployments gated on passing repository checks.
Before creating the Blueprint, create/populate the **`finsight-api-runtime`**
environment group in the dashboard with all required API/worker production
variables from `.env.example`. The Blueprint generates/preserves the group's
shared auth secret. Set the field-encryption key yourself with `openssl rand -hex 32`.
Render does not support `sync: false` inside environment groups; supplier, store,
SMTP, privacy and optional provider settings must be entered into that group.
Both API and worker inherit it, including any retained encryption keys.

The web prompts for its public URL and privacy contacts; `API_URL` references the
API's configured `API_ORIGIN`. Set `NEXT_PUBLIC_APP_URL` before building so the
Docker ARG, metadata and browser code use the deployed origin. Optional monitoring
variables can remain blank. Use paid long-lived services for a paying-user release.

## Railway and Vercel

Create three Railway services from the repository root and select their **Config
File Path** as `railway.api.json`, `railway.web.json`, `railway.worker.json` respectively.
Supply the same API/worker runtime secret group to both backend services. Supply
web `API_URL`, public URL and privacy contacts; Railway forwards the declared public
URL build argument. Keep API/worker continuously running. API reads platform `PORT`
when `API_PORT` is absent; configure routing to the actual listening port. Worker
uses `node apps/api/dist/worker.js` and has no HTTP port. Configure external alerts
for its heartbeat and failed/old email jobs.

Web can deploy on Vercel with the root `vercel.json`. API and worker are separate
long-lived Node services. Set web `API_URL` to the API origin and preserve
same-origin identity/finance proxy routing.

Google and Razorpay are optional complete configuration groups. Follow
[BILLING](BILLING.md) for supplier data, exact GST-inclusive test/live plans,
webhooks, and `${WEB_ORIGIN}/api/identity/callback/google`. A deployment with all
billing variables blank exposes Free only; it is not payment-provider verification.

## Backups and restore

Enable managed MongoDB point-in-time recovery and encrypted snapshots. Store key
escrow separately with restricted access; retain keys for every retained snapshot.
Invoice records have eight-year retention. Redis is not the ledger source of truth:
the encrypted Mongo outbox can requeue unsent email after Redis loss. Losing Redis
still resets rate counters and transient auth/cache state, so monitor its recovery.

For a controlled logical restore drill, pause API mutations and workers while
taking a consistent snapshot (or use the managed provider's consistent snapshot).
Use `mongodump --uri="$MONGODB_URI" --archive="$BACKUP_ARCHIVE" --gzip` with a private
destination. Restore into a **separate empty** replica-set database using
`mongorestore --uri="$RESTORE_MONGODB_URI" --archive="$BACKUP_ARCHIVE" --gzip`
and explicit namespace remapping if the database name changes. Never restore over
the live database during a drill. Keep provider mutations and outgoing mail disabled
in the restore environment.

Compare collection counts, indexes, tenant-scoped exports and exact money/date
values; decrypt protected fields with their original purpose/ID and escrowed keys.
Test the rekey procedure, repeat it to confirm zero changed/conflicted records,
and verify decryption after removing old runtime keys. Destroy the isolated restore
database and private archive after the drill; retain the operational verification
record. The local replica-set dump/restore and four-field resumable rekey drill was
executed successfully on 7 October 2026; this does not verify a managed PITR policy.

## Monitoring and release

Optional `SENTRY_DSN` and `SENTRY_RELEASE` enable server-only error capture on
web/API/worker. SDK collection excludes user/request data, cookies, bodies, query
parameters, database payloads, queue arguments, frame variables and source context;
error values are replaced with generic messages. Tracing/default integrations are
disabled. Local logs retain request IDs for investigation. No browser replay or
client financial telemetry is installed. Set retention/region/processor disclosure
in the operator's Sentry project and verify an actual test event there before relying
on alert delivery.

Run the root quality commands, real-service browser suite and Compose readiness
on the exact release, then perform the operator-dependent checks in
[LAUNCH_CHECKLIST](LAUNCH_CHECKLIST.md). No provider account or hosted infrastructure
was deployed by the local verification run.
