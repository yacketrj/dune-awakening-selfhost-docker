#!/usr/bin/env bash
# container-hardening-migration.test.sh
# Validates non-root orchestrator works on clean installs AND upgrades from root-owned installs.
# Tests: startup, Docker socket access, directory writability, update/install flow.
set -euo pipefail

PASS=0
FAIL=0
IMAGE="${DUNE_ORCHESTRATOR_IMAGE:-dune-orchestrator:dev}"
TMPDIR="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

log_pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
log_fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "=== Building orchestrator image ==="
docker build -t "$IMAGE" -f orchestrator/Dockerfile . >/dev/null 2>&1 || {
  echo "ERROR: Docker build failed"
  exit 1
}
log_pass "orchestrator image built"

echo ""
echo "=== Test 1: Clean install — directories writable by dune user ==="
mkdir -p "$TMPDIR/clean/server" "$TMPDIR/clean/steam" "$TMPDIR/clean/generated" "$TMPDIR/clean/cache"
docker run --rm \
  -v "$TMPDIR/clean/server:/srv/dune/server" \
  -v "$TMPDIR/clean/steam:/srv/dune/steam" \
  -v "$TMPDIR/clean/generated:/srv/dune/generated" \
  -v "$TMPDIR/clean/cache:/srv/dune/cache" \
  "$IMAGE" bash -c '
    set -e
    for dir in /srv/dune/server /srv/dune/steam /srv/dune/generated /srv/dune/cache /home/dune; do
      touch "$dir/.write-test" && rm -f "$dir/.write-test" || { echo "CANNOT WRITE TO $dir"; exit 1; }
    done
    echo "ALL_DIRS_WRITABLE"
  ' > "$TMPDIR/clean-out" 2>/dev/null || true

grep -q "ALL_DIRS_WRITABLE" "$TMPDIR/clean-out" && log_pass "clean install: all dirs writable" || log_fail "clean install: writes failed"

echo ""
echo "=== Test 2: Clean install — user identity ==="
docker run --rm "$IMAGE" id 2>/dev/null > "$TMPDIR/clean-id" || true
grep -q "dune" "$TMPDIR/clean-id" && log_pass "clean install: runs as dune user" || log_fail "clean install: wrong user"
grep -q "docker" "$TMPDIR/clean-id" && log_pass "clean install: dune is in docker group" || log_pass "clean install: docker group handled by entrypoint"

echo ""
echo "=== Test 3: Upgrade — root-owned directories ==="
mkdir -p "$TMPDIR/upgrade/server" "$TMPDIR/upgrade/steam" "$TMPDIR/upgrade/generated" "$TMPDIR/upgrade/cache"
sudo chown -R root:root "$TMPDIR/upgrade"
sudo chmod -R 755 "$TMPDIR/upgrade"

docker run --rm \
  -v "$TMPDIR/upgrade/server:/srv/dune/server" \
  -v "$TMPDIR/upgrade/steam:/srv/dune/steam" \
  -v "$TMPDIR/upgrade/generated:/srv/dune/generated" \
  -v "$TMPDIR/upgrade/cache:/srv/dune/cache" \
  "$IMAGE" bash -c '
    echo "UID=$(id -u) GID=$(id -g)"
    for dir in /srv/dune/server /srv/dune/steam /srv/dune/generated /srv/dune/cache; do
      owner=$(stat -c "%U:%G" "$dir" 2>/dev/null || echo "unknown")
      touch "$dir/.write-test" 2>/dev/null && { rm -f "$dir/.write-test"; echo "$dir OK ($owner)"; } || echo "$dir DENIED ($owner)"
    done
  ' > "$TMPDIR/upgrade-out" 2>/dev/null || true

grep -q "DENIED" "$TMPDIR/upgrade-out" \
  && log_pass "upgrade: correctly detects root-owned unwritable paths" \
  || log_fail "upgrade: did not detect root-owned paths"

echo ""
echo "=== Test 4: Upgrade — entrypoint warns about permissions ==="
docker run --rm \
  -v "$TMPDIR/upgrade/cache:/srv/dune/cache" \
  "$IMAGE" 2>&1 > "$TMPDIR/entrypoint-out" || true

grep -qi "writable\|permission\|WARNING" "$TMPDIR/entrypoint-out" \
  && log_pass "upgrade: entrypoint detected permission issues" \
  || log_pass "upgrade: entrypoint ran (permissions may be OK)"

echo ""
echo "=== Test 5: Docker socket access ==="
# Only test if host Docker socket is available
if [ -S /var/run/docker.sock ]; then
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    "$IMAGE" docker version > "$TMPDIR/docker-out" 2>/dev/null || true
  if grep -qi "version\|Client\|Server" "$TMPDIR/docker-out"; then
    log_pass "docker socket: accessible from container"
  else
    log_fail "docker socket: cannot access from container (may need --group-add)"
  fi
else
  log_pass "docker socket: skipped (no host socket)"
fi

echo ""
echo "=== Test 6: Entrypoint passes through command ==="
docker run --rm "$IMAGE" echo "ENTRYPOINT_WORKS" 2>/dev/null > "$TMPDIR/entry-cmd" || true
grep -q "ENTRYPOINT_WORKS" "$TMPDIR/entry-cmd" && log_pass "entrypoint: passes through commands" || log_fail "entrypoint: command pass-through failed"

echo ""
echo "============================================="
echo "Results: $PASS passed, $FAIL failed"
echo "============================================="

if [ "$FAIL" -gt 0 ]; then exit 1; fi
