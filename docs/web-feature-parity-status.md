# Web Feature Parity Status

This file is the working status ledger for the RedBlink web admin interface. A feature is not Done unless it has a frontend UI, backend endpoint, real RedBlink Docker/DB/RMQ logic, clear errors, safety confirmation where needed, and at least one test or manual verification note.

## Current Overall Status

| Area | Status | Reason |
|---|---|---|
| Phase 1 foundation | Partial | Auth/session/CSRF/task/audit/safe-runner basics exist; several placeholder routes were removed or replaced with real validated operations; broader parity coverage and tests are still incomplete. |
| Phase 2 server operations | Done | Server status/readiness/ports/services/doctor, lifecycle tasks, service restart, logs, backup list/create/restore/delete, and update tasks are wired to real RedBlink commands with frontend controls and task streaming. |
| Phase 3 direct DB features | Partial | Direct Postgres access, database browser, player list/profile/inventory/currency/factions/specs/position capability, storage, bases, and blueprints are wired. Progression/events/stats/history and full blueprint/base export/import remain schema-dependent. |

## Feature Group Status

| Feature group | Status | Exact reason if Partial / Blocked / Not Implemented | Test or manual verification |
|---|---|---|---|
| Server lifecycle / Server Control | Partial | Phase 2 server status/readiness/ports/services/doctor/start/stop/restart/restart-service are done through real RedBlink commands; broader parity items such as backup upload/download and scheduled restart controls remain. | Runner lifecycle mapping tests pass; frontend build passes. |
| Server settings | Not Implemented | No full editor for `.env`, UserGame/UserEngine, sietch, memory, and restart impact metadata. | Needs tests. |
| Players / profiles | Partial | Direct DB player list, online list, search, profile, inventory, currency, factions, specs, and position capability are wired. Progression/events/stats/history return explicit unsupported capability responses until the exact RedBlink schema mapping is completed. | DB query-builder tests, live read-only DB smoke check, and frontend build pass. |
| Player/admin actions | Partial | Phase 4 wraps real RedBlink CLI commands for item grants by name/ID, Scout Ornithopter Mk6 bundle grants, XP, skill points/modules, refill water, kick/kick-all, teleport, spawn vehicle, clean inventory, reset progression, catalogs, and admin history. Currency, faction reputation, repair/refuel, inventory delete, storage mutation, broadcast, shutdown broadcast, and whisper remain explicit unsupported capability responses until their DB/RMQ paths are verified and backed by backup-before-write where needed. | Backend runner validation tests and frontend build pass. |
| Logs | Partial | Phase 2 service logs are wired through `/api/logs/services`, `/api/logs/:service`, `/stream`, and `/download`; known services use `dune logs`, safely discovered dynamic `dune-server-*` containers use validated Docker logs. Cheat/admin logs remain for later parity work. | Runner log validation tests pass; frontend build passes. |
| Live map | Not Implemented | No marker/player/base query adapter or map UI parity yet. | Needs tests. |
| Market | Not Implemented | No market DB query layer or UI yet. | Needs tests. |
| Starter Kit | Not Implemented | No welcome package/starter kit backend or UI yet. | Needs tests. |
| Notifications / broadcast / chat | Partial | Broadcast, shutdown broadcast, and whisper endpoints/UI exist but return explicit unsupported capability responses. The RedBlink CLI does not yet expose ServiceBroadcast or courier whisper publishing, and direct RMQ porting still needs GM persona and wire-path verification. | Frontend build pass; no live RMQ broadcast test was run. |
| Updates | Partial | Phase 2 game/stack check/apply task wrappers are done; release listing, auto-update controls, and repair remain for later phases. | Runner update mapping tests pass; frontend build passes. |
| Setup wizard | Partial | Existing setup wizard scaffold exists; must be cleaned up and kept separate from parity features. | Needs tests. |
| Security / audit / tasks | Partial | Auth, CSRF, task, audit, redaction exist; runner validation expanded for update flags, backups, SQL, item names, and teleport; task lifecycle and endpoint tests still need expansion. | Auth/CSRF and runner tests pass. |
| Backups | Partial | Phase 2 list/create/restore/delete are wired to `dune db list`, `backup`, `restore`, and `delete`; restore/delete require frontend confirmation and validate backup names server-side. Upload/download parity remains. | Runner backup validation and task lifecycle tests pass; frontend build passes. |

## Blocked Items

No feature group is currently marked Blocked. Features without a known reliable RedBlink implementation path are Not Implemented until a direct schema/RMQ/runtime audit proves whether they can work.

## Phase 4 Action Status

| Action | Status | Implementation path |
|---|---|---|
| Give Item | Done | UI in `web/src/App.tsx`, `POST /api/players/:id/give-item`, `dune admin grant-item`; validates player ID, item name, quantity, durability; audited as `task.adminGiveItem`. |
| Give Multiple Items | Partial | UI and `POST /api/players/:id/give-items` wrap `dune admin grant-template scout-ornithopter-mk6`. Arbitrary multi-item payloads remain future work. |
| Give Item by ID | Done | UI, `POST /api/players/:id/give-item-id`, `dune admin grant-item-id`; validates player ID, raw item ID, quantity, durability; audited. |
| Add XP | Done | UI, `POST /api/players/:id/add-xp`, `dune admin award-xp`; validates amount bounds; audited. |
| Set Skill Points | Done | UI, `POST /api/players/:id/set-skill-points`, `dune admin skill-points`; validates point bounds; audited. |
| Set Skill Module | Done | UI, `POST /api/players/:id/set-skill-module`, `dune admin skill-module`; CLI resolves module catalog and max level; audited. |
| Refill Water | Done | UI, `POST /api/players/:id/refill-water`, `dune admin refill-water`; validates amount; audited. |
| Kick Player | Done | UI, `POST /api/players/:id/kick`, `dune admin kick --yes --force`; audited. |
| Kick All Online Players | Done | UI, `POST /api/players/kick-all-online`, `dune admin kick --all-online --yes`; frontend confirmation plus backend phrase `KICK ALL ONLINE PLAYERS`; audited. |
| Teleport Player | Done | UI, `POST /api/players/:id/teleport`, `dune admin teleport`; validates coordinates/yaw; audited. |
| Spawn Vehicle | Done | UI, `POST /api/players/:id/spawn-vehicle`, `dune admin spawn-vehicle`; validates vehicle ID/template/offset and CLI resolves catalog/live position; audited. |
| Clean Inventory | Done | UI, `POST /api/players/:id/clean-inventory`, `dune admin clean-inventory`; frontend confirmation plus backend phrase `CLEAN INVENTORY`; audited. |
| Reset Progression | Done | UI, `POST /api/players/:id/reset-progression`, `dune admin reset-progression`; frontend confirmation plus backend phrase `RESET PROGRESSION`; audited. |
| Add Currency / Solaris | Blocked | Endpoint/UI return unsupported. Needs verified RedBlink currency function/table semantics and backup-before-write. |
| Add Faction Reputation | Blocked | Endpoint/UI return unsupported. Needs verified faction DB functions and component synchronization. |
| Repair Gear / Refuel Vehicle | Blocked | Endpoint/UI return unsupported. Needs safe DB stat update port and backup-before-write. |
| Broadcast / Shutdown Broadcast / Whisper | Blocked | Endpoints/UI return unsupported. Needs RedBlink ServiceBroadcast/courier RabbitMQ implementation or CLI support. |
| Command History | Done | UI and `GET /api/admin/history` wrap `dune admin history`. |
| Storage Give Item | Blocked | Endpoint/UI return unsupported after backend confirmation. Needs direct DB insert port with backup-before-write. |
| Inventory Delete | Blocked | Endpoint returns unsupported after backend confirmation. Needs ownership validation and `dune.delete_item` verification with backup-before-write. |

## Completion Rule

When a feature moves to Done, add:

- backend endpoint path
- frontend page/component path
- command, SQL, Docker, or RMQ operation used
- confirmation/backup behavior for dangerous actions
- automated test name or manual verification command
