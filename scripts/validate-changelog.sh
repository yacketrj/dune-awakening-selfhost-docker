#!/usr/bin/env bash
# validate-changelog.sh — ensures CHANGELOG has an Unreleased section for the current branch.
# Run before cutting a PR or pushing feature work.
set -euo pipefail

CHANGELOG="${1:-CHANGELOG.md}"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"

if [ ! -f "$CHANGELOG" ]; then
  echo "ERROR: $CHANGELOG not found. Create one before continuing." >&2
  exit 1
fi

if ! grep -q "^## Unreleased" "$CHANGELOG"; then
  echo "WARNING: $CHANGELOG has no '## Unreleased' section." >&2
  echo "" >&2
  echo "Add an Unreleased section with your changes:" >&2
  echo "" >&2
  echo "## Unreleased" >&2
  echo "" >&2
  echo "### Added" >&2
  echo "" >&2
  echo "- (describe new features)" >&2
  echo "" >&2
  echo "### Fixed" >&2
  echo "" >&2
  echo "- (describe bug fixes)" >&2
  echo "" >&2
  echo "### Security" >&2
  echo "" >&2
  echo "- (describe security improvements)" >&2
  exit 1
fi

# If there's only the placeholder with no real entries, warn
UNRELEASED_CONTENT=$(sed -n '/^## Unreleased/,/^## /p' "$CHANGELOG" | grep -c "^- " || true)
if [ "$UNRELEASED_CONTENT" -eq 0 ]; then
  echo "WARNING: Unreleased section exists but has no entries." >&2
  echo "Add at least one bullet under Added, Fixed, or Security." >&2
  exit 1
fi

echo "CHANGELOG OK: Unreleased section has $UNRELEASED_CONTENT entries (branch: $BRANCH)"
