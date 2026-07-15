# Project Requirements

**Version:** 1.0
**Last Updated:** 2026-07-15
**Branch:** feature/p0-critical-testing

## Pre-Push Gate Requirements

All branches must pass the following gates before pushing to any remote:

### Security Scans (5/5 required)
1. **ggshield** - Secret detection (GitGuardian)
2. **gitleaks** - Secret detection (alternative scanner)
3. **trivy** - Filesystem vulnerability scanning
4. **semgrep** - Static code analysis
5. **npm audit** - Node.js dependency vulnerabilities

### Full CLI Test Suite (required for all branches with tests/)
- **dune-cli-test.sh** - Core CLI functionality (25 tests)
- **api-security-test.sh** - API security validation
- **bridge-smoke-test.sh** - Bridge connectivity (exits 2 if addon not installed)
- **container-lifecycle-test.sh** - Container lifecycle management
- **ready-configured-ports-test.sh** - Port configuration validation
- **update-db-role-privilege-test.sh** - Database role privilege checks

**Exit codes:**
- `0` = PASS
- `2` = SKIP (prerequisites not met, e.g., addon not installed)
- `1` or other = FAIL (blocks push)

### Upstream CI Mirror (required for feature/*, fix/*, integration/*, release/*, main/* branches)
1. **api-tests** - Node.js API test suite
2. **metrics-unit** - Metrics stack unit tests
3. **security-checks** - Security PR validation (whitespace, conflict markers, etc.)
4. **CHANGELOG** - Changelog validation

### Code Quality (required for all branches)
1. **artifact-guard** - Prevents generated files from being committed
2. **web build** - Web UI build validation

## Pre-Commit Requirements

All commits must pass pre-commit hooks:
- JSON/YAML validation
- Merge conflict detection
- Line ending normalization (LF)
- End-of-file fixing
- Trailing whitespace removal
- Secret detection (ggshield, gitleaks)
- Vulnerability scanning (trivy)
- Static analysis (semgrep)

**Note:** Upstream test files with known findings are excluded via `.semgrepignore` and explicit `--exclude` flags in `.pre-commit-config.yaml`.

## Branch Naming Convention

- `feature/*` - New features
- `fix/*` - Bug fixes
- `integration/*` - Integration work
- `release/*` - Release preparation
- `main` - Production branch

## Commit Message Format

Follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/modifications
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

## Local PR Requirements

Before creating a PR:
1. All pre-push gates must pass
2. All tests must pass (or be explicitly skipped with exit code 2)
3. No trailing whitespace or conflict markers in changed files
4. CHANGELOG.md must be updated for user-facing changes
5. Documentation must be updated for new features

## Upstream PR Requirements

Before submitting to upstream (Red-Blink/dune-awakening-selfhost-docker):
1. Branch must be based on latest `upstream/main`
2. All pre-push gates must pass
3. All upstream CI checks must pass
4. No merge conflicts with upstream/main
5. Single-commit PRs preferred (squash if needed)
6. PR description must include:
   - What changed
   - Why it changed
   - How it was tested
   - Any breaking changes

## Blueprint System Implementation

The blueprint import/export system uses **direct SQL INSERT statements** into the database, not the game's `blueprint_copy` function.

**Tables modified:**
- `dune.building_blueprints` - Blueprint metadata
- `dune.building_blueprint_instances` - Building piece instances
- `dune.building_blueprint_placeables` - Placeable items
- `dune.building_blueprint_pentashields` - Pentashield configurations

**Implementation details:**
- All inserts happen within a single database transaction
- Player must be offline (encrypted state is authoritative)
- Blueprint item is added to player inventory
- Stats JSON includes `PlayerBaseBackupId: {}` to match live solido format
- Instance IDs start at 0 (matching game format)
- Hologram flag set to `true` for imported blueprints

**Why direct inserts instead of `blueprint_copy`:**
- Full control over import process and error handling
- Supports multi-file imports and deduplication
- Allows online players with relog warning
- Handles missing building pieces gracefully
- Compatible with blueprint export format

## Security Requirements

- No secrets in code (use environment variables)
- No hardcoded credentials
- All user input must be validated/sanitized
- SQL queries must use parameterized statements
- File operations must check permissions
- Container operations must respect UID/GID

## Testing Requirements

- All new features must include tests
- Test coverage should not decrease
- Tests must be deterministic (no flaky tests)
- Tests must clean up after themselves
- Exit code 2 for skipped tests (prerequisites not met)

## Migration Requirements

For version updates:
- `runtime/scripts/migrate.sh` must be run before self-update
- Breaking changes must be detected and warned
- Config files must be migrated automatically
- Database migrations must be idempotent
- Large version jumps (>3 minor versions) require confirmation

## Documentation Requirements

- All public APIs must be documented
- Breaking changes must be documented in CHANGELOG.md
- New features must have user-facing documentation
- Architecture decisions must be documented in ARCHITECTURE.md
- Troubleshooting guides must be updated for new error conditions
