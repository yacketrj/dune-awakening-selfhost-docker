#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";

const outDir = "artifacts/security";
const jsonOut = `${outDir}/sbom.cyclonedx.json`;
const mdOut = `${outDir}/sbom.md`;
const lockfiles = process.argv.slice(2).length ? process.argv.slice(2) : [
  "discord-bot/package-lock.json",
  "console/api/package-lock.json"
];

mkdirSync(outDir, { recursive: true });

const components = [];
const evidence = [];
for (const lockfile of lockfiles) {
  if (!existsSync(lockfile)) {
    evidence.push({ lockfile, status: "missing", components: 0 });
    continue;
  }
  const parsed = parseLockfile(lockfile);
  evidence.push({ lockfile, status: "parsed", components: parsed.length });
  components.push(...parsed);
}

const deduped = dedupeComponents(components);
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: `urn:uuid:${randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [
      {
        vendor: "Dune Discord Control Bot",
        name: "repository-local npm lockfile SBOM generator",
        version: "1.0.0"
      }
    ],
    component: {
      type: "application",
      name: "dune-discord-control-bot",
      version: process.env.GITHUB_SHA || "local"
    },
    properties: [
      { name: "scope", value: "Experimental read-only Discord companion bot and Console API adapter" },
      { name: "generator-cost", value: "free / repository-local" }
    ]
  },
  components: deduped,
  properties: evidence.map((item) => ({ name: `lockfile:${item.lockfile}`, value: `${item.status}; components=${item.components}` }))
};

writeFileSync(jsonOut, `${JSON.stringify(sbom, null, 2)}\n`, "utf8");
writeFileSync(mdOut, renderMarkdown(sbom, evidence), "utf8");
console.log(`Wrote ${jsonOut}`);
console.log(`Wrote ${mdOut}`);
console.log(`SBOM components: ${deduped.length}`);

function parseLockfile(lockfile) {
  const payload = JSON.parse(readFileSync(lockfile, "utf8"));
  const components = [];
  if (payload.packages && typeof payload.packages === "object") {
    for (const [path, pkg] of Object.entries(payload.packages)) {
      if (!path || !path.startsWith("node_modules/")) continue;
      if (!pkg?.version) continue;
      const name = packageNameFromPath(path);
      components.push(componentFromPackage({
        name,
        version: pkg.version,
        integrity: pkg.integrity,
        license: pkg.license,
        scope: pkg.dev ? "excluded" : "required",
        lockfile
      }));
    }
    return components;
  }

  if (payload.dependencies && typeof payload.dependencies === "object") {
    walkDependencies(payload.dependencies, lockfile, components);
  }
  return components;
}

function walkDependencies(dependencies, lockfile, components) {
  for (const [name, dep] of Object.entries(dependencies || {})) {
    if (!dep?.version) continue;
    components.push(componentFromPackage({
      name,
      version: dep.version,
      integrity: dep.integrity,
      license: dep.license,
      scope: dep.dev ? "excluded" : "required",
      lockfile
    }));
    if (dep.dependencies) walkDependencies(dep.dependencies, lockfile, components);
  }
}

function componentFromPackage({ name, version, integrity, license, scope, lockfile }) {
  const bomRef = `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
  const component = {
    type: "library",
    "bom-ref": bomRef,
    name,
    version,
    scope,
    purl: bomRef,
    properties: [
      { name: "source-lockfile", value: lockfile }
    ]
  };
  if (integrity) {
    component.hashes = integrityToHashes(integrity);
  }
  if (license) {
    component.licenses = [{ license: { id: String(license) } }];
  }
  return component;
}

function integrityToHashes(integrity) {
  const hashes = [];
  for (const item of String(integrity).split(/\s+/).filter(Boolean)) {
    const [alg, content] = item.split("-");
    if (!alg || !content) continue;
    const algName = {
      sha1: "SHA-1",
      sha256: "SHA-256",
      sha384: "SHA-384",
      sha512: "SHA-512"
    }[alg.toLowerCase()];
    if (!algName) continue;
    hashes.push({ alg: algName, content });
  }
  return hashes;
}

function dedupeComponents(items) {
  const seen = new Map();
  for (const item of items) {
    const key = `${item.name}@${item.version}`;
    if (!seen.has(key)) {
      seen.set(key, item);
      continue;
    }
    const existing = seen.get(key);
    const sources = new Set([
      ...(existing.properties || []).filter((prop) => prop.name === "source-lockfile").map((prop) => prop.value),
      ...(item.properties || []).filter((prop) => prop.name === "source-lockfile").map((prop) => prop.value)
    ]);
    existing.properties = [...(existing.properties || []).filter((prop) => prop.name !== "source-lockfile")];
    for (const source of sources) existing.properties.push({ name: "source-lockfile", value: source });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

function packageNameFromPath(path) {
  const parts = path.replace(/^node_modules\//, "").split("/node_modules/").pop().split("/");
  if (parts[0]?.startsWith("@")) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function renderMarkdown(sbom, evidence) {
  const byScope = {};
  for (const component of sbom.components) byScope[component.scope || "unknown"] = (byScope[component.scope || "unknown"] || 0) + 1;
  const lines = [];
  lines.push("# Software Bill of Materials");
  lines.push("");
  lines.push(`Generated: ${sbom.metadata.timestamp}`);
  lines.push(`Format: ${sbom.bomFormat} ${sbom.specVersion}`);
  lines.push(`Components: ${sbom.components.length}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push("Experimental read-only Discord companion bot and Console API adapter.");
  lines.push("");
  lines.push("## Source Lockfiles");
  lines.push("");
  lines.push("| Lockfile | Status | Components |");
  lines.push("|---|---|---:|");
  for (const item of evidence) lines.push(`| ${item.lockfile} | ${item.status} | ${item.components} |`);
  lines.push("");
  lines.push("## Component Summary");
  lines.push("");
  lines.push("| Scope | Count |");
  lines.push("|---|---:|");
  for (const [scope, count] of Object.entries(byScope)) lines.push(`| ${scope} | ${count} |`);
  lines.push("");
  lines.push("## Components");
  lines.push("");
  lines.push("| Name | Version | Scope | Package URL |");
  lines.push("|---|---|---|---|");
  for (const component of sbom.components) {
    lines.push(`| ${escapeMd(component.name)} | ${escapeMd(component.version)} | ${component.scope || "unknown"} | ${escapeMd(component.purl)} |`);
  }
  lines.push("");
  lines.push("## SOC 2 Readiness Mapping");
  lines.push("");
  lines.push("- DC-SOC2-SEC-006: Vulnerabilities are identified before release.");
  lines.push("- DC-SOC2-SEC-010: Dependency risk is managed.");
  lines.push("- E-009: SBOM evidence for release readiness.");
  lines.push("");
  return lines.join("\n");
}

function escapeMd(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 240);
}

function stableHash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
