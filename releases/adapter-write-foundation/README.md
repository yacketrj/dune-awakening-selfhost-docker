# Discord Adapter — Write-Safety Foundation Planning

**Branch**: `release/discord-adapter-write-foundation`
**PR**: [#57](https://github.com/Red-Blink/dune-awakening-selfhost-docker/pull/57)
**Target**: Red-Blink/dune-awakening-selfhost-docker main
**State**: Open (planning only)

## Scope

Planning baseline for write-capable Discord adapter routes.
Not yet implemented.

## Artifacts

| Artifact | Location |
|----------|----------|
| PR body | `docs/PR-discord-adapter-write-foundation.md` |

## Entry Criteria (not yet met)

- [ ] Read-only adapter (release/discord-adapter-readonly) merged and stable
- [ ] Upstream approves write-capable adapter contract
- [ ] STRIDE and abuse-case review completed

## When Implemented

Required foundation:
- Write routes disabled by default (`DUNE_DISCORD_WRITES_ENABLED=false`)
- Write-specific RBAC that observer roles do not inherit
- Capability discovery before route execution
- Confirmation primitives for write operations
- Idempotency key generation and enforcement
- Audit event publishing for all write operations
- Write adapter timeout and retry rules
- Redaction tests for previews, failures, and audit output

## Staging Checklist

- [ ] Planning doc reviewed by upstream
- [ ] Entry criteria tracked
- [ ] Upstream write-contract RFC published
