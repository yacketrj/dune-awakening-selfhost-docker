
## Upstream PR Feedback

### PR #76 — UI Enhancements
- **Reviewer**: Red-Blink (DAWK)
- **Issues**:
  1. Icon assets "messed up" — 16MB total for 12 PNGs at 1.8-2MB each
  2. Web build fails with TSX errors (corrupted from merge conflict resolution)
  3. PR bundles too many unrelated areas
- **Resolution**:
  1. Removed 12 bloated PNGs, kept single 5KB clean version matching upstream
  2. Reverted corrupted TSX files to upstream, kept only clean additions
  3. Stripped to 4 files: placeableResources.ts, DataTable.tsx, docs, icon

### PR #71 — Broadcast Provider
- **Reviewer**: Red-Blink
- **Issues**:
  1. Generated coverage artifacts (77 files, 55K lines) committed
  2. Conflicts with routes.js after #69 merge
- **Resolution**:
  1. Removed all coverage HTML, lcov.info, SBOM JSON, .tmp files
  2. Resolved route conflicts, removed duplicate imports

### PR #75 — Pre-Augmented Gear
- **Reviewer**: Red-Blink
- **Issues**:
  1. "We may not need the main backend change anymore" — upstream already fixed roll-count fallback
  2. Wants to preserve docs, tests, compatibility data
- **Resolution**:
  1. Trimmed to 2 files: isTemplateAugmentable helpers (11 lines) + PRE-AUGMENTED-GEAR.md (730 lines)
  2. Removed duplicate augmentRollCount (upstream has it via addf775)

### PR #13 — Container Hardening
- **Reviewer**: Red-Blink
- **Issues**:
  1. Entrypoint runs as USER node, can't repair mounted repo/app ownership
  2. Need to verify root-owned installs, Docker socket access, mounted repo writes
- **Status**: PENDING — entrypoint/user flow fix needed

### Template: Adding New Upstream Feedback
When upstream leaves PR feedback:
1. Add to CHANGELOG.md "Upstream PR Feedback" table
2. Add to ISSUES.md "Upstream PR Feedback" section with reviewer, issues, resolution
3. Link the specific PR comments

### PR #13 — Container Hardening
- **Reviewer**: Red-Blink
- **Status**: PENDING
- **Issues**:
  1. Entrypoint runs as USER node before entrypoint.sh executes
  2. Cannot repair mounted repo/app ownership (root-owned installs)
  3. Need to verify Docker socket access and mounted repo writes
- **Fix needed**: Restructure entrypoint/user flow so ownership repairs happen before switching to non-root user
- **Progress**: Not started
- **Last updated**: 2026-07-12

### Permission issue on bind-mounted runtime/secrets
- **Symptom**: `cat runtime/secrets/admin-web-password.txt: Permission denied` after container restart
- **Root cause**: Container runs as root (DUNE_HOST_UID=0), creates files owned by root:root. Host user (darkdante, uid 1000) cannot read them
- **Workaround**: Set DUNE_HOST_UID=1000 in .env, chown runtime/ after deploy
- **Fix needed**: Entrypoint should repair ownership before switching to non-root user (PR #13)
- **Also affects**: runtime/generated/ files created by orchestrator
- **Discovered**: 2026-07-12 on e2e-clean stack
