# Release Staging Index — Core Docker

Staging area for upstream PRs organized by release train.
Each subdirectory contains the PR artifacts for that release.

## Release Train Manifest

| Train | Scope | PR | Branch | Status |
|-------|-------|----|--------|--------|
| v1.4.0 | Core release including Discord adapter | [#58](https://github.com/Red-Blink/dune-awakening-selfhost-docker/pull/58) | `release/v1.4.0` | Open |
| Adapter RO | Modular read-only Discord adapter | [#56](https://github.com/Red-Blink/dune-awakening-selfhost-docker/pull/56) | `release/discord-adapter-readonly` | Open |
| Adapter WF | Write-safety foundation planning | [#57](https://github.com/Red-Blink/dune-awakening-selfhost-docker/pull/57) | `release/discord-adapter-write-foundation` | Open |

## Artifacts per PR

Each release PR directory contains:
- PR body documentation
- Reference to related docs
- Staging checklist

## Staging Rules

1. **Read-only first**: Adapter read-only must be reviewed before any write work
2. **Upstream alignment**: All releases target Red-Blink/dune-awakening-selfhost-docker main
3. **Security**: Discord adapter disabled by default, bearer-token authenticated, RBAC-enforced
4. **Modular**: Each adapter feature is a separate route module with capability-based access
