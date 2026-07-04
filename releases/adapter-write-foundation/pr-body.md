# Discord adapter: write-safety foundation planning

## Summary

Write-safety foundation for the Discord adapter. **Future train — not yet implemented.** Establishes the planning baseline and entry criteria for introducing write-capable Discord adapter routes.

## User Impact

No runtime changes. Documents the foundation required before any write-capable adapter route is implemented.

## Security Impact

- Command surface: unchanged
- RBAC or authorization: write-specific RBAC design documented
- Secret handling: unchanged

## Least Privilege

Write paths disabled by default by design.

## Tests and Evidence

- [ ] Planning review complete

## Known Limitations

- Not yet implemented. Requires upstream write-adapter contract approval.

## Entry Criteria

- [ ] Read-only adapter (release/discord-adapter-readonly) merged and stable
- [ ] Upstream approves write-capable adapter contract
- [ ] STRIDE and abuse-case review completed

## Sources

- `docs/discord-control-bot/roadmap.md`
- `docs/discord-control-bot/api-adapter-contract.md`
