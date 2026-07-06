#!/usr/bin/env bash
set -euo pipefail

cd ~/dune-clean-repro

DIAG_DIR="${DIAG_DIR:-$PWD/runtime/generated/diagnostics}"
mkdir -p "$DIAG_DIR"
OUT="$DIAG_DIR/director-authbuffer-rpc-topology-$(date +%Y%m%d-%H%M%S).log"

redact() {
  sed -E \
    -e 's/[A-Fa-f0-9]{16,}/<REDACTED_HEX>/g' \
    -e 's/(ServiceAuthToken|AuthToken|TOKEN|token|SECRET|secret|PASSWORD|password)([^=:{ ]*)([=:{ ][^, ]+)/\1\2=<redacted>/Ig'
}

{
  echo "===== diagnostic output ====="
  echo "Saved target: $OUT"
  echo "Working dir: $PWD"
  echo

  echo "===== director authbuffer files ====="
  docker exec dune-director sh -lc '
    cd /Tools/Battlegroups/Director/BattlegroupDirector

    echo "----- ls -----"
    ls -lah libAuthbuffer* QAVAuthBuffer* 2>/dev/null || true

    echo
    echo "----- file -----"
    file libAuthbuffer* QAVAuthBuffer* 2>/dev/null || true

    echo
    echo "----- ldd -----"
    ldd libAuthbuffer.so 2>/dev/null || true

    echo
    echo "----- exported symbols: readelf -----"
    readelf -Ws libAuthbuffer.so 2>/dev/null \
      | grep -Ei "GME|Auth|Buffer|Token|GMESDK" || true

    echo
    echo "----- exported symbols: nm -----"
    nm -D libAuthbuffer.so 2>/dev/null \
      | grep -Ei "GME|Auth|Buffer|Token|GMESDK" || true

    echo
    echo "----- objdump dynamic table -----"
    objdump -T libAuthbuffer.so 2>/dev/null \
      | grep -Ei "GME|Auth|Buffer|Token|GMESDK" || true

    echo
    echo "----- c++filt demangle candidates -----"
    {
      readelf -Ws libAuthbuffer.so 2>/dev/null || true
      nm -D libAuthbuffer.so 2>/dev/null || true
      objdump -T libAuthbuffer.so 2>/dev/null || true
    } | grep -Ei "GME|Auth|Buffer|Token|GMESDK" \
      | c++filt 2>/dev/null || true
  ' 2>&1 | redact

  echo
  echo "===== director binary focused auth/rpc strings ====="
  docker exec dune-director sh -lc '
    strings /Tools/Battlegroups/Director/BattlegroupDirector/Director 2>/dev/null \
      | grep -Ei "GmeToken|GmeAuth|gme_token|GenAuthToken|GMESDK|AuthBuffer|QAVAuthBuffer|SimpleShaTokens|RmqRpc|RpcExchange|_RPC_NOTIFICATIONS|EndpointName|ListenToQueue|TryCall|TryNotify|HandleRmqRpc" \
      | sort -u
  ' 2>&1 | redact

  echo
  echo "===== RMQ GAME topology: rpc/auth candidates ====="
  docker exec dune-rmq-game rabbitmqctl list_exchanges name type durable auto_delete internal 2>/dev/null \
    | grep -Ei "rpc|notification|heartbeats|simple|gme|auth|_RPC" || true

  echo
  docker exec dune-rmq-game rabbitmqctl list_queues name consumers messages_ready messages_unacknowledged arguments 2>/dev/null \
    | grep -Ei "rpc|notification|heartbeats|simple|gme|auth|_RPC|reply|response|request" || true

  echo
  docker exec dune-rmq-game rabbitmqctl list_bindings source_name source_kind destination_name destination_kind routing_key arguments 2>/dev/null \
    | grep -Ei "rpc|notification|heartbeats|simple|gme|auth|_RPC|reply|response|request" || true

  echo
  echo "===== RMQ ADMIN topology: rpc/auth candidates ====="
  docker exec dune-rmq-admin rabbitmqctl list_exchanges name type durable auto_delete internal 2>/dev/null \
    | grep -Ei "rpc|notification|heartbeats|simple|gme|auth|_RPC" || true

  echo
  docker exec dune-rmq-admin rabbitmqctl list_queues name consumers messages_ready messages_unacknowledged arguments 2>/dev/null \
    | grep -Ei "rpc|notification|heartbeats|simple|gme|auth|_RPC|reply|response|request" || true

  echo
  docker exec dune-rmq-admin rabbitmqctl list_bindings source_name source_kind destination_name destination_kind routing_key arguments 2>/dev/null \
    | grep -Ei "rpc|notification|heartbeats|simple|gme|auth|_RPC|reply|response|request" || true
} | tee "$OUT"

echo
echo "Saved: $OUT"
