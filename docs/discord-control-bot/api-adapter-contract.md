# Dune Console Discord API Adapter Contract

## Purpose

The Discord API Adapter is the protected server-side boundary between the experimental Discord companion bot and Dune Docker Console.

The adapter scope is read-only:

- Server status, readiness, services, population.
- Logs, map state, backup metadata.
- Infrastructure routes (version, servers, ports, database).
- Player identity linking and inventory visibility.
- Storage container listing and item search.
- Guild storage and item search.
- OPS observability data (activity, combat, resources, economy, inventory, location, SOC, Prometheus, dashboard).
- Broadcast (planned — requires write enablement and admin capability).

The bot must not call broad WebUI routes directly. It must call adapter routes that understand Discord actor context and enforce capability policy server-side.

## Design Requirements

1. The bot authenticates with a dedicated Dune bot API token, not the WebUI admin password.
2. Every request includes Discord actor context.
3. Every route enforces server-side capability authorization.
4. Public-safe responses must not expose internal IPs, SSH hosts, DB URLs, tokens, raw `.env`, stack traces, host paths, or backup filesystem paths.
5. The initial adapter exposes read-only routes only.
6. No destructive, write, credential, Docker lifecycle, database mutation, backup mutation, player mutation, addon mutation, or map mutation routes are in scope.
7. The adapter reuses existing Dune Console backend functions rather than duplicating privileged logic inside the bot.

## Explicitly Forbidden in Experimental Scope

1. Docker socket access from the bot.
2. Direct Postgres access from the bot.
3. Direct Postgres writes from any bot flow.
4. Backup create, restore, delete, import, or delete-all.
5. Player grants, kicks, teleport, refills, resets, or inventory mutation.
6. Broadcasts and shutdown broadcasts.
7. Map, sietch, or deep desert mutations.
8. Addon install, enable, disable, or remove.
9. Secret-setting workflows.
10. Any destructive action.

## Authentication

### Header

```http
Authorization: Bearer <dune-bot-api-token>
```

The token must be loaded by the bot from `DUNE_BOT_API_TOKEN_FILE` and validated server-side by the adapter.

### Rejected Patterns

- WebUI admin password as bot token.
- Discord bot token as Dune API token.
- Browser session cookie as bot auth.
- Query-string token.

## Required Actor Context

Every bot request must include a Discord actor context object.

```json
{
  "actor": {
    "guildId": "123456789",
    "channelId": "234567890",
    "userId": "345678901",
    "username": "admin-user",
    "roleIds": ["456789012"],
    "interactionId": "567890123",
    "commandName": "/dune status"
  }
}
```

## Role Tiers

| Tier | Intended Use |
| --- | --- |
| public | Basic non-sensitive status only. |
| observer | Low-risk status/readiness visibility. |
| moderator | Population, map state, backup metadata, inventory, and guild visibility. |
| admin | Logs, diagnostics, storage, and all read-only visibility. |
| owner | Same read-only access as admin in the experimental phase. |

## Experimental Capability Model

| Capability | Description | Minimum Tier |
| --- | --- | --- |
| `status:read` | Basic health/status visibility | public |
| `readiness:read` | Readiness checks | observer |
| `services:read` | Service list, infra routes, and container status | observer |
| `population:read` | Population summary and online count | moderator |
| `inventory:read` | Personal inventory viewing and search | moderator |
| `guild:read` | Guild storage listing and item search | moderator |
| `maps:read` | Map, sietch, and deep desert read-only status | moderator |
| `backups:read` | Backup list/latest metadata | moderator |
| `logs:read` | Capped, redacted service logs | admin |
| `storage:read` | Storage container listing and container item search | admin |

## Response Classification

| Class | Description | Allowed Fields |
| --- | --- | --- |
| public | Safe in public Discord channels. | High-level status, no internal topology. |
| moderator | Safe for moderator/admin channels. | Population, inventory, guild data with sensitive values removed. |
| admin | Safe only in admin channels or ephemeral admin responses. | Capped logs, diagnostics, storage details, always redacted. |

## Adapter Routes (32 total)

### Core Routes

#### `GET /api/integrations/discord/health`

Purpose: bot connectivity check.

Capability: `status:read`.

Response:

```json
{
  "ok": true,
  "service": "dune-console-discord-adapter",
  "experimental": true,
  "readOnly": true,
  "writesEnabled": false,
  "routes": ["/api/integrations/discord/health", "..."],
  "liveRoutes": ["..."],
  "plannedRoutes": ["..."],
  "rolePolicy": {
    "observerConfigured": true,
    "moderatorConfigured": true,
    "adminConfigured": true,
    "ownerConfigured": false
  }
}
```

#### `POST /api/integrations/discord/status`

Purpose: sanitized stack status for Discord.

Capability: `status:read`.

#### `POST /api/integrations/discord/readiness`

Purpose: readiness checks.

Capability: `readiness:read`.

#### `POST /api/integrations/discord/services`

Purpose: service list and service status summary.

Capability: `services:read`.

Requirement: service names must come from an allowlist or backend-safe source.

#### `POST /api/integrations/discord/population`

Purpose: population summary and online player count.

Capability: `population:read`.

Requirement: public output should be count-only unless detailed output is explicitly role-gated.

#### `POST /api/integrations/discord/logs`

Purpose: capped, redacted service logs.

Capability: `logs:read`.

Requirements:

1. Service name validation.
2. Line limit.
3. Redaction.
4. Admin-channel or ephemeral response recommended.
5. No raw `.env`, tokens, DB URLs, host paths, or stack traces.

#### `POST /api/integrations/discord/map-state`

Purpose: map, sietch, and deep desert read-only state.

Capability: `maps:read`.

#### `GET /api/integrations/discord/backups/list`

Purpose: backup list/latest metadata.

Capability: `backups:read`.

Requirements:

1. No backup create/restore/delete/import/delete-all.
2. No raw filesystem paths in public responses.
3. Output capped and paginated.

### Infrastructure Routes

#### `GET /api/integrations/discord/version`

Purpose: Dune stack version string.

Capability: `services:read` (observer+).

Response: `{ "ok": true, "version": "1.3.41" }`

#### `POST /api/integrations/discord/servers`

Purpose: list game servers.

Capability: `services:read`. Enforced via `validateDiscordActor` + `requireDiscordCapability`.

Actor validation: required. Executes `dune servers` via whitelist. Output capped at 4000 chars.

#### `POST /api/integrations/discord/ports`

Purpose: network port and listener status.

Capability: `services:read`. Enforced via `validateDiscordActor` + `requireDiscordCapability`.

Actor validation: required. Executes `dune ports` via whitelist. Output capped at 4000 chars.

#### `POST /api/integrations/discord/db`

Purpose: database status and health.

Capability: `services:read`. Enforced via `validateDiscordActor` + `requireDiscordCapability`.

Actor validation: required. Executes `dune db status` via whitelist. Output capped at 4000 chars.

### Player Identity Routes

#### `POST /api/integrations/discord/players/link`

Purpose: link a Discord user to a game character (self-claim by character name).

Capability: `inventory:read`.

Request: `{ "actor": {...}, "characterName": "DarkDante" }`

Response: `{ "ok": true, "linked": "DarkDante", "characterName": "DarkDante", "message": "Linked as DarkDante. Use /dune data inventory to view your inventory." }`

Status: table `dune.discord_player_links` created on first call. Link persists across restarts.

#### `POST /api/integrations/discord/players/unlink`

Purpose: remove the Discord-to-character link.

Capability: `inventory:read`.

Response: `{ "ok": true, "message": "Unlinked." }`

#### `POST /api/integrations/discord/players/me`

Purpose: show the currently linked character.

Capability: `inventory:read`.

Response: `{ "ok": true, "linked": true, "characterName": "DarkDante", "controllerId": "1", "pawnId": "3", "onlineStatus": "Offline" }`

### Player Inventory Routes

#### `POST /api/integrations/discord/players/inventory`

Purpose: list the linked player's personal inventory (equipped gear + backpack).

Capability: `inventory:read`. Requires linked identity (`not_linked` 403 if unlinked).

Response: `{ "ok": true, "characterName": "DarkDante", "rows": [...], "count": 59 }`

Each row: `{ "id", "template_id", "stack_size", "quality_level", "position_index", "inventory_id", "current_durability", "max_durability", "stats" }`

#### `POST /api/integrations/discord/players/inventory-search`

Purpose: search the linked player's inventory by item template_id (ILIKE match).

Capability: `inventory:read`. Requires linked identity.

Request: `{ "actor": {...}, "query": "spice" }`

Response: `{ "ok": true, "query": "spice", "rows": [...], "count": 1 }`

### Player Storage Routes

#### `POST /api/integrations/discord/players/storage`

Purpose: list storage containers accessible to the linked player.

Capability: `storage:read`. Requires linked identity.

Request: `{ "actor": {...}, "scope": "owned" }`

Scope values:
- `owned` — only containers the player owns (rank 1 in `permission_actor_rank`)
- `guild` — owned containers + guild containers (player shares a guild with the container owner)

Response: grouped by map with `containerId`, `name`, `class`, `itemCount`.

#### `POST /api/integrations/discord/players/find`

Purpose: search items across the player's accessible storage containers.

Capability: `storage:read`. Requires linked identity.

Request: `{ "actor": {...}, "query": "spice", "scope": "owned" }`

Response: `{ "ok": true, "query": "spice", "matches": [{ "containerId": "...", "containerName": "...", "map": "...", "items": [...] }] }`

### Guild Routes

#### `POST /api/integrations/discord/guilds/storage`

Purpose: list storage containers owned by guild members.

Capability: `guild:read`. Requires linked identity + guild membership.

#### `POST /api/integrations/discord/guilds/find`

Purpose: search items across guild storage containers.

Capability: `guild:read`. Requires linked identity + guild membership.

### OPS Observability Routes

All OPS routes return provider responses from the ops bridge.

| Route | Provider | Capability |
| --- | --- | --- |
| `POST /api/integrations/discord/ops/activity` | `opsActivityProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/combat` | `opsCombatProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/resources` | `opsResourcesProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/economy` | `opsEconomyProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/inventory` | `opsInventoryProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/location` | `opsLocationProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/soc` | `opsSocProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/prometheus` | `opsPrometheusProvider` | `maps:read` |
| `POST /api/integrations/discord/ops/dashboard` | `opsDashboardProvider` | `maps:read` |

### Broadcast Route

#### `POST /api/integrations/discord/broadcast`

Purpose: send a message to in-game players.

Capability: `status:read`. Actor validation enforced.

Status: planned — requires write enablement and game server integration.

### Announcements Route

#### `POST /api/integrations/discord/announcements`

Purpose: server announcements feed.

Capability: `status:read`.

Status: planned — requires game server event bridge.

## Identity Linking Model

The `dune.discord_player_links` table maps Discord user IDs to game character controller IDs.

```
discord_user_id (text PK) | player_controller_id (text) | linked_at (timestamptz)
```

Linking flow:
1. Player runs `/dune data link <character-name>` in Discord
2. Bot sends POST to `/players/link` with actor context + character name
3. Adapter resolves character name to `player_controller_id` via `player_state`
4. Link stored in `discord_player_links` — persists across bot/console restarts

Unlinking removes the row. A player can re-link at any time.

## Permission Model for Storage

Storage container visibility is permission-filtered:

| Scope | Visible Containers |
| --- | --- |
| `owned` | Only containers where the linked player has rank 1 in `permission_actor_rank` |
| `guild` | Owned containers + containers where the owner shares a guild with the linked player |

No admin override or global search. Admins see only their own inventory, same as any player.

## Audit Event Requirements

Every adapter request should be auditable. Read-only requests may use lower-risk audit records, but logs and detailed diagnostics should always be audited.

Required fields:

```json
{
  "source": "discord",
  "discordGuildId": "...",
  "discordChannelId": "...",
  "discordUserId": "...",
  "discordUsername": "...",
  "command": "/dune logs",
  "action": "logs.read",
  "capability": "logs:read",
  "risk": "low|medium",
  "targetType": "service|server|map|backup|population|player|storage|guild",
  "targetId": "...",
  "result": "success|failed|blocked"
}
```

## Error Contract

Errors must be redacted and safe to display.

```json
{
  "ok": false,
  "error": "Not authorized for logs:read.",
  "code": "not_authorized"
}
```

Error codes:

| Code | Meaning |
| --- | --- |
| `missing_bot_token` | No Authorization header |
| `invalid_bot_token` | Token does not match |
| `bot_token_not_configured` | Server-side token is not set |
| `missing_actor` | No actor context in request body |
| `invalid_actor` | Actor fields are missing or invalid |
| `not_authorized` | Actor lacks required capability |
| `not_linked` | Discord user is not linked to a game character |
| `not_read_only` | Capability is not allowed in experimental read-only mode |
| `invalid_scope` | Storage/find scope must be `owned` or `guild` |
| `adapter_disabled` | Discord adapter is not enabled |
| `not_found` | Route not recognized |

Forbidden in errors:

- Raw stack traces.
- Raw SQL errors containing secrets.
- Raw environment variables.
- Discord or Dune tokens.
- Internal DB URLs.
- Funcom token values.
- Internal IPs or SSH hosts.
- Raw host paths.

## DAST Requirements

The adapter must have runtime tests for:

1. Missing token rejected.
2. Invalid token rejected.
3. Missing actor rejected.
4. Unauthorized role rejected.
5. Public status sanitizes internal topology.
6. Diagnostic/log output requires admin capability.
7. Logs are capped and redacted.
8. Backup routes are metadata-only.
9. Infra routes enforce actor validation before execution.
10. Identity routes reject unlinked users.
11. No write/destructive adapter routes are exposed.
12. Secret-like values are redacted from errors and audit details.
