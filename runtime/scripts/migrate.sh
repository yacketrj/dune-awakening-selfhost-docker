#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
ROOT_DIR="$(pwd)"

FROM_VERSION="${1:-}"
TO_VERSION="${2:-}"

if [ -z "$FROM_VERSION" ] || [ -z "$TO_VERSION" ]; then
  echo "Usage: $0 <from_version> <to_version>"
  exit 1
fi

FROM_VERSION="${FROM_VERSION#v}"
TO_VERSION="${TO_VERSION#v}"

MIGRATION_LOG="runtime/generated/migration-$(date +%Y%m%d-%H%M%S).log"
mkdir -p runtime/generated

log() {
  local msg="[$(date '+%H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$MIGRATION_LOG"
}

version_compare() {
  local v1="$1"
  local v2="$2"
  v1="${v1#v}"
  v2="${v2#v}"
  [ "$v1" = "$v2" ] && return 1
  [ "$(printf '%s\n%s\n' "$v1" "$v2" | sort -V | tail -n1)" = "$v2" ]
}

version_jump_distance() {
  local from="$1"
  local to="$2"
  from="${from#v}"
  to="${to#v}"

  local from_minor to_minor
  from_minor="$(echo "$from" | cut -d. -f2)"
  to_minor="$(echo "$to" | cut -d. -f2)"

  local from_patch to_patch
  from_patch="$(echo "$from" | cut -d. -f3)"
  to_patch="$(echo "$to" | cut -d. -f3)"

  echo $(( (to_minor - from_minor) * 100 + (to_patch - from_patch) ))
}

detect_breaking_changes() {
  local from="$1"
  local to="$2"
  local breaking=()

  if version_compare "$from" "1.3.50" && ! version_compare "$to" "1.3.49"; then
    breaking+=("v1.3.50: Added DUNE_HOST_UID/GID for container permissions")
  fi

  if version_compare "$from" "1.3.54" && ! version_compare "$to" "1.3.53"; then
    breaking+=("v1.3.54: Runtime permissions fix across upgrades")
  fi

  if [ ${#breaking[@]} -gt 0 ]; then
    echo "BREAKING_CHANGES"
    printf '%s\n' "${breaking[@]}"
    return 0
  fi

  return 1
}

migrate_env_file() {
  local env_file="$1"
  local backup="${env_file}.pre-migration"

  [ -f "$env_file" ] || return 0

  cp "$env_file" "$backup"
  log "Backed up $env_file to $backup"

  local migrated=0

  if grep -q "^DUNE_HOST_UID=0$" "$env_file" 2>/dev/null; then
    if [ "$(id -u)" != "0" ]; then
      sed -i "s/^DUNE_HOST_UID=0$/DUNE_HOST_UID=$(id -u)/" "$env_file"
      log "Fixed DUNE_HOST_UID from 0 to $(id -u)"
      migrated=1
    fi
  fi

  if grep -q "^DUNE_HOST_GID=0$" "$env_file" 2>/dev/null; then
    if [ "$(id -g)" != "0" ]; then
      sed -i "s/^DUNE_HOST_GID=0$/DUNE_HOST_GID=$(id -g)/" "$env_file"
      log "Fixed DUNE_HOST_GID from 0 to $(id -g)"
      migrated=1
    fi
  fi

  if ! grep -q "^DUNE_COMPOSE_PROJECT_NAME=" "$env_file" 2>/dev/null; then
    if [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
      echo "DUNE_COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}" >> "$env_file"
      log "Added DUNE_COMPOSE_PROJECT_NAME from environment"
      migrated=1
    fi
  fi

  if [ "$migrated" -eq 1 ]; then
    log "Environment file migrated: $env_file"
  else
    log "No migrations needed for $env_file"
    rm -f "$backup"
  fi
}

migrate_compose_volumes() {
  local compose_file="$1"

  [ -f "$compose_file" ] || return 0

  if docker volume ls --format '{{.Name}}' 2>/dev/null | grep -q "^dune-postgres-data$"; then
    if ! docker volume ls --format '{{.Name}}' 2>/dev/null | grep -q "^dune-postgres-data-clean$"; then
      log "Found legacy dune-postgres-data volume"
      log "Consider backing up before migration: docker run --rm -v dune-postgres-data:/data -v \$(pwd):/backup alpine tar czf /backup/postgres-backup-\$(date +%Y%m%d).tar.gz /data"
    fi
  fi
}

check_config_compatibility() {
  local from="$1"
  local to="$2"
  local warnings=()

  if [ -f .env ]; then
    if grep -q "^DUNE_HOST_UID=0$" .env && [ "$(id -u)" != "0" ]; then
      warnings+=("DUNE_HOST_UID=0 in .env but running as non-root user $(id -u)")
    fi

    if grep -q "^DUNE_HOST_GID=0$" .env && [ "$(id -g)" != "0" ]; then
      warnings+=("DUNE_HOST_GID=0 in .env but running as non-root group $(id -g)")
    fi
  fi

  if [ -f docker-compose.yml ]; then
    if grep -q "container_name:" docker-compose.yml; then
      warnings+=("docker-compose.yml contains container_name directives - may need docker rm -f before update")
    fi
  fi

  if [ ${#warnings[@]} -gt 0 ]; then
    echo "CONFIG_WARNINGS"
    printf '%s\n' "${warnings[@]}"
    return 0
  fi

  return 1
}

main() {
  log "Starting migration from v$FROM_VERSION to v$TO_VERSION"

  local jump_distance
  jump_distance="$(version_jump_distance "$FROM_VERSION" "$TO_VERSION")"

  if [ "$jump_distance" -gt 200 ]; then
    log "WARNING: Large version jump detected ($jump_distance patch versions)"
    log "Consider updating incrementally through intermediate versions"
  fi

  log "Checking for breaking changes..."
  if detect_breaking_changes "$FROM_VERSION" "$TO_VERSION" > /tmp/breaking.txt 2>&1; then
    log "BREAKING CHANGES DETECTED:"
    cat /tmp/breaking.txt | while read -r line; do
      [ "$line" = "BREAKING_CHANGES" ] && continue
      log "  - $line"
    done
    log ""
    log "These changes may require manual intervention. Review the changelog before proceeding."
  fi
  rm -f /tmp/breaking.txt

  log "Checking config compatibility..."
  if check_config_compatibility "$FROM_VERSION" "$TO_VERSION" > /tmp/warnings.txt 2>&1; then
    log "CONFIG WARNINGS:"
    cat /tmp/warnings.txt | while read -r line; do
      [ "$line" = "CONFIG_WARNINGS" ] && continue
      log "  - $line"
    done
  fi
  rm -f /tmp/warnings.txt

  log "Migrating environment files..."
  migrate_env_file ".env"
  migrate_env_file "runtime/generated/battlegroup.env"

  log "Checking compose volumes..."
  migrate_compose_volumes "docker-compose.yml"

  log "Migration pre-flight complete"
  log "Log saved to: $MIGRATION_LOG"
}

main
