# Contributing

Thank you for helping improve FinSight. This guide covers setup, conventions and
what a pull request must include.

## Setup

Requirements: Node.js 22 (see `.nvmrc`), npm 10+, and Docker for the local stores
and integration tests.

```sh
npm ci
npm run env:init                       # creates .env with unique local secrets (never commit it)
docker compose up --build -d --wait    # web, API, worker, MongoDB, Redis, Mailpit
docker compose stop web api            # then run those two from source
npm run shared:build
npm run dev:hosted
```

Web runs on <http://localhost:3000>, the API on port 4000 and local mail on 8025.
Rebuild shared code with `npm run shared:build` after editing `packages/shared`.

## Principles

- Money is integer paise and dates are ISO calendar dates. Do not introduce floats.
- Tenant boundaries and role checks are enforced in the API; never trust a
  caller-provided user or workspace ID.
- Database changes are additive and idempotent.
- Secrets never enter source, logs, build arguments or screenshots.

## Workflow

1. Open an issue for anything larger than a small fix.
2. Branch from `main` and keep changes focused.
3. Use [Conventional Commits](https://www.conventionalcommits.org) for messages
   (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
4. Add or update tests with the change. Financial, authentication, billing and
   configuration changes require regression coverage.
5. Update documentation and `CHANGELOG.md` when behavior changes.

## Checks to run before opening a pull request

```sh
npm run format:check
npm run check             # lint, typecheck, coverage, API tests, integration tests, build
```

For changes that touch the browser experience or deployment, also run the browser
suite and the container smoke test with Docker available:

```sh
E2E_PRODUCTION=1 npm run test:e2e
docker compose up --build -d --wait && curl --fail http://localhost:4000/ready
docker compose down -v
```

## Review expectations

A pull request is ready when CI is green, the description explains the user-visible
effect and the risk, and the diff contains no unrelated formatting or dependency
churn. New dependencies need a one-line justification.

## Reporting vulnerabilities

Do not open a public issue. Follow [SECURITY](SECURITY.md).