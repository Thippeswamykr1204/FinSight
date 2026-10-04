# Deployment and operations

## What can be deployed today

The browser demo can be hosted publicly with the legacy API disabled. A separate hosted foundation now provides verified identity, tenant-scoped Postgres workspaces and transactional email; it is verified against isolated local dependencies. Paid memberships, bank aggregation, managed backups, deletion and deployed-environment operations remain pending. See [HOSTED.md](HOSTED.md) for that boundary and its configuration.

## Local launch

Use Node.js 22.12 or later. Install once with `npm ci`. Then run `npm run dev` and open `http://localhost:3000`. No environment file or database is required for the demo. A fresh browser profile gets fictional records; all changes stay in local storage.

Production-mode preview: `npm run build` followed by `npm run start`. The regular build uses Next’s standard runtime. Container builds opt into standalone output through `BUILD_STANDALONE=true`.

Container preview: with Docker running, `docker compose up --build`. The image runs as the non-root Node user, drops Linux capabilities, and checks `/api/health`. This Compose file starts the demo web app with no database. The standalone image build, container health check and HTTP liveness response have been verified locally. Set `FINSIGHT_PORT=3300` to use an alternate host port; the container still listens on 3000. CI includes the same image build and health smoke test.

Hosted development: `npm run dev:hosted` starts the isolated database and Mailpit using `compose.hosted.yaml`, applies only `prisma/hosted` migrations, and runs the app plus email worker. It does not alter the external database in `.env`. Verification messages appear at `http://localhost:18025`.

## Demo staging configuration

- Set `NEXT_PUBLIC_APP_URL` to the staging origin at build time; metadata and sitemap use this value. Container builds accept `--build-arg NEXT_PUBLIC_APP_URL=https://your-staging-origin` or the corresponding Compose build argument.
- Keep `ENABLE_LEGACY_API=false` and omit all bank, payment, mail and production database credentials.
- Terminate HTTPS at the platform ingress; enable HSTS there after verifying the domain and HTTPS redirects.
- Use a separate hostname and announce the preview as a demo. No hosted privacy, compliance, or banking claims.
- Run the quality workflow and browser tests against the actual artifact before promotion.

## Production configuration for a demo deployment

Use the same immutable artifact and runtime settings as staging with the public origin. Serve immutable Next assets through the hosting CDN. Health checks use `/api/health`; this endpoint reports process liveness, not database readiness. No authenticated response or financial statement is cached by the service worker.

Release process: build → test → stage on a new revision → verify health and critical browser flow → switch traffic → monitor errors → retain the previous revision. Platform traffic switching is an operator configuration, not provisioned in this repository. Do not claim zero downtime without exercising the target ingress and rollout policy.

## Hosted staging configuration

1. Provision an isolated PostgreSQL database and SMTP account. Configure the variables in `.env.hosted.example` through the environment/secret manager: enable hosted mode, set the HTTPS origin and a cryptographically generated auth secret, and supply the database and mail connection details. Keep `HOSTED_LOCAL=false` and legacy access disabled.
2. Generate both Prisma clients and run `npm run db:hosted:migrate` with the **staging hosted** connection. This migration creates only v2 tables. Legacy data conversion/backfill is not implemented; do not point legacy migration commands at it.
3. Build the web artifact with the public origin. Run the web service and a separate `npm run worker:email` process with the same hosted environment. The worker currently runs from the Node source/dependencies deployment; the standalone demo image does not package a worker entrypoint or managed database.
4. Configure ingress to overwrite the header named by `TRUSTED_IP_HEADER`, limit request sizes, terminate TLS and block direct origin access. Without the configured header, auth throttling deliberately uses one fallback IP bucket. Identity payloads are bounded to 64 KB in the application; finance JSON is bounded to 2 MB, including streamed bodies without Content-Length.
5. Verify a new email account, password reset, TOTP, passkeys on the actual HTTPS hostname, invitation/role changes, financial writes, reload persistence and authorized export. Configure and verify Google/Apple in their provider consoles before enabling those buttons.
6. `/api/health` reports process liveness and selected mode; it is not a database, SMTP or backup-readiness check. Before a customer pilot, add dependency monitoring, backup/restore drills, retention cleanup and the remaining release controls in the launch checklist.

## Runbooks

### Unavailable demo
1. Check the process and `/api/health` response.
2. Inspect platform stdout/stderr for build or startup errors without copying secrets into tickets.
3. Revert traffic to the previous successful revision if health or static asset loading fails.
4. Confirm landing, dashboard, transaction creation, and settings in a clean browser.

### Stale service worker
1. The worker only stores the offline recovery page and application icons; it does not store financial pages or API responses.
2. Change the versioned cache name when changing offline assets.
3. A new worker activates after old clients close. Test the offline recovery page after deployment.
4. Site data clearing is a last resort because it deletes the demo’s local financial records. Export before using it.

### Local data recovery
The demo has no remote backup. Export JSON through Settings before clearing browser storage. Hosted owners can export financial JSON from their workspace. The local development Postgres volume survives container restarts, but is not a backup; managed PITR and deletion propagation remain unimplemented.

### Delayed identity email
1. Confirm the worker is running with the same hosted database, origin and auth secret as the web service.
2. Inspect queue counts, attempts, leases and redacted `lastError` in `v2_email_outbox`. Do not copy message bodies, tokens or recipient lists into logs/tickets.
3. Verify SMTP DNS, credentials, TLS and provider delivery status. Local Mailpit accepts mail on port 11025 and shows it on 18025.
4. An expired two-minute lease is reclaimed automatically. Jobs retry up to six attempts. Exhausted jobs need operator review; after the root cause is fixed, users should request fresh expiring links rather than blindly replaying old authentication mail.
5. Delivered bodies are erased. The outbox uses the auth secret for its encryption key; rotating it also invalidates outstanding encrypted mail. Drain delivery first where practical and issue fresh links after emergency rotation. A versioned managed-key rotation workflow remains future work.

### Credential exposure
The original tracked env template contained credential-like values. They were removed from the current template, but Git history is unchanged. Rotate the affected database password, app password, and signing secret in the owning services before reusing those environments. Invalidate existing sessions. Treat any historical values as exposed.

## Hosted SaaS operational targets (not yet demonstrated)

- Availability: 99.9% monthly for authenticated core reads/writes.
- Latency: p95 API < 300 ms excluding bank provider work; p95 import acceptance < 1 s with async processing.
- Durability: database RPO ≤ 15 minutes; RTO ≤ 4 hours. Validate with quarterly restores.
- Postgres: continuous WAL archiving/PITR, daily snapshot, encrypted cross-region copy, restore drills into isolated staging.
- Events/jobs: encrypted durable email outbox, leases and bounded retries are implemented. Broader provider events, dead-letter tooling and payment/bank idempotency remain pending.
- Read replicas: only for eventually consistent analytics. Route read-after-write finance views to primary.
- Partitioning: consider monthly transaction partitions only after measured query pressure/retention needs. Preserve `(workspace_id, date, id)` indexes and uniqueness semantics.
- Secrets: managed secret store, per-environment identity, rotation, no values in source/images/logs.
- Telemetry: API request IDs and redacted status/duration logs are implemented. OpenTelemetry spans, latency/error counters, redacted error tracking and monitored error budgets remain pending.

Terraform, managed database provisioning, deployment automation, central logging, and OpenTelemetry are still pending. This document specifies operational work, not completed infrastructure.
