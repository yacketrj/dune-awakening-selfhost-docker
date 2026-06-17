# Dune Discord Control Bot - Detailed Prioritized Roadmap

## Roadmap Objective

Deliver a Discord-native operator interface for Dune Docker Console with full WebUI domain coverage, implemented through a security-first delivery model. The bot must remain a client. Dune Docker Console must remain the authority for backend authorization, execution, confirmation enforcement, audit logging, and redaction.

## Guiding Principles

1. Security gates first; functionality second.
2. Server-side authorization is mandatory for privileged actions.
3. The bot must not directly control Docker, Postgres, RabbitMQ, or host files.
4. Read-only parity ships before write parity.
5. Destructive commands require typed confirmation, audit, and rate limiting.
6. Secrets must use file-based runtime secret paths.
7. SOC 2 readiness evidence must be produced as part of normal engineering work.
8. Every milestone must define acceptance criteria and evidence artifacts.

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
- CI blocks Docker socket references in bot assets.
- CI blocks privileged container mode.
- CI requires lockfile.
- CI executes unit/security tests.
- CI runs SCA, SAST, and container scan gates.
- README states no write actions are enabled by default.

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

- Every bot PR must include test evidence.
- Every privileged feature PR must include a threat model update.
- Every backend route PR must include authorization and audit tests.
- Every dependency addition must pass dependency review.
- Every Docker or Compose change must pass DCA checks.

### Evidence

- PR template.
- ADR template.
- Threat-model template.
- Security review checklist.

## Milestone P0.3 - Dune Console Discord API Adapter Contract

### Goal

Define the backend API contract before implementing Discord commands.

### Deliverables

- API route inventory for WebUI parity.
- Discord API adapter route design.
- Bot API token authentication model.
- Discord actor context schema.
- Role/capability policy schema.
- Confirmation token/idempotency schema.
- Audit event schema.
- Error/redaction response contract.
- Public/admin response classification.

### Acceptance Criteria

- No bot command calls existing WebUI endpoints directly without the adapter contract.
- Every adapter route maps to a WebUI capability domain.
- Every adapter route has a capability requirement.
- Every destructive route has confirmation policy.
- Every destructive route has audit policy.
- Every route has safe error handling.

### Evidence

- API contract document.
- OpenAPI or JSON schema draft.
- Authorization matrix.
- Confirmation matrix.
- Audit schema.

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

Add Discord connection without administrative functionality.

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

## Milestone P1.2 - Read-Only Status and Health

### Goal

Deliver low-risk operational visibility.

### Deliverables

- `/dune status`.
- `/dune health`.
- `/dune server status`.
- `/dune server performance`.
- Public/admin response split.
- Sanitized status output.
- Diagnostic mode for owner/admin only.

### Acceptance Criteria

- Public status does not expose internal IPs, SSH hosts, DB URLs, tokens, or raw environment values.
- Admin diagnostic status requires admin/owner capability.
- Backend adapter enforces capability checks.
- Errors are redacted.

### Evidence

- Unit tests.
- Authorization matrix tests.
- DAST auth tests once adapter runs.

## Milestone P1.3 - Read-Only Player and Catalog Domains

### Goal

Deliver the highest-value read-only admin commands.

### Deliverables

- `/dune players online`.
- `/dune players search`.
- `/dune player profile`.
- `/dune item search`.
- `/dune vehicle search`.
- `/dune skill-modules search`.

### Acceptance Criteria

- Player details are not posted in public channels unless configured.
- Moderator/admin roles are required for player lookup.
- Pagination and result limits prevent oversized Discord responses.
- All responses classify sensitive fields.

### Evidence

- Unit tests.
- Authorization tests.
- Redaction tests.

## Milestone P1.4 - Read-Only Backup, DB, Map, Addon, and Settings Domains

### Goal

Complete read-only WebUI parity coverage.

### Deliverables

- `/dune backup list`.
- `/dune backup latest`.
- `/dune backup auto status`.
- `/dune db status`.
- `/dune db schemas`.
- `/dune db tables`.
- `/dune db preview`.
- `/dune db query` for read-only SQL only.
- `/dune maps status`.
- `/dune sietches list`.
- `/dune deepdesert status`.
- `/dune addons community`.
- `/dune addons installed`.
- `/dune settings show` sanitized summary.

### Acceptance Criteria

- Read-only SQL rejects writes.
- DB responses are capped and paginated.
- Settings output is sanitized.
- Addon permission summaries are displayed without enabling/installing addons.

### Evidence

- Read-only SQL tests.
- Response-size tests.
- Authorization tests.

## Milestone P2.1 - Controlled Broadcasts and Backup Create

### Goal

Enable first low/moderate-risk write actions.

### Deliverables

- `/dune broadcast`.
- `/dune shutdown-broadcast`.
- `/dune backup create`.
- Preview-before-send flow.
- Button confirmation flow.
- Audit events.
- Rate limits.

### Acceptance Criteria

- Write actions are disabled unless `DUNE_DISCORD_WRITES_ENABLED=true`.
- Admin or owner role required.
- Confirmation required.
- Audit event emitted.
- Backend adapter enforces authorization and confirmation.

### Evidence

- Authorization matrix tests.
- Confirmation tests.
- Audit tests.
- DAST tests.

## Milestone P2.2 - Controlled Player Admin Actions

### Goal

Add reversible or moderate-risk player actions.

### Deliverables

- `/dune player kick`.
- `/dune player teleport`.
- `/dune player refill-water`.
- `/dune player give-item`.
- `/dune player give-items`.
- `/dune player add-xp`.
- `/dune player set-skill-points`.

### Acceptance Criteria

- Admin or owner role required.
- Target preview includes player ID/name.
- Confirmation required.
- Audit event emitted.
- Rate limits prevent repeated grants.
- Idempotency prevents double-submit.

### Evidence

- Unit tests.
- Integration tests.
- Authorization tests.
- Audit tests.

## Milestone P3.1 - High-Risk Owner-Only Actions

### Goal

Add destructive and high-impact parity features only after lower-risk domains are stable.

### Deliverables

- `/dune db execute`.
- Backup restore/delete/delete-all.
- Player clean inventory.
- Player reset progression.
- Kick all online.
- Map/sietch/deep desert mutation workflows.
- Addon install/enable/disable/remove.

### Acceptance Criteria

- Owner role required.
- Typed phrase confirmation required.
- Backup required where supported.
- Audit event required.
- Multi-step preview required.
- Emergency kill switch overrides all write actions.

### Evidence

- DAST destructive action tests.
- Backup-before-action tests.
- Audit logs.
- Release approval record.

## Milestone P3.2 - Sensitive Settings and Credential Workflows

### Goal

Provide safe parity for sensitive WebUI workflows.

### Deliverables

- Token/password workflows redirect to WebUI or use secure ephemeral modal only.
- No secrets stored in Discord messages.
- No secrets logged.
- Secret rotation guide.
- Token validation status command.

### Acceptance Criteria

- No raw secret accepted in normal channel messages.
- Secret values are never echoed.
- Secret workflows produce audit events without secret content.
- Secret scanner blocks accidental commits.

### Evidence

- Secret redaction tests.
- Manual security review.
- DAST secret leakage tests.

## Milestone P4 - Operational Maturity

### Goal

Make the bot maintainable as part of the Dune Docker Console ecosystem.

### Deliverables

- WebUI bot management page.
- Discord role/channel mapping UI.
- Bot heartbeat and health dashboard.
- Per-command enable/disable toggles.
- Multi-admin approval for critical commands.
- Signed releases.
- Release SBOM.
- Image provenance.
- Service addon proposal.

### Acceptance Criteria

- Owners can review bot status in WebUI.
- Critical actions can require two-person approval.
- Release artifacts are signed and traceable.
- Evidence package supports SOC 2 readiness.

## Roadmap Exit Criteria

The roadmap is complete when:

1. Every WebUI domain has a Discord command or a documented safe exception.
2. Every command maps to a capability and role requirement.
3. Every write command has confirmation, audit, and rate limiting.
4. Every release passes SCA, SAST, DCA, DAST, and secret scanning.
5. Evidence exists for SOC 2 control mapping.
6. The bot can be disabled without impacting the WebUI.
