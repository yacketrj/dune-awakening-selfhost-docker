#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/rmq-publish-path-audit-$(date +%Y%m%d-%H%M%S).log"

redact() {
  sed -E \
    -e 's/[A-Fa-f0-9]{16,}/<REDACTED_HEX>/g' \
    -e 's/(player\.#\.)[^[:space:]]+/\1<REDACTED_PLAYER_ROUTE>/g' \
    -e 's/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig' \
    -e 's/(user_id|app_id)([=:][^, ]+)/\1=<redacted>/Ig'
}

{
  echo "===== diagnostic output ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== current RMQ topology summary, sanitized ====="
  echo "--- GAME exchanges ---"
  docker exec dune-rmq-game rabbitmqctl list_exchanges name type durable auto_delete internal 2>/dev/null \
    | grep -Ei 'heartbeats|notifications|rpc|login|response' || true

  echo
  echo "--- GAME queues ---"
  docker exec dune-rmq-game rabbitmqctl list_queues name consumers messages_ready messages_unacknowledged 2>/dev/null \
    | grep -Ei 'server|rpc|bgd|login|response|queue|AFE|Survival|Overmap' || true

  echo
  echo "--- GAME bindings ---"
  docker exec dune-rmq-game rabbitmqctl list_bindings source_name source_kind destination_name destination_kind routing_key arguments 2>/dev/null \
    | grep -Ei 'heartbeats|notifications|rpc|login|response|PlayerOnlineState|player\.#|Survival|Overmap|bgdRpc' || true

  echo
  echo "--- ADMIN exchanges ---"
  docker exec dune-rmq-admin rabbitmqctl list_exchanges name type durable auto_delete internal 2>/dev/null \
    | grep -Ei 'heartbeats|notifications|rpc|login|response' || true

  echo
  echo "--- ADMIN queues ---"
  docker exec dune-rmq-admin rabbitmqctl list_queues name consumers messages_ready messages_unacknowledged 2>/dev/null \
    | grep -Ei 'server|rpc|bgd|login|response|queue|Survival|Overmap' || true

  echo
  echo "--- ADMIN bindings ---"
  docker exec dune-rmq-admin rabbitmqctl list_bindings source_name source_kind destination_name destination_kind routing_key arguments 2>/dev/null \
    | grep -Ei 'heartbeats|notifications|rpc|login|response|Survival|Overmap|bgdRpc' || true

  echo
  echo "===== repo-wide RMQ publish/path grep ====="
  grep -RIn \
    --exclude-dir=.git \
    --exclude="*.log" \
    --exclude="*.sql" \
    --exclude="*.jsonl" \
    -e "rabbitmqctl eval" \
    -e "basic.publish" \
    -e "basic_publish" \
    -e "publishServerCommand" \
    -e "publish_player_command" \
    -e "publish_inner_json" \
    -e "heartbeats" \
    -e "notifications" \
    -e "exchange=heartbeats" \
    -e "routing=notifications" \
    -e "rpc" \
    -e "bgdRpc" \
    -e "Survival_11" \
    -e "Overmap2" \
    -e "SimpleShaTokens" \
    -e "GmeAuth" \
    -e "GmeToken" \
    -e "RmqRpc" \
    runtime console scripts docker-compose.yml .env* 2>/dev/null \
    | redact \
    | head -800

  echo
  echo "===== focused source snippets ====="

  for f in \
    runtime/scripts/admin-tools.sh \
    console/api/src/rmq.js \
    console/api/src/runner.js \
    console/api/src/server.js
  do
    [ -f "$f" ] || continue
    echo
    echo "----- $f key matches -----"
    grep -nE 'publish_player_command|publish_inner_json|publishServerCommand|rabbitmqctl eval|heartbeats|notifications|rpc|bgdRpc|SimpleShaTokens|GmeAuth|GmeToken|user_id|app_id|AuthToken|MessageContent' "$f" \
      | redact || true
  done

  echo
  echo "===== context around repo matches ====="
  grep -RIn \
    --exclude-dir=.git \
    --exclude="*.log" \
    --exclude="*.sql" \
    --exclude="*.jsonl" \
    -e "publish_player_command" \
    -e "publish_inner_json" \
    -e "publishServerCommand" \
    -e "rabbitmqctl eval" \
    -e "SimpleShaTokens" \
    -e "GmeAuth" \
    -e "GmeToken" \
    -e "bgdRpc" \
    runtime console scripts 2>/dev/null \
    | head -80 \
    | while IFS=: read -r file line rest; do
        [ -f "$file" ] || continue
        start=$((line-25))
        end=$((line+45))
        [ "$start" -lt 1 ] && start=1
        echo
        echo "----- $file lines $start-$end around $line -----"
        nl -ba "$file" | sed -n "${start},${end}p" | redact
      done

} | redact | tee "$OUT"

echo
echo "Saved: $OUT"
