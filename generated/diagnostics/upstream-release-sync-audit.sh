#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/upstream-release-sync-audit-$(date +%Y%m%d-%H%M%S).log"

redact() {
  sed -E \
    -e 's/[A-Fa-f0-9]{16,}/<REDACTED_HEX>/g' \
    -e 's/(player\.#\.)[^[:space:]]+/\1<REDACTED_PLAYER_ROUTE>/g' \
    -e 's/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig' \
    -e 's/(user_id|app_id)([=:][^, ]+)/\1=<redacted>/Ig'
}

{
  echo "===== upstream release sync audit ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== git remotes ====="
  git remote -v || true
  echo

  echo "===== current branch/state ====="
  git branch --show-current || true
  git status --short || true
  echo

  REMOTE="upstream"
  if ! git remote | grep -qx "upstream"; then
    REMOTE="origin"
  fi

  echo "Using remote: $REMOTE"
  echo

  echo "===== fetch all remotes/tags ====="
  git fetch --all --tags --prune
  echo

  echo "===== latest tags ====="
  git for-each-ref --sort=-creatordate --format='%(refname:short) %(creatordate:iso8601)' refs/tags | head -20 || true
  echo

  LATEST_TAG="$(git for-each-ref --sort=-creatordate --format='%(refname:short)' refs/tags | head -1 || true)"
  REMOTE_HEAD_BRANCH="$(git remote show "$REMOTE" 2>/dev/null | sed -n 's/.*HEAD branch: //p' | head -1 || true)"

  if [ -n "$LATEST_TAG" ]; then
    TARGET_REF="$LATEST_TAG"
  elif [ -n "$REMOTE_HEAD_BRANCH" ]; then
    TARGET_REF="$REMOTE/$REMOTE_HEAD_BRANCH"
  else
    TARGET_REF="$REMOTE/main"
  fi

  echo "Selected target ref: $TARGET_REF"
  echo

  echo "===== commits current..target ====="
  git log --oneline --decorate --max-count=80 HEAD.."$TARGET_REF" || true
  echo

  echo "===== changed files current..target ====="
  git diff --name-status HEAD.."$TARGET_REF" | head -300 || true
  echo

  echo "===== admin/RMQ-related changed files ====="
  git diff --name-status HEAD.."$TARGET_REF" \
    | grep -Ei 'admin-tools|rmq|runner|server\.js|rabbit|notification|hydrate|player|give|grant|water|broadcast|docker-compose|env|secrets' || true
  echo

  echo "===== diff: relevant files only ====="
  git diff --stat HEAD.."$TARGET_REF" -- \
    runtime/scripts/admin-tools.sh \
    console/api/src/rmq.js \
    console/api/src/runner.js \
    console/api/src/server.js \
    console/api/test/rmq.test.js \
    runtime/scripts/validate-admin-tools.sh \
    docker-compose.yml \
    .env.example \
    2>/dev/null || true

  echo
  git diff --unified=80 HEAD.."$TARGET_REF" -- \
    runtime/scripts/admin-tools.sh \
    console/api/src/rmq.js \
    console/api/src/runner.js \
    console/api/src/server.js \
    console/api/test/rmq.test.js \
    runtime/scripts/validate-admin-tools.sh \
    docker-compose.yml \
    .env.example \
    2>/dev/null | redact || true

  echo
  echo "===== target source grep ====="
  for f in \
    runtime/scripts/admin-tools.sh \
    console/api/src/rmq.js \
    console/api/src/runner.js \
    console/api/src/server.js
  do
    echo
    echo "----- $TARGET_REF:$f -----"
    git show "$TARGET_REF:$f" 2>/dev/null \
      | nl -ba \
      | grep -Ei 'ADMIN_COMMAND_PATH|publish_inner_json|publish_player_command|publishServerCommand|rabbitmqctl eval|heartbeats|notifications|rpc|response|bgdRpc|SimpleShaTokens|GmeAuth|GmeToken|RmqRpc|AuthToken|MessageContent|refill-water|adminRefillWater|give-items|grant-item|UpdateAllWaterFillables|ServiceBroadcast' \
      | redact || true
  done

  echo
  echo "===== verdict hints ====="
  echo "Look for:"
  echo "1. ADMIN_COMMAND_PATH no longer using rabbitmq-game:heartbeats/notifications"
  echo "2. WebUI rmq.js no longer publishing admin commands to heartbeats/notifications"
  echo "3. New publisher using RMQ ADMIN rpc/response/server queues"
  echo "4. New SimpleShaTokens/GME/RmqRpc implementation"
  echo "5. Hydrate All calling refill-water/adminRefillWater instead of give-items"
} | tee "$OUT"

echo
echo "Saved: $OUT"
