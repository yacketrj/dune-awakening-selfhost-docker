# Dune Discord Companion Bot - Issue Tracking Policy

## Purpose

This policy defines how repository issues support SOC 2 readiness evidence for the experimental read-only Discord companion bot and Console adapter.

Issue tracking is not itself a SOC 2 certification requirement. SOC 2 readiness does require evidence that changes, vulnerabilities, exceptions, access reviews, and incidents are identified, owned, reviewed, remediated, and traceable. Repository issues provide that evidence trail.

## Issue Types

| Issue type | Template | SOC 2 readiness purpose |
|---|---|---|
| Bug | `.github/ISSUE_TEMPLATE/bug-report.yml` | Defect tracking, remediation evidence, regression evidence |
| Feature request | `.github/ISSUE_TEMPLATE/feature-request.yml` | Change-management evidence and security impact review |
| Vulnerability remediation | `.github/ISSUE_TEMPLATE/vulnerability-remediation.yml` | Vulnerability management and CVSS remediation tracking |
| Security exception | `.github/ISSUE_TEMPLATE/security-exception.yml` | Time-bound risk acceptance and compensating controls |
| SOC 2 evidence gap | `.github/ISSUE_TEMPLATE/soc2-evidence-gap.yml` | Missing/stale evidence remediation |
| Access review | `.github/ISSUE_TEMPLATE/access-review.yml` | Monthly and release-candidate access review evidence |

## Minimum Fields

Every security, SOC 2, vulnerability, or exception issue must include:

- Owner.
- Severity or risk impact.
- Target due date or expiration date.
- Remediation plan.
- Evidence links.
- Closure criteria.

## Public Issue Hygiene

Do not place the following in public issues:

- Secrets or tokens.
- Raw `.env` content.
- Database URLs.
- Private keys.
- Sensitive private IP/topology details.
- Exploit details that materially increase risk.
- Player personal data.

Use GitHub Security Advisories for sensitive security disclosures.

## Required Tracking Cadence

| Activity | Cadence | Issue requirement |
|---|---:|---|
| Access review | Monthly and before release candidate | Open an `Access review` issue and close it with evidence |
| SOC 2 evidence review | Monthly and before release candidate | Open `SOC 2 evidence gap` issues for missing/stale evidence |
| Vulnerability review | Every Trivy/Semgrep/Dependabot finding requiring action | Open `Vulnerability remediation` issues for non-trivial findings |
| Security exceptions | As needed | Open `Security exception`; must include expiration and compensating controls |
| Release readiness | Every release candidate | Link related issues in release checklist |

## Closure Rules

Issues may be closed only when one of these is true:

1. Fixed and linked to a commit or PR.
2. Risk accepted through a time-bound security exception.
3. Duplicate of another issue.
4. Not applicable with documented rationale.
5. Transferred to a more appropriate tracker with a durable link.

## SOC 2 Readiness Mapping

| SOC 2 area | Issue evidence |
|---|---|
| Change management | Feature/bug issues linked to PRs and tests |
| Risk assessment | Severity, impact, and exception fields |
| Vulnerability management | CVSS, scanner source, fix version, remediation issue |
| Access control | Access review issue evidence |
| Monitoring | Scheduled readiness and scanner workflow issues/findings |
| Incident response | Security issue or advisory plus follow-up remediation issues |

## Current Project Scope

The Discord companion bot remains read-only. Any issue proposing write, destructive, database mutation, player mutation, map mutation, addon mutation, credential, or Docker/service lifecycle behavior must be labeled for future review and must not be implemented without separate approval, threat model update, DAST cases, audit policy, and rollback plan.
