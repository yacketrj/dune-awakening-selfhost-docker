# CHANGELOG & SBOM Process

## CHANGELOG

The CHANGELOG is a living document updated with every meaningful change.
It follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions
and Semantic Versioning.

### When to update

| Trigger | Action |
|---------|--------|
| **Creating a feature branch** | Add planned scope under `## Unreleased` with placeholder entries |
| **Implementing a feature** | Move entries from placeholder to real bullets under Added/Fixed/Changed |
| **Fixing a bug** | Add entry under `### Fixed` in the Unreleased section |
| **Security improvement** | Add entry under `### Security` |
| **Upstream review feedback** | Add findings and resolutions under the relevant section |
| **Cutting a release** | Replace `## Unreleased` with `## vX.Y.Z - YYYY-MM-DD`; add a new empty `## Unreleased` at the top |
| **Upstream PR merges** | Move your entries from Unreleased to the version that was merged |

### Validation

```bash
# Check CHANGELOG is current before pushing
bash scripts/validate-changelog.sh
```

This script verifies:
- CHANGELOG.md exists
- An `## Unreleased` section is present
- The Unreleased section has at least one entry

### Format

```markdown
# Changelog

## Unreleased

### Added

- feat: add player inventory commands with permission filtering

### Fixed

- fix: persist player identity links across console restarts

### Security

- security: enforce actor validation on all infra routes

## v1.3.48 - 2026-07-01
...
```

## SBOM (Software Bill of Materials)

The SBOM is a CycloneDX 1.6 JSON document listing all npm dependencies
with versions, licenses, and integrity hashes.

### When to regenerate

| Trigger | Action |
|---------|--------|
| **`package-lock.json` changes** | Regenerate immediately — the SBOM must match committed lockfiles |
| **Before every release** | Always regenerate as part of `npm run check` |
| **CI on every push** | GitHub Actions generates SBOM as a build artifact |
| **Dependabot PR merges** | SBOM regenerates automatically in CI |

### Generation

```bash
# From repo root
node scripts/generate-sbom.js

# Or from console/api
npm run sbom
```

Output:
- `dist/dune-awakening-selfhost-docker.cdx.json` — CycloneDX SBOM
- `dist/dune-awakening-selfhost-docker.cdx.json.sha256` — SHA-256 checksum

### CI Integration

The `npm run check` command in `console/api` runs both tests and SBOM generation.
The SBOM freshness check runs as a pre-push hook when `package-lock.json` changes.

```bash
# Full check (tests + SBOM)
cd console/api && npm run check
```

### Why both files?

Two lockfiles exist because the API and Web Console are separate npm workspaces:
- `console/api/package-lock.json` — API dependencies (pg)
- `console/web/package-lock.json` — Frontend dependencies (React, Vite, etc.)

The SBOM generator merges components from both into a single document.
Deduplication by `name@version` ensures shared dependencies appear once.

## Release Checklist

Before cutting a release, verify:

- [ ] `CHANGELOG.md` has a dated `## vX.Y.Z` section (not `## Unreleased`)
- [ ] All entries in the release section are accurate
- [ ] SBOM regenerated: `node scripts/generate-sbom.js`
- [ ] SBOM checksum verified
- [ ] Tests pass: 297/297
- [ ] Security gates pass: Semgrep, Gitleaks, Trivy, ggshield
- [ ] Coverage thresholds met: `npm run coverage:check`
- [ ] New `## Unreleased` section added at the top for the next cycle
