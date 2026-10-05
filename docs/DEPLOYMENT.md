# Deployment — two supported operational paths

The web app and durable email worker are separate processes. The procedures below cover public hosting, release migrations, SMTP, backups and rollback; provider provisioning and production approvals are operator responsibilities.

## Demo on Vercel

Import the repository, select Node 22, install with `npm ci` and build with `npm run build`. Keep `HOSTED_ENABLED=false` and `ENABLE_LEGACY_API=false`; no database or SMTP is needed. Set `NEXT_PUBLIC_APP_URL` to the deployment's real HTTPS origin and redeploy so metadata uses it. Check the landing page, `/dashboard`, mutations/reload persistence and `/api/health`, then update the repository website and README demo link.

## Common release contract

Node 22.12+ and Docker Compose 2.20+ (optional dependencies/profiles). One `.env.example` documents every setting. No secrets are needed for the demo. Hosted mode needs `HOSTED_DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `SMTP_HOST` and `EMAIL_FROM`; `SMTP_PORT` defaults to 587. Authenticated SMTP requires its user/password pair. Public production additionally requires the real privacy contact and grievance officer. `npm run env:init` creates fresh local-only credentials with mode 0600 and refuses to overwrite a file. Replace loopback defaults before public deployment.

Set `HOSTED_ENABLED=true`, `HOSTED_LOCAL=false`, `ENABLE_LEGACY_API=false`, an HTTPS `BETTER_AUTH_URL` and the same `NEXT_PUBLIC_APP_URL` at build time. Both `npm run start` and the container entrypoint validate required configuration before opening the server. Next instrumentation also validates Node-hosted functions. Public configuration errors name the missing variable, never its secret value.

Use one tested immutable image/commit per release. Migrate with **only** `npm run db:hosted:migrate` or the Docker `migrator` target; never run the legacy seed, `migrate dev`, `db push` or destructive reset on customer data. Serialize release migration jobs. Prisma's deploy lock provides a second guard. The INR migration is additive and preserves funded legacy amounts; rollback must retain the INR-aware application contract.

`/api/health` is liveness; `/api/ready` checks hosted database access (or demo readiness). Neither proves SMTP delivery or backup status. Hosted/auth HTML receives a fresh script nonce and `no-store`; APIs are not cached. Run the complete post-deploy checklist before opening signups.

## Path A — Vercel web + Neon database + Mumbai worker

1. In Neon, create a **new isolated project/branch** for staging. The official region list currently has Singapore but **no Mumbai region**. Neon cannot move an existing project's region. This path is suitable only if the operator's cross-border-processing policy permits that location; it is **not India-only residency**. If India residency is a requirement, use Path B with RDS/Postgres in Mumbai.
2. Copy the Neon pooled DSN for web requests, with TLS (`sslmode=require`), `connection_limit=5`, a suitable `pool_timeout` and `connect_timeout=15`. This repository uses Prisma 5 TCP, not the Prisma 7 adapter from newer examples. Use the direct/unpooled DSN for the release migration job by temporarily setting `HOSTED_DATABASE_URL` in that job; the application/worker retain their pooled DSN. No new legacy `DATABASE_URL` wiring is needed.
3. In Vercel, import this repository, select Node 22, install with `npm ci` and build with `npm run build`. `vercel.json` selects Mumbai `bom1` for Node Functions. Routing middleware/CDN and platform logs have their own locality; `bom1` is not a whole-platform residency guarantee. Separate preview/staging secrets and databases from production; do not expose hosted signup on unreviewed preview domains.
4. In project environment settings, enter the hosted variables above and operator legal contacts. Add the actual domain in Vercel's Domains screen, apply the provider's DNS records, wait for HTTPS verification, and set both origins to that exact domain. Better Auth/passkeys bind to its hostname; a domain change affects existing passkeys and callback links.
5. Configure Amazon SES in `ap-south-1`: verify your sender/domain, publish its DKIM/SPF/DMARC records, obtain region-specific **SMTP** credentials, request production sending access and configure `email-smtp.ap-south-1.amazonaws.com:587`. A sandbox accepts only verified recipients. The repository's SMTP transport requires STARTTLS outside local tests. Production deliverability remains an operator verification step.
6. Run the release migration from a trusted CI/release runner using the direct DSN, then build/deploy the same commit in Vercel. Migrations are a release stage, not a side effect of every preview build. Use separate migration credentials/role and a lower-privilege runtime role where practical; all authorization remains enforced by application membership and composite DB constraints.
7. Run the Docker app image as a **separate long-running email worker** on a Mumbai VPS/ECS task, command `node dist/email-worker.cjs`, with the same database/auth secret/origin/SMTP settings. Vercel Functions do not host a perpetual worker. Do not rely on opportunistic `after()` delivery alone. The worker's healthcheck uses its heartbeat; alert on queue age and attempts.
8. Leave `TRUSTED_IP_HEADER` empty until the provider's exact overwrite semantics and direct-origin protections are verified. An empty header safely shares one fallback login bucket. A comma-separated forwarded-IP list is intentionally rejected. Do not assume the caller controls a trustworthy header.
9. Set Neon's restore-history window appropriate to the paid plan. Take an encrypted logical export to operator-controlled storage, retain it in the approved region and restore into an isolated branch periodically. Worker polling prevents a hosted database from staying asleep; include that compute cost in capacity planning.
10. Promote only after the HTTPS-domain smoke checklist. Keep the prior Vercel deployment and corresponding worker image for rollback. A schema-compatible traffic rollback is safe; do not run a down migration that relabels paise as another currency.

## Path B — Docker VPS / AWS Mumbai

1. Provision a supported Linux VPS/EC2 host in `ap-south-1` with Docker Engine and Compose 2.20+. For a modest pilot, start with 2 vCPU/4 GB RAM and monitor it; this is a sizing starting point, not a load-tested capacity claim. Open 80/443 publicly and limit SSH to an administrator network. Postgres, Redis and the app origin must not be exposed directly.
2. Point your real DNS A/AAAA record to the host. Install Caddy using its official packaging and run `ops/Caddyfile` under the Caddy system service. Supply `FINSIGHT_DOMAIN` and `FINSIGHT_PORT` to that service. Caddy obtains/renews HTTPS and overwrites `X-Real-IP` with the direct peer; set app `TRUSTED_IP_HEADER=x-real-ip`. If adding a CDN, configure its explicit trusted proxy network and reverify anti-spoofing before relying on forwarded identity.
3. Create a mode-0600 environment file outside Git from `.env.example`. Supply fresh auth/database passwords and public origins, verified SMTP and real privacy contacts. `POSTGRES_PASSWORD` must be nonempty for the Compose database. Do not reuse historical template credentials. Keep `HOSTED_LOCAL=false` publicly; the loopback escape hatch is rejected for public hostnames.
4. Build/tag the `runner` and `migrator` targets for the same release. `compose.yaml` starts the app by default in demo mode; the `hosted` profile adds Postgres, a one-shot migration job and the durable email worker. App/worker wait for successful migration; a failed migration prevents promotion. The app/worker are non-root, read-only, capability-dropped, with a writable temporary mount. The app binds only to host loopback.
5. For a local hosted-container rehearsal:

   ```sh
   npm run env:init -- --mode hosted --output .local/docker.env
   docker compose --env-file .local/docker.env -f compose.yaml -f compose.smoke.yaml --profile hosted up -d --build --wait
   ```

   This uses a **test-only** SMTP sink at `http://localhost:18026` and app at `http://localhost:3302`. The generator refuses overwrites; reuse the protected file for later rehearsals. `compose.smoke.yaml` never belongs in a public deployment. Production uses just `compose.yaml`, its protected environment file and the verified SMTP provider.

6. For a managed Mumbai database, use RDS PostgreSQL in private subnets with encryption, automated backups/PITR and security groups restricted to app/worker/release jobs. Use the migrator target as a separate release task with its direct DSN, and the runner image for app/worker. The bundled local Postgres profile is a VPS path; don't provision an unused local database alongside RDS. Run the application container with its runtime environment after that migration succeeds.
7. Keep SES in Mumbai as in Path A, and monitor bounce/complaint rates. Restrict the SMTP principal to the sender identity. No SMTP key is embedded in the image; all runtime configuration is injected. Google/Apple adapters need independent provider-console/test validation.
8. Schedule daily logical backups and, for a serious public service, continuous WAL/PITR via managed RDS or an operationally proven backup system. Encrypt archives with KMS/age before off-host storage; retain daily backups for 7 days and a recovery window chosen by the operator (a 30-day starting policy must be reviewed). Include the auth secret/key lifecycle needed to read undelivered encrypted outbox messages. Do not back up only the Docker volume and call it disaster recovery.
9. Restore regularly into a separate database, never into the active customer database. Validate migrations, tenant counts and ledger sums, SMTP disabled for restored data, and a clean-domain browser flow. Record recovery time and recovery point. A local logical dump/restore smoke is distinct from a cloud PITR drill.
10. Roll back by repointing the app and worker to the previously verified **schema-compatible** release image. Retain immutable release tags/digests and a pre-migration restore point. If destructive data loss occurs, put the app in maintenance, restore to a separate database, reconcile lost writes, then switch its DSN. Do not remove volumes during normal rollout. Local `test:container` intentionally removes only its named disposable smoke stack.

## Verification and smoke checklist

Local release commands:

```sh
npm run check
E2E_PRODUCTION=1 npm run test:e2e
E2E_PRODUCTION=1 npm run test:hosted
npm audit --omit=dev --audit-level=high
docker build -t finsight:local .
npm run test:container
```

After actual deployment:

- Domain HTTPS and redirects, HSTS, no framing, production script nonce with no `unsafe-inline` on `/app` and identity pages; no console/page errors.
- Liveness and database readiness return 200 without credentials or dependency details.
- Signup notice acceptance, email verification, sign-in, reset/session revocation, TOTP/recovery and passkeys on the actual domain.
- Empty INR workspace, account/transaction CRUD, Indian commas/date import, deduplication, FY reports, budget/goal persistence, member-role denials and owner export.
- Separate two-user tenant test; forbidden foreign origins; spoofed/invalid IP headers cannot evade login limits.
- Actual standalone worker delivery, queue age/failed jobs alerts and erased sent bodies; provider delivery/bounce status checked.
- Export then delete disposable workspace/account; verify sessions stop working and shared ownership rules hold.
- Real-device layout, demo dark mode, no large-number overflow, offline recovery; financial responses remain uncached.
- Backup artifact restored with balances checked, rollback rehearsed, privacy/grievance contact and processor/retention disclosures reviewed.

## Ongoing operations

Worker cleanup runs hourly: expired rate buckets/auth verifications, idempotency records older than 30 days, sent-mail metadata older than 7 days, exhausted mail older than 30 days. Idempotent finance replay is therefore guaranteed within its 30-day retention window; retrying an ancient manually created command after expiry is a new write. Monitor cleanup and queue errors; successful SMTP is not a health proof for every recipient. Identity links are short-lived; after auth-secret rotation, undelivered encrypted mail must be invalidated/reissued. A versioned outbox-key rotation mechanism remains pending.

The Quality workflow configures install, formatting, lint, typecheck, coverage, production build/browser suites, runtime audit and demo/hosted container smoke. It also reports the full dependency audit with a documented build-tool exception. Deployment promotion is a separate operation.

Historical database/app credentials must be revoked in their owning services. Generating fresh local credentials does not revoke an external password; see [rotation guidance](SECURITY.md#secret-handling-and-rotation).

## Provider references

- [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region) and [region list](https://vercel.com/docs/regions)
- [Neon regions](https://neon.com/docs/introduction/regions), [Prisma integration](https://neon.com/docs/guides/prisma), [restore history](https://neon.com/docs/introduction/branch-restore)
- [Amazon SES regional identity/SMTP requirements](https://docs.aws.amazon.com/ses/latest/dg/regions.html)
- [Caddy reverse proxy and header overwrite](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
