# Changelog

This project follows Semantic Versioning. Release tags align with upstream
Red-Blink/dune-awakening-selfhost-docker releases.

## Unreleased (integration/discord)

### Added

- Discord player inventory + self-claim identity linking (9 routes)
- Storage container listing and item search (permission-filtered)
- Guild storage visibility
- Secure infra routes (version, servers, ports, db) with actor/capability enforcement
- Broadcast route with actor validation + capability check
- Augment limit enforcement (weapons/armor only, game config defaults)
- `clearItemAugments` API endpoint for removing applied augments
- Blueprints tab in Web UI
- Dependabot configuration for automated dependency updates
- DevSecOps artifacts (CODEOWNERS, SECURITY.md, CONTRIBUTING.md, PR template)

### Fixed

- `par.actor_id` → `par.permission_actor_id` in storage queries
- Player identity links persist across console restarts
- Inventory route returns character name (was returning empty)
- Guild storage paths use plural `/guilds/` (was singular `/guild/`)
- Inventory-search path uses dash (`/inventory-search`) not slash (`/inventory/search`)
- Web console UID/GID persistence across container rebuilds
- OPS provider routes restored (were downgraded to planned stubs)

### Security

- All infra routes enforce `validateDiscordActor` + `requireDiscordCapability`
- Broadcast route gated behind actor identity validation
- Storage visibility permission-filtered (rank 1 + guild membership)
- No admin override for inventory/storage (admins see only own items)
- Augments restricted to weapons and armor (server-side + client-side enforcement)
- 297 unit tests + 11 DAST checks passing
