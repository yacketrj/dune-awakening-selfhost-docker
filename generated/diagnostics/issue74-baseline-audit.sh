#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/issue74-baseline-audit-$(date +%Y%m%d-%H%M%S).log"

redact() {
  sed -E \
    -e 's/[A-Fa-f0-9]{16,}/<REDACTED_HEX>/g' \
    -e 's/(AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig'
}

{
  echo "===== issue 74 baseline audit ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== git state ====="
  git remote -v
  echo
  git branch --show-current
  git rev-parse HEAD
  git log -1 --oneline
  git status --short
  echo

  echo "===== known-bad repo/runtime references ====="
  grep -RniE 'cpuset|DUNE_CPUSET|m_MaxFps|NetServerMaxTickRate|MaxPhysicsDeltaTime|m_MaxSimulationTimeStepDefault|DefaultGame.ini|DefaultEngine.ini|udp-relay|start-relay|always.?on|DeepDesert' \
    . runtime 2>/dev/null \
    | redact \
    | head -500 || true
  echo

  echo "===== container resource/network/mount state ====="
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

  echo "===== recent vehicle warnings ====="
  for c in $(docker ps --format '{{.Names}}' | grep -E 'dune-server|overmap|survival|deepdesert|server' || true); do
    echo "---- $c ----"
    docker logs --since 2h "$c" 2>&1 \
      | grep -Ei 'LogDuneVehicle|replicated inputs|speed cheating|rubber|correction|vehicle|ornithopter|warning|error' \
      | tail -200 \
      | redact || true
  done
} | tee "$OUT"

echo
echo "Saved: $OUT"
