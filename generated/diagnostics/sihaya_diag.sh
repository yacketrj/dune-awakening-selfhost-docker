#!/usr/bin/env bash
set -uo pipefail

FLS_ID="AFE0154F3AFE602C"
OUT_DIR="/tmp/dune-db-fix"
OUT="$OUT_DIR/sihaya_diag_$(date +%Y%m%d-%H%M%S).txt"

mkdir -p "$OUT_DIR"

exec > >(tee "$OUT") 2>&1

section() {
  printf '\n\n===== %s =====\n' "$*"
}

run() {
  section "$*"
  "$@" || true
}

psqlq() {
  local title="$1"
  local sql="$2"

  section "$title"
  docker exec dune-postgres psql \
    -X \
    -U dune \
    -d dune \
    -P pager=off \
    -v ON_ERROR_STOP=0 \
    -c "$sql" || true
}

section "DIAGNOSTIC START"
date -Is
echo "host=$(hostname)"
echo "user=$(whoami)"
echo "pwd=$(pwd)"
echo "output=$OUT"

run docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.CreatedAt}}'

psqlq "PSQL sanity" \
"select now(), current_database(), current_user;"

psqlq "DB table counts" \
"select 'accounts' as table_name, count(*) from dune.accounts
union all select 'encrypted_accounts', count(*) from dune.encrypted_accounts
union all select 'encrypted_player_state', count(*) from dune.encrypted_player_state
union all select 'player_state_view', count(*) from dune.player_state
union all select 'actors', count(*) from dune.actors
union all select 'actor_audit', count(*) from dune.actor_audit
union all select 'account_removal_log', count(*) from dune.account_removal_log
union all select 'player_travel_state', count(*) from dune.player_travel_state
order by table_name;"

psqlq "Account rows for FLS id" \
"select id, \"user\", funcom_id, platform_id, platform_name
from dune.accounts
where \"user\" = '$FLS_ID';

select id, \"user\", platform_id, platform_name, takeoverable
from dune.encrypted_accounts
where \"user\" = '$FLS_ID';"

psqlq "All encrypted_player_state rows for this FLS account" \
"with acct as (
  select id from dune.accounts where \"user\" = '$FLS_ID'
  union
  select id from dune.encrypted_accounts where \"user\" = '$FLS_ID'
)
select
  eps.account_id,
  eps.id,
  encode(eps.encrypted_character_name, 'escape') as encrypted_character_name_escape,
  eps.character_state,
  eps.life_state,
  eps.online_status,
  eps.last_login_time,
  eps.last_avatar_activity,
  eps.server_id,
  eps.previous_server_partition_id,
  eps.home_dimension_index,
  eps.return_dimension_index,
  eps.player_controller_id,
  eps.player_pawn_id,
  eps.player_state_id,
  eps.last_character_state_change,
  eps.transfer_count
from dune.encrypted_player_state eps
where eps.account_id in (select id from acct)
order by eps.account_id, eps.id;"

psqlq "Visible player_state rows" \
"select
  account_id,
  id,
  character_name,
  character_state,
  life_state,
  online_status,
  last_login_time,
  last_avatar_activity,
  server_id,
  previous_server_partition_id,
  home_dimension_index,
  return_dimension_index,
  player_controller_id,
  player_pawn_id,
  player_state_id
from dune.player_state
order by account_id, id;"

psqlq "Current server routing" \
"select * from dune.active_server_ids;

select *
from dune.player_travel_state
where fls_id = '$FLS_ID';"

psqlq "World partitions" \
"select *
from dune.world_partition
order by partition_id;"

psqlq "Actor table schema" \
"select
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'dune'
  and table_name = 'actors'
order by ordinal_position;"

psqlq "Actor rows referenced by this account's character rows" \
"with acct as (
  select id from dune.accounts where \"user\" = '$FLS_ID'
  union
  select id from dune.encrypted_accounts where \"user\" = '$FLS_ID'
),
ids as (
  select player_controller_id as actor_id from dune.encrypted_player_state where account_id in (select id from acct)
  union
  select player_pawn_id from dune.encrypted_player_state where account_id in (select id from acct)
  union
  select player_state_id from dune.encrypted_player_state where account_id in (select id from acct)
)
select
  a.id,
  a.class,
  a.map,
  a.partition_id,
  a.dimension_index,
  a.owner_account_id,
  a.serial,
  left(a.transform::text, 250) as transform_prefix,
  left(a.properties::text, 250) as properties_prefix
from dune.actors a
join ids on ids.actor_id = a.id
order by a.id;"

psqlq "Actor rows 1 through 20" \
"select
  id,
  class,
  map,
  partition_id,
  dimension_index,
  owner_account_id,
  serial,
  left(transform::text, 250) as transform_prefix,
  left(properties::text, 250) as properties_prefix
from dune.actors
where id between 1 and 20
order by id;"

psqlq "Actor audit for ids 1 through 20" \
"select *
from dune.actor_audit
where id between 1 and 20
order by id;"

psqlq "Actor-related tables and estimated live rows" \
"select
  schemaname,
  relname,
  n_live_tup
from pg_stat_user_tables
where schemaname = 'dune'
  and relname ilike '%actor%'
order by relname;"

psqlq "Actor-related columns" \
"select
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'dune'
  and (
    table_name ilike '%actor%'
    or column_name ilike '%actor%'
    or column_name ilike '%pawn%'
    or column_name ilike '%controller%'
  )
order by table_name, ordinal_position;"

psqlq "Account removal log for this account" \
"select *
from dune.account_removal_log
where fls_id = '$FLS_ID'
   or account_id in (
      select id from dune.accounts where \"user\" = '$FLS_ID'
      union
      select id from dune.encrypted_accounts where \"user\" = '$FLS_ID'
   )
order by event_time;"

psqlq "Cheater tracking for this account" \
"select *
from dune.cheater_tracking
where fls_id = '$FLS_ID'
order by event_time;"

section "Backup files"
ls -lh /tmp/dune-db-fix/*.sql 2>/dev/null | sort || true

section "Backup scan: encrypted_player_state rows for account 1"
for f in /tmp/dune-db-fix/*.sql; do
  [ -f "$f" ] || continue
  echo "--- $f"
  awk '
    /^COPY dune\.encrypted_player_state[[:space:](]/ { in_copy=1; print FILENAME ":" NR ":" $0; next }
    /^\\\./ { in_copy=0 }
    in_copy && $1 == "1" { print FILENAME ":" NR ":" $0 }
  ' "$f" | head -40
done

section "Backup scan: actor rows ids 1-12"
for f in /tmp/dune-db-fix/*.sql; do
  [ -f "$f" ] || continue
  echo "--- $f"
  awk '
    /^COPY dune\.actors[[:space:](]/ { in_copy=1; print FILENAME ":" NR ":" $0; next }
    /^\\\./ { in_copy=0 }
    in_copy && $1 ~ /^(1|2|3|4|5|6|7|8|9|10|11|12)$/ { print FILENAME ":" NR ":" $0 }
  ' "$f" | head -80
done

section "Backup scan: actor_audit rows ids 1-12"
for f in /tmp/dune-db-fix/*.sql; do
  [ -f "$f" ] || continue
  echo "--- $f"
  awk '
    /^COPY dune\.actor_audit[[:space:](]/ { in_copy=1; print FILENAME ":" NR ":" $0; next }
    /^\\\./ { in_copy=0 }
    in_copy && $1 ~ /^(1|2|3|4|5|6|7|8|9|10|11|12)$/ { print FILENAME ":" NR ":" $0 }
  ' "$f" | head -80
done

section "Sanitized recent gateway character/delete logs"
docker logs --since 45m dune-server-gateway 2>&1 \
  | sed -E \
      -e 's/(ServiceAuthToken: ).*/\1[REDACTED]/g' \
      -e 's/("GameRmqSecret": ")[^"]+/\1[REDACTED]/g' \
      -e 's/("GameRmqAddress": ")[^"]+/\1[REDACTED]/g' \
      -e 's/("GameRmqHttpAddress": ")[^"]+/\1[REDACTED]/g' \
  | grep -Ei 'GetCharactersRipeForDeletion|Deleting from the database|Starting gateway|Server .* came up|Battlegroup|character|account|login|error|failed|AFE0154F3AFE602C|Sihaya' \
  | tail -250 || true

section "DIAGNOSTIC END"
date -Is
echo "Saved diagnostic to: $OUT"
