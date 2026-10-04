# Deployment and operations

## What can be deployed today

The current release is a browser-local product demo. It can be hosted publicly with the legacy API disabled. It does not provide hosted user accounts, paid memberships, tenant isolation, bank aggregation, or server backups of financial records. Keep those boundaries visible in the product.

## Local launch

Use Node.js 22.12 or later. Install once with `npm ci`. Then run `npm run dev` and open `http://localhost:3000`. No environment file or database is required for the demo. A fresh browser profile gets fictional records; all changes stay in local storage.

Production-mode preview: `npm run build` followed by `npm run start`. The regular build uses Next’s standard runtime. Container builds opt into standalone output through `BUILD_STANDALONE=true`.

Container preview: with Docker running, `docker compose up --build`. The image runs as the non-root Node user, drops Linux capabilities, and checks `/api/health`. The compose configuration starts only the demo web app; no database is needed. Docker Compose configuration was validated locally. The container image could not be built here because the Docker daemon remained unavailable after a Docker Desktop startup attempt timed out; CI includes the actual image build and health smoke test.

## Staging configuration

- Set `NEXT_PUBLIC_APP_URL` to the staging origin at build time; metadata and sitemap use this value. Container builds accept `--build-arg NEXT_PUBLIC_APP_URL=https://your-staging-origin` or the corresponding Compose build argument.
- Keep `ENABLE_LEGACY_API=false` and omit all bank, payment, mail and production database credentials.
- Terminate HTTPS at the platform ingress; enable HSTS there after verifying the domain and HTTPS redirects.
- Use a separate hostname and announce the preview as a demo. No hosted privacy, compliance, or banking claims.
- Run the quality workflow and browser tests against the actual artifact before promotion.

## Production configuration for a demo deployment

Use the same immutable artifact and runtime settings as staging with the public origin. Serve immutable Next assets through the hosting CDN. Health checks use `/api/health`; this endpoint reports process liveness, not database readiness. No authenticated response or financial statement is cached by the service worker.

Release process: build → test → stage on a new revision → verify health and critical browser flow → switch traffic → monitor errors → retain the previous revision. Platform traffic switching is an operator configuration, not provisioned in this repository. Do not claim zero downtime without exercising the target ingress and rollout policy.

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
The current demo has no remote backup. Export JSON through Settings before clearing browser storage. A future hosted system must provide tested point-in-time restoration and deletion propagation; the demo cannot promise either.

### Credential exposure
The original tracked env template contained credential-like values. They were removed from the current template, but Git history is unchanged. Rotate the affected database password, app password, and signing secret in the owning services before reusing those environments. Invalidate existing sessions. Treat any historical values as exposed.

## Hosted SaaS operational targets (not implemented)

- Availability: 99.9% monthly for authenticated core reads/writes.
- Latency: p95 API < 300 ms excluding bank provider work; p95 import acceptance < 1 s with async processing.
- Durability: database RPO ≤ 15 minutes; RTO ≤ 4 hours. Validate with quarterly restores.
- Postgres: continuous WAL archiving/PITR, daily snapshot, encrypted cross-region copy, restore drills into isolated staging.
- Events/jobs: durable outbox + at-least-once worker delivery, unique event IDs, bounded retry with backoff, poison queue review, provider idempotency keys.
- Read replicas: only for eventually consistent analytics. Route read-after-write finance views to primary.
- Partitioning: consider monthly transaction partitions only after measured query pressure/retention needs. Preserve `(workspace_id, date, id)` indexes and uniqueness semantics.
- Secrets: managed secret store, per-environment identity, rotation, no values in source/images/logs.
- Telemetry: structured request IDs, tenant-safe logs, OpenTelemetry spans, latency/error counters, redacted error tracking, monitored error budgets.

Terraform, managed database provisioning, deployment automation, central logging, and OpenTelemetry are still pending. This document specifies operational work, not completed infrastructure.
