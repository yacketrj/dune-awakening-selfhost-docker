#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/admin-command-functional-smoke-$(date +%Y%m%d-%H%M%S).log"

SQL_ITEM_COUNT="
select coalesce(sum(it.stack_size),0)
from dune.items it
join dune.inventories inv on inv.id = it.inventory_id
join dune.actors a on a.id = inv.actor_id
where a.owner_account_id = 1
  and it.template_id = 'WaterPack_Consumable';
"

run_sql() {
  docker exec dune-postgres psql -U dune -d dune -At -c "$1" 2>/dev/null | tr -d '[:space:]'
}

redact() {
  sed -E \
    -e 's/[A-Fa-f0-9]{16,}/<REDACTED_HEX>/g' \
    -e 's/(AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig'
}

{
  echo "===== admin command functional smoke ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== command token fingerprint only ====="
  if [ -s runtime/secrets/command-auth-token.txt ]; then
    token="$(tr -d '\r\n' < runtime/secrets/command-auth-token.txt)"
    echo "command-auth-token len=$(printf '%s' "$token" | wc -c | awk '{print $1}') sha256=$(printf '%s' "$token" | sha256sum | awk '{print $1}')"
  else
    echo "command-auth-token missing"
  fi
  echo

  echo "===== player/account target ====="
  docker exec dune-postgres psql -U dune -d dune -c "
    select id, name, status, online, player_controller_id, player_pawn_id, player_state_id
    from dune.encrypted_player_state
    where id = 2 or name ilike '%Sihaya%'
    order by id;
  " | redact || true
  echo

  before="$(run_sql "$SQL_ITEM_COUNT" || echo unknown)"
  echo "WaterPack_Consumable before=$before"
  echo

  SINCE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Since=$SINCE"
  echo

  echo "===== test 1: grant one Cup of Water item ====="
  dune admin grant-item 1 WaterPack_Consumable 1 1 0 || true
  sleep 5

  after_item="$(run_sql "$SQL_ITEM_COUNT" || echo unknown)"
  echo "WaterPack_Consumable after_item_grant=$after_item"
  echo

  echo "===== test 2: refill-water command ====="
  dune admin refill-water 1 1000000 || true
  sleep 5

  after_water="$(run_sql "$SQL_ITEM_COUNT" || echo unknown)"
  echo "WaterPack_Consumable after_refill_water=$after_water"
  echo

  echo "===== recent admin history ====="
  tail -20 runtime/generated/admin-command-history.tsv 2>/dev/null | redact || true
  echo

  echo "===== survival logs since command ====="
  docker logs --since "$SINCE" dune-server-survival-1 2>&1 \
    | grep -Ei 'NotificationSystem|Invalid Auth Token|AddItemToInventory|UpdateAllWaterFillables|WaterPack|Water|ServerCommand|error|warn|failed' \
    | redact || true
  echo

  echo "===== overmap logs since command ====="
  docker logs --since "$SINCE" dune-server-overmap 2>&1 \
    | grep -Ei 'NotificationSystem|Invalid Auth Token|AddItemToInventory|UpdateAllWaterFillables|WaterPack|Water|ServerCommand|error|warn|failed' \
    | redact || true
} | tee "$OUT"

echo
echo "Saved: $OUT"
