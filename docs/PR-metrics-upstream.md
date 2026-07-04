# Upstream PR: Opt-in Prometheus Metrics Stack

## PR Command

```bash
gh pr create \
  --repo Red-Blink/dune-awakening-selfhost-docker \
  --base main \
  --head yacketrj:release/v1.0.0 \
  --title "feat: add opt-in Prometheus metrics stack and monitoring scripts" \
  --body-file docs/PR-metrics-upstream-body.md
```

## PR Body

See `docs/PR-metrics-upstream-body.md`

## Changed Files

### New files
- `docker-compose.metrics.yml` — Prometheus, node-exporter, cAdvisor, postgres-exporter services
- `runtime/metrics/prometheus.yml` — Scrape configuration (6 jobs)
- `runtime/metrics/rules/containers.yml` — Container alert rules
- `runtime/metrics/rules/dune-stack.yml` — Stack alert rules (placeholder)
- `runtime/metrics/rules/host.yml` — Host-level alert rules
- `runtime/metrics/rules/postgres.yml` — Postgres alert rules
- `runtime/metrics/rules/rabbitmq.yml` — RabbitMQ alert rules
- `runtime/scripts/metrics-stack.sh` — Metrics stack lifecycle management
- `runtime/scripts/metrics-status.sh` — Quick status wrapper
- `tests/metrics-stack-unit.sh` — Unit tests (TAP format)
- `docs/E2E-METRICS-TESTING.md` — E2E testing documentation

### Modified files
- `runtime/scripts/dune` — Added `dune metrics` subcommand (+9 lines)

### Bridge action (fork-only, not upstream)
- `console/api/src/duneDb.js` — `addonOpsPrometheusHealth()` function
- `console/api/src/server.js` — `ops.health.prometheus` bridge handler

## Verification

```bash
# Unit tests
bash tests/metrics-stack-unit.sh

# API tests
cd console/api && npm test
```
