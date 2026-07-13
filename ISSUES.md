
### Blueprint Import/Export — Frontend UI
- **Status**: IN PROGRESS
- **Branch**: feature/blueprints-ui
- **Progress**:
  - ✅ BlueprintsPanel component with import/export UI
  - ✅ Multi-select export with checkbox column
  - ✅ Multi-file import support (append mode with file chips, batch sequential processing)
  - ✅ Integrated into Player tab (CharacterAdminUI sub-tab)
  - ✅ Offline + relog import support
  - ✅ Fixed readMultipartForm to parse form fields (player_id was lost)
  - ✅ Fixed player_id insertion on import + owner_id in list query
  - ✅ Added PlayerBaseBackupId to stats JSON to match live solido format
  - ✅ Blueprint delete API + UI (per-row + bulk selected)
  - ✅ Name derivation from file name (not building_type fallback)
  - ✅ Name deduplication — Windows-style (1), (2) suffixes
  - ✅ Inventory capacity check before multi-file import
  - ✅ Select-all + Delete button on same row
  - ✅ Column order: Name | Actions (Delete+Download) | Select
  - ⬜ Test in-game preview (P34 crash investigation)
  - ⬜ Create upstream PR
- **Discovered**: 2026-07-12

### Blueprint Import — P34 Crash Investigation
- **Status**: OPEN
- **Finding**: Game crashes (P34) when previewing imported blueprint in-game
- **Comparison**: Live solido vs imported blueprint — stats JSON missing PlayerBaseBackupId
- **Fix applied**: Added PlayerBaseBackupId to blueprintItemStatsJSON
- **Verification needed**: Test blueprint #3 in-game after relog
- **Root cause candidates**: hologram flag, transform format, building_blueprint_map empty
