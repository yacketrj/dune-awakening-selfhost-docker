# Dune Discord Companion Bot - Detailed Prioritized Roadmap

## Roadmap Objective

Deliver an experimental Discord companion bot for Dune Docker Console that provides safe, read-only operational visibility first. The initial target is not full WebUI parity. The bot starts with server status, readiness, services, population, logs, map state, and backup list.

Dune Docker Console remains the authority for backend authorization, safety checks, redaction, audit logging, and execution. The bot must call a protected Console API and must not directly control Docker, write to Postgres, store secrets in addon/static files, or execute destructive actions.

## Guiding Principles

1. Security gates first; functionality second.
2. Experimental scope is read-only.
3. Console API owns final authorization and safety checks.
4. The bot must not mount the Docker socket.
5. The bot must not write directly to Postgres.
6. The bot must not execute destructive actions.
7. The bot must not store secrets in addon files, source control, logs, or image layers.
8. Logs must be capped, redacted, and role-gated.
9. Public responses must not expose internal topology or secrets.
10. SOC 2 readiness evidence must be produced as part of normal engineering work.

## Milestone P0.1 - Project Foundation

### Goal

Create the isolated bot workspace and security-first delivery framework.

### Deliverables

- `discord-bot/` workspace.
- Security-gates workflow.
- Feature-priority document.
- Roadmap document.
- Development standards document.
- SOC 2 control matrix.
- Hardened Dockerfile scaffold.
- Secure Compose scaffold.
- Secret scanning script.
- Redaction helper.
- Authorization model.
- Secure config contract.

### Acceptance Criteria

- Branch contains isolated bot workspace.
- Bot does not connect to Discord yet.
- Bot does not expose write commands.
- CI blocks Docker socket references in bot assets.
- CI blocks privileged container mode.
- CI requires lockfile.
- CI executes unit/security tests.
- CI runs SCA, SAST, and container scan gates.
- README states the bot is experimental and read-only first.

### Evidence

- Passing GitHub Actions run.
- Commit diff showing workspace isolation.
- Security-gates documentation.
- Local command output from `npm test`, `npm run security:secrets`, and Docker build.

## Milestone P0.2 - Engineering Standards and Governance

### Goal

Establish development practices required for secure and auditable delivery.

### Deliverables

- Branch strategy.
- PR template.
- CODEOWNERS or reviewer policy.
- Commit and PR naming conventions.
- Definition of Done.
- Security review checklist.
- Threat-model template.
- Architecture Decision Record template.
- Test strategy.
- Release checklist.

### Acceptance Criteria

- Every bot PR includes test evidence.
- Every adapter route PR includes authorization and audit tests.
- Every dependency addition passes dependency review.
- Every Docker or Compose change passes DCA checks.
- Any proposal to add write behavior requires a separate threat model and explicit approval.

### Evidence

- PR template.
- ADR template.
- Threat-model template.
- Security review checklist.

## Milestone P0.3 - Protected Console API Adapter Contract

### Goal

Define the backend API contract before implementing Discord commands.

### Deliverables

- Experimental read-only route inventory.
- Bot API token authentication model.
- Discord actor context schema.
- Role/capability policy schema.
- Audit event schema.
- Error/redaction response contract.
- Public/admin response classification.
- Explicit no-destructive-action contract.

### Acceptance Criteria

- No bot command calls broad WebUI endpoints directly.
- Every adapter route is read-only.
- Every adapter route has a capability requirement.
- Every route has safe error handling.
- Logs route is capped, redacted, and role-gated.
- Backup route exposes list/latest metadata only; no create/restore/delete.

### Evidence

- API contract document.
- Authorization matrix.
- Read-only route matrix.
- Adapter policy tests.
- Sanitization tests.
- Audit event tests.

## Milestone P0.4 - Compliance and Evidence Automation

### Goal

Make evidence generation part of normal CI and release workflows.

### Deliverables

- CI artifact retention policy.
- SBOM generation.
- Dependency vulnerability report.
- Container vulnerability report.
- Test report output.
- Security scan report output.
- Release checklist artifact.
- SOC 2 evidence index.

### Acceptance Criteria

- CI produces evidence for each release candidate.
- Evidence is mapped to SOC 2 control areas.
- Failed gates prevent merge or release.
- Exceptions require documented owner, risk, mitigation, and expiration.

### Evidence

- SBOM artifact.
- SCA report.
- SAST report.
- DCA report.
- DAST report once runtime exists.
- Test reports.
- Release approval record.

## Milestone P1.1 - Bot Client Skeleton

### Goal

Add Discord connection without administrative or destructive functionality.

### Deliverables

- `discord.js` dependency.
- Discord client bootstrap.
- Slash command registration framework.
- Interaction handler.
- Secure logger.
- Rate-limit middleware.
- Safe error formatter.
- `/dune help` command.
- `/dune version` command.

### Acceptance Criteria

- Bot starts with file-based secrets.
- Bot does not log tokens.
- Bot exposes no write commands.
- Bot replies only with sanitized responses.
- Bot handles Discord errors without leaking stack traces.

### Evidence

- Unit tests.
- Redaction tests.
- Secret scan output.
- Local runtime smoke output.

## Milestone P1.2 - Read-Only Status, Readiness, and Services

### Goal

Deliver the first useful read-only operational commands.

### Deliverables

- `/dune status`.
- `/dune health`.
- `/dune readiness`.
- `/dune services`.
- `/dune service status`.
- Public/admin response split.
- Sanitized status output.
- Diagnostic mode for admin/owner only.

### Acceptance Criteria

- Public status does not expose internal IPs, SSH hosts, DB URLs, tokens, raw environment values, or host paths.
- Admin diagnostic status requires admin/owner capability.
- Backend adapter enforces capability checks.
- Service names are validated against an allowlist or backend-safe source.
- Errors are redacted.

### Evidence

- Unit tests.
- Authorization matrix tests.
- DAST auth tests once adapter runs.

## Milestone P1.3 - Read-Only Population and Logs

### Goal

Expose useful server visibility without allowing moderation or mutation.

### Deliverables

- `/dune population`.
- `/dune players online` summary.
- `/dune logs service:<service>`.
- Log line caps.
- Log redaction.
- Role-gated detailed output.

### Acceptance Criteria

- Player details are not posted in public channels unless explicitly configured.
- Population summary can be public-safe.
- Detailed player visibility requires moderator/admin/owner.
- Logs require moderator/admin/owner.
- Logs are capped, redacted, and never include secrets, tokens, raw `.env`, DB URLs, or internal paths.

### Evidence

- Unit tests.
- Authorization tests.
- Redaction tests.
- Response-size tests.

## Milestone P1.4 - Read-Only Map State and Backups

### Goal

Complete the experimental read-only companion scope.

### Deliverables

- `/dune map status`.
- `/dune sietches status`.
- `/dune deepdesert status`.
- `/dune backups list`.
- `/dune backups latest`.

### Acceptance Criteria

- Map state is read-only.
- Backup output is metadata-only.
- No backup create, restore, delete, import, or delete-all endpoints are exposed.
- Backup paths are not exposed in public Discord responses.
- Responses are capped and paginated.

### Evidence

- Route tests.
- Authorization tests.
- Sanitization tests.

## Milestone P2 - Operational Hardening

### Goal

Improve safety and usability before considering any non-read-only behavior.

### Deliverables

- Bot heartbeat dashboard.
- Alerting for status/readiness changes.
- Alerting for backup failure or stale backups.
- Per-command rate limits.
- Public/admin channel mapping.
- WebUI management surface for role/channel mapping.
- Emergency disable flag for all Discord-originated requests.
- SOC 2 evidence review.

### Acceptance Criteria

- Alerts are deduplicated and rate-limited.
- Bot failure does not affect WebUI.
- Evidence package maps to SOC 2 readiness controls.
- Emergency disable can block all bot-originated calls.

## Milestone P3 - Future Review Gate

### Goal

Decide whether to remain read-only or propose limited non-destructive admin conveniences.

### Rule

No write, destructive, credential, database mutation, addon mutation, player mutation, map mutation, or Docker/service lifecycle action may be added without:

1. Separate approval.
2. Threat model update.
3. SOC 2 control matrix update.
4. DAST cases.
5. Confirmation policy.
6. Audit policy.
7. Rollback plan.

## Roadmap Exit Criteria for Experimental Release

The experimental read-only release is complete when:

1. Status, readiness, services, population, logs, map state, and backup list are available through Discord.
2. Every command maps to a read-only capability and role requirement.
3. No write or destructive route exists in the bot or adapter.
4. Logs are capped, redacted, and role-gated.
5. Public responses do not leak internal topology or secrets.
6. SCA, SAST, DCA, DAST, secret scanning, and adapter tests pass.
7. SOC 2 readiness evidence exists for the experimental release.
8. The bot can be disabled without impacting WebUI.
