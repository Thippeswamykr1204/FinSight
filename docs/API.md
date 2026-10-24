# API surface

All JSON responses use `{ "data": ... }` on success and `{ "error": { "code", "message", "requestId" } }` on failure. Browser mutations require the CSRF header and write endpoints accept `Idempotency-Key`.

## Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Personal data

- `PATCH /api/me`
- `GET /api/me/export`
- `DELETE /api/me`

## Workspaces

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId/overview`
- `GET /api/workspaces/:workspaceId/export`
- `DELETE /api/workspaces/:workspaceId`
- `GET /api/workspaces/:workspaceId/members`
- `POST /api/workspaces/:workspaceId/members/invite`
- `POST /api/invitations/accept`

## Finance

- `GET|POST /api/workspaces/:workspaceId/accounts`
- `DELETE /api/workspaces/:workspaceId/accounts/:id`
- `GET|POST /api/workspaces/:workspaceId/transactions`
- `PATCH|DELETE /api/workspaces/:workspaceId/transactions/:id`
- `GET|POST /api/workspaces/:workspaceId/budgets`
- `DELETE /api/workspaces/:workspaceId/budgets/:id`
- `GET|POST /api/workspaces/:workspaceId/goals`
- `POST /api/workspaces/:workspaceId/goals/:id/contributions`
- `GET|POST /api/workspaces/:workspaceId/recurring`
- `POST /api/workspaces/:workspaceId/recurring/:id/record`
- `GET /api/workspaces/:workspaceId/insights`

Transaction list pagination uses `limit`, `cursor`, `category`, and `search`. The cursor encodes the last `(date, id)` pair and must be treated as opaque by clients.
