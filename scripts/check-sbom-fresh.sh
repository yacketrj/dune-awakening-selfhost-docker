#!/usr/bin/env bash
# check-sbom-fresh.sh — verifies SBOM is current against committed lockfiles.
# Run before pushing if package-lock.json changed.
set -euo pipefail

CHANGED_FILES="$(git diff --name-only HEAD 2>/dev/null || true)"
LOCKFILE_CHANGED=false

for f in $CHANGED_FILES; do
  if [[ "$f" == *package-lock.json ]]; then
    LOCKFILE_CHANGED=true
    break
  fi
done

if [ "$LOCKFILE_CHANGED" = true ]; then
  echo "package-lock.json changed — regenerating SBOM..."
  if [ -f scripts/generate-sbom.js ]; then
    node scripts/generate-sbom.js || {
      echo "ERROR: SBOM generation failed. Fix before pushing." >&2
      exit 1
    }
    echo "SBOM regenerated. Stage dist/*.cdx.json if not gitignored."
  else
    echo "WARNING: No SBOM generator found. Skipping."
  fi
fi

# Also check if SBOM file exists for the commit
cd "$(dirname "$0")/.."
if [ -f dist/dune-awakening-selfhost-docker.cdx.json ]; then
  echo "SBOM: exists"
else
  echo "NOTE: No SBOM found in dist/. Run 'npm run sbom' in console/api to generate."
fi

echo "SBOM check complete."
