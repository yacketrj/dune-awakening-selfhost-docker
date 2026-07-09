# Dune Discord Companion Bot - User Guide

## Purpose

The Dune Discord Companion Bot gives safe read-only visibility into Dune Docker Console from Discord.

It does not perform server mutations, player actions, database writes, backup restores, or Docker control actions.

## Commands

### Core Commands

| Command | Who can use it | What it shows |
|---|---|---|
| `/dune core about` | Public | Safe bot and adapter metadata. |
| `/dune core ping` | Public | Discord and adapter latency. |
| `/dune core help` | Public | Available commands for your role. |
| `/dune core setup` | Public | How to add this bot to your Discord server. |

### Server Commands

| Command | Who can use it | What it shows |
|---|---|---|
| `/dune server health` | Public | Whether the Console adapter is online and read-only. |
| `/dune server status` | Public | Public status summary for the server. |
| `/dune server status diagnostic:true` | Admin | Detailed status with container table. |
| `/dune server summary` | Public | Compact aggregate server status. |
| `/dune server readiness` | Observer+ | Whether server components appear ready. |
| `/dune server readiness diagnostic:true` | Admin | Detailed readiness checks. |
| `/dune server services` | Observer+ | Friendly service status summary. |

### Data Commands

| Command | Who can use it | What it shows |
|---|---|---|
| `/dune data population` | Observer+ | Aggregate player count and server population. |
| `/dune data backups` | Observer+ | Recent backup metadata (read-only). |
| `/dune data maps` | Observer+ | Active game maps with state and uptime. |
| `/dune data link <character>` | Everyone | Link your Discord to your game character. |
| `/dune data unlink` | Everyone | Unlink your Discord from your game character. |
| `/dune data whoami` | Everyone | Show your linked game character and online status. |
| `/dune data inventory` | Moderator+ | View your personal inventory. |
| `/dune data inventory search:<item>` | Moderator+ | Search your inventory for a specific item. |
| `/dune data storage` | Admin | View your owned storage containers grouped by map. |
| `/dune data storage scope:guild` | Admin | View guild storage containers. |
| `/dune data find <item>` | Admin | Search for items across your accessible containers. |
| `/dune data find <item> scope:guild` | Admin | Search for items across guild containers. |

### OPS Commands

| Command | Who can use it | What it shows |
|---|---|---|
| `/dune ops activity` | Observer+ | Player activity statistics. |
| `/dune ops combat` | Observer+ | Combat and death statistics. |
| `/dune ops resources` | Observer+ | Resource field statistics. |
| `/dune ops economy` | Observer+ | Economy statistics. |
| `/dune ops inventory` | Observer+ | Inventory and crafting stats. |
| `/dune ops location` | Observer+ | Map location activity. |
| `/dune ops soc` | Observer+ | OPS bridge health and stats. |
| `/dune ops prometheus` | Observer+ | Container and infra metrics. |
| `/dune ops dashboard` | Observer+ | Aggregated dashboard summary. |

### Admin Commands

| Command | Who can use it | What it shows |
|---|---|---|
| `/dune admin doctor` | Admin | Comprehensive system diagnostic. |
| `/dune admin cooldowns` | Admin | Active command cooldowns. |
| `/dune admin latency` | Admin | Adapter request latency history. |
| `/dune admin events` | Admin | Recent server incidents and events. |
| `/dune admin broadcast <message>` | Admin | Send a message to all in-game players (requires write enablement). |

### Infrastructure Commands

| Command | Who can use it | What it shows |
|---|---|---|
| `/dune infra version` | Observer+ | Dune stack version. |
| `/dune infra servers` | Observer+ | List game servers. |
| `/dune infra ports` | Observer+ | Network port and listener status. |
| `/dune infra db` | Observer+ | Database status and health. |

## Identity Linking

Before using inventory, storage, or find commands, you must link your Discord account to your game character:

1. Run `/dune data link <your-character-name>`
2. The bot confirms: "Linked as DarkDante."
3. Run `/dune data whoami` to verify.
4. You're now linked — use `/dune data inventory` to see your items.

The link persists across bot and server restarts. You only need to link once.

To switch characters, just run `/dune data link` again with the new name.

To remove the link, run `/dune data unlink`.

## Inventory

`/dune data inventory` shows everything your character is carrying — equipped gear, backpack items, and stacked resources.

Each item shows:
- Template ID (game identifier)
- Stack size
- Quality level (if applicable)

Example output:

```
📦 DarkDante's Inventory — 59 items
  Ammo ×42
  AzuriteOre ×333
  BasicBuildingTool ×1
  Bloodsack_01 ×1
  Stillsuit_Neut_Leaking01_Mask ×1
  ...
```

Use `/dune data inventory search:spice` to filter by item name.

## Storage

`/dune data storage` shows your owned storage containers (Spice Silos, Storage Containers) grouped by map.

`/dune data storage scope:guild` adds guild-owned containers.

Each container shows:
- Container name
- Item count
- Map location

## Finding Items

`/dune data find spice` searches all your accessible containers for items matching the query.

Results are grouped by container with map location:

```
🔍 Search: "spice" — 2 containers
  Spice Silo (Hagga Basin)
    Raw_Spice ×12,847
  Medium Storage (Deep Desert)
    Raw_Spice ×500
    Processed_Spice ×32
```

## What You Can See

The bot only shows containers you have permission to access:

- **Owned** containers: you are the owner (rank 1)
- **Guild** containers: you share a guild with the container owner

You cannot see other players' containers. Admins have the same restrictions — no special override.

## Public Status

`/dune server status` is safe for public or semi-public operational channels.

It may show:

- Overall status.
- Server title.
- Region.
- Mode.
- Population.
- Map readiness.
- General issue summary.

It does not show:

- Internal SSH hosts.
- Internal IPs.
- Database URLs.
- Tokens or secrets.
- Raw host paths.
- Raw Docker/container internals.

## Detailed Status

`/dune server status diagnostic:true` provides more detail for administrators. It is ephemeral and should not be posted into public channels.

## Readiness

`/dune server readiness` shows whether the server appears ready for players.

A readiness issue does not always mean the server is broken. For example, a map may be warming or a listener may need a short period to appear after startup.

## Services

`/dune server services` shows a friendly summary of important services.

Instead of exposing raw container details, the bot uses user-facing labels such as Database, Gateway, Survival, Overmap, and Orchestrator.

## If a Command Is Denied

A `not_authorized` response means your Discord role does not map to the required bot capability.

A `not_linked` response means you need to link first. Run `/dune data link <character-name>`.

Ask a server admin to verify:

- Your Discord role.
- The bot role mapping.
- The Console adapter role mapping.

## Safety Expectations

The bot is read-only. It cannot grant items, restart services, restore backups, mutate players, edit maps, send broadcasts, or change server settings.

Write commands (under `/dune write`) are disabled by default and require explicit `DUNE_DISCORD_WRITES_ENABLED=true` plus write-admin or write-owner roles.
