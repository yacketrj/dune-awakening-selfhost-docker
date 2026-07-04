# Core Release v1.4.0

**Branch**: `release/v1.4.0`
**PR**: [#58](https://github.com/Red-Blink/dune-awakening-selfhost-docker/pull/58)
**Target**: Red-Blink/dune-awakening-selfhost-docker main
**State**: Open

## Scope

Core Docker self-hosting platform release v1.4.0.
Includes modular read-only Discord adapter integration and runtime improvements.

## Included

| Feature | Source |
|---------|--------|
| Modular read-only Discord adapter | release/discord-adapter-readonly |
| Sietch override publisher stability fix | Upstream changes |
| Game update UI with update log panel | Upstream changes |
| Player admin: Repair Vehicle Red Bar action | Upstream changes |
| Journey browser enhancements | Upstream changes |
| Readiness/status dynamic port checks | Upstream changes |
| Database browser table preview filtering | Upstream changes |
| Aggregate login rate limiting | Upstream changes |
| Addon provenance recording | Upstream changes |

## Artifacts

| Artifact | Location |
|----------|----------|
| PR body | `docs/PR-v1.4.0-core-release.md` |

## Security

- Discord adapter disabled by default
- Login rate limiting added
- Addon provenance tracking
- All existing security gates maintained

## Staging Checklist

- [ ] Discord adapter read-only PR merged first
- [ ] All upstream features verified
- [ ] CHANGELOG updated
- [ ] Version bump across all files
- [ ] Release notes complete
- [ ] Security gates pass
- [ ] SBOM and checksums verified
