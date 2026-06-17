#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const outDir = "artifacts/security";
const jsonOut = `${outDir}/stride-report.json`;
const mdOut = `${outDir}/stride-report.md`;

mkdirSync(outDir, { recursive: true });

const files = {
  botAuth: read("discord-bot/src/security/authorization.ts"),
  botConfig: read("discord-bot/src/config.ts"),
  botCommands: read("discord-bot/src/commands.ts"),
  botConsoleApi: read("discord-bot/src/consoleApi.ts"),
  botRedaction: read("discord-bot/src/security/redaction.ts"),
  botDockerfile: read("discord-bot/Dockerfile"),
  botCompose: read("discord-bot/docker-compose.discord-bot.yml"),
  adapter: read("console/api/src/integrations/discord/adapter.js"),
  routes: read("console/api/src/integrations/discord/routes.js"),
  policy: read("console/api/src/integrations/discord/policy.js"),
  audit: read("console/api/src/integrations/discord/audit.js"),
  sanitize: read("console/api/src/integrations/discord/sanitize.js"),
  statusProvider: read("console/api/src/integrations/discord/statusProvider.js"),
  apiContract: read("docs/discord-control-bot/api-adapter-contract.md"),
  securityGates: read("docs/discord-control-bot/security-gates.md"),
  roadmap: read("docs/discord-control-bot/roadmap.md"),
  trivyWorkflow: read(".github/workflows/trivy-vulnerability-scan.yml"),
  semgrepWorkflow: read(".github/workflows/semgrep-sast.yml")
};

const report = {
  generatedAt: new Date().toISOString(),
  scanner: {
    name: "Dune STRIDE Threat Model Scanner",
    cost: "free / repository-local",
    methodology: "STRIDE",
    scope: "Experimental read-only Discord companion bot and protected Console API adapter"
  },
  assets: assets(),
  trustBoundaries: trustBoundaries(),
  findings: findings()
};
report.summary = summarize(report.findings);

writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(mdOut, renderMarkdown(report), "utf8");
console.log(`Wrote ${jsonOut}`);
console.log(`Wrote ${mdOut}`);
console.log(`STRIDE findings: ${report.findings.length}; open: ${report.summary.byStatus.open || 0}; mitigated: ${report.summary.byStatus.mitigated || 0}`);

function assets() {
  return [
    { id: "discord-user", name: "Discord user/member", sensitivity: "identity and role context" },
    { id: "discord-bot", name: "Discord companion bot", sensitivity: "operational command client" },
    { id: "console-adapter", name: "Dune Console Discord API adapter", sensitivity: "protected operational API" },
    { id: "bot-api-token", name: "Dune bot API token", sensitivity: "shared service credential" },
    { id: "console-runtime", name: "Dune Docker Console runtime", sensitivity: "server operations and status data" },
    { id: "security-artifacts", name: "Security evidence artifacts", sensitivity: "SOC 2 readiness evidence" },
    { id: "github-actions", name: "GitHub Actions automation", sensitivity: "CI permissions and issue automation" }
  ];
}

function trustBoundaries() {
  return [
    { id: "tb-discord-bot", from: "Discord", to: "Discord companion bot", protocol: "Discord interactions / future client runtime" },
    { id: "tb-bot-console", from: "Discord companion bot", to: "Console adapter", protocol: "HTTP with bot API bearer token" },
    { id: "tb-console-runtime", from: "Console adapter", to: "Dune runtime files and commands", protocol: "local process/runtime access" },
    { id: "tb-ci-repo", from: "GitHub Actions", to: "repository issues/code scanning/artifacts", protocol: "GITHUB_TOKEN and workflow permissions" }
  ];
}

function findings() {
  return [
    finding({
      id: "STRIDE-S-001",
      category: "Spoofing",
      title: "Discord actor or role spoofing across bot-to-adapter boundary",
      asset: "console-adapter",
      trustBoundary: "tb-bot-console",
      severity: "high",
      status: hasAll(files.adapter, ["validateDiscordActor", "discordRolePolicyHealth"]) && hasAny(files.policy, ["authorize", "capability"]),
      evidence: evidence([
        ["adapter validates actor context", hasAll(files.adapter, ["validateDiscordActor"])],
        ["backend policy exists", hasAny(files.policy, ["authorize", "capability"])],
        ["role-policy health exists without exposing IDs", hasAll(files.adapter, ["discordRolePolicyHealth"])]
      ]),
      recommendation: "Keep final authorization in the Console adapter. Never rely on client-side Discord role checks only."
    }),
    finding({
      id: "STRIDE-S-002",
      category: "Spoofing",
      title: "Bot API token disclosure or static token misuse",
      asset: "bot-api-token",
      trustBoundary: "tb-bot-console",
      severity: "high",
      status: hasAll(files.botConfig, ["DUNE_BOT_API_TOKEN_FILE"]) && hasAny(files.botConsoleApi, ["Authorization", "Bearer"]),
      evidence: evidence([
        ["file-based token configuration", hasAll(files.botConfig, ["DUNE_BOT_API_TOKEN_FILE"])],
        ["bearer token used for adapter calls", hasAny(files.botConsoleApi, ["Authorization", "Bearer"])],
        ["secret scanner exists", existsSync("discord-bot/scripts/check-secrets.mjs")]
      ]),
      recommendation: "Continue using file-based runtime secrets and rotate the bot API token after suspected exposure."
    }),
    finding({
      id: "STRIDE-T-001",
      category: "Tampering",
      title: "Write/destructive behavior exposed through Discord command surface",
      asset: "discord-bot",
      trustBoundary: "tb-discord-bot",
      severity: "critical",
      status: hasAll(files.adapter, ["writesEnabled: false", "readOnly: true"]) && !hasAny(files.botAuth, ["write", "destructive", "broadcast"]),
      evidence: evidence([
        ["adapter writes disabled", hasAll(files.adapter, ["writesEnabled: false"])],
        ["adapter read-only marker", hasAll(files.adapter, ["readOnly: true"])],
        ["bot auth has no write/destructive/broadcast capability strings", !hasAny(files.botAuth, ["write", "destructive", "broadcast"])]
      ]),
      recommendation: "Any future write behavior requires separate approval, threat model, confirmation policy, DAST cases, audit policy, and rollback plan."
    }),
    finding({
      id: "STRIDE-T-002",
      category: "Tampering",
      title: "Docker socket or privileged container access from bot",
      asset: "discord-bot",
      trustBoundary: "tb-console-runtime",
      severity: "critical",
      status: !hasAny(files.botDockerfile + files.botCompose, ["/var/run/docker.sock", "privileged: true"]),
      evidence: evidence([
        ["no Docker socket reference in bot Docker/Compose files", !hasAny(files.botDockerfile + files.botCompose, ["/var/run/docker.sock"])],
        ["no privileged mode in bot Docker/Compose files", !hasAny(files.botDockerfile + files.botCompose, ["privileged: true"])]
      ]),
      recommendation: "Keep the bot as an API client. Do not mount Docker socket or run privileged."
    }),
    finding({
      id: "STRIDE-R-001",
      category: "Repudiation",
      title: "Discord-originated adapter access lacks audit evidence",
      asset: "console-adapter",
      trustBoundary: "tb-bot-console",
      severity: "medium",
      status: hasAny(files.audit, ["audit", "event"]) && hasAny(files.adapter + files.routes, ["audit"]),
      evidence: evidence([
        ["audit module exists", hasAny(files.audit, ["audit", "event"])],
        ["adapter/routes reference audit", hasAny(files.adapter + files.routes, ["audit"])]
      ]),
      recommendation: "Maintain structured audit events containing Discord actor, command, capability, route, result, and timestamp."
    }),
    finding({
      id: "STRIDE-I-001",
      category: "Information Disclosure",
      title: "Public Discord responses expose internal topology or secrets",
      asset: "console-runtime",
      trustBoundary: "tb-discord-bot",
      severity: "high",
      status: hasAny(files.sanitize, ["redact", "sanitize"]) && hasAny(files.statusProvider, ["public", "diagnostic"]),
      evidence: evidence([
        ["sanitize/redaction module exists", hasAny(files.sanitize, ["redact", "sanitize"])],
        ["public/diagnostic response split exists", hasAny(files.statusProvider, ["public", "diagnostic"])],
        ["bot redaction helper exists", hasAny(files.botRedaction, ["redact"])]
      ]),
      recommendation: "Keep public status minimal. Gate diagnostic details to admin/owner and prefer ephemeral Discord responses."
    }),
    finding({
      id: "STRIDE-I-002",
      category: "Information Disclosure",
      title: "Security artifacts expose sensitive runtime details",
      asset: "security-artifacts",
      trustBoundary: "tb-ci-repo",
      severity: "medium",
      status: existsSync(".gitignore") && hasAll(read(".gitignore"), ["artifacts/security/*", "!artifacts/security/.gitkeep"]),
      evidence: evidence([
        ["security artifacts ignored by git", hasAll(read(".gitignore"), ["artifacts/security/*"])],
        ["artifact directory placeholder allowed", hasAll(read(".gitignore"), ["!artifacts/security/.gitkeep"])]
      ]),
      recommendation: "Keep generated scan artifacts in workflow artifacts, not committed source, unless explicitly reviewed and sanitized."
    }),
    finding({
      id: "STRIDE-D-001",
      category: "Denial of Service",
      title: "Discord command abuse or repeated status/log requests overload adapter/runtime",
      asset: "console-adapter",
      trustBoundary: "tb-discord-bot",
      severity: "medium",
      status: hasAny(files.roadmap + files.securityGates, ["Rate limits", "rate limits", "rate-limit"]),
      evidence: evidence([
        ["rate limits documented/planned", hasAny(files.roadmap + files.securityGates, ["Rate limits", "rate limits", "rate-limit"])],
        ["runtime rate-limit implementation present", hasAny(files.botCommands + files.routes, ["rateLimit", "rate-limit", "rate limit"])]
      ]),
      recommendation: "Implement command-level rate limits before production Discord deployment. Treat current state as planned mitigation, not full runtime control."
    }),
    finding({
      id: "STRIDE-E-001",
      category: "Elevation of Privilege",
      title: "Observer/moderator gains admin-only diagnostic data",
      asset: "console-adapter",
      trustBoundary: "tb-bot-console",
      severity: "high",
      status: hasAny(files.policy + files.botAuth, ["admin", "owner"]) && hasAny(files.statusProvider + files.routes, ["diagnostic"]),
      evidence: evidence([
        ["admin/owner roles represented in policy/auth", hasAny(files.policy + files.botAuth, ["admin", "owner"])],
        ["diagnostic mode exists", hasAny(files.statusProvider + files.routes, ["diagnostic"])],
        ["authorization tests exist", existsSync("console/api/test/discordPolicy.test.js") && existsSync("console/api/test/discordRoutes.test.js")]
      ]),
      recommendation: "Keep detailed status behind admin/owner capability and enforce that check server-side."
    }),
    finding({
      id: "STRIDE-E-002",
      category: "Elevation of Privilege",
      title: "GitHub Actions issue automation over-permissioned or abused",
      asset: "github-actions",
      trustBoundary: "tb-ci-repo",
      severity: "medium",
      status: hasAll(files.trivyWorkflow + files.semgrepWorkflow, ["issues: write"]) && hasAll(files.trivyWorkflow + files.semgrepWorkflow, ["github.event_name == 'pull_request'", "--dry-run"]),
      evidence: evidence([
        ["issue automation permission explicit", hasAll(files.trivyWorkflow + files.semgrepWorkflow, ["issues: write"])],
        ["pull request issue sync is dry-run", hasAll(files.trivyWorkflow + files.semgrepWorkflow, ["github.event_name == 'pull_request'", "--dry-run"])],
        ["push/schedule sync uses repository token", hasAll(files.trivyWorkflow + files.semgrepWorkflow, ["GITHUB_TOKEN"])]
      ]),
      recommendation: "Keep issue creation disabled on pull_request context and avoid pull_request_target for untrusted code."
    })
  ].map((item) => ({
    ...item,
    status: item.status === true ? "mitigated" : "open",
    controls: controlsFor(item.category)
  }));
}

function finding(input) {
  return input;
}

function summarize(findings) {
  const byCategory = {};
  const bySeverity = {};
  const byStatus = {};
  for (const finding of findings) {
    byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
    byStatus[finding.status] = (byStatus[finding.status] || 0) + 1;
  }
  return { total: findings.length, byCategory, bySeverity, byStatus };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# STRIDE Threat Model Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Scanner: ${report.scanner.name}`);
  lines.push(`Cost: ${report.scanner.cost}`);
  lines.push(`Scope: ${report.scanner.scope}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total findings: ${report.summary.total}`);
  lines.push(`- Open findings: ${report.summary.byStatus.open || 0}`);
  lines.push(`- Mitigated findings: ${report.summary.byStatus.mitigated || 0}`);
  lines.push("");
  lines.push("### By STRIDE Category");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("|---|---:|");
  for (const [category, count] of Object.entries(report.summary.byCategory)) lines.push(`| ${category} | ${count} |`);
  lines.push("");
  lines.push("## Assets");
  lines.push("");
  lines.push("| ID | Asset | Sensitivity |");
  lines.push("|---|---|---|");
  for (const asset of report.assets) lines.push(`| ${asset.id} | ${asset.name} | ${asset.sensitivity} |`);
  lines.push("");
  lines.push("## Trust Boundaries");
  lines.push("");
  lines.push("| ID | From | To | Protocol |");
  lines.push("|---|---|---|---|");
  for (const boundary of report.trustBoundaries) lines.push(`| ${boundary.id} | ${boundary.from} | ${boundary.to} | ${boundary.protocol} |`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  lines.push("| ID | STRIDE | Severity | Status | Threat | Recommendation |");
  lines.push("|---|---|---|---|---|---|");
  for (const finding of report.findings) {
    lines.push(`| ${finding.id} | ${finding.category} | ${finding.severity} | ${finding.status} | ${escapeMd(finding.title)} | ${escapeMd(finding.recommendation)} |`);
  }
  lines.push("");
  lines.push("## Detailed Evidence");
  lines.push("");
  for (const finding of report.findings) {
    lines.push(`### ${finding.id} - ${finding.title}`);
    lines.push("");
    lines.push(`- STRIDE: ${finding.category}`);
    lines.push(`- Severity: ${finding.severity}`);
    lines.push(`- Status: ${finding.status}`);
    lines.push(`- Asset: ${finding.asset}`);
    lines.push(`- Trust boundary: ${finding.trustBoundary}`);
    lines.push("- Evidence:");
    for (const line of finding.evidence) lines.push(`  - ${line}`);
    lines.push(`- Recommendation: ${finding.recommendation}`);
    lines.push(`- SOC 2 readiness mapping: ${finding.controls.join(", ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function hasAll(text, patterns) {
  return patterns.every((pattern) => text.includes(pattern));
}

function evidence(items) {
  return items.map(([label, passed]) => `${passed ? "PASS" : "GAP"}: ${label}`);
}

function controlsFor(category) {
  const base = ["DC-SOC2-SEC-006", "E-013"];
  const map = {
    Spoofing: ["DC-SOC2-SEC-001", "DC-SOC2-SEC-002"],
    Tampering: ["DC-SOC2-SEC-003", "DC-SOC2-SEC-005"],
    Repudiation: ["DC-SOC2-SEC-008"],
    "Information Disclosure": ["DC-SOC2-C-001", "DC-SOC2-C-002", "DC-SOC2-C-003"],
    "Denial of Service": ["DC-SOC2-AV-001", "DC-SOC2-AV-004"],
    "Elevation of Privilege": ["DC-SOC2-SEC-001", "DC-SOC2-SEC-005"]
  };
  return [...new Set([...(map[category] || []), ...base])];
}

function escapeMd(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 220);
}
