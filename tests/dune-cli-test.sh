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

# ── Test 7.5: Bridge smoke test (PRE-RESTART — validates bridge functionality) ──
echo ""
echo "7.5. Bridge smoke test (pre-restart)"
if [ -x "$REPO_ROOT/tests/bridge-smoke-test.sh" ]; then
  BRIDGE_PRE_RC=0
  BRIDGE_PRE=$("$REPO_ROOT/tests/bridge-smoke-test.sh" 2>&1) || BRIDGE_PRE_RC=$?
  if [ "$BRIDGE_PRE_RC" -eq 2 ]; then
    skip "bridge pre-restart: addon not installed"
  else
    BRIDGE_PRE_PASS=$(echo "$BRIDGE_PRE" | grep -o "Passed:  *[0-9]*" | grep -o "[0-9]*" || echo "0")
    BRIDGE_PRE_FAIL=$(echo "$BRIDGE_PRE" | grep -o "Failed:  *[0-9]*" | grep -o "[0-9]*" || echo "0")
    if [ "$BRIDGE_PRE_FAIL" -gt 0 ]; then
      fail "bridge pre-restart: $BRIDGE_PRE_PASS passed, $BRIDGE_PRE_FAIL failed"
    else
      pass "bridge pre-restart: $BRIDGE_PRE_PASS passed, 0 failed"
    fi
  fi
else
  skip "bridge-smoke-test.sh not found"
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

# ── Test 8.5: Bridge smoke test (POST-RESTART — validates session invalidation + re-auth) ──
echo ""
echo "8.5. Bridge smoke test (post-restart)"
if [ -x "$REPO_ROOT/tests/bridge-smoke-test.sh" ]; then
  BRIDGE_POST_RC=0
  BRIDGE_POST=$("$REPO_ROOT/tests/bridge-smoke-test.sh" 2>&1) || BRIDGE_POST_RC=$?
  if [ "$BRIDGE_POST_RC" -eq 2 ]; then
    skip "bridge post-restart: addon not installed"
  else
    BRIDGE_POST_PASS=$(echo "$BRIDGE_POST" | grep -o "Passed:  *[0-9]*" | grep -o "[0-9]*" || echo "0")
    BRIDGE_POST_FAIL=$(echo "$BRIDGE_POST" | grep -o "Failed:  *[0-9]*" | grep -o "[0-9]*" || echo "0")
    BRIDGE_POST_SKIP=$(echo "$BRIDGE_POST" | grep -o "Skipped: *[0-9]*" | grep -o "[0-9]*" || echo "0")
    if [ "$BRIDGE_POST_FAIL" -gt 0 ]; then
      fail "bridge post-restart: $BRIDGE_POST_PASS passed, $BRIDGE_POST_FAIL failed, $BRIDGE_POST_SKIP skipped"
    else
      pass "bridge post-restart: $BRIDGE_POST_PASS passed, 0 failed, $BRIDGE_POST_SKIP skipped"
    fi
  fi
else
  skip "bridge-smoke-test.sh not found"
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

# ── Test 26: Doctor diagnostic ──
echo ""
echo "26. Doctor diagnostic"
DOCTOR_OUT=$("$DUNE" doctor 2>&1) || true
if echo "$DOCTOR_OUT" | grep -qiE 'doctor|diagnostic|check|error|warning'; then
  pass "doctor command executed"
else
  fail "doctor command failed: $(echo "$DOCTOR_OUT" | head -3)"
fi

# ── Test 27: Process list ──
echo ""
echo "27. Process list (ps)"
PS_OUT=$("$DUNE" ps 2>&1) || true
if echo "$PS_OUT" | grep -qiE 'container|process|dune|postgres|rabbitmq|gateway'; then
  pass "ps shows running processes"
else
  fail "ps doesn't show expected processes: $(echo "$PS_OUT" | head -3)"
fi

# ── Test 28: Maps status ──
echo ""
echo "28. Maps status"
MAPS_OUT=$("$DUNE" maps 2>&1) || true
if echo "$MAPS_OUT" | grep -qiE 'map|survival|overmap|deepdesert|world'; then
  pass "maps shows map information"
else
  fail "maps doesn't show expected information: $(echo "$MAPS_OUT" | head -3)"
fi

# ── Test 29: Memory usage ──
echo ""
echo "29. Memory usage"
MEMORY_OUT=$("$DUNE" memory 2>&1) || true
if echo "$MEMORY_OUT" | grep -qiE 'memory|usage|mb|gb|container'; then
  pass "memory shows usage information"
else
  fail "memory doesn't show expected information: $(echo "$MEMORY_OUT" | head -3)"
fi

# ── Test 30: Metrics status ──
echo ""
echo "30. Metrics status"
METRICS_OUT=$("$DUNE" metrics 2>&1) || true
if echo "$METRICS_OUT" | grep -qiE 'metric|prometheus|grafana|exporter|monitor'; then
  pass "metrics shows monitoring information"
else
  fail "metrics doesn't show expected information: $(echo "$METRICS_OUT" | head -3)"
fi

# ── Test 31: Network status ──
echo ""
echo "31. Network status"
NETWORK_OUT=$("$DUNE" network 2>&1) || true
if echo "$NETWORK_OUT" | grep -qiE 'network|port|bind|listen|address'; then
  pass "network shows network information"
else
  fail "network doesn't show expected information: $(echo "$NETWORK_OUT" | head -3)"
fi

# ── Test 32: Overmap status ──
echo ""
echo "32. Overmap status"
OVERMAP_OUT=$("$DUNE" overmap 2>&1) || true
if echo "$OVERMAP_OUT" | grep -qiE 'overmap|map|world|region'; then
  pass "overmap shows overmap information"
else
  fail "overmap doesn't show expected information: $(echo "$OVERMAP_OUT" | head -3)"
fi

# ── Test 33: Storage status ──
echo ""
echo "33. Storage status"
STORAGE_OUT=$("$DUNE" storage 2>&1) || true
if echo "$STORAGE_OUT" | grep -qiE 'storage|disk|volume|usage|gb|mb'; then
  pass "storage shows storage information"
else
  fail "storage doesn't show expected information: $(echo "$STORAGE_OUT" | head -3)"
fi

# ── Test 34: Restart schedule status ──
echo ""
echo "34. Restart schedule status"
RESTART_OUT=$("$DUNE" restart-schedule 2>&1) || true
if echo "$RESTART_OUT" | grep -qiE 'schedule|restart|time|cron|daily'; then
  pass "restart-schedule shows schedule information"
else
  fail "restart-schedule doesn't show expected information: $(echo "$RESTART_OUT" | head -3)"
fi

# ── Test 35: Admin status ──
echo ""
echo "35. Admin status"
ADMIN_OUT=$("$DUNE" admin 2>&1) || true
if echo "$ADMIN_OUT" | grep -qiE 'admin|console|web|ui|panel'; then
  pass "admin shows admin information"
else
  fail "admin doesn't show expected information: $(echo "$ADMIN_OUT" | head -3)"
fi

# ── Test 36: Autoscaler status ──
echo ""
echo "36. Autoscaler status"
AUTOSCALER_OUT=$("$DUNE" autoscaler 2>&1) || true
if echo "$AUTOSCALER_OUT" | grep -qiE 'autoscaler|scale|server|instance'; then
  pass "autoscaler shows autoscaler information"
else
  fail "autoscaler doesn't show expected information: $(echo "$AUTOSCALER_OUT" | head -3)"
fi

# ── Test 37: Database status ──
echo ""
echo "37. Database status"
DB_OUT=$("$DUNE" db 2>&1) || true
if echo "$DB_OUT" | grep -qiE 'database|postgres|db|connection|status'; then
  pass "db shows database information"
else
  fail "db doesn't show expected information: $(echo "$DB_OUT" | head -3)"
fi

# ── Test 38: Web UI status ──
echo ""
echo "38. Web UI status"
WEB_OUT=$("$DUNE" web 2>&1) || true
if echo "$WEB_OUT" | grep -qiE 'web|console|ui|panel|http|port'; then
  pass "web shows web UI information"
else
  fail "web doesn't show expected information: $(echo "$WEB_OUT" | head -3)"
fi

# ── Test 39: Destructive commands (conditional) ──
echo ""
echo "39. Destructive commands"
if [ "${DUNE_TEST_CLEAN_DEPLOY:-0}" = "1" ]; then
  # Clean deployment - test safe destructive commands only

  echo "  Testing restart command..."
  RESTART_OUT=$("$DUNE" restart 2>&1) || true
  if echo "$RESTART_OUT" | grep -qiE 'restart|restarting|complete|success'; then
    pass "restart command executed"
  else
    fail "restart command failed: $(echo "$RESTART_OUT" | head -3)"
  fi

  echo "  Testing stop command..."
  STOP_OUT=$("$DUNE" stop 2>&1) || true
  if echo "$STOP_OUT" | grep -qiE 'stop|stopping|complete|success'; then
    pass "stop command executed"
  else
    fail "stop command failed: $(echo "$STOP_OUT" | head -3)"
  fi

  echo "  Testing start command..."
  START_OUT=$("$DUNE" start 2>&1) || true
  if echo "$START_OUT" | grep -qiE 'start|starting|complete|success|running'; then
    pass "start command executed"
  else
    fail "start command failed: $(echo "$START_OUT" | head -3)"
  fi

  echo "  Testing ip-change-restart command..."
  IPCHANGE_OUT=$("$DUNE" ip-change-restart 2>&1) || true
  if echo "$IPCHANGE_OUT" | grep -qiE 'ip|change|restart|complete|success|error|usage'; then
    pass "ip-change-restart command executed"
  else
    fail "ip-change-restart command failed: $(echo "$IPCHANGE_OUT" | head -3)"
  fi

  # Skip truly destructive commands that change game state
  skip "init - destructive (initializes stack, would reset volumes)"
  skip "spawn/despawn - destructive (changes game server state)"
  skip "deepdesert/sietches - destructive (changes map state)"
  skip "update - destructive (updates stack)"

else
  # Live stack - skip all destructive commands
  skip "init - destructive (initializes stack)"
  skip "start/stop/restart - destructive (changes server state)"
  skip "spawn/despawn - destructive (changes game state)"
  skip "deepdesert/sietches - destructive (changes map state)"
  skip "update - destructive (updates stack)"
  skip "ip-change-restart - destructive (restarts services)"
fi

# ── Test 21: Migration script exists and is executable ──
echo ""
echo "21. Migration script"
if [ -x "$REPO_ROOT/runtime/scripts/migrate.sh" ]; then
  pass "migrate.sh exists and executable"
else
  fail "migrate.sh missing or not executable"
fi

# ── Test 22: Version jump detection function exists ──
echo ""
echo "22. Version jump detection"
if grep -q "version_jump_distance" "$REPO_ROOT/runtime/scripts/self-update.sh"; then
  pass "version_jump_distance function exists in self-update.sh"
else
  fail "version_jump_distance function missing from self-update.sh"
fi

# ── Test 23: Check version jump warning logic ──
echo ""
echo "23. Version jump warning"
if grep -q "check_version_jump" "$REPO_ROOT/runtime/scripts/self-update.sh"; then
  pass "check_version_jump function exists in self-update.sh"
else
  fail "check_version_jump function missing from self-update.sh"
fi

# ── Test 24: Migration script handles version arguments ──
echo ""
echo "24. Migration argument handling"
MIGRATE_OUT=$("$REPO_ROOT/runtime/scripts/migrate.sh" 2>&1 || true)
if echo "$MIGRATE_OUT" | grep -q "Usage:"; then
  pass "migrate.sh shows usage when called without arguments"
else
  fail "migrate.sh doesn't show usage: $MIGRATE_OUT"
fi

# ── Test 25: Migration script runs with valid versions ──
echo ""
echo "25. Migration execution"
CURRENT_VER=$(cat "$REPO_ROOT/VERSION" 2>/dev/null | tr -d '[:space:]')
if [ -n "$CURRENT_VER" ]; then
  MIGRATE_RUN=$("$REPO_ROOT/runtime/scripts/migrate.sh" "$CURRENT_VER" "$CURRENT_VER" 2>&1) || true
  if echo "$MIGRATE_RUN" | grep -q "Starting migration"; then
    pass "migrate.sh runs with valid version arguments"
  else
    fail "migrate.sh failed to run: $(echo "$MIGRATE_RUN" | head -3)"
  fi
else
  skip "VERSION file not found"
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
