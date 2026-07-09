# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest | :x:                |

Only the latest release on the default branch receives security updates.

## Reporting a Vulnerability

**Do not open a public issue.** Use GitHub's private vulnerability reporting:

1. Go to the **Security** tab → **Advisories** → **Report a vulnerability**
2. Describe the vulnerability with:
   - Affected component and version
   - Steps to reproduce
   - Potential impact
   - Any known workarounds

We aim to acknowledge reports within 48 hours and provide an initial assessment within 5 business days.

## Scope

This policy covers:

- Console API (Node.js HTTP server)
- Web Console frontend (React/TypeScript)
- Orchestrator (Python/Docker lifecycle)
- Runtime scripts (bash/Python)
- Docker Compose configurations
- Discord adapter integration

Out of scope:

- Third-party Docker images (Ubuntu, Node.js, PostgreSQL, RabbitMQ) — report to the respective vendor
- The Dune: Awakening game client/server binaries — managed by Funcom
- Community addons installed via the addon manager

## Secret Exposure Response

If a secret is committed or exposed:

1. **Rotate immediately**: Regenerate the credential on the responsible service
2. **Revoke the exposed value**: Invalidate the old credential
3. **Clean git history**: Use `git filter-branch` or BFG Repo-Cleaner if the secret was in commit history
4. **Verify**: Confirm no unauthorized access occurred during the exposure window
5. **Post-mortem**: Document the root cause and add a detection rule

## Security Gates

Every pull request and release must pass:

- Semgrep static analysis (482 rules)
- Gitleaks secret detection
- GitGuardian secret scanning (ggshield)
- Trivy filesystem secret scanning
- npm audit (moderate+)
- Unit tests (297 tests)
- API security DAST

No PR may merge with unresolved medium, high, or critical findings.

## Public Repository Notice

This is an open-source community fork. The upstream repository is
[Red-Blink/dune-awakening-selfhost-docker](https://github.com/Red-Blink/dune-awakening-selfhost-docker).
Security fixes should be submitted to both repositories.
