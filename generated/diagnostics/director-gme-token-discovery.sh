#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/director-gme-token-discovery-$(date +%Y%m%d-%H%M%S).log"

{
  echo "===== diagnostic output ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== director process/listening ports ====="
  docker exec dune-director sh -lc '
    ps auxww
    echo
    ss -lntup 2>/dev/null || netstat -lntup 2>/dev/null || true
  ' 2>&1 | sed -E 's/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig'

  echo
  echo "===== director configs grep ====="
  docker exec dune-director sh -lc '
    grep -RInE "GmeAuthToken|GenAuthToken|SimpleShaTokens|RpcExchange|HeartbeatsExchange|ServiceAuthToken|_RPC_NOTIFICATIONS|notifications|heartbeats|Route|Endpoint|Url|Listen|Port" \
      /Tools/Battlegroups/Director/BattlegroupDirector 2>/dev/null || true
  ' | sed -E 's/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig'

  echo
  echo "===== director strings focused route scan ====="
  docker exec dune-director sh -lc '
    strings /Tools/Battlegroups/Director/BattlegroupDirector/Director 2>/dev/null \
      | grep -Ei "GmeAuthToken|GenAuthToken|SimpleShaTokens|RpcExchange|HeartbeatsExchange|ServiceAuthToken|_RPC_NOTIFICATIONS|notifications|heartbeats|api/|/api|http|https|Route|Endpoint|Controller|MapGet|MapPost|Token|Auth" \
      | sort -u
  ' | sed -E 's/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig'

  echo
  echo "===== local curl probes, metadata only ====="
  docker exec dune-director sh -lc '
    for port in 80 443 5000 5001 8080 8081 11717; do
      for path in / /health /swagger /api /api/gme-auth-token /GmeAuthToken /gmeAuthToken /gme-auth-token /rpc-notifications /_RPC_NOTIFICATIONS; do
        url="http://127.0.0.1:${port}${path}"
        code="$(curl -sS -o /tmp/curl_probe_body -w "%{http_code}" --max-time 2 "$url" 2>/dev/null || true)"
        size="$(wc -c < /tmp/curl_probe_body 2>/dev/null || echo 0)"
        if [ "$code" != "000" ]; then
          echo "$url code=$code bytes=$size"
          head -c 300 /tmp/curl_probe_body 2>/dev/null | tr "\n" " " | sed -E "s/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig"
          echo
        fi
      done
    done
  ' || true
} | tee "$OUT"

echo
echo "Saved: $OUT"
