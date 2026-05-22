#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

[ -f .env ] && . ./.env
[ -f runtime/generated/battlegroup.env ] && . runtime/generated/battlegroup.env

set -a
if [ -f .env ]; then
  . ./.env
fi
set +a

echo "=== Starting Postgres ==="
runtime/scripts/start-postgres.sh

echo
echo "=== Starting RabbitMQ ==="
runtime/scripts/start-rabbitmq.sh

echo
echo "=== Starting TextRouter ==="
runtime/scripts/start-text-router.sh

echo
echo "=== Starting Director ==="
runtime/scripts/start-director.sh

echo
echo "=== Starting ServerGateway ==="
runtime/scripts/start-server-gateway.sh

echo
echo "=== Starting Survival_1 ==="
runtime/scripts/start-server-survival-1.sh

echo
echo "=== Starting Overmap ==="
runtime/scripts/start-server-overmap.sh

echo
echo "=== Starting Sietch Override Publisher ==="
runtime/scripts/publish-sietch-overrides.sh restart || {
  echo "Sietch override publisher did not start. Survival_1 custom browser names/passwords will not republish."
}

echo
echo "=== Starting Autoscaler ==="
runtime/scripts/start-autoscaler.sh || {
  echo "Autoscaler did not start. Dynamic maps will not spawn automatically."
  echo "Check with: dune autoscaler status"
}

echo
echo "=== Reconciling Active Sietch Dimensions ==="
runtime/scripts/sietches.sh reconcile Survival_1 || {
  echo "Could not reconcile Survival_1 active dimensions."
}


echo
echo "=== Final quick status ==="
docker ps --filter "name=dune-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo
echo "=== Required TCP listeners ==="
ss -lntp | grep -E ':(15432|31982|31983|32573|5059|11717)' || true

client_port_base="$(resolve_client_port_base)"
igw_port_base="$(resolve_igw_port_base)"
echo
echo "=== Required UDP listeners ==="
ss -lnup | grep -E ":(${client_port_base}|$((client_port_base + 1))|${igw_port_base}|$((igw_port_base + 1)))" || true

cat <<'EOF'

Started. Notes:
- Survival_1 can take several minutes to become fully READY.
- Overmap can also take a few minutes.
- Autoscaler starts with the battlegroup so dynamic maps can spawn on demand.
- Use runtime/scripts/status.sh after startup to check readiness.
EOF
