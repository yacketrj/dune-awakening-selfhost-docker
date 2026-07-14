
### DUNE CLI — Test Plan & Process Fix (2026-07-14)
- **Root cause**: PR #13 shipped without testing `dune self-update`, `dune console`,
  or any CLI commands that spawn helper containers. The helper containers ran as
  root and couldn't write to host-owned `/repo` directories.
- **Fix**: Created comprehensive 43-case test plan covering all `dune` CLI commands,
  Web UI write operations, and upgrade path scenarios.
- **Process**: New branch requirement — any PR touching containers, permissions,
  or compose config must run the CLI test plan before merge.
