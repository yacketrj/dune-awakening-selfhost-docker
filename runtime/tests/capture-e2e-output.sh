#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BASE_DIR="${E2E_OUTPUT_BASE:-work/e2e-output}"
ACTIVE_FILE="$BASE_DIR/.active-run"
WATCH_INTERVAL="${E2E_WATCH_INTERVAL:-15}"

usage() {
  cat <<'USAGE'
Usage:
  bash runtime/tests/capture-e2e-output.sh start
  bash runtime/tests/capture-e2e-output.sh install
  bash runtime/tests/capture-e2e-output.sh start-watch
  bash runtime/tests/capture-e2e-output.sh note "what happened"
  bash runtime/tests/capture-e2e-output.sh snapshot <label>
  bash runtime/tests/capture-e2e-output.sh stop-watch
  bash runtime/tests/capture-e2e-output.sh finish
  bash runtime/tests/capture-e2e-output.sh path

Suggested E2E flow:
  1. start
  2. install
  3. start-watch
  4. Use the WebUI to deploy the server.
  5. snapshot webui-deployed
  6. Have a player connect in game.
  7. note "Player connected in game as <name/identifier>"
  8. snapshot player-connected
  9. finish
USAGE
}

timestamp_utc() {
  date -u +%Y%m%dT%H%M%SZ
}

iso_utc() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

safe_label() {
  printf '%s' "${1:-snapshot}" | tr -cs '[:alnum:]._-' '-' | sed 's/^-//; s/-$//'
}

current_run_dir() {
  if [ -n "${E2E_RUN_DIR:-}" ]; then
    printf '%s\n' "$E2E_RUN_DIR"
    return
  fi
  if [ -f "$ACTIVE_FILE" ]; then
    cat "$ACTIVE_FILE"
    return
  fi
  echo "No active E2E capture run. Start one with: bash runtime/tests/capture-e2e-output.sh start" >&2
  exit 1
}

redact_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  sed -i -E \
    -e 's/((password|passwd|secret|token|api[_-]?key|credential|ADMIN_PASSWORD|DUNE_COMMAND_AUTH_TOKEN)[^[:space:]=:]*[[:space:]]*[:=][[:space:]]*)[^[:space:]]+/\1[REDACTED]/Ig' \
    -e 's/(postgres:\/\/[^:[:space:]]+:)[^@[:space:]]+@/\1[REDACTED]@/Ig' \
    "$file" 2>/dev/null || true
}

redact_tree() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  while IFS= read -r file; do
    redact_file "$file"
  done < <(find "$dir" -type f -size -10M 2>/dev/null)
}

append_note() {
  local run_dir="$1"
  shift
  mkdir -p "$run_dir/notes"
  printf -- '- %s %s\n' "$(iso_utc)" "$*" >> "$run_dir/notes/timeline.md"
}

capture_command() {
  local run_dir="$1"
  local name="$2"
  shift 2
  local log_file="$run_dir/logs/${name}.log"
  local command_display status

  mkdir -p "$run_dir/logs"
  printf -v command_display '%q ' "$@"
  command_display="${command_display% }"

  {
    echo "# $name"
    echo
    echo "Command: $command_display"
    echo "Started: $(iso_utc)"
    echo
  } > "$log_file"

  "$@" >> "$log_file" 2>&1
  status=$?

  {
    echo
    echo "Finished: $(iso_utc)"
    echo "Exit code: $status"
  } >> "$log_file"

  redact_file "$log_file"
  printf '%s\t%s\t%s\t%s\n' "$name" "$command_display" "$status" "$log_file" >> "$run_dir/commands.tsv"
  return "$status"
}

capture_interactive_command() {
  local run_dir="$1"
  local name="$2"
  local command_string="$3"
  local log_file="$run_dir/logs/${name}.session.log"
  local status

  mkdir -p "$run_dir/logs"

  {
    echo "# $name"
    echo
    echo "Command: $command_string"
    echo "Started: $(iso_utc)"
    echo
  } > "$log_file"

  if command -v script >/dev/null 2>&1; then
    script -q -f -c "$command_string" "$log_file.tmp"
    status=$?
    cat "$log_file.tmp" >> "$log_file"
    rm -f "$log_file.tmp"
  else
    bash -lc "$command_string" >> "$log_file" 2>&1
    status=$?
  fi

  {
    echo
    echo "Finished: $(iso_utc)"
    echo "Exit code: $status"
  } >> "$log_file"

  redact_file "$log_file"
  printf '%s\t%s\t%s\t%s\n' "$name" "$command_string" "$status" "$log_file" >> "$run_dir/commands.tsv"
  return "$status"
}

container_names() {
  docker ps -a --format '{{.Names}}' 2>/dev/null | sort || true
}

capture_runtime_logs() {
  local snap_dir="$1"
  local out_dir="$snap_dir/runtime-log-files"
  mkdir -p "$out_dir"

  find runtime -maxdepth 7 -type f \
    \( -name '*.log' -o -name '*.out' -o -name '*.txt' -o -name '*.json' \) \
    ! -path 'runtime/secrets/*' \
    ! -path 'runtime/backups/*' \
    ! -path 'runtime/generated/*' \
    ! -path 'runtime/addons/*' \
    -size -10M \
    -print 2>/dev/null | sort > "$snap_dir/runtime-log-file-list.txt" || true

  while IFS= read -r file; do
    [ -f "$file" ] || continue
    safe_name="$(printf '%s' "$file" | tr '/ ' '__')"
    cp "$file" "$out_dir/$safe_name" 2>/dev/null || true
  done < "$snap_dir/runtime-log-file-list.txt"

  redact_tree "$out_dir"
}

snapshot() {
  local run_dir="$1"
  local label="${2:-snapshot}"
  local stamp snap_dir name safe_name

  stamp="$(timestamp_utc)"
  label="$(safe_label "$label")"
  snap_dir="$run_dir/snapshots/${stamp}-${label}"
  mkdir -p "$snap_dir/container-logs" "$snap_dir/container-state"

  append_note "$run_dir" "Snapshot captured: $label"

  {
    echo "Captured: $(iso_utc)"
    echo "Label: $label"
    echo "Run directory: $run_dir"
  } > "$snap_dir/snapshot-meta.txt"

  {
    echo "## git"
    git status --short 2>/dev/null || true
    git rev-parse --abbrev-ref HEAD 2>/dev/null || true
    git rev-parse HEAD 2>/dev/null || true
  } > "$snap_dir/git.txt"

  {
    echo "## host"
    uname -a 2>/dev/null || true
    id 2>/dev/null || true
    df -h . 2>/dev/null || true
    free -h 2>/dev/null || true
  } > "$snap_dir/host.txt"

  {
    echo "## docker version"
    docker version 2>/dev/null || true
    echo
    echo "## docker compose version"
    docker compose version 2>/dev/null || true
  } > "$snap_dir/docker-version.txt"

  docker ps -a > "$snap_dir/docker-ps-a.txt" 2>&1 || true
  docker images > "$snap_dir/docker-images.txt" 2>&1 || true
  docker network ls > "$snap_dir/docker-networks.txt" 2>&1 || true
  docker volume ls > "$snap_dir/docker-volumes.txt" 2>&1 || true
  docker stats --no-stream --no-trunc > "$snap_dir/docker-stats.txt" 2>&1 || true
  ss -ltnp > "$snap_dir/listening-tcp.txt" 2>&1 || true

  if [ -f docker-compose.web.yml ]; then
    docker compose -f docker-compose.web.yml ps > "$snap_dir/docker-compose-web-ps.txt" 2>&1 || true
    docker compose -f docker-compose.web.yml config > "$snap_dir/docker-compose-web-config.yml" 2>&1 || true
  fi

  if command -v dune >/dev/null 2>&1; then
    dune status > "$snap_dir/dune-status.txt" 2>&1 || true
  elif [ -x runtime/scripts/status.sh ]; then
    bash runtime/scripts/status.sh > "$snap_dir/dune-status.txt" 2>&1 || true
  fi

  find runtime -maxdepth 5 -type f -printf '%M %u %g %s %TY-%Tm-%TdT%TH:%TM %p\n' \
    ! -path 'runtime/secrets/*' \
    ! -path 'runtime/backups/*' \
    ! -path 'runtime/generated/*' \
    2>/dev/null | sort > "$snap_dir/runtime-file-inventory.txt" || true

  while IFS= read -r name; do
    [ -n "$name" ] || continue
    safe_name="$(printf '%s' "$name" | tr '/ ' '__')"
    docker logs --timestamps --tail 5000 "$name" > "$snap_dir/container-logs/${safe_name}.log" 2>&1 || true
    docker inspect --format \
      'Name={{.Name}}
Image={{.Config.Image}}
State={{.State.Status}}
StartedAt={{.State.StartedAt}}
FinishedAt={{.State.FinishedAt}}
ExitCode={{.State.ExitCode}}
RestartCount={{.RestartCount}}
NetworkMode={{.HostConfig.NetworkMode}}' \
      "$name" > "$snap_dir/container-state/${safe_name}.txt" 2>&1 || true
  done < <(container_names)

  capture_runtime_logs "$snap_dir"
  redact_tree "$snap_dir"
  echo "$snap_dir"
}

generate_report() {
  local run_dir="$1"
  local report="$run_dir/reports/e2e-report.md"
  mkdir -p "$run_dir/reports"

  {
    echo "# Dune Awakening Self-Host E2E Test Report"
    echo
    echo "## Summary"
    echo
    echo "- Run directory: \`$run_dir\`"
    echo "- Generated: $(iso_utc)"
    if [ -f "$run_dir/metadata.md" ]; then
      grep '^- ' "$run_dir/metadata.md" || true
    fi
    echo
    echo "## Test Scope"
    echo
    echo "This evidence bundle is intended to cover install, WebUI deployment, container/runtime state, and player-connect verification."
    echo
    echo "## Timeline / Operator Notes"
    echo
    if [ -f "$run_dir/notes/timeline.md" ]; then
      cat "$run_dir/notes/timeline.md"
    else
      echo "No operator notes recorded."
    fi
    echo
    echo "## Commands Captured"
    echo
    if [ -f "$run_dir/commands.tsv" ]; then
      echo
      echo '```tsv'
      cat "$run_dir/commands.tsv"
      echo '```'
    else
      echo "No command capture file found."
    fi
    echo
    echo "## Snapshots"
    echo
    if compgen -G "$run_dir/snapshots/*" >/dev/null; then
      for snap in "$run_dir"/snapshots/*; do
        [ -d "$snap" ] || continue
        echo
        echo "### $(basename "$snap")"
        echo
        echo "- Docker state: \`$snap/docker-ps-a.txt\`"
        echo "- Container logs: \`$snap/container-logs/\`"
        echo "- Runtime log files: \`$snap/runtime-log-files/\`"
        echo "- Listening ports: \`$snap/listening-tcp.txt\`"
        if [ -f "$snap/dune-status.txt" ]; then
          echo "- Dune status: \`$snap/dune-status.txt\`"
        fi
      done
    else
      echo "No snapshots captured."
    fi
    echo
    echo "## Review Notes"
    echo
    echo "- Inspect \`container-logs/\` in the WebUI deployment and player-connected snapshots for task execution and join/connect evidence."
    echo "- Inspect \`docker-ps-a.txt\`, \`docker-stats.txt\`, and \`listening-tcp.txt\` for service health and exposed ports."
    echo "- Inspect \`runtime-log-files/\` for game/runtime logs copied from the host filesystem."
    echo "- Secrets are best-effort redacted, but review the bundle before sharing outside trusted maintainers."
  } > "$report"

  echo "$report"
}

start_run() {
  local stamp run_dir
  stamp="$(timestamp_utc)"
  run_dir="$BASE_DIR/$stamp"
  mkdir -p "$run_dir/logs" "$run_dir/snapshots" "$run_dir/notes" "$run_dir/reports"
  printf '%s\n' "$run_dir" > "$ACTIVE_FILE"
  printf 'name\tcommand\texit_code\tlog\n' > "$run_dir/commands.tsv"

  {
    echo "# E2E Capture Metadata"
    echo
    echo "- Started: $(iso_utc)"
    echo "- Run directory: \`$run_dir\`"
    echo "- Host: \`$(hostname 2>/dev/null || true)\`"
    echo "- User: \`$(id -un 2>/dev/null || true)\`"
    echo "- Git branch: \`$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)\`"
    echo "- Git commit: \`$(git rev-parse HEAD 2>/dev/null || true)\`"
  } > "$run_dir/metadata.md"

  append_note "$run_dir" "E2E capture started."
  snapshot "$run_dir" "pre-install" >/dev/null
  echo "E2E capture started: $run_dir"
}

start_watch() {
  local run_dir="$1"
  local pids_file="$run_dir/watch.pids"
  mkdir -p "$run_dir/logs"

  if [ -f "$pids_file" ]; then
    echo "Watchers already appear to be running: $pids_file"
    return 0
  fi

  (
    while true; do
      echo
      echo "## $(iso_utc)"
      docker ps -a 2>&1 || true
      echo
      docker stats --no-stream --no-trunc 2>&1 || true
      echo
      ss -ltnp 2>&1 || true
      sleep "$WATCH_INTERVAL"
    done
  ) > "$run_dir/logs/watch-loop.log" 2>&1 &
  echo "$!" > "$pids_file"

  if command -v docker >/dev/null 2>&1; then
    docker events --since "$(iso_utc)" > "$run_dir/logs/docker-events.log" 2>&1 &
    echo "$!" >> "$pids_file"
  fi

  append_note "$run_dir" "Background watch started."
  echo "Background watch started for: $run_dir"
}

stop_watch() {
  local run_dir="$1"
  local pids_file="$run_dir/watch.pids"
  if [ ! -f "$pids_file" ]; then
    echo "No watcher PID file found."
    return 0
  fi

  while IFS= read -r pid; do
    [ -n "$pid" ] || continue
    kill "$pid" 2>/dev/null || true
  done < "$pids_file"
  rm -f "$pids_file"
  append_note "$run_dir" "Background watch stopped."
  echo "Background watch stopped."
}

command="${1:-}"
case "$command" in
  start)
    start_run
    ;;
  install)
    run_dir="$(current_run_dir)"
    append_note "$run_dir" "Starting install.sh."
    capture_interactive_command "$run_dir" "install-sh" "./install.sh"
    status=$?
    append_note "$run_dir" "install.sh finished with exit code $status."
    exit "$status"
    ;;
  start-watch)
    start_watch "$(current_run_dir)"
    ;;
  stop-watch)
    stop_watch "$(current_run_dir)"
    ;;
  snapshot)
    run_dir="$(current_run_dir)"
    label="${2:-manual}"
    snap="$(snapshot "$run_dir" "$label")"
    echo "Snapshot written: $snap"
    ;;
  note)
    run_dir="$(current_run_dir)"
    shift || true
    append_note "$run_dir" "$*"
    echo "Note added."
    ;;
  finish)
    run_dir="$(current_run_dir)"
    stop_watch "$run_dir" >/dev/null 2>&1 || true
    snapshot "$run_dir" "final" >/dev/null
    append_note "$run_dir" "E2E capture finished."
    report="$(generate_report "$run_dir")"
    rm -f "$ACTIVE_FILE"
    echo "E2E report written: $report"
    echo "Evidence bundle: $run_dir"
    ;;
  path)
    current_run_dir
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $command" >&2
    usage >&2
    exit 2
    ;;
esac
