#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/auth-token-hash-compare-$(date +%Y%m%d-%H%M%S).log"

hash_file() {
  local label="$1"
  local file="$2"

  if [ -s "$file" ]; then
    local len hash
    len="$(tr -d '\r\n' < "$file" | wc -c | awk '{print $1}')"
    hash="$(tr -d '\r\n' < "$file" | sha256sum | awk '{print $1}')"
    echo "$label file=$file exists len=$len sha256=$hash"
  else
    echo "$label file=$file missing-or-empty"
  fi
}

hash_envs() {
  local c="$1"
  echo
  echo "===== $c env auth/token hashes ====="
  docker exec "$c" sh -lc '
    env | sort | grep -Ei "token|auth|secret|service|notification|fls|rabbit|rmq" | while IFS= read -r line; do
      key="${line%%=*}"
      val="${line#*=}"
      len="${#val}"
      hash="$(printf "%s" "$val" | sha256sum | awk "{print \$1}")"
      case "$key" in
        *TOKEN*|*Token*|*token*|*SECRET*|*Secret*|*secret*|*AUTH*|*Auth*|*auth*|*PASSWORD*|*Password*|*password*)
          echo "$key=<redacted> len=$len sha256=$hash"
          ;;
        *)
          echo "$key=$val"
          ;;
      esac
    done
  ' 2>/dev/null || true
}

{
  echo "===== diagnostic output ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== repo secret file hashes ====="
  hash_file "funcom-token" "runtime/secrets/funcom-token.txt"
  hash_file "command-auth-token" "runtime/secrets/command-auth-token.txt"

  echo
  echo "===== repo files mentioning auth/token/notification ====="
  grep -RIn \
    --exclude-dir=.git \
    --exclude="*.log" \
    --exclude="*.sql" \
    --exclude="*.jsonl" \
    -e "ServiceAuthToken" \
    -e "AuthToken" \
    -e "CommandAuth" \
    -e "NotificationSystem" \
    -e "notification" \
    -e "DUNE_COMMAND_AUTH_TOKEN" \
    -e "command-auth-token" \
    -e "funcom-token" \
    runtime console docker-compose.yml .env* 2>/dev/null \
    | sed -E 's/(Token|TOKEN|token|Secret|SECRET|secret|Password|PASSWORD|password)([^=:{"]*)([=:{"][^, "]+)/\1\2=<redacted>/Ig' \
    | head -400

  hash_envs dune-server-survival-1
  hash_envs dune-server-overmap
  hash_envs dune-server-gateway
  hash_envs dune-director
  hash_envs dune-text-router
  hash_envs redblink-dune-docker-console
} | tee "$OUT"

echo
echo "Saved: $OUT"
