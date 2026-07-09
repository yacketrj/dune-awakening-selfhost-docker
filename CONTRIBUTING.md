# Contributing

## Repository Discipline

This is a community fork of [Red-Blink/dune-awakening-selfhost-docker](https://github.com/Red-Blink/dune-awakening-selfhost-docker). The `main` branch **must** stay in sync with upstream/main.

### Where code lives

| Component | Directory | Language |
|-----------|-----------|----------|
| Console API | `console/api/src/` | Node.js (raw HTTP, pg) |
| Web Console | `console/web/src/` | React 18, TypeScript, Vite |
| Database | `console/api/src/duneDb.js` | Parameterized SQL |
| API Routes | `console/api/src/server.js` | Regex path matching |
| Orchestrator | `orchestrator/` | Python, bash |
| Runtime | `runtime/scripts/` | bash, Python |
| Tests | `console/api/test/` | Node.js `node:test` |

## Development Workflow

1. **Fork and branch**: Create a feature branch from `upstream/main`
2. **Develop**: Follow existing patterns — no framework, raw HTTP, parameterized SQL
3. **Test**: Run `node --test console/api/test/*.test.js` — 297 must pass
4. **Security**: Pre-commit hooks run Semgrep, Gitleaks, ggshield, Trivy automatically
5. **PR**: Open against upstream Red-Blink/dune-awakening-selfhost-docker

## Commit Convention

```
type: brief description

feat: add blueprint import/export from Solido JSON
fix: enforce Discord actor/capability on infra routes
docs: update adapter contract for 32 routes
security: add ggshield to pre-commit hooks
test: add augment inventory regression tests
```

Types: `feat`, `fix`, `docs`, `security`, `test`, `refactor`, `chore`, `ci`

## Testing

```bash
# All core tests
cd console/api && node --test test/*.test.js

# Specific test file
node --test test/discordAdapter.test.js

# Security DAST
bash tests/api-security-test.sh
```

## Security Gates (Pre-Commit)

Every commit runs:

| Gate | Tool | What it checks |
|------|------|---------------|
| SAST | Semgrep | 482 security rules |
| Secrets | Gitleaks | Hardcoded credentials |
| Secrets | ggshield | GitGuardian patterns |
| Secrets | Trivy | Filesystem secret scan |
| Format | pre-commit | Whitespace, line endings, merge conflicts |

## Pull Request Checklist

- [ ] Tests pass: `node --test console/api/test/*.test.js`
- [ ] Security gates pass: Semgrep, Gitleaks, Trivy, ggshield
- [ ] No unresolved medium+ security findings
- [ ] `main` branch synced with upstream
- [ ] Branch rebased on upstream/main
- [ ] Breaking changes documented

## Upstream PR Rules

- All PRs must be rebased on `upstream/main`
- Push with `--force-with-lease`
- All tests must pass
- No secrets in commits
- No merge conflicts
