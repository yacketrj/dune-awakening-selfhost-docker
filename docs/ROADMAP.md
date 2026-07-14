### P0-Critical: Comprehensive Write Operation Testing
- **Priority**: P0 | **Risk**: HIGH | **Branch**: `feature/p0-critical-testing`
- **Status**: Test plan created, execution pending
- **Description**: 43 test cases covering all `dune` CLI commands, Web UI write ops,
  service lifecycle, DB operations, and upgrade paths. Must pass before any PR
  affecting containers, permissions, or compose config.
- **Root cause**: PR #13 broke self-update/console restart for thousands of stacks
  because helper container operations were untested.
