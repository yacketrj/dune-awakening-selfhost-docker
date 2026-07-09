## Summary

<!-- Brief description of what this PR does -->

## Security Impact

<!-- Check all that apply and explain -->

- [ ] **No security impact** — docs, comments, formatting only
- [ ] **Command surface change** — new/modified API routes or CLI commands
- [ ] **RBAC change** — new/modified role requirements
- [ ] **Data boundary change** — new database queries or output fields
- [ ] **Network exposure** — new listening ports or external connections

## Testing

<!-- All must pass before merge -->

- [ ] Unit tests pass: `node --test console/api/test/*.test.js` (297 tests)
- [ ] Security gates: Semgrep, Gitleaks, Trivy, ggshield
- [ ] npm audit (moderate+)
- [ ] API security DAST

## Compatibility

- [ ] `main` branch synced with upstream
- [ ] Branch rebased on `upstream/main`
- [ ] No breaking changes to existing APIs

## Evidence

<!-- Link test output, security scans, screenshots -->
