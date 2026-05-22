#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
[ -f .env ] && . ./.env
[ -f runtime/generated/battlegroup.env ] && . runtime/generated/battlegroup.env
source runtime/scripts/runtime-env.sh

client_port_base="$(resolve_client_port_base)"
igw_port_base="$(resolve_igw_port_base)"
overmap_client_port="$client_port_base"
survival_client_port="$((client_port_base + 1))"
survival_s2s_port="$igw_port_base"
overmap_s2s_port="$((igw_port_base + 1))"

echo "=== Public / required ports ==="

echo
echo "TCP:"
ss -lntp | grep -E ':(15432|31982|31983|32573|5059|11717)' || true

echo
echo "UDP:"
ss -lnup | grep -E ":(${overmap_client_port}|${survival_client_port}|${survival_s2s_port}|${overmap_s2s_port})" || true

cat <<EOF

Expected:
  Public TCP:
    31982  RabbitMQ game TLS
    31983  RabbitMQ game HTTP

  Public UDP:
    ${overmap_client_port}   Overmap clients
    ${survival_client_port}   Survival_1 clients
    ${survival_s2s_port}   Survival_1 server-to-server
    ${overmap_s2s_port}   Overmap server-to-server

  Localhost TCP:
    15432  Postgres
    32573  RabbitMQ admin
    5059   TextRouter
    11717  Director
EOF
