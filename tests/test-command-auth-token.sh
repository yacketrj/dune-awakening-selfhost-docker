#!/usr/bin/env bash
set -euo pipefail

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_contains() { grep -Fq -- "$2" "$1" || fail "$1 missing: $2"; }

CORE="${HOME}/dune-docker-addon/e2e-integration"

# Auto-generation on both sides (PR #35 merged upstream)
assert_contains "$CORE/console/api/src/rmq.js" 'generateCommandAuthTokenFile'
assert_contains "$CORE/console/api/src/rmq.js" 'randomBytes(COMMAND_AUTH_TOKEN_BYTES)'
assert_contains "$CORE/console/api/src/rmq.js" 'runtime/secrets/command-auth-token.txt'
assert_contains "$CORE/console/api/src/rmq.js" 'DUNE_COMMAND_AUTH_TOKEN'
assert_contains "$CORE/runtime/scripts/admin-tools.sh" 'DUNE_COMMAND_AUTH_TOKEN'
assert_contains "$CORE/runtime/scripts/admin-tools.sh" 'command-auth-token.txt'

# No hardcoded fallback (removed by PR #35)
if grep -rn 'BUILTIN_COMMAND_AUTH_TOKEN' "$CORE/console/api/src" "$CORE/runtime/scripts" >/dev/null 2>&1; then
  fail "BUILTIN_COMMAND_AUTH_TOKEN still present — upstream PR #35 removed it"
fi

echo "PASS: command auth token generated without hardcoded fallback (upstream PR #35)"
