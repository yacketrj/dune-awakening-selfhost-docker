# Dune CLI — Comprehensive Test Plan

Generated after PR #13 broke `self-update`, `console` restart, and other privileged operations.

## Test Environment
- Fresh install from upstream/main + PR changes
- Non-root container (USER dune, DUNE_HOST_UID/DUNE_HOST_GID set)
- Root-owned repo directory (upgrade simulation)
- Host-owned repo directory (new install simulation)

## Test Matrix

### Critical (write operations — where PR #13 failed)
| # | Command | What to test | Expected |
|---|---------|-------------|----------|
| 1 | `dune self-update` | Console self-update via helper container | Helper runs with correct UID/GID, writes to /repo |
| 2 | `dune console` | Console restart via helper container | Helper uses `--user`/`--group-add`, console comes back |
| 3 | `dune update` | Game server update download | Downloads to /srv/dune, owned by dune user |
| 4 | `dune start` | Full stack start | All containers start, orchestrator drops to dune |
| 5 | `dune stop` | Full stack stop | All containers stop cleanly |
| 6 | `dune restart` | Full stack restart | All containers restart, ownership preserved |
| 7 | `dune restart survival` | Single map restart | Game server restarts, no permission errors |
| 8 | `dune shutdown-protection` | Toggle shutdown protection | Script creates/removes flag file with correct perms |
| 9 | `dune ip-change-restart` | IP change handler | Detects IP change, restarts affected services |
| 10 | `dune restart-schedule` | Scheduled restart timer | Creates timer file, triggers restart at scheduled time |

### Service Management
| # | Command | What to test |
|---|---------|-------------|
| 11 | `dune status` | Service health — all containers reporting |
| 12 | `dune servers` | Game server list — maps show online |
| 13 | `dune logs` | Log access — no permission errors |
| 14 | `dune spawn survival` | Spawn new map instance |
| 15 | `dune despawn survival` | Despawn map instance |
| 16 | `dune autoscaler` | Autoscaler start/stop/reconcile |
| 17 | `dune gateway` | Gateway restart |
| 18 | `dune director` | Director restart |
| 19 | `dune text-router` | Text router restart |

### Database
| # | Command | What to test |
|---|---------|-------------|
| 20 | `dune db` | DB interactive access |
| 21 | `dune db-manage` | DB backup/restore | 
| 22 | `dune database` | DB maintenance tools |

### Configuration
| # | Command | What to test |
|---|---------|-------------|
| 23 | `dune config server` | Server config read/write |
| 24 | `dune memory` | Memory limits read/write |
| 25 | `dune network` | Network config |
| 26 | `dune maps` | Map management |
| 27 | `dune sietches` | Sietch management |

### Read-only (low risk but must work)
| # | Command | What to test |
|---|---------|-------------|
| 28 | `dune version` | Version display |
| 29 | `dune ports` | Port listing |
| 30 | `dune ping` | Service ping |
| 31 | `dune ready` | Readiness check |
| 32 | `dune doctor` | Health diagnostics |
| 33 | `dune web` | Web UI URL |
| 34 | `dune metrics` | Metrics status |

### Web UI Write Operations (via browser)
| # | Feature | What to test |
|---|---------|-------------|
| 35 | Server Control → Update | Console self-update via UI |
| 36 | Server Control → Restart | Service restart via UI |
| 37 | Database → Backup | Create backup |
| 38 | Database → Restore | Restore from backup |
| 39 | Maps → Start/Stop | Map lifecycle via UI |
| 40 | Server Panels → Memory | Memory config save |

### Upgrade Path (simulate existing root-owned install)
| # | Scenario | Expected |
|---|----------|----------|
| 41 | Root-owned /repo, DUNE_HOST_UID=1000 | Entrypoint fails with clear error |
| 42 | Root-owned /repo, DUNE_HOST_UID=0 | Entrypoint stays root |
| 43 | Host-owned /repo, DUNE_HOST_UID=$(id -u) | Entrypoint passes, writes work |

### Test Execution
```bash
# Run lifecycle tests
bash tests/container-lifecycle-test.sh

# Run API tests
cd console/api && node --test test/*.test.js

# Validate compose
docker compose -f docker-compose.yml -f docker-compose.web.yml config --quiet

# Test each CLI command
for cmd in status start stop restart update self-update console; do
  echo "=== dune $cmd ==="
  ./runtime/scripts/dune "$cmd"
done
```
