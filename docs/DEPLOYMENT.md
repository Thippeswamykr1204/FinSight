# Deployment

FinSight runs Next.js web, Express API and a BullMQ email worker with a MongoDB
replica set and Redis. The source roots are `apps/web`, `apps/api` and
`packages/shared`; build from the repository root with one lockfile.

## Choosing a topology

| Topology                                             | Use when                                         | Notes                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Render: public web, private API, worker, Redis       | Default recommendation for a first public launch | API stays off the internet; `TRUSTED_PROXY` identifies real client addresses. Blueprint included. |
| Single host with `compose.production.yaml` and Caddy | You want one VM and full control                 | Managed MongoDB replica set and Redis are still recommended. Caddy terminates HTTPS.              |
| Web on Vercel, API and worker elsewhere              | You already use Vercel for the web               | Works, with the rate-limit caveat in [Proxy trust and rate limits](#proxy-trust-and-rate-limits). |

Whatever you choose, the API and worker need continuously running Node processes,
a MongoDB replica set, Redis, and a transactional SMTP provider.

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

## Preflight

Validate a production environment before every deploy. The check never prints
secret values and exits non-zero on any failure:

```sh
npm run preflight -- --env-file path/to/production.env
```

It verifies HTTPS origins, key and secret strength, an authenticated MongoDB
replica-set URI with a database name, TLS and authentication for public Redis,
a real SMTP host and sender domain, real privacy and grievance contacts,
all-or-nothing billing and Google groups, and an explicit proxy allowlist. Add
`--strict` to treat warnings as failures or `--json` for machine-readable output.
Without `--env-file` it reads the current process environment.

At boot, the API and worker also confirm that MongoDB is a replica set (a failure
stops a production process) and log a warning when Redis `maxmemory-policy` is not
`noeviction`. Managed Redis providers often block `CONFIG`; confirm the policy in
the provider console in that case.

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

## Proxy trust and rate limits

`TRUSTED_PROXY` is an Express address/subnet allowlist, not a Boolean/hop count.
The HTTPS ingress must overwrite untrusted forwarded headers. Trust only the
verified ingress/web proxy peers or a private application subnet with no direct
public API access. The API derives the auth-limiter address from `request.ip` and
overwrites caller-supplied `X-Finsight-Client-IP`. Validate spoofed header requests
at the actual platform boundary. Leaving the allowlist blank is conservative but
groups proxied callers under the proxy address for rate limiting.

On Vercel the web tier is serverless, so its egress addresses are not stable and
cannot be allowlisted. With `TRUSTED_PROXY` blank, every visitor is rate limited as
one client at the API. Prefer a web service on Render, Railway or your own host
that reaches the API over a private network, and set `TRUSTED_PROXY` to that private
subnet. Verify at the real ingress that a spoofed `X-Forwarded-For` or
`X-Finsight-Client-IP` header does not change the address used for limits.

## Render

`render.yaml` deploys four resources in Singapore: a public web service, a **private**
API service, a worker, and a private Redis (Key Value) instance with `noeviction`.
The API is never exposed to the internet. The web service proxies `/api/identity` and
`/api/v1` (including the billing webhook) to it over Render's private network, so
`API_ORIGIN` and `API_URL` are the internal address `http://finsight-api:4000`.
Deployments wait for the repository checks to pass.

Render does not allow `sync: false` inside environment groups, so create the group
**`finsight-api-runtime`** in the dashboard before the first Blueprint sync and add:

| Variable                                          | Notes                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `WEB_ORIGIN`                                      | Public HTTPS web origin; must equal the web service's `NEXT_PUBLIC_APP_URL` |
| `MONGODB_URI`                                     | Atlas `mongodb+srv` URI with credentials and a database name                |
| `FIELD_ENCRYPTION_KEY`                            | `openssl rand -hex 32`; escrow a copy; never regenerate                     |
| `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`            | Transactional provider and verified sender                                  |
| `PRIVACY_CONTACT_EMAIL`, `GRIEVANCE_OFFICER_NAME` | Real operator contacts                                                      |

`BETTER_AUTH_SECRET` is generated once in that group and shared by the API and
worker. Add `SMTP_USER`, `SMTP_PASSWORD`, `FIELD_ENCRYPTION_PREVIOUS_KEYS`, the Google
pair and the complete billing group to the same group when needed.

Notes:

- Allow Render's outbound addresses for your region in MongoDB Atlas network access
  (listed in the Render dashboard).
- The internal Redis URL carries no password or TLS; access is limited to the private
  network by `ipAllowList: []`. The preflight reports this as a warning, which is
  expected for this topology.
- Point Razorpay's webhook at `https://<web origin>/api/v1/billing/webhook`.
- `TRUSTED_PROXY` is `10.0.0.0/8` for the private network. After the first deploy,
  send a request with a spoofed `X-Forwarded-For` header and confirm it does not
  change the address used for rate limits.
- Set `NEXT_PUBLIC_APP_URL` before the web build; it is compiled into the image. Use
  paid long-lived instances for a paying-user release.
- Verify the stack with `GET <web origin>/api/ready`, which proxies the API readiness
  check and so covers the whole chain.

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
same-origin identity/finance proxy routing. Read
[Proxy trust and rate limits](#proxy-trust-and-rate-limits) first: the web alone
being live does not make the product usable, because sign-in and every finance
feature need the API, worker, database and Redis.

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

## Pre-deploy checklist

- [ ] Quality, CodeQL, Container scan and Secret scan workflows pass on the release commit.
- [ ] `npm run preflight` reports zero failures against the production environment.
- [ ] MongoDB is an authenticated replica set; Redis uses TLS, a password and `noeviction`.
- [ ] A transactional SMTP provider and verified sender domain (SPF, DKIM, DMARC) are ready.
- [ ] `FIELD_ENCRYPTION_KEY` and every retained key are escrowed outside the hosting account.
- [ ] A database snapshot has been taken.
- [ ] Billing variables are blank (Free-only) unless the checks in [LAUNCH_CHECKLIST](LAUNCH_CHECKLIST.md) are complete.

## Post-deploy checklist

- [ ] `GET <WEB_ORIGIN>/api/ready` returns 200 (it proxies the API readiness check, covering MongoDB and Redis).
- [ ] A new account receives its verification email and can sign in and complete onboarding.
- [ ] Password-reset and invitation emails use the public HTTPS domain.
- [ ] Rate limiting distinguishes real clients and ignores spoofed forwarding headers.
- [ ] The privacy and terms pages show the real operator contact and grievance officer.
- [ ] Worker heartbeat, outbox age and readiness alerts are configured and tested.
- [ ] A restore drill into a staging database has succeeded with the escrowed keys.

Day-two procedures (rollback, key rotation, incidents, alerts) are in
[RUNBOOK](RUNBOOK.md).