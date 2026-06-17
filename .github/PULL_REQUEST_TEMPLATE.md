## Summary

Describe the change and why it is needed.

## Change Type

- [ ] Documentation only
- [ ] Security control / gate
- [ ] Bot client feature
- [ ] Dune Console API adapter feature
- [ ] Container / deployment change
- [ ] Test-only change
- [ ] Bug fix
- [ ] Other

## Risk Classification

- [ ] Low - read-only or documentation
- [ ] Medium - operational behavior change, no destructive capability
- [ ] High - privileged action, admin flow, sensitive data, or availability impact
- [ ] Critical - destructive action, credential flow, DB write, backup restore/delete, or Docker/service lifecycle

## Security Impact

Explain the security impact, including authorization, confirmation, audit logging, redaction, rate limiting, and abuse cases.

## SOC 2 Evidence Impact

- [ ] No SOC 2 evidence impact
- [ ] Updates control mapping
- [ ] Adds/updates evidence artifact
- [ ] Adds/updates audit logging
- [ ] Adds/updates CI/security gate
- [ ] Adds/updates access control
- [ ] Adds/updates incident/rollback procedure

Related control IDs:

```text
DC-SOC2-
```

## Testing Evidence

Paste relevant output or link to CI evidence.

```text
npm test
npm run security:secrets
npm run build
docker build
```

## Security Checklist

- [ ] No secrets are committed.
- [ ] Secret scan passes.
- [ ] SCA gate passes or has documented exception.
- [ ] SAST gate passes or has documented exception.
- [ ] DCA gate passes if Docker/Compose changed.
- [ ] DAST cases are added/updated for runtime behavior.
- [ ] Public responses do not expose internal IPs, tokens, passwords, DB URLs, raw `.env`, or stack traces.
- [ ] Backend authorization is server-side for privileged actions.
- [ ] Destructive actions require confirmation.
- [ ] State-changing actions emit audit events.
- [ ] Rollback path is documented.

## Rollback Plan

Describe how to back out this change safely.

## Documentation Updates

- [ ] Not required
- [ ] Roadmap updated
- [ ] Security gates updated
- [ ] Development standards updated
- [ ] SOC 2 matrix updated
- [ ] Threat model updated
- [ ] ADR added/updated
