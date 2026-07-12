# Known Issues

## Disk space preflight false-positive
- **Symptom**: "There is not enough free disk space for a safe Dune server deployment" despite 860GB+ free on `/`
- **Workaround**: Set `DUNE_SKIP_DISK_CHECK=1` in orchestrator compose environment
- **Root cause**: `dune_orchestrator.py:check_free_space()` calls `shutil.disk_usage()` on `/srv/dune/*` paths which are Docker volumes — reports volume quota, not host disk space
- **Fix needed**: Change the check to use host mount point via `df` or check the volume mountpoint's parent filesystem

## Orchestrator command mismatch
- **Symptom**: Orchestrator container crashes with `daemon: not found`
- **Root cause**: `docker-compose.yml` has `command: ["daemon"]` but upstream repos use `["dune", "daemon"]` or different entrypoints depending on Docker image version
- **Status**: Upstream compose is correct (`ENTRYPOINT dune + command daemon = dune daemon`). Our older e2e-ops-health compose had a stale image.

## Deploy script: COMPOSE_PROJECT_NAME leak
- **Symptom**: Clean stack reuses RBAC stack volumes despite using `COMPOSE_PROJECT_NAME` env var
- **Root cause**: `docker-compose.web.yml` has `name: dune-awakening-selfhost-docker` on line 1, which overrides the env var
- **Fix**: `deploy-clean-stack.sh` should `sed` the `name:` field in the generated compose
