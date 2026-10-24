# Security notes

## Identity and sessions

- Passwords use Argon2id with a bounded memory and time cost.
- Access tokens expire after fifteen minutes and are held in HTTP-only cookies by default.
- Refresh tokens are opaque, hashed at rest, rotated on use, and tied to a refresh family. Reuse of a revoked token revokes the family.
- Session cookies are `Secure` on HTTPS deployments and use `SameSite=Lax`.
- Authentication endpoints are rate-limited by client address. API calls are rate-limited by client address in this release; setting `REDIS_URL` makes the limiter shared across API instances.

## Request protection

- CORS allows exactly `WEB_ORIGIN` and credentials.
- Mutations require a matching non-HTTP-only CSRF cookie and `X-CSRF-Token` header, plus an allowed `Origin` when a browser supplies one.
- Helmet sets security headers. The app does not render untrusted HTML and React escapes user-provided text.
- Zod schemas reject unknown request keys on sensitive inputs. Database filters are constructed from validated scalar values; user objects are never passed directly to MongoDB filters.
- The API does not fetch user-supplied URLs, so there is no user-controlled outbound HTTP feature. If one is added, use an allowlist, DNS/IP validation, redirect limits, and an egress proxy.
- JSON requests are capped at 1 MB and list queries have explicit limits.

## Data protection

Email addresses are stored as a lookup hash plus AES-256-GCM ciphertext. The encryption key is provided only to the API process. Passwords, refresh tokens, and invitation tokens are stored as one-way hashes or Argon2id encodings.

Financial data is not written to localStorage, sessionStorage, service-worker caches, logs, or error messages. Exports are authorized, bounded, and audited. Account and workspace deletion require exact confirmation text.

## Operational controls

Production refuses to boot without explicit MongoDB, JWT, encryption, HTTPS-origin, and privacy-contact configuration. Request logs contain request IDs, method, path, status, and duration but redact cookies and authorization material. `/health` is liveness; `/ready` verifies the database connection.

The operator must still provide HTTPS, MongoDB network restrictions, secret storage, backup and restoration checks, dependency review, alerting, privacy notices, retention rules, and incident response. This repository does not claim a compliance certification.
