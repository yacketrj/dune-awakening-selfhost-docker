#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/server-notification-strings-$(date +%Y%m%d-%H%M%S).log"

{
  echo "===== diagnostic output ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== server binary paths ====="
  for c in dune-server-survival-1 dune-server-overmap dune-server-gateway dune-director dune-text-router; do
    echo
    echo "----- $c -----"
    docker exec "$c" sh -lc '
      pwd
      find /home /Tools /app -maxdepth 5 -type f 2>/dev/null \
        | grep -Ei "(DuneSandboxServer|Gateway|Director|Router|LiveServices|Notification|Funcom)" \
        | head -80
    ' || true
  done

  echo
  echo "===== strings: NotificationSystem/AuthToken/ServerCommand ====="
  for c in dune-server-survival-1 dune-server-overmap dune-server-gateway dune-director dune-text-router; do
    echo
    echo "----- $c -----"
    docker exec "$c" sh -lc '
      for f in \
        /home/dune/server/DuneSandbox/Binaries/Linux/DuneSandboxServer-Linux-Shipping \
        /home/dune/server/DuneSandboxServer.sh \
        /Tools/Battlegroups/GatewayService/GatewayService \
        /Tools/Battlegroups/DirectorService/DirectorService \
        /Tools/Battlegroups/TextRouterService/TextRouterService
      do
        [ -f "$f" ] || continue
        echo "### FILE $f"
        strings "$f" 2>/dev/null \
          | grep -Ei "NotificationSystem|Invalid Auth Token|AuthToken|ServerCommand|UpdateAllWaterFillables|ServiceBroadcast|AddItemToInventory|fls_backend|heartbeats|notifications|RMQ_HTTP|ServiceAuthToken" \
          | head -300
      done
    ' || true
  done
} | tee "$OUT"

echo
echo "Saved: $OUT"
