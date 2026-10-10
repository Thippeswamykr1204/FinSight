# Operations runbook

Procedures for running FinSight in production. Replace `<...>` placeholders with
values from your own deployment. Never paste secrets into tickets, chat or logs.

## Services and health

| Service | Entrypoint                     | Health signal                                            |
| ------- | ------------------------------ | -------------------------------------------------------- |
| Web     | `node apps/web/server.js`      | `GET /api/ready` (proxies the API readiness check)       |
| API     | `node apps/api/dist/index.js`  | `GET /health` (liveness), `GET /ready` (MongoDB, Redis)  |
| Worker  | `node apps/api/dist/worker.js` | Redis heartbeat refreshed every 10 s, expires after 45 s |

At boot the API and worker verify that MongoDB is a replica set and log a warning
when Redis `maxmemory-policy` is not `noeviction`. In production a standalone
MongoDB server stops the process, so a misconfigured release never reports ready.

## Alert conditions

Configure these in your uptime and log tooling. Thresholds are starting points.

| Condition                    | Signal                                                    | Suggested threshold      |
| ---------------------------- | --------------------------------------------------------- | ------------------------ |
| Web or API not ready         | `/api/ready` or `/ready` returns non-200                  | 2 consecutive failures   |
| Worker stalled               | Container health check failing / heartbeat key missing    | 3 minutes                |
| Email delivery failing       | `email_dispatch_failed` log events                        | Any sustained burst      |
| Outbox backlog               | Oldest `email_outbox` row with `sentAt: null`             | Older than 15 minutes    |
| Scheduled work failing       | `recurrence_failed` / `billing_failed` log events         | Any repeat within 1 hour |
| Elevated server errors       | HTTP 5xx rate or `request_failed` log events              | Above 1 % for 5 minutes  |
| Redis policy drift           | `store_check` log event with code `REDIS_EVICTION_POLICY` | Any                      |
| Certificate or domain expiry | Provider or external monitor                              | 21 days                  |

Every response carries `X-Request-Id`. Quote it when tracing a report through web,
API and worker logs.

## Deploy

1. Confirm the release commit passed the Quality, CodeQL, Container scan and
   Secret scan workflows.
2. Run `npm run preflight -- --env-file <production env file>` and resolve every
   failure. Review warnings.
3. Take a database snapshot (see Backups).
4. Deploy the API and worker from the same revision, then the web service. The web
   image embeds `NEXT_PUBLIC_APP_URL` at build time.
5. Verify `GET <WEB_ORIGIN>/api/ready` returns 200. It proxies the API readiness check, so it covers the API, MongoDB and Redis.
6. Run the post-deploy checklist in [DEPLOYMENT](DEPLOYMENT.md#post-deploy-checklist).

## Roll back

1. Redeploy the previous image or revision for the web, API and worker together.
2. Database changes are additive; do not restore a snapshot for an application
   rollback unless data was corrupted.
3. If a rollback follows a key rotation, follow the rollback section of
   [KEY_ROTATION](KEY_ROTATION.md). Never discard the previous key.
4. Verify readiness and sign in with a test account.

## Backups and restore

- Use the managed provider's continuous backup or snapshots. Record the retention
  period and recovery targets that you have agreed to.
- Keep every encryption key that protects retained backups in restricted escrow,
  separate from the backups. A restore needs the keys that were active when the
  data was written.
- Take a logical copy before risky changes:

  ```sh
  mongodump --uri="$MONGODB_URI" --archive=finsight-$(date +%F).archive --gzip
  ```

- Restore drill (repeat at least quarterly, always into a staging database):

  ```sh
  mongorestore --uri="$STAGING_MONGODB_URI" --archive=<archive file> --gzip --drop
  ```

  Then start a staging API with the escrowed keys, sign in, open a workspace,
  download a personal export and, if billing is enabled, an invoice. Compare
  collection counts with the source.

## Key rotation drill

Rotate on a schedule and whenever a key may be exposed. Follow
[KEY_ROTATION](KEY_ROTATION.md) exactly: generate the new key with
`openssl rand -hex 32`, set `FIELD_ENCRYPTION_PREVIOUS_KEYS`, deploy API and worker
together, run `npm run fields:rekey`, then confirm a second run reports zero
changed or conflicted records. Practise the procedure in staging first.

Rotating `BETTER_AUTH_SECRET` signs out every user; schedule it deliberately.

## Incident response

1. **Acknowledge** and open an incident record with the start time and impact.
2. **Contain.** For suspected credential exposure, rotate the affected secret first
   (database, Redis, SMTP, Google, Razorpay, `BETTER_AUTH_SECRET`,
   `FIELD_ENCRYPTION_KEY`), then investigate.
3. **Diagnose** using request IDs, readiness endpoints and the alert table above.
4. **Communicate.** If personal data may be affected, involve the privacy and
   grievance contacts configured for the deployment and follow the legal process
   that applies to you.
5. **Recover**, verify, and write a short post-incident review with follow-ups.

Report vulnerabilities through the process in the root [SECURITY](../SECURITY.md).

## Routine checks

| Cadence   | Check                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Daily     | Readiness monitors green; outbox age; error rate                         |
| Weekly    | Dependabot and CodeQL alerts; dependency audit; failed job counts        |
| Monthly   | Review access to hosting, database, Redis and mail provider accounts     |
| Quarterly | Restore drill; key rotation drill; review retention and operator notices |

## First 24 hours after launch

- Watch readiness, error rate, outbox age and worker heartbeat continuously.
- Create a fresh account end to end: verification email, sign-in, onboarding,
  a transaction, export and account deletion.
- Confirm password-reset and invitation emails arrive and the links use the public
  HTTPS domain.
- Confirm rate limiting distinguishes real clients at the production ingress
  (see the proxy section of [DEPLOYMENT](DEPLOYMENT.md#proxy-trust-and-rate-limits)).
- Confirm the privacy and terms pages show the real operator contact and
  grievance officer.
- Keep billing disabled until the payment lifecycle checks in
  [LAUNCH_CHECKLIST](LAUNCH_CHECKLIST.md) are complete.