
### Blueprint UI — Import/Export (feature/blueprints-ui)
- **BlueprintsPanel** — import/export component integrated into Player tab
- **Multi-select export** — checkbox column, Export Selected, Export All
- **Multi-file import** — file chips (append mode with × to remove), batch sequential processing
- **Multipart form fix** — readMultipartForm now parses non-file form fields (player_id)
- **Offline + relog** — import works for online players with relog warning
- **PlayerBaseBackupId** — added to blueprint stats JSON to match live solido format
- **owner_id in list** — insert player_id on import, include in list query for player filtering
- **Blueprint delete** — DELETE API route + handler (removes instances, placeables, pentashields, item, blueprint row in transaction); per-row + bulk selected delete UI
- **Name from file** — blueprint name derived from import file name instead of building_type fallback
- **Name dedupe** — Windows-style (1), (2), etc. suffixes when a blueprint name already exists for the player
- **Inventory check** — warns before import if available slots are fewer than selected files
- **UI polish** — Select All + Delete on same row, greyed-out Delete activates when any selected
- **Name cleanup** — underscores and dots replaced with spaces (Hawks_Base → "Hawks Base")
- **Column order** — Name | Actions (Delete+Download icon group) | Select checkbox
