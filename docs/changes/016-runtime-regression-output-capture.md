# 016 - Runtime Regression Output Capture

## Summary

Adds a runtime shell regression output capture helper so local and CI runs produce reviewable evidence instead of relying only on live terminal output.

## Changes

- Added `runtime/tests/capture-regression-output.sh`.
- Updated the security gates workflow to run the capture helper for runtime shell regression coverage.
- Uploaded `work/regression-output/` as the `runtime-shell-regression-output` GitHub Actions artifact.
- Updated `docs/security-gates.md` with the new local command and evidence layout.

## Evidence Produced

The capture helper writes timestamped output under `work/regression-output/<UTC timestamp>/`:

- `summary.md` records git branch, git commit, gate exit codes, and log paths when available.
- `commands.tsv` records each captured command, exit code, and log path.
- `runtime-shell-syntax.log` captures shell syntax validation for runtime shell files.
- `runtime-shell-tests.log` captures each `runtime/tests/test-*.sh` run.

## Operator Impact

No production runtime behavior changes. Local maintainers can now run:

```bash
bash runtime/tests/capture-regression-output.sh
```

The generated `work/` output remains ignored by git and can be attached to PRs, copied into change notes, or retained locally as review evidence.

## Security Impact

This improves PR review evidence and regression traceability. It does not add credentials, network exposure, or runtime privileges.

## Validation

- `bash -n runtime/tests/capture-regression-output.sh` passed locally before commit.
- CI now runs the capture helper and preserves output through the runtime shell regression artifact.
