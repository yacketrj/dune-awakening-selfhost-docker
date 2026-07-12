# Changelog

All notable changes to the `yacketrj/dune-awakening-selfhost-docker` fork.

---

## [Unreleased]

### `feature/rbac-core` — Role-Based Access Control

#### Added
- **RBAC Admin Panel** — web UI for managing role capabilities: select role, toggle 21 capabilities across 9 domains, save to DB
- **Audit log viewer** — sub-tab in RBAC Admin showing 198+ tracked events with actor, action, target, result
- **Dual-write audit** — `auditWrite()` writes to both upstream JSONL file AND `dune.rbac_audit_log` DB table
- **Capability denial logging** — every 403 from `requireRouteCapability` is audited
- **Discord OAuth2 login** — Discord button on login page, OAuth2 callback with tier resolution
- **`prompt=none` OAuth flow** — skips consent screen on subsequent logins, falls back to consent on first auth
- **Faction selector** — Atreides (green), Harkonnen (red), Fremen (blue) theme picker with full CSS variable system
- **User profile** — topbar avatar, username, role badge, sign-out button
- **Discord user profiles table** — `dune.discord_user_profiles` persists username/avatar on each OAuth login
- **Owner-immutable role** — owner always has all 21 capabilities, cannot be modified in RBAC panel
- **Secrets via runtime files** — Discord OAuth credentials load from `runtime/secrets/discord-oauth-*.txt` with env var fallback
- **Architecture docs**: `RBAC-DESIGN.md`, `RBAC-PERMISSIONS.md` (Markdown + PDF)

#### Fixed
- **`resolveSessionCapabilities()`** — now reads `DISCORD_*_ROLE_IDS` env vars as fallback (was passing empty `{}` mapping, causing all Discord users to resolve as "public")
- **`matchRouteCapability()`** — `:param` paths no longer broken by `split(":")` on colons in URL patterns
- **`requireRouteCapability()`** — unregistered routes now ALLOW pass-through (was DENY, blocking all API access behind auth guard)
- **`handleSecureInfraRoute()`** — added missing `await` so capability errors are caught by try/catch
- **OAuth2 scope encoding** — `identify` and `guilds` sent as separate params to fix Discord scope parsing
- **Profile layout** — horizontal `[Avatar] name | role | Sign out` enforced with `!important`
- **DB exports** — restored missing `guildStorageQuery`, `playerOwnedStorageQuery`, `searchItemsInContainers`, `searchItemsInPlayerInventory`

### `fix/graded-item-online-grant` — Item Grade Fix (PR #77)

#### Changed
- **`grantPlayerItem()`** — grade 1-5 items without augments now use live console command (online OK). Only schematics and augmented items require DB path
- **`databaseGrade` fallback** — defaults to 1 when DB path is used but no explicit grade was selected

### `feature/ui-enhancements` — UI & Placeables (PR #76)

#### Changed
- **Icons trimmed** — removed 12 bloated PNGs (16MB total), replaced with single 5KB clean version matching upstream
- **PR split** — removed Care Package, AugmentPicker, CharacterAdminUI changes (already in upstream)

### Infrastructure

- **`deploy-clean-stack.sh`** — repeatable script: clones upstream, applies fix branch, deploys with isolated volumes (separate project `dune-clean-test`, separate DB volume `dune-postgres-data-clean`)
- **`restore-stack.sh`** — restores backed-up volumes and runtime files to switch back to RBAC stack
- **`e2e-clean/`** — isolated clean deploy directory, fully independent from RBAC stack (`e2e-integration/`)
- **Pre-push gates** — 5 security scans + 4 upstream CI mirror checks (`~/.local/bin/pre-push-gates`)
- **Hourly validation** — `validate-and-report.sh` via cron checks fork sync, PR mergeability, CI failures, sends Discord notifications
- **Container name conflicts** — resolved by `docker rm -f` cleanup before every deploy
- **Orchestrator fix** — `command: ["daemon"]` restored (was incorrectly changed to `["dune", "daemon"]` causing `dune dune daemon`)
- **PR cleanup** — all 5 upstream PRs (#75, #76, #71, #69, #13) synced, merge conflicts resolved, CI green

### `feature/augment-upstream` — Pre-Augmented Gear (PR #75)

#### Trimmed
- Removed duplicate `augmentRollCount` (upstream fixed via `addf775`)
- Removed UI changes (already in upstream PR #74)
- Kept `isTemplateAugmentable/isWeaponTemplate/isArmorTemplate` helpers (11 lines)
- Kept `PRE-AUGMENTED-GEAR.md` docs (730 lines)

#### Fixed
- Trailing whitespace in docs (CI security-checks)

---

### `feature/augment-upstream` — Pre-Augmented Gear

#### Added
- **Augmented item stats** — `FAugmentedItemStats` structure with `AppliedAugments`, `AppliedAugmentRollData`, `AppliedAugmentQualities`
- **Schema name stripping** — `_Schematic` suffix removed from augmented item names
- **Per-augment roll count** — `augmentRollCount()` with type defaults (melee=2, others=1)
- **Augment validation** — `isTemplateAugmentable()`, `isWeaponTemplate()`, `isArmorTemplate()`
- **AugmentPicker UI** — chip-based augment selector in Player Tab + CarePackage panel
- **Catalog filter** — schematic-only filter for augmented items
- **Weapon-type filtering** — melee/ranged/armor separation in augment picker
- **Weapon map fallback** — `weaponMap` lowercase sets for item lookup
- **DB trigger** — max roll recalculation on durability change
- **Scraper scripts** — `dev-tools/scrape-augments.js` + `scrape-placeables.js` in addon repo
- **Architecture doc**: `docs/architecture/PRE-AUGMENTED-GEAR.md`

#### Fixed
- Chapter 5 / Off / lowercase augment names now handled in filter
- Weapon-type filter correctly separates melee from ranged
- A-Z sorted augment list in picker

---

### `feature/ui-enhancements` — UI & Quality of Life

#### Added
- **Give Placeables** — category rail (Utilities, Fabricators, Refineries, Storage) with custom icons (normal + selected)
- **Resource requirements** — volume display, `resourceTemplateId()` mapping
- **Inventory validation** — slot count + volume capacity check before granting placeable resources
- **Give Level** — XP table for quick level grants
- **Grant All Research / Crafting / Skills** — confirmation dialogs
- **Building sub-categories** in catalog
- **Grant table auto-width** — adapts to content
- **Inventory display names** — human-readable labels
- **Catalog performance** — results caching
- **Addon-source-link** — neutral gold color, removed faction accent bleed
- **Faction tagger fixes** — removed `*` wildcard and `strong` CSS overrides
- **Architecture doc**: `docs/architecture/UI-ENHANCEMENTS.md`

#### Security
- `actionPlayerId` required (online) for placeable resource grants
- Inventory capacity validation prevents overflow exploits

---

### Infrastructure

- **Pre-push gates** (`~/.local/bin/pre-push-gates`): 5 security scans + 4 upstream CI mirror checks
- **E2E compose**: source mounts for live development (`duneDb.js`, `server.js`, `auth.js`, `config.js`, `deathPoller.js`, `blueprints.js`, `discord/`)
- **Docker image**: `redblink-dune-docker-console:dev`
- **Branch decoupling**: `feature/rbac` (118 commits) split into 3 clean single-concern branches

---

## Upstream Releases

### v1.3.48
- Bridge smoke test + integration test suite
- Economy/activity/resource/combat bridge actions
- Death poller gating behind `DUNE_DEATH_POLLER_ENABLED`
- Defensive column names in activity queries

### v1.3.47
- Blueprint import/export from Solido blueprint JSON
- Augment filter by item type (melee/ranged/armor)
- Augment picker in Care Package + Give Items
- Persistent UID/GID for web console runtime

### v1.3.44 – v1.3.46
- Earlier upstream releases pre-fork

#### Fixed
- **`requireRouteCapability()` pass-through** — unregistered routes now ALLOW (was DENY), fixing all route access behind auth guard. Registered routes still enforce tiered capabilities.
