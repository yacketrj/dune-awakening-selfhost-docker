#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

source runtime/scripts/secrets-bootstrap.sh

assert_file_value() {
  local file="$1"
  local expected="$2"
  local actual
  actual="$(tr -d '\r\n' < "$file")"
  if [ "$actual" != "$expected" ]; then
    echo "Unexpected secret value in $file: expected '$expected', got '$actual'" >&2
    exit 1
  fi
}

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/dune-secret-bootstrap-test.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

missing_secret="$tmp_dir/runtime/secrets/missing.txt"
ensure_runtime_secret_file "$missing_secret" printf '%s\n' created-secret
assert_file_value "$missing_secret" created-secret

if command -v stat >/dev/null 2>&1; then
  mode="$(stat -c '%a' "$missing_secret" 2>/dev/null || true)"
  if [ -n "$mode" ] && [ "$mode" != "600" ]; then
    echo "Expected $missing_secret to have mode 600, got $mode" >&2
    exit 1
  fi
fi

existing_secret="$tmp_dir/runtime/secrets/existing.txt"
printf '%s\n' original-secret > "$existing_secret"
ensure_runtime_secret_file "$existing_secret" printf '%s\n' rotated-secret
assert_file_value "$existing_secret" original-secret

empty_secret="$tmp_dir/runtime/secrets/empty.txt"
: > "$empty_secret"
ensure_runtime_secret_file "$empty_secret" printf '%s\n' replacement-secret
assert_file_value "$empty_secret" replacement-secret

read_value="$(read_runtime_secret_file "$missing_secret")"
if [ "$read_value" != "created-secret" ]; then
  echo "read_runtime_secret_file returned '$read_value'" >&2
  exit 1
fi

echo "Runtime secret bootstrap checks passed."
