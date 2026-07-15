#!/usr/bin/env bash
# dune-cli-test.sh — Automated CLI test suite for the dune management script
# Tests all privileged operations: self-update, console restart, service management
# Must be run from a clean install with a running stack
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DUNE="./runtime/scripts/dune"
PASS=0
FAIL=0
SKIP=0

pass() { echo -e "  \033[0;32m✓ $*\033[0m"; PASS=$((PASS + 1)); }
fail() { echo -e "  \033[0;31m✗ $*\033[0m"; FAIL=$((FAIL + 1)); }
skip() { echo -e "  \033[1;33m- $* (SKIP)\033[0m"; SKIP=$((SKIP + 1)); }

echo "============================================="
echo "  DUNE CLI Test Suite"
echo "============================================="

# ── Test 1: Script exists and is executable ──
echo ""
echo "1. Script presence"
if [ -x "$DUNE" ]; then
  pass "dune script exists and is executable"
else
  fail "dune script missing or not executable"
fi

# ── Test 2: Version ──
echo ""
echo "2. Version"
VERSION_OUT=$("$DUNE" version 2>&1) || true
if echo "$VERSION_OUT" | grep -qE '[0-9]+\.[0-9]+'; then
  pass "version: $VERSION_OUT"
else
  fail "version command failed: $VERSION_OUT"
fi

# ── Test 3: Status reports containers ──
echo ""
echo "3. Status"
STATUS_OUT=$("$DUNE" status 2>&1) || true
if echo "$STATUS_OUT" | grep -qE 'orchestrator|console|gateway|rabbitmq'; then
  pass "status shows running services"
else
  fail "status doesn't show expected services: $(echo "$STATUS_OUT" | head -3)"
fi

# ── Test 4: Servers list ──
echo ""
echo "4. Servers"
SERVERS_OUT=$("$DUNE" servers 2>&1) || true
if echo "$SERVERS_OUT" | grep -qE 'Survival_1|Overmap|DeepDesert|map='; then
  pass "servers shows game maps"
else
  fail "servers doesn't show game maps: $(echo "$SERVERS_OUT" | head -3)"
fi

# ── Test 5: Ports ──
echo ""
echo "5. Ports"
PORTS_OUT=$("$DUNE" ports 2>&1) || true
if echo "$PORTS_OUT" | grep -qE '8088|7777|31982'; then
  pass "ports shows expected ports"
else
  skip "ports output doesn't show expected ports (OK if different config)"
fi

# ── Test 6: Ping/Ready ──
echo ""
echo "6. Ready check"
READY_OUT=$("$DUNE" ready 2>&1) || true
if echo "$READY_OUT" | grep -qiE 'ready|healthy|ok'; then
  pass "ready check: $(echo "$READY_OUT" | head -1)"
else
  fail "ready check failed: $(echo "$READY_OUT" | head -3)"
fi

# ── Test 7: Logs (read-only, no permission errors) ──
echo ""
echo "7. Logs permissions"
LOGS_OUT=$("$DUNE" logs survival 2>&1 | head -5) || true
if echo "$LOGS_OUT" | grep -qiE 'permission|denied|access'; then
  fail "logs show permission error: $(echo "$LOGS_OUT" | head -2)"
else
  pass "logs accessible (no permission errors)"
fi

# ── Test 8: Console restart (CRITICAL — was broken by PR #13) ──
echo ""
echo "8. Console restart"
CONSOLE_OUT=$("$DUNE" console restart 2>&1) || true
if echo "$CONSOLE_OUT" | grep -qiE 'permission|denied|error|failed|cannot'; then
  fail "console restart failed: $(echo "$CONSOLE_OUT" | head -3)"
else
  pass "console restart triggered: $(echo "$CONSOLE_OUT" | head -1)"
fi
# Wait for console to come back
sleep 5
if curl -s --max-time 5 http://localhost:8088/api/health 2>/dev/null | grep -q '"ok":true'; then
  pass "console came back online after restart"
else
  fail "console did not come back online after restart"
fi

# ── Test 9: Shutdown protection toggle ──
echo ""
echo "9. Shutdown protection"
PROTECT_OUT=$("$DUNE" shutdown-protection 2>&1) || true
if [ -f "$REPO_ROOT/runtime/generated/.shutdown-protection" ]; then
  pass "shutdown protection flag file created"
elif echo "$PROTECT_OUT" | grep -qiE 'error|fail'; then
  fail "shutdown protection failed: $PROTECT_OUT"
else
  skip "shutdown protection not applicable in this environment"
fi

# ── Test 10: Config read ──
echo ""
echo "10. Config read"
CONFIG_OUT=$("$DUNE" config title 2>&1) || true
if echo "$CONFIG_OUT" | grep -qE 'Current server title|SERVER_TITLE|Title:'; then
  pass "config readable: $(echo "$CONFIG_OUT" | head -1)"
else
  fail "config read failed: $(echo "$CONFIG_OUT" | head -3)"
fi

# ── Test 11: Web UI health ──
echo ""
echo "11. Web UI"
WEB_OUT=$(curl -s --max-time 5 http://localhost:8088/api/health 2>/dev/null) || true
if echo "$WEB_OUT" | grep -q '"ok":true'; then
  pass "web UI API responding"
else
  fail "web UI API not responding: $WEB_OUT"
fi

# ── Test 12: Web UI login works ──
echo ""
echo "12. Web UI auth"
PASSWORD=$(cat "$REPO_ROOT/runtime/secrets/admin-web-password.txt" 2>/dev/null || echo "")
if [ -n "$PASSWORD" ]; then
  LOGIN_OUT=$(curl -s --max-time 5 -X POST http://localhost:8088/api/login \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$PASSWORD\"}" 2>/dev/null) || true
  if echo "$LOGIN_OUT" | grep -q '"error".*session expired'; then
    skip "login session expired (expected after restart)"
  elif echo "$LOGIN_OUT" | grep -q '"error"'; then
    fail "login returned error: $LOGIN_OUT"
  else
    pass "login successful"
  fi
else
  skip "no admin password file found"
fi

# ── Test 13: DB access ──
echo ""
echo "13. Database"
if docker exec dune-postgres psql -U dune -d dune -c "SELECT 1" 2>&1 > /dev/null; then
  pass "database accessible"
else
  fail "database not accessible"
fi

# ── Test 14: Gateway restart (single service) ──
echo ""
echo "14. Gateway restart"
GATEWAY_OUT=$("$DUNE" gateway 2>&1) || true
if echo "$GATEWAY_OUT" | grep -qiE 'error|fail|permission'; then
  fail "gateway restart failed: $GATEWAY_OUT"
else
  pass "gateway restart triggered"
fi

# ── Test 15: Orchestrator runs as non-root ──
echo ""
echo "15. Orchestrator user"
ORCH_USER=$(docker exec dune-orchestrator id -un 2>/dev/null || echo "unknown")
if [ "$ORCH_USER" = "dune" ]; then
  pass "orchestrator running as dune (non-root)"
elif [ "$ORCH_USER" = "root" ]; then
  skip "orchestrator running as root (expected if DUNE_HOST_UID=0)"
else
  fail "orchestrator running as unknown user: $ORCH_USER"
fi

# ── Test 16: Console runs as non-root ──
echo ""
echo "16. Console user"
CONSOLE_USER=$(docker exec redblink-dune-docker-console id -un 2>/dev/null || echo "unknown")
if [ "$CONSOLE_USER" = "dune" ]; then
  pass "console running as dune (non-root)"
elif [ "$CONSOLE_USER" = "root" ]; then
  skip "console running as root (expected if DUNE_HOST_UID=0)"
else
  pass "console running as $CONSOLE_USER"
fi

# ── Test 17: Self-update helper image exists ──
echo ""
echo "17. Self-update image"
if docker image inspect redblink-dune-docker-console:dev 2>&1 > /dev/null; then
# ── Test 20: Self-update helper args (simulate — don't actually update) ──
echo ""
echo "20. Self-update capability"
if docker image inspect redblink-dune-docker-console:dev 2>&1 > /dev/null; then
  # Verify the helper args include --user and --group-add
  HELPER_FUNC=$(grep -A20 "buildSelfUpdateHelperDockerArgs" console/api/src/tasks.js 2>/dev/null | grep -c "\-\-user\|\-\-group\-add" || true)
  if [ "$HELPER_FUNC" -ge 2 ]; then
    pass "self-update helper includes --user and --group-add"
  else
    fail "self-update helper missing --user or --group-add (may break on non-root)"
  fi
else
  skip "console image not built"
fi
else
  skip "console image not found (need to build first)"
fi

# ── Test 18: IP change restart script ──
echo ""
echo "18. IP change restart"
if [ -x "$REPO_ROOT/runtime/scripts/ip-change-restart.sh" ]; then
  pass "ip-change-restart.sh exists and executable"
else
  fail "ip-change-restart.sh missing"
fi

# ── Test 19: Restart schedule script ──
echo ""
echo "19. Restart schedule"
if [ -x "$REPO_ROOT/runtime/scripts/restart-schedule.sh" ]; then
  pass "restart-schedule.sh exists and executable"
else
  fail "restart-schedule.sh missing"
fi

# ── Results ──
echo ""
echo "============================================="
echo "  RESULTS: $PASS pass, $FAIL fail, $SKIP skip"
echo "============================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
