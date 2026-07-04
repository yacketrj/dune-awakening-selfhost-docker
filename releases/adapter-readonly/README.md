# Discord Adapter — Read-Only Integration

**Branch**: `release/discord-adapter-readonly`
**PR**: [#56](https://github.com/Red-Blink/dune-awakening-selfhost-docker/pull/56)
**Target**: Red-Blink/dune-awakening-selfhost-docker main
**State**: Open

## Scope

Modular read-only Discord adapter extracted from `feature/discord-control-bot`.
8 integration modules, 2 launcher scripts, comprehensive test suite, full documentation.

## Included Modules

| Module | Purpose |
|--------|---------|
| `adapter.js` | Core adapter with capability-based routing |
| `routes.js` | Route registration and capability binding |
| `policy.js` | RBAC policy evaluation |
| `audit.js` | Audit event schema and publishing |
| `redact.js` | PII and secret redaction |
| `fixtures.js` | Test fixtures and mock data |
| `health.js` | Adapter health endpoint |
| `config.js` | Configuration schema and defaults |

## Artifacts

| Artifact | Location |
|----------|----------|
| PR body | `docs/PR-discord-adapter-readonly.md` |
| Project docs | `docs/discord-control-bot/` |
| Adapter contract | `docs/discord-control-bot/api-adapter-contract.md` |
| Roadmap | `docs/discord-control-bot/roadmap.md` |
| Setup guide | `docs/discord-control-bot/setup-guide.md` |
| User guide | `docs/discord-control-bot/user-guide.md` |

## Security Controls

- Discord adapter disabled by default (`DUNE_DISCORD_ADAPTER_ENABLED=false`)
- Bearer-token authentication on every route
- Capability-based RBAC
- All routes read-only
- Audit event publishing
- PII/secret redaction
- Bounded response size

## Staging Checklist

- [ ] Modular adapter code reviewed
- [ ] All routes read-only verified
- [ ] RBAC matrix complete
- [ ] Audit schema documented
- [ ] Redaction tests pass
- [ ] Launcher scripts tested
- [ ] Setup guide verified
- [ ] No unresolved security findings
