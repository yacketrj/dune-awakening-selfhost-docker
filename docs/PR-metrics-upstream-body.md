## Summary

Adds an opt-in operational metrics stack to support server health monitoring without changing the default runtime path.

## What this adds

- **`docker-compose.metrics.yml`** — Prometheus with node-exporter, cAdvisor, postgres-exporter, and RabbitMQ metric endpoints
- **Prometheus rule files** — Alert rules for host, container, Postgres, and RabbitMQ health
- **`dune metrics` CLI** — Start, stop, restart, status, validate, logs, config, and pull commands
- **Validation script** — `dune metrics validate` checks target health, rule loading, scrape health, and Postgres connectivity

## Design

- Opt-in: does not start automatically with the game stack
- Prometheus binds to `127.0.0.1:9090` only (not publicly exposed)
- Exporters attach to the internal `dune-net` network
- All containers use `no-new-privileges:true` except cAdvisor (requires `privileged: true` for cgroup metrics)

## Testing

```bash
bash tests/metrics-stack-unit.sh
```

See `docs/E2E-METRICS-TESTING.md` for full E2E procedure.

## Rollback

Remove the metrics compose file and the `dune metrics` block from `runtime/scripts/dune`:

```bash
rm docker-compose.metrics.yml
rm -rf runtime/metrics/
sed -i '/metrics)/,/;;/d' runtime/scripts/dune
```
