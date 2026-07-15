# Project Requirements

This document outlines the strict requirements that must be followed for all development work on this project.

## Pre-Commit Requirements

All commits must pass the following pre-commit hooks (defined in `.pre-commit-config.yaml`):

### Code Quality
- `check-json` - Validate JSON syntax
- `check-yaml` - Validate YAML syntax
- `check-merge-conflict` - Check for merge conflict markers
- `mixed-line-ending` - Ensure consistent line endings (LF)
- `end-of-file-fixer` - Ensure files end with newline
- `trailing-whitespace` - Remove trailing whitespace

### Security Scanning
- `gitleaks` - Scan for hardcoded secrets and credentials
- `ggshield` - GitGuardian secret scanning
- `trivy` - Vulnerability scanning (HIGH, CRITICAL severity)
- `semgrep` - Static application security testing (SAST)
- `security-pr-checks` - Custom security checks for console, runtime, docker-compose, and .env files

**Important:** Never use `--no-verify` to bypass pre-commit hooks. All commits must pass all checks.

## Branch Creation Requirements

Before creating any new branch:

1. **Ensure you're on the correct base branch**
   - For features: `git checkout feature/blueprints-ui`
   - For hotfixes: `git checkout main` or appropriate hotfix branch

2. **Pull latest changes**
   ```bash
   git pull origin <base-branch>
   ```

3. **Run all tests locally**
   ```bash
   cd console/api && npm test
   ```

4. **Run security checks**
   ```bash
   bash tests/security-pr-checks.sh
   ```

5. **Create branch from clean state**
   ```bash
   git checkout -b feature/<feature-name>
   ```

## Local PR Requirements

Before creating a local PR (pushing to your fork):

1. **Run all tests**
   ```bash
   cd console/api && npm test
   ```

2. **Run security checks**
   ```bash
   bash tests/security-pr-checks.sh
   ```

3. **Run OWASP security tests**
   ```bash
   cd console/api && npm test -- test/blueprints-security.test.js
   ```

4. **Run CLI tests**
   ```bash
   cd tests && bash dune-cli-test.sh --fast
   ```

5. **Verify all pre-commit hooks pass**
   ```bash
   pre-commit run --all-files
   ```

6. **Push to fork**
   ```bash
   git push origin <branch-name>
   ```

## Upstream PR Requirements

Before creating an upstream PR (PR to Red-Blink/dune-awakening-selfhost-docker):

1. **All local PR requirements must pass**

2. **Verify CI passes on your fork**
   - Check GitHub Actions on your fork
   - All jobs must pass: api-tests, metrics-unit, security-checks, api-dependency-audit

3. **Verify no merge conflicts**
   ```bash
   git fetch upstream
   git merge upstream/main
   # Resolve any conflicts
   ```

4. **Run full test suite one more time**
   ```bash
   cd console/api && npm test
   bash tests/security-pr-checks.sh
   ```

5. **Create PR with proper description**
   - Clear description of changes
   - Link to related issues
   - List all tests that were run
   - Note any breaking changes

## Never Use These Arguments

The following arguments should **never** be used as they bypass important checks:

- `--no-verify` - Bypasses pre-commit hooks
- `--no-edit` - Bypasses commit message editing (use only for merge commits)
- `--force` - Force push (use only when absolutely necessary and with caution)
- `--force-with-lease` - Safer force push, but still use with caution

## Security Requirements

1. **Never commit secrets or credentials**
   - Use environment variables
   - Use `.env` files (not committed)
   - Use secret scanning tools (gitleaks, ggshield, trivy)

2. **Validate all inputs**
   - Validate all user inputs before database operations
   - Use parameterized queries (never concatenate SQL strings)
   - Check player is offline before admin changes

3. **Use stored procedures**
   - Never modify `encrypted_player_state` directly
   - Use stored procedures for all game state changes
   - Use parameterized queries for all database operations

4. **Audit all admin actions**
   - All admin actions must be logged to `event_log`
   - Include player ID, action type, and timestamp

## Testing Requirements

### Test Coverage

| Test Type | Count | Purpose |
|-----------|-------|---------|
| Unit Tests | 52 | Blueprint import/export, faction management |
| Integration Tests | 20 | End-to-end blueprint import/export |
| Security Tests | 27 | OWASP Top 10 security checks |
| CLI Tests | 20 | Admin CLI command tests |
| **Total** | **97** | **Comprehensive coverage** |

### Running Tests

```bash
# Run all tests
cd console/api && npm test

# Run specific test suite
npm test -- test/blueprints.test.js

# Run security tests
npm test -- test/blueprints-security.test.js

# Run CLI tests
cd tests && bash dune-cli-test.sh --fast
```

## Branch Naming Convention

- Features: `feature/<feature-name>`
- Hotfixes: `hotfix/<issue-number>-<description>`
- Releases: `release/v<version>`
- Documentation: `docs/<description>`

## Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `security`: Security improvements

## PR Review Checklist

Before merging any PR:

- [ ] All tests pass (unit, integration, security, CLI)
- [ ] All pre-commit hooks pass
- [ ] No merge conflicts
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] Security checks pass
- [ ] No secrets or credentials committed
- [ ] Breaking changes are documented
- [ ] Performance impact is acceptable
- [ ] Backward compatibility is maintained

## Conclusion

These requirements ensure code quality, security, and reliability. All developers must follow these requirements for all development work. Never use `--no-verify` or other bypass arguments. All commits must pass all checks.
