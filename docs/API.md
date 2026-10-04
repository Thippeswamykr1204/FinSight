# Authenticated API v1

The current API is session-authenticated; public API keys are not implemented yet. The web client uses same-origin cookies and sends JSON. All responses are `Cache-Control: no-store` and include `X-Request-Id`.

Success envelope: `data` plus `requestId`. Error envelope: `error.code`, `error.message`, and `error.requestId`. Codes distinguish unauthenticated (401), forbidden/origin rejection (403), inaccessible workspace (404), stale/idempotency conflict (409), validation/limits (422), throttling (429), and unavailable deployment (503).

## Routes

| Method | Route | Role / behavior |
|---|---|---|
| GET | `/api/v1/workspaces` | Lists only the authenticated user’s memberships |
| POST | `/api/v1/workspaces` | Creates an empty workspace and its owner membership |
| GET | `/api/v1/workspaces/{id}/overview` | Member; DB-backed balances, monthly totals, budgets, goals and members |
| GET | `/api/v1/workspaces/{id}/transactions` | Member; `limit` up to 100, `search`, `category`, opaque `cursor` |
| POST | `/api/v1/workspaces/{id}/commands` | Editor/admin/owner; idempotent finance mutation |
| POST | `/api/v1/workspaces/{id}/members` | Admin/owner; queue an invitation; only owner can grant admin |
| PATCH | `/api/v1/workspaces/{id}/members` | Owner; change a non-owner member’s role |
| DELETE | `/api/v1/workspaces/{id}/members` | Admin/owner subject to target-role checks; owners cannot be removed |
| POST | `/api/v1/invitations/accept` | Verified invited email; single-use, unexpired token |
| GET | `/api/v1/workspaces/{id}/audit` | Admin/owner; latest 100 audit events |
| GET | `/api/v1/workspaces/{id}/export` | Owner; consistent JSON snapshot plus audit event |

Identity endpoints are handled by Better Auth under `/api/identity`. The previous `/api/auth/login` endpoint remains disabled legacy behavior and is not the new sign-in path.

## Finance command contract

See `src/lib/hosted/contracts.ts` for the runtime-validated discriminated union. Supported actions are `account.create`, `transaction.create`, `transaction.update`, `transaction.delete`, `transaction.import`, `budget.set`, `budget.delete`, `goal.create`, and `goal.contribute`.

- Money uses integer USD cents, never floating-point dollar values.
- Dates use `YYYY-MM-DD`; budget periods use `YYYY-MM`.
- Commands require an `Idempotency-Key` of 8–128 alphanumeric, hyphen or underscore characters. A random UUID is suitable.
- Reuse the key when retrying an identical request. Changing the payload with the same key produces 409.
- Transaction updates and deletes include `id` and `version` from the last read. Refresh after a stale-version error.
- Request bodies are limited to 2 MB. Imports accept up to 1,000 validated rows and cannot attach another workspace’s account.
- The API does not accept an actor/user ID to determine access; it resolves the authenticated principal from the server session.
- POST/PATCH/DELETE require an Origin equal to the configured hosted origin. Provider callbacks are validated by Better Auth instead of this finance API gate.

OpenAPI publication and scoped API-key authentication remain separate follow-up work; the current cookie contract should not be presented as a completed public developer platform.
