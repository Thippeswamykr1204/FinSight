# MERN migration architecture

Status: Phase 1 implementation in progress, 7 October 2026. This document distinguishes the target from the verified implementation and remaining production work. UI contract: [PARITY](PARITY.md). Findings: [AUDIT](AUDIT.md).

## Package boundaries

```text
apps/web     Next.js 15 + React + existing Tailwind/Radix/Recharts UI
apps/api     Express + TypeScript; routes > controllers > services > repositories
packages/shared  Existing India finance functions + Zod contracts + transport types
```

npm workspaces with one root lockfile. Next retains SEO, OG/icons, PWA, marketing and SSR. Web may forward cookies and render data from the typed API client; it contains no database/auth-server/queue/business implementation. Same-origin `/api` reverse proxy retains current URLs/cookie/passkey RP behavior and avoids third-party cookie dependence. The API is separately deployed and has a public-origin allowlist. Only headers explicitly overwritten by controlled ingress are trusted; no arbitrary `X-Forwarded-*` trust.

## Persistence

MongoDB replica set is mandatory for ledger atomicity. Mongoose models use strict schemas and database validators for safe integer paise/date/currency bounds. Mongo does not provide relational foreign keys: services validate account/workspace references and use a workspace revision write inside every transaction to serialize membership/finance/deletion conflicts. Domain write, audit, idempotency result and durable outbox commit together. Retry transient Mongo transaction conflicts; never retry arbitrary non-idempotent operations outside this boundary.

IDs remain string IDs to preserve existing records and URLs. Calendar fields remain `YYYY-MM-DD` and budget months `YYYY-MM`; operational timestamps are UTC Date. Numbers represent exact integer paise within shared bounds; export validates aggregate safe-integer bounds. No silent currency conversion; funded old USD records remain read-only.

| Collection | Query/index contract |
| --- | --- |
| users | unique normalized email, identity ID; no invented old consent |
| sessions | unique token, userId/expiry, TTL; provider-owned session validation |
| auth_accounts | userId, unique providerId/accountId; encrypted provider tokens |
| verifications | identifier/expiry + TTL |
| two_factors / passkeys | userId; unique credentialID; provider-compatible protected secret storage |
| workspaces | ownerId/createdAt/id, revision |
| memberships | unique workspaceId/userId; userId/createdAt/id; workspaceId/role |
| financial_accounts | workspaceId/createdAt/id; workspaceId/id |
| transactions | workspaceId/date descending/id descending; workspaceId/category/date/id; workspaceId/accountId/date; partial unique workspaceId/importKey |
| budgets | unique workspaceId/category/month; workspaceId/month |
| goals | workspaceId/due/id |
| invitations | unique tokenHash; workspaceId/email/acceptedAt; inviterId; expiresAt |
| audit_events | workspaceId/createdAt descending/id descending; actorId |
| idempotent_writes | unique workspaceId/key; actorId; expiresAt TTL (30 days) |
| consents / privacy_notices | userId/purpose/version; unique notice version; effective time |
| email_outbox / reports / recurring_rules | scoped actor/workspace; delivery/nextDue/expiry indexes and unique job/occurrence IDs |

Every tenant repository operation takes an authenticated principal and explicit workspace scope. Membership is checked before cached data access and again within writes. Shared household queries include workspace scope, not owner-only filters that would prevent legitimate editors/viewers reading shared records. Personal identity queries include userId. Never pass request bodies/query objects directly to Mongo filters or update operators.

## API and identity

Versioned `/api/v1` preserves current workspace/command/me/invitation routes for parity. Zod validates params/query/body/idempotency headers. Add cursor pagination/filtering, consistent `{data,requestId}` / `{error:{code,message,requestId}}`, JSON size limits, request IDs, helmet, explicit CORS/origin/Fetch-Metadata CSRF gates, Redis rate limits, compression, redacted pino and diagnostic hooks. OpenAPI is served from the real route schemas, not placeholder endpoints.

Better Auth Mongo adapter retains client plugins and `/api/identity`. Explicit Argon2id hashing with legacy default-hash verification for imports; bounded memory/concurrency. Verified email, reset revocation, magic-link replay protection, TOTP/recovery, user-verified passkeys and MFA alternative-method restrictions remain. Cookie cache stays disabled so revocation is immediate. Session refresh/rotation must be tested; refreshing expiry alone is not claimed as reuse detection. Cookies are HttpOnly, same-site and Secure on HTTPS. Destructive operations retain ten-minute fresh sign-in.

Encryption uses versioned AES-256-GCM envelopes and authenticated purpose/workspace context. Separate injected encryption key ring from auth secret; preserve old email envelope decryption during import only. Secrets/financial request bodies are never logged or returned in personal exports.

## Redis / workers

Redis is required for rate limiting and BullMQ; fail closed when limits cannot be enforced. Cache is non-authoritative and revision/user/workspace keyed. No `KEYS` invalidation. BullMQ workers handle email, recurring transactions, reports and cleanup. Queue payloads carry record IDs, not personal plaintext; durable Mongo outbox is dispatched to BullMQ with deterministic job IDs. Worker retries are bounded/at-least-once; reconcile before replay, erase delivered body, expose queue age/failures/heartbeat. Recurrences use unique rule/date keys and IST calendar month-end clamping.

## Migration and seed

One-off importer reads a consistent exported old Postgres shape or read-only DSN, with dry run, deterministic IDs, validation, checkpoints and per-workspace counts/ledger-sum reconciliation. Preserve every source money/date/currency/consent record. Auth credentials import only with format-compatible verifier; invalidate sessions and expiring tokens at cutover. Verify passkeys/TOTP encryption compatibility. Never auto-import demo records. Optional dev seed requires explicit local mode, creates a verified fictional identity/empty workspace, and never clears existing databases.

## Delivery and verification

Multi-stage web/API Dockerfiles; Compose web/api/worker/Mongo replica set/Redis plus local Mailpit and shared generated secret volume for one-command local boot. Local-only topology binds host ports to loopback; public deployment validates HTTPS, real operator contacts and SMTP. Deploy web to Vercel, API/worker to Render/Railway/AWS, Atlas replica set and Redis/Upstash (BullMQ-compatible TCP; test connection/eviction limits). No production auto-seed.

CI: npm ci, lint, typecheck, domain coverage, Supertest Mongo/Redis integration, build, production Playwright including MFA/passkey/isolation/data rights and signup→workspace→transaction→budget alert→import→export→invite→delete, screenshot diffs/axe, runtime/full audit and both Docker builds. Lighthouse scores are measured outputs, not configuration claims. Load/restore evidence is required before asserting million-user capacity.

## Phases / exit criteria

0. Review/document; capture before screenshots; baseline install/lint/types/tests/build.
1. Move UI mechanically, share the existing domain, port hosted services/auth to Mongo/Redis/API, add importer/seed and remove Prisma/legacy paths. The foundation, Compose boot, API smoke flow and repository checks now pass; full authenticated integration coverage remains.
2. Required 320–1920 both-theme matrix; fix measured responsive defects only; preserve desktop references. Run all checks.
3. Security/observability/test/CI/container/deployment hardening, audits and end-to-end smoke. Fully tick parity only against actual evidence; record external blockers explicitly.
