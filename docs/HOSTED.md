# Hosted identity and workspaces

## Run locally

With Node 22.12+ and Docker running, use `npm run dev:hosted`. This starts an isolated PostgreSQL 16 database, Mailpit, the email worker, and Next on `http://localhost:3000`. Open `/sign-up`, create an account, and read the real verification message at `http://localhost:18025`. After verification, sign in and create a workspace. If port 3000 is occupied, stop the application that owns it before running this command.

The local launcher explicitly sets `HOSTED_DATABASE_URL`; it never migrates the connection in the existing `.env` or the legacy Prisma schema. The local database is `finsight_hosted_local` on loopback port 55432. Tests use a different container/database on 55433. Development data persists in a named Docker volume; test data is ephemeral when its container is removed.

Local auth secrets are generated with cryptographic randomness and saved with mode 0600 under ignored `.local/`. These values are never printed. Deleting that directory invalidates local sessions and makes any still-pending encrypted email unreadable.

The original `npm run dev` remains the no-configuration browser demo. `/dashboard` and related routes use local storage; `/app` and its children use authenticated database records. Hosted failures never fall back to sample data. `.env.hosted.example` lists the configuration for a separately hosted deployment.

## Implemented identity flows

- Better Auth 1.7.7, compatible with Next 15, React 18 and Prisma 5.
- Password registration with minimum 12 characters, email verification, and no automatic unverified session.
- Sign-in, sign-out, seven-day sessions with database validation on every protected request.
- Password reset with single-use tokens and revocation of existing sessions.
- Hashed single-use magic links for existing accounts.
- TOTP enrollment requires confirmation, provides recovery codes, and challenges password sign-in. A credential password is required to manage TOTP; passwordless users can establish one through password reset first.
- Recovery codes are single use. Accounts with TOTP enabled cannot bypass it through magic links or OAuth. User-verified passkeys remain an alternative.
- WebAuthn registration, sign-in, listing and removal with user verification required. Chromium tests use a real virtual authenticator to run the ceremony.
- Session/device list, individual revocation and sign-out of other devices.
- Google and Apple adapters and sign-in buttons are conditionally enabled by provider configuration. Their external authorization flows are **not live-verified**, because provider credentials are not supplied.

Register provider callback URLs at `/api/identity/callback/google` and `/api/identity/callback/apple` on the configured `BETTER_AUTH_URL` origin. Use the correct Apple Services ID and generated, expiring client-secret JWT. Review provider consent, origins and email verification in their actual sandbox before enabling production buttons.

## Schema and financial correctness

The v2 schema/migrations live in `prisma/hosted`, with a separately generated Prisma client in ignored `src/generated/hosted`. Tables use the `v2_` prefix. The legacy two-table schema is retained unchanged; there is no automatic conversion or destructive migration of its Float money columns.

All new ledger amounts are integer INR paise in PostgreSQL BIGINT, bounded to safe JSON arithmetic. Foreign keys link a transaction to `(workspaceId, accountId)`, so a transaction cannot reference an account belonging to another workspace even if application validation is bypassed. SQL constraints enforce positive transaction amounts, account types and goal bounds. The additive India migration defaults to INR and only updates financially empty legacy workspaces. Funded USD workspaces keep their original currency and amounts and become read-only in the application. There is no FX conversion. The original applied migration is immutable.

Workspace roles are owner, admin, editor and viewer. Membership is resolved from the authenticated user on the server. Every query includes workspace scope; every mutation rechecks permission inside a workspace-serialized transaction. A revoked membership cannot retain write authority from a stale UI.

Finance commands require an `Idempotency-Key`. The actor, canonical request fingerprint, audit record, financial write and response are committed atomically. Replays return the original response only for the same actor and payload; conflicting key use returns 409. Transaction edits/deletes also require the version last read and reject stale versions.

Pagination uses opaque `(date, id)` cursors bound to the workspace/search/category query. Summary queries aggregate in PostgreSQL. Hosted imports parse in the browser, validate again on the server, and deduplicate against both imported and manually entered records.

Current release bounds are 5 owned workspaces, 20 members per workspace, 100 accounts, 100 goals, and 10,000 transactions. These are protective release bounds, not monetized entitlements. Paid plan enforcement is the next phase.

## Email delivery and rate limiting

Verification, reset, magic-link and invitation emails use a durable PostgreSQL outbox. Sensitive message bodies are AES-256-GCM encrypted with a domain-separated key derived from the auth secret; delivered bodies are erased. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, recover expired leases, and retry up to six attempts with exponential backoff. Delivery is at least once; a deterministic Message-ID helps downstream deduplication but does not guarantee exactly-once email.

The local launcher runs the worker automatically. A hosted deployment must run `npm run worker:email` with the same hosted environment. Next’s post-response callback also opportunistically drains small batches. SMTP must be configured and, outside local mode, requires TLS. No link is logged or returned as a substitute for delivery.

Auth and finance rate limits use atomic PostgreSQL counters shared by application replicas. Auth endpoints have stricter per-path limits; finance APIs use authenticated-user limits. Identity bodies are limited to 64 KB; finance JSON to 2 MB, including streamed bodies. With no trusted IP header configured, auth requests share a conservative fallback bucket. To enable per-client IP limits behind ingress, configure `TRUSTED_IP_HEADER` and ensure the proxy overwrites it and prevents direct origin access. Never pass client-supplied forwarded headers through as trusted identity.

## Tests

`npm run test:hosted` starts the isolated test database, applies v2 migrations, starts a Next test server and email worker, and runs HTTP plus browser tests. To test the production artifact, build first and run `E2E_PRODUCTION=1 npm run test:hosted`. Both modes have been exercised.

Seven hosted tests verify account/email flows; password recovery and revocation; one-time magic/recovery links; MFA enforcement; origin and rate-limit rejection; real database persistence through the browser; passkey registration/login/deletion; cross-tenant denials; role changes; idempotency; cursor scope; optimistic conflicts; audit records; and direct SQL constraint enforcement. The browser flow includes automated accessibility and mobile-width checks.

## Remaining launch work

This is a verified hosted foundation, not a full commercial launch. Billing/entitlements, account deletion across all stores, live bank providers, admin/support tooling, public API keys, retention cleanup, dedicated observability, disaster recovery and infrastructure provisioning remain. OAuth provider verification, production SMTP deliverability, strict nonced CSP, host-level security and independent review must be completed before accepting public customer financial data.
