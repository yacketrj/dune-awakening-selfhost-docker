# Dune Discord Companion Bot - Admin Guide

## Purpose

This guide is for server owners and administrators configuring the experimental read-only Discord companion bot.

The bot is not the authority. Dune Docker Console remains responsible for final authorization, safety checks, redaction, audit logging, and execution.

## No Write Actions

The experimental bot has no write-capable command surface.

The bot cannot:

- Mount or use the Docker socket.
- Write directly to Postgres.
- Run database mutations.
- Create, restore, import, or delete backups.
- Grant items, teleport, kick, refill, or mutate players.
- Mutate map state, sietch state, or Deep Desert state.
- Enable, disable, install, or remove addons.
- Send broadcasts.
- Store runtime secrets in source control, addon files, static files, logs, or image layers.

## Role Mapping

Configure Discord role IDs in both the Console adapter runtime and the bot runtime.

| Tier | Environment variable | Intended access |
|---|---|---|
| Observer | `DISCORD_OBSERVER_ROLE_IDS` | Readiness and services |
| Moderator | `DISCORD_MODERATOR_ROLE_IDS` | Population, maps, backups, inventory, guild data |
| Admin | `DISCORD_ADMIN_ROLE_IDS` | Detailed status, redacted logs, storage listing, item search |
| Owner | `DISCORD_OWNER_ROLE_IDS` | Same read-only access as admin in the experimental phase |

For local smoke tests, placeholder values are acceptable as long as both processes use the same values.

Example:

```bash
DISCORD_OBSERVER_ROLE_IDS=role-observer
DISCORD_MODERATOR_ROLE_IDS=role-moderator
DISCORD_ADMIN_ROLE_IDS=role-admin
DISCORD_OWNER_ROLE_IDS=role-owner
```

For production Discord use, replace those placeholders with real Discord role snowflake IDs.

## All Commands

### Core

| Command | Minimum role |
|---|---|
| `/dune core about` | Public |
| `/dune core ping` | Public |
| `/dune core help` | Public |
| `/dune core setup` | Public |

### Server

| Command | Minimum role | Notes |
|---|---|---|
| `/dune server health` | Public | Shows adapter health and configured role-policy booleans. |
| `/dune server status` | Public | Public redacted status output. |
| `/dune server status diagnostic:true` | Admin | Detailed status output. Ephemeral by default. |
| `/dune server summary` | Public | Compact aggregate status. |
| `/dune server readiness` | Observer | Readiness summary. |
| `/dune server readiness diagnostic:true` | Admin | Detailed readiness checks. |
| `/dune server services` | Observer | Friendly service summary. |

### Data

| Command | Minimum role | Notes |
|---|---|---|
| `/dune data population` | Observer | Aggregate player count. |
| `/dune data backups` | Observer | Recent backup metadata (read-only). |
| `/dune data maps` | Observer | Active game maps with state and uptime. |
| `/dune data link` | Public | Links Discord user to game character. |
| `/dune data unlink` | Public | Removes the link. |
| `/dune data whoami` | Public | Shows linked character info. |
| `/dune data inventory` | Moderator | Personal inventory listing. Requires linked identity. |
| `/dune data inventory search:<item>` | Moderator | Search inventory by item name. |
| `/dune data storage` | Admin | Owned storage containers grouped by map. |
| `/dune data storage scope:guild` | Admin | Adds guild containers. |
| `/dune data find <item>` | Moderator | Search items across accessible containers. |
| `/dune data find <item> scope:guild` | Moderator | Search items across guild containers. |

### OPS

| Command | Minimum role |
|---|---|
| `/dune ops activity` through `/dune ops dashboard` | Observer |

### Admin

| Command | Minimum role |
|---|---|
| `/dune admin doctor` | Admin |
| `/dune admin cooldowns` | Admin |
| `/dune admin latency` | Admin |
| `/dune admin events` | Admin |
| `/dune admin broadcast` | Admin (requires write enablement) |

### Infrastructure

| Command | Minimum role | Notes |
|---|---|---|
| `/dune infra version` | Observer | Dune stack version via `config.version`. |
| `/dune infra servers` | Observer | Game server listing. Actor validation enforced. |
| `/dune infra ports` | Observer | Network port status. Actor validation enforced. |
| `/dune infra db` | Observer | Database health. Actor validation enforced. |

## Identity Linking Administration

The `dune.discord_player_links` table stores the Discord-to-character mapping:

```sql
SELECT discord_user_id, player_controller_id, linked_at
FROM dune.discord_player_links;
```

The table is auto-created on the first `/dune data link` call. Links persist across bot and console restarts.

### Troubleshooting Links

- Player sees "not linked" after successful link: verify both sides are using the same `discordUserId` (it's the Discord snowflake from `interaction.user.id`)
- Link was overwritten: a new link for the same character replaces any prior link
- Table is empty after rebuild: the table is auto-created but a `DROP TABLE` or fresh database loses links

## Storage Visibility

Storage visibility is permission-filtered server-side:

| Scope | Visible To |
|---|---|
| `owned` | Linked player with rank 1 in `permission_actor_rank` for the container |
| `guild` | Linked player who shares a guild with the container owner |

There is no admin override. All players — including admins — see only their own containers and guild containers.

## Public Status

Public status is intentionally concise. It excludes internal addresses, SSH hosts, database URLs, host paths, raw environment values, tokens, and sensitive topology.

## Detailed Status

Detailed Status is for admin/owner use only.

It may include more operational context such as parsed services, listeners, maps, issues, and capped redacted command output. It remains redacted and should be ephemeral in Discord.

## Health and Role-Policy Verification

Use health to confirm the Console adapter has role mapping loaded:

```bash
curl -i \
  -H 'Authorization: Bearer local-dev-bot-api' \
  http://127.0.0.1:8088/api/integrations/discord/health
```

Expected role policy shape:

```json
{
  "rolePolicy": {
    "observerConfigured": true,
    "moderatorConfigured": true,
    "adminConfigured": true,
    "ownerConfigured": false
  }
}
```

The values only indicate whether a tier is configured. Role IDs are not exposed.

## Common Admin Issue: 403 Authorization

If readiness, services, or detailed status returns `403`, check both sides:

1. The bot process must send the expected role ID in `actor.roleIds`.
2. The Console adapter process must be started with the matching `DISCORD_*_ROLE_IDS` value.

## Common Admin Issue: 403 Not Linked

If inventory, storage, or find returns `not_linked`, the Discord user has not linked to a game character. They must run `/dune data link <name>` first.

To view all links:

```sql
SELECT * FROM dune.discord_player_links;
```

## Common Admin Issue: 500 Storage Queries

If storage routes return `column par.actor_id does not exist`, the `permission_actor_rank` table uses `permission_actor_id` (not `actor_id`). This was fixed in the integration branch.

## SOC 2 Readiness

Admins should treat this bot as a privileged operational visibility plane even though it is read-only.

Required recurring checks:

- Review role mappings monthly and before release.
- Review SOC 2 readiness workflow results weekly.
- Confirm secret scans remain passing.
- Confirm public responses do not expose internal topology.
- Document any exception with owner, risk, mitigation, and expiration.
