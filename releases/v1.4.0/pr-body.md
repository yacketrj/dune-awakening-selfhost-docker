# Release v1.4.0

## Summary

Core release v1.4.0. Includes the modular read-only Discord adapter integration and improved Docker runtime stability.

## User Impact

Server operators get the modular Discord adapter plus runtime stability improvements.

## Security Impact

- Command surface: new read-only Discord adapter routes
- RBAC or authorization: capability-based RBAC on adapter routes
- Secret handling: bearer-token authentication on adapter
- Data crossing boundaries: sanitized read-only responses
- Network exposure: adapter disabled by default

## Least Privilege

- Discord adapter disabled by default
- Login rate limiting added
- Addon provenance tracking

## Tests and Evidence

- [ ] Adapter tests
- [ ] Docker build
- [ ] Trivy filesystem
- [ ] Trivy image
- [ ] CHANGELOG updated

## Known Limitations

- Discord adapter read-only PR should be merged before this release.

## Sources

- `CHANGELOG.md`
- `docs/discord-control-bot/roadmap.md`
