# Architecture

FinSight is a two-process MERN application with one shared TypeScript package.

```text
React/Vite static site ── HTTPS JSON ── Express API ── Mongoose ── MongoDB
                                              │
                                              └── optional Redis-compatible limiter
```

## Boundaries

- `apps/web` owns routing, presentation, accessibility, theme state, optimistic-safe UI states, and the PWA shell. It has no database or signing keys.
- `apps/api` owns identity, cookies, CSRF, authorization, input validation, idempotency, transactions, audit events, aggregation, and data-rights operations.
- `packages/shared` owns pure INR arithmetic, schemas, formatting, summaries, cash-flow helpers, and calculators.

## Persistence model

Collections are keyed by UUID strings and every workspace-owned document carries `workspaceId`:

`users`, `refreshsessions`, `workspaces`, `memberships`, `accounts`, `transactions`, `budgets`, `goals`, `recurringrules`, `auditevents`, `idempotencyrecords`, and `invitations`.

The main indexes follow actual request paths:

- membership by `(workspaceId, userId)` and `(userId, createdAt, _id)`;
- transactions by `(workspaceId, date, _id)`, `(workspaceId, category, date, _id)`, and `(workspaceId, accountId, date, _id)`;
- budgets by `(workspaceId, category, month)` and `(workspaceId, month)`;
- goals and recurring rules by workspace and next-use date;
- refresh, idempotency, and invitation records by their lookup hash and TTL date.

Transactions use integer paise, an ISO calendar date, and a version number. Updates include the expected version so concurrent edits fail closed instead of silently overwriting another change. MongoDB sessions protect multi-document workspace creation, recurring recording, and workspace deletion.

## Request flow

1. `helmet`, CORS, request IDs, cookies, JSON limits, CSRF, and rate limits run before routes.
2. Authentication verifies the short-lived access token and checks the persisted refresh session is active.
3. Every workspace route resolves membership from MongoDB. The client-supplied role is never trusted.
4. Zod parses the request body, query, and path identifiers before a database filter is built.
5. Mutating routes audit the actor and request ID. Retried writes can return the stored response for the same actor, scope, key, and payload fingerprint.
6. The centralized error handler returns a stable error code and request ID without exposing stack traces or database details.

## Free deployment behavior

The default local limiter is in memory. Setting `REDIS_URL` selects the Redis-compatible implementation without changing route code. There is no worker, local file store, or in-process session registry. Recurring records are recorded by an authenticated user action; a queue can be added behind the same service boundary when a deployment can support it.
