#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

is_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$1"
}

if ! is_running dune-postgres || ! is_running dune-rmq-game; then
  exit 0
fi

guild_ids="$(
  docker exec dune-postgres psql -U dune -d dune -Atc "
    select guild_id
    from dune.guilds
    where guild_id is not null
    order by guild_id;
  " 2>/dev/null || true
)"

[ -n "$guild_ids" ] || exit 0

declared=0
failed=0

while IFS= read -r guild_id; do
  guild_id="$(printf '%s' "$guild_id" | tr -d '[:space:]')"
  [[ "$guild_id" =~ ^[0-9]+$ ]] || continue

  exchange="chat.guild.$guild_id"
  eval_code='XName = rabbit_misc:r(<<"/">>, exchange, <<"'"$exchange"'">>), rabbit_exchange:declare(XName, fanout, false, false, false, [], none), io:format("declared '"$exchange"'~n").'
  if docker exec dune-rmq-game rabbitmqctl eval "$eval_code" >/dev/null 2>&1; then
    declared=$((declared + 1))
  else
    failed=$((failed + 1))
    echo "WARN failed to declare guild chat exchange: $exchange" >&2
  fi
done <<< "$guild_ids"

if [ "$declared" -gt 0 ]; then
  echo "Ensured guild chat exchanges: $declared"
fi

if [ "$failed" -gt 0 ]; then
  exit 1
fi
