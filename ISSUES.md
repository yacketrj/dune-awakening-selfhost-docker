
## Upstream PR Feedback

### PR #76 — UI Enhancements (CLOSED — split into #78 + #79)
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
- **Status**: RESOLVED — trimmed to docs-only per reviewer
- **Issues**:
  1. "Most useful behavior already in main. Remaining backend additions look unused."
  2. Suggested docs-only PR
- **Resolution**:
  1. Removed `isTemplateAugmentable/isWeaponTemplate/isArmorTemplate` helpers (unused call path)
  2. Kept `PRE-AUGMENTED-GEAR.md` (730 lines) as architecture docs-only PR
  3. CI green, all checks pass
- **Closed**: 2026-07-12

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

### Pipeline Improvement — Pre-PR Validation
- **Reporter**: RedBlink (DAWK)
- **Status**: OPEN
- **Priority**: HIGH
- **Created**: 2026-07-12

#### Problem
Upstream reviewer is spending excessive time finding errors in PRs:
- Back-and-forth on merge conflicts, trailing whitespace, syntax errors
- Web build failures (corrupted TSX from merge resolution)
- Missed checks (generated artifacts committed, icon size bloating)
- In-game testing not done before PR submission

#### Root Causes
1. Pre-push gates bypassed with `--no-verify`
2. No automated CI on our fork — upstream CI is the first CI run
3. No in-game validation before PR submission
4. Merge conflict resolution (`both sides`) introduces JSX corruption
5. No pre-PR check for generated artifacts (coverage, SBOM, dist)

#### Required Pre-PR Checklist (per DAWK)
- [ ] Backend: `node --test test/*.test.js` — 0 failures
- [ ] Frontend: `npm run build` in `console/web/` — 0 errors
- [ ] Game: Deploy to e2e-clean, test the feature in-game
- [ ] Security: Run pre-push gates WITHOUT `--no-verify`
- [ ] Clean diff: Only intended files changed, no merge artifacts
- [ ] No generated files: No coverage/, dist/, .tmp/, SBOM

#### Action Items
1. Stop using `--no-verify` on pushes
2. Add CI workflow to our fork (yacketrj) mirroring upstream
3. Create pre-PR validation script that runs all checks locally
4. Add `git diff --check` for trailing whitespace to local checks
5. Add check for generated artifacts in changed files
6. After merge conflicts, verify JSX/TSX files compile before pushing
7. Test in-game on e2e-clean before pushing to upstream PR branch

#### Notes
"what I usually do: set goal to implement feature X, do backend, check frontend, test ingame, then commit" — DAWK
"nothing is automatic 🙂 the upstream PR cut goes through a lot of checks and tests" — Dark Dante

### RabbitMQ Quality Limitation (Discovery)
- **Status**: CLOSED
- **Finding**: Funcom game server ignores Quality/Grade/ItemQuality in AddItemToInventory RabbitMQ messages
- **Impact**: Quality 1-5 items must use DB path; live console only works for grade 0
- **Evidence**: CLI sends correct payload, inventory increases, but item is always grade 0
- **Resolution**: Reverted PR #77 fix-branches, documented limitation

### Pipeline Improvement — Pre-PR Validation
- **Status**: IN PROGRESS
- **Progress**: All pipeline scripts created in `yacketrj/dune-docker-addon/pipeline/`
- **Next**: Install fork CI, test pipeline on next PR
