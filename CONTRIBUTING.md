# Contributing

Open a focused issue or pull request explaining the user-visible change.
Keep integer-paise invariants, tenant boundaries and applied migrations intact.
Use additive hosted migrations and representative fixtures for financial formats.
Run `npm run check` and `npm run format:check` before submitting.
After building, run `E2E_PRODUCTION=1 npm run test:e2e` and `E2E_PRODUCTION=1 npm run test:hosted` with Docker available.
Include meaningful regression coverage for changed financial or security behavior.
Use fictional records in screenshots; never commit credentials or customer data.
Report vulnerabilities privately using [SECURITY](docs/SECURITY.md).
