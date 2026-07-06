#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/issue74-deepdesert-flight-capture-$(date +%Y%m%d-%H%M%S).log"

DURATION="${1:-600}"

redact() {
  sed -E \
    -e 's/[A-Fa-f0-9]{16,}/<REDACTED_HEX>/g' \
    -e 's/(AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig'
}

{
  echo "===== issue 74 deep desert flight capture ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo "Duration seconds: $DURATION"
  echo

  echo "===== git state ====="
  git branch --show-current
  git rev-parse HEAD
  git log -1 --oneline
  git status --short
  echo

  echo "===== map status before ====="
  dune maps status 2>&1 | redact || true
  echo

  echo "===== containers before ====="
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' \
    | grep -Ei 'dune-server|overmap|survival|deepdesert|gateway|director|rabbit|postgres' || true
  echo

  echo "===== container inspect before ====="
  for c in $(docker ps --format '{{.Names}}' | grep -E 'dune-server|overmap|survival|deepdesert|server' || true); do
    echo "---- $c ----"
    docker inspect "$c" --format '
Name={{.Name}}
Image={{.Config.Image}}
NetworkMode={{.HostConfig.NetworkMode}}
CpusetCpus={{.HostConfig.CpusetCpus}}
NanoCpus={{.HostConfig.NanoCpus}}
Memory={{.HostConfig.Memory}}
MemorySwap={{.HostConfig.MemorySwap}}
Mounts={{range .Mounts}}{{.Source}} -> {{.Destination}}; {{end}}
StartedAt={{.State.StartedAt}}
RestartCount={{.RestartCount}}
OOMKilled={{.State.OOMKilled}}
'
  done | redact
  echo

  SINCE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "===== capture window ====="
  echo "Since: $SINCE"
  echo "Now reproduce Deep Desert ornithopter rubber-banding."
  echo "Sleeping $DURATION seconds..."
  echo

  for i in $(seq 1 "$DURATION"); do
    if [ $((i % 30)) -eq 0 ]; then
      echo "===== docker stats sample t+${i}s ====="
      docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}' \
        | grep -Ei 'dune-server|overmap|survival|deepdesert|gateway|director|rabbit|postgres' || true
      echo
    fi
    sleep 1
  done

  echo "===== logs after capture ====="
  for c in $(docker ps --format '{{.Names}}' | grep -E 'dune-server|overmap|survival|deepdesert|server' || true); do
    echo "---- $c ----"
    docker logs --since "$SINCE" "$c" 2>&1 \
      | grep -Ei 'LogDuneVehicle|replicated inputs|possible speed cheating|dropped [0-9]+/[0-9]+|Vehicle|Ornithopter|rubber|correction|LogGarbage|Garbage Collection time|Missed Acks|LogNetTraffic|ping|timeout|hitch|EQS|over threshold|warning|error' \
      | tail -500 \
      | redact || true
    echo
  done

  echo "===== map status after ====="
  dune maps status 2>&1 | redact || true
} | tee "$OUT"

echo
echo "Saved: $OUT"
