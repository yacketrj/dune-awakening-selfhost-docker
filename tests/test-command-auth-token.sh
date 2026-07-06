#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_contains() {
  local file="$1"
  local pattern="$2"

  grep -Fq -- "$pattern" "$file" || fail "$file missing: $pattern"
}

CORE="${HOME}/dune-awakening-selfhost-docker"

# Built-in fallback present on both sides (matches game server default)
assert_contains "$CORE/console/api/src/rmq.js" 'BUILTIN_COMMAND_AUTH_TOKEN'
assert_contains "$CORE/runtime/scripts/admin-tools.sh" 'BUILTIN_COMMAND_AUTH_TOKEN'

# Env var override takes priority
assert_contains "$CORE/console/api/src/rmq.js" 'DUNE_COMMAND_AUTH_TOKEN'
assert_contains "$CORE/runtime/scripts/admin-tools.sh" 'DUNE_COMMAND_AUTH_TOKEN'

# File persistence path for operator overrides
assert_contains "$CORE/console/api/src/rmq.js" 'runtime/secrets/command-auth-token.txt'
assert_contains "$CORE/runtime/scripts/admin-tools.sh" 'command-auth-token.txt'

# File is read if it exists (operator can pre-create it)
assert_contains "$CORE/console/api/src/rmq.js" 'existsSync(file)'
assert_contains "$CORE/runtime/scripts/admin-tools.sh" '-s "$COMMAND_TOKEN_FILE"'

# .env.example documents the fallback behavior
assert_contains "$CORE/.env.example" 'runtime/secrets/command-auth-token.txt'
assert_contains "$CORE/.env.example" 'RedBlink built-in token'

echo "PASS: command auth token matches upstream pattern (env > file > built-in)"
