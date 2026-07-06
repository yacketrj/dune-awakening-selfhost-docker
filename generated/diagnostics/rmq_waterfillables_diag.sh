#!/usr/bin/env bash
set -euo pipefail

OUT="/tmp/dune-db-fix/rmq-waterfillables-diag-$(date +%Y%m%d-%H%M%S).log"
mkdir -p /tmp/dune-db-fix

{
  echo "===== docker ps rmq/server ====="
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' \
    | grep -E 'dune-rmq|dune-server|gateway|director|text-router|console|postgres' || true

  echo
  echo "===== rabbitmq-game exchanges ====="
  docker exec dune-rmq-game rabbitmqctl list_exchanges name type durable auto_delete internal arguments 2>&1 || true

  echo
  echo "===== rabbitmq-game bindings matching heartbeats/notifications ====="
  docker exec dune-rmq-game rabbitmqctl list_bindings source_name source_kind destination_name destination_kind routing_key arguments 2>&1 \
    | grep -Ei 'heartbeats|notifications|server|survival|gateway|director|fls|backend' || true

  echo
  echo "===== rabbitmq-game queues ====="
  docker exec dune-rmq-game rabbitmqctl list_queues name durable auto_delete consumers messages_ready messages_unacknowledged arguments 2>&1 || true

  echo
  echo "===== rabbitmq-game connections ====="
  docker exec dune-rmq-game rabbitmqctl list_connections name user peer_host peer_port client_properties state channels 2>&1 || true

  echo
  echo "===== rabbitmq-game consumers ====="
  docker exec dune-rmq-game rabbitmqctl list_consumers queue_name consumer_tag ack_required prefetch_count active 2>&1 || true

  echo
  echo "===== recent server logs mentioning command/water/rmq ====="
  for c in dune-server-gateway dune-server-survival-1 dune-server-overmap dune-director dune-text-router; do
    echo
    echo "----- $c -----"
    docker logs --since 10m "$c" 2>&1 \
      | grep -Ei 'UpdateAllWaterFillables|WaterFillables|refill|water|rabbit|rmq|ServerCommand|notifications|heartbeats|error|warn|failed' \
      || true
  done
} | tee "$OUT"

echo
echo "Saved: $OUT"
