
### DUNE CLI — Missing write operation tests
- **Status**: OPEN
- **Priority**: P0
- **Risk**: HIGH
- **Discovered**: 2026-07-14
- **Finding**: PR #13 (container hardening) broke `dune self-update`, `dune console` restart,
  and privileged helper containers because the UID/GID pattern was not carried through
  to the self-update/restart helper paths.
- **Impact**: Thousands of user stacks failed on update/restart operations.
- **Root cause**: Test plan only covered container lifecycle (startup, entrypoint, user mapping).
  Did not test CLI commands that spawn helper containers (self-update, console restart).
- **Fix**: Created comprehensive 43-case test plan at `docs/DUNE-CLI-TEST-PLAN.md`.
  Must be run before any future PRs that touch container users, permissions, or compose config.
- **Blocking**: All future container/permission changes.
