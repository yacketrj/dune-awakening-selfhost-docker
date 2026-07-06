#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/server-notification-broad-scan-$(date +%Y%m%d-%H%M%S).log"

PATTERN='NotificationSystem|Invalid Auth Token|AuthToken|ServerCommand|UpdateAllWaterFillables|ServiceBroadcast|AddItemToInventory|AwardXP|heartbeats|notifications|fls_backend|RMQ_HTTP|ServiceAuthToken|MessageContent|rabbit_basic|P_basic|routing'

scan_container() {
  local c="$1"

  echo
  echo "===== $c ====="

  docker exec "$c" sh -lc '
    set +e

    echo "----- pwd -----"
    pwd

    echo
    echo "----- relevant env keys only -----"
    env | sort | grep -Ei "token|auth|secret|service|notification|fls|rabbit|rmq" \
      | sed -E "s/(=).*/=<redacted>/"

    echo
    echo "----- candidate files -----"
    find /home /Tools /app -type f 2>/dev/null \
      | grep -Ei "(\.so$|\.dll$|\.exe$|\.pyc$|\.py$|\.json$|\.ini$|\.conf$|\.sh$|DuneSandbox|Director|TextRouter|Gateway|LiveServices|Notification|Rabbit|RMQ|Auth)" \
      | head -500

    echo
    echo "----- direct grep in text-like files -----"
    find /home /Tools /app -type f 2>/dev/null \
      | grep -Ei "(\.py$|\.json$|\.ini$|\.conf$|\.sh$|\.txt$|\.log$)" \
      | while read -r f; do
          grep -IEn "'"$PATTERN"'" "$f" 2>/dev/null \
            | sed -E "s#^#$f:#" \
            | sed -E "s/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{]*)([=:{][^, ]+)/\1\2=<redacted>/Ig"
        done \
      | head -500

    echo
    echo "----- strings scan candidate binaries/libraries -----"
    find /home /Tools /app -type f 2>/dev/null \
      | grep -Ei "(\.so$|\.dll$|\.exe$|DuneSandbox|Director$|TextRouter$|Gateway|lib.*\.so)" \
      | while read -r f; do
          hit="$(strings "$f" 2>/dev/null | grep -Ei "'"$PATTERN"'" | head -100 || true)"
          if [ -n "$hit" ]; then
            echo "### FILE $f"
            printf "%s\n" "$hit" \
              | sed -E "s/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{]*)([=:{][^, ]+)/\1\2=<redacted>/Ig"
          fi
        done \
      | head -1000
  ' || true
}

{
  echo "===== diagnostic output ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  scan_container dune-server-survival-1
  scan_container dune-server-overmap
  scan_container dune-server-gateway
  scan_container dune-director
  scan_container dune-text-router
} | tee "$OUT"

echo
echo "Saved: $OUT"
