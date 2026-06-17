# Dune Discord Control Bot - Security Gates

## Purpose

The Discord control bot creates a Discord-accessible administration surface for Dune Docker Console. Because the target end state is WebUI functional parity, security controls are release blockers, not optional hardening.

This document defines required SCA, SAST, DCA, and DAST controls for the bot, the Dune Console Discord API adapter, and any addon UI that manages the integration.

## Gate Summary

| Gate | Scope | Blocking Conditions |
| --- | --- | --- |
| Secrets | Source, logs, images, release artifacts | Any verified token, password, private key, database URL, or Funcom token leak |
| SCA | Dependencies and licenses | Critical/high exploitable dependency, missing lockfile, disallowed license |
| SAST | Source code | Auth bypass, command injection, SQL injection, path traversal, unsafe secret logging |
| DCA | Dockerfiles, Compose, images | Docker socket in bot, privileged mode, root runtime, critical/high image CVE |
| DAST | Running API and bot flows | Unauthorized admin action, missing confirmation, secret leakage, read-only bypass |
| Authorization | Discord roles and backend policy | Client-only authorization, missing backend authorization, stale role use |
| Audit | All state-changing actions | Missing audit event for any destructive or privileged operation |

## SCA - Software Composition Analysis

### Required Controls

1. Dependency vulnerability scanning on every pull request.
2. Lockfile required for each package manager workspace.
3. Dependency pinning; no floating major versions in release builds.
4. SBOM generation for releases.
5. License policy checks.
6. Dependabot or Renovate for dependency update pull requests.
7. Transitive dependency visibility.
8. Dependency review for new packages.

### Blocking Conditions

- Critical exploitable vulnerability.
- High exploitable vulnerability without approved exception.
- Missing lockfile when package dependencies exist.
- Disallowed license.
- Missing release SBOM.

## SAST - Static Application Security Testing

### Required Controls

1. CodeQL or equivalent static analysis.
2. Semgrep security rules.
3. ESLint security rules for TypeScript.
4. Secret scanning.
5. ShellCheck for shell scripts.
6. SQL safety rules for raw SQL construction.
7. Command execution rules for shell/process execution.
8. Route authorization checks for the Discord API adapter.
9. Redaction checks for all logs and errors.

### High-Risk Patterns to Block

```text
child_process.exec(...)
spawn(..., { shell: true })
template-built shell commands
raw SQL concatenation from Discord/user input
file paths derived from Discord input without allowlist validation
logging request bodies, headers, environment variables, or secrets
backend routes without authorization middleware
bot-only authorization for privileged actions
```

## DCA - Docker/Container Analysis

### Required Controls

1. Dockerfile linting.
2. Container image vulnerability scanning.
3. Base image pinning.
4. Non-root container user.
5. No Docker socket mount in the bot container.
6. No privileged mode.
7. Drop Linux capabilities.
8. Read-only filesystem where practical.
9. Minimal host mounts.
10. Runtime secrets mounted as files.
11. Healthcheck required.
12. Signed image and release SBOM.

### Blocking Conditions

- Bot container mounts `/var/run/docker.sock`.
- Bot container uses `privileged: true`.
- Bot container runs as root without an approved exception.
- Critical/high exploitable image vulnerability.
- Secret baked into image layer.
- Broad writable host mount.
- Floating base image in release Dockerfile.

## DAST - Dynamic Application Security Testing

### Required Controls

1. Authenticated scan of Discord API adapter endpoints.
2. Unauthenticated access tests.
3. Authorization matrix tests for Observer, Moderator, Admin, Owner.
4. Destructive confirmation tests.
5. Rate-limit tests.
6. Replay/idempotency tests for Discord buttons and modals.
7. Secret leakage tests against API responses and logs.
8. Error redaction tests.
9. API fuzzing for user-controlled fields.
10. Read-only SQL enforcement tests.

### Blocking Conditions

- Privileged endpoint works without valid bot API token.
- User can exceed Discord role capability.
- Destructive action succeeds without confirmation.
- Secret appears in response, logs, or Discord message.
- Read-only SQL endpoint accepts write SQL.
- Command injection or path traversal is possible.
- Missing rate limits on destructive endpoints.

## Required Runtime Controls

1. Dedicated Dune bot API token separate from WebUI admin password.
2. Server-side Discord actor authorization.
3. Command-level rate limits.
4. Idempotency keys for state-changing interactions.
5. Structured audit events.
6. Central redaction library.
7. Public/admin response classification.
8. Emergency kill switch for Discord-originated write actions.

## Minimum Release Criteria

A release candidate may not ship unless all of the following are true:

```text
[BLOCK] No verified secrets in source, logs, images, or release artifacts.
[BLOCK] No critical/high exploitable dependency vulnerabilities.
[BLOCK] No critical/high SAST findings.
[BLOCK] Bot image does not run as root.
[BLOCK] Bot image does not mount Docker socket.
[BLOCK] Bot image is not privileged.
[BLOCK] All destructive commands have confirmation tests.
[BLOCK] All destructive commands emit audit events.
[BLOCK] Authorization matrix tests pass.
[BLOCK] Redaction tests pass.
[BLOCK] Release image has SBOM and is signed.
```
