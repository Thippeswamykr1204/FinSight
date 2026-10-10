# Changelog

All notable changes to FinSight are documented here.

The format follows Keep a Changelog, and releases use Semantic Versioning.

## [Unreleased]

### Added

- `npm run preflight` validates a production environment without printing secrets.
- API and worker boot checks for a MongoDB replica set and the Redis eviction policy.
- Operations runbook, deployment topologies and pre/post-deploy checklists.
- CodeQL, dependency review, secret scanning, container vulnerability scanning and
  a tag-driven release workflow with provenance and SBOM.
- Dependabot, issue templates and API coverage thresholds.

### Changed

- GitHub Actions are pinned to commit SHAs and run with least-privilege permissions.
- Production Compose services drop capabilities, set resource limits and rotate logs;
  the API and worker use a read-only root filesystem.
- Render Blueprint declares every required runtime variable.
- Caddy configuration adds security headers, request limits and timeouts.
- Container images carry OCI labels.
- Rewrote the README and contributing guide; renamed the visual QA document.

### Removed

- Unused `FINSIGHT_IMAGE` variable.

## [3.0.0] - 2026-10-08

### Added

- Repository hygiene files, public vulnerability-reporting guidance, and visual
  QA documentation.

### Changed

- Aligned the workspace version metadata at `3.0.0`.
- Published public-facing visual QA guidance.
- Restricted the quality workflow's push trigger to `main`.

### Release notes

- Razorpay billing and Google OAuth are implemented, but hosted-provider
  end-to-end verification remains an operator-dependent release check.
- See the [launch checklist](docs/LAUNCH_CHECKLIST.md) for release verification
  requirements. Free-only operation is recommended until payment-provider
  verification is complete.