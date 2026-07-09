import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const LOCKFILES = [
  { path: "console/api/package-lock.json", label: "api" },
  { path: "console/web/package-lock.json", label: "web" }
];
const DEFAULT_OUTPUT_DIR = "dist";
const DEFAULT_OUTPUT_NAME = "dune-awakening-selfhost-docker.cdx.json";
const CYCLONEDX_SPEC_VERSION = "1.6";

export async function writeSbom({
  outputDir = DEFAULT_OUTPUT_DIR,
  outputName = DEFAULT_OUTPUT_NAME,
  timestamp = new Date().toISOString()
} = {}) {
  const allComponents = [];
  const metadataComponents = [];
  let totalPackages = 0;

  for (const lockfile of LOCKFILES) {
    try {
      const lockfileData = JSON.parse(await readFile(lockfile.path, "utf8"));
      const result = buildCycloneDxComponents(lockfileData, lockfile.label, { timestamp });
      allComponents.push(...result.components);
      metadataComponents.push(result.rootComponent);
      totalPackages += result.totalPackages;
    } catch (error) {
      console.error(`Warning: could not process ${lockfile.path}: ${error.message}`);
    }
  }

  if (allComponents.length === 0) throw new Error("No lockfiles could be processed.");

  const merged = deduplicateComponents(allComponents);
  const sbom = buildMergedSbom(merged, metadataComponents, { timestamp });
  validateCycloneDxSbom(sbom);

  const contents = `${JSON.stringify(sbom, null, 2)}\n`;
  const sha256 = createHash("sha256").update(contents).digest("hex");
  const outputPath = join(resolve(outputDir), outputName);
  const checksumPath = `${outputPath}.sha256`;

  await mkdir(resolve(outputDir), { recursive: true });
  await writeFile(outputPath, contents, "utf8");
  await writeFile(checksumPath, `${sha256}  ${basename(outputPath)}\n`, "utf8");

  return {
    outputPath,
    checksumPath,
    componentCount: sbom.components.length,
    totalPackages,
    sha256
  };
}

function buildCycloneDxComponents(lockfile, label, { timestamp }) {
  if (!lockfile?.packages) throw new Error(`${label}: package-lock.json must include a packages object.`);
  const root = lockfile.packages[""];
  if (!root?.name || !root?.version) throw new Error(`${label}: must include root package name and version.`);

  const components = [];
  const seenRefs = new Set();

  for (const [lockPath, packageInfo] of Object.entries(lockfile.packages)) {
    if (lockPath === "" || !lockPath.includes("node_modules/")) continue;
    const name = packageNameFromLockPath(lockPath);
    if (!name || !packageInfo.version) continue;
    const bomRef = `pkg:npm/${encodeNpmName(name)}@${packageInfo.version}`;
    if (seenRefs.has(bomRef)) continue;
    seenRefs.add(bomRef);

    const component = {
      type: "library",
      "bom-ref": bomRef,
      name,
      version: packageInfo.version,
      purl: bomRef,
      scope: packageInfo.dev ? "excluded" : "required"
    };
    if (packageInfo.license) component.licenses = [{ license: { id: packageInfo.license } }];
    if (packageInfo.resolved?.startsWith("https://")) {
      component.externalReferences = [{ type: "distribution", url: packageInfo.resolved }];
    }
    if (packageInfo.integrity) {
      const hash = integrityToHash(packageInfo.integrity);
      if (hash) component.hashes = [hash];
    }
    components.push(component);
  }

  const rootRef = `pkg:npm/${encodeNpmName(root.name)}@${root.version}`;
  return {
    rootComponent: { "bom-ref": rootRef, name: root.name, version: root.version, label },
    components,
    totalPackages: seenRefs.size
  };
}

function deduplicateComponents(allComponents) {
  const seen = new Map();
  for (const c of allComponents) {
    const key = `${c.name}@${c.version}`;
    if (!seen.has(key)) seen.set(key, c);
  }
  const merged = [...seen.values()];
  merged.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return merged;
}

function buildMergedSbom(components, metadataComponents, { timestamp }) {
  const rootRef = "pkg:npm/dune-awakening-selfhost-docker@0.1.0";
  return {
    bomFormat: "CycloneDX",
    specVersion: CYCLONEDX_SPEC_VERSION,
    version: 1,
    serialNumber: deterministicSerialNumber(components),
    metadata: {
      timestamp,
      tools: {
        components: [{
          type: "application",
          name: "dune-awakening-selfhost-docker-sbom-generator",
          version: "0.1.0"
        }]
      },
      component: {
        type: "application",
        "bom-ref": rootRef,
        name: "dune-awakening-selfhost-docker",
        version: "0.1.0"
      }
    },
    components,
    dependencies: [{
      ref: rootRef,
      dependsOn: components.map((c) => c["bom-ref"])
    }]
  };
}

export function validateCycloneDxSbom(sbom) {
  if (sbom?.bomFormat !== "CycloneDX") throw new Error("SBOM must use CycloneDX format.");
  if (sbom.specVersion !== CYCLONEDX_SPEC_VERSION) throw new Error(`SBOM must use CycloneDX ${CYCLONEDX_SPEC_VERSION}.`);
  if (!Array.isArray(sbom.components)) throw new Error("SBOM components must be an array.");
  if (!sbom.metadata?.component?.name) throw new Error("SBOM metadata must include root component name.");
  for (const c of sbom.components) {
    if (c.type !== "library" || !c.name || !c.version || !c.purl) throw new Error("Components must include library type, name, version, purl.");
  }
  return sbom;
}

function packageNameFromLockPath(lockPath) {
  const parts = lockPath.split("/");
  const nodeIndex = parts.lastIndexOf("node_modules");
  if (nodeIndex === -1) return undefined;
  const first = parts[nodeIndex + 1];
  if (!first) return undefined;
  if (first.startsWith("@")) return `${first}/${parts[nodeIndex + 2]}`;
  return first;
}

function encodeNpmName(name) {
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    return `%40${encodeURIComponent(scope.slice(1))}/${encodeURIComponent(pkg)}`;
  }
  return encodeURIComponent(name);
}

function integrityToHash(integrity) {
  const [algorithm, content] = integrity.split("-", 2);
  const map = { sha1: "SHA-1", sha256: "SHA-256", sha384: "SHA-384", sha512: "SHA-512" };
  if (!map[algorithm] || !content) return undefined;
  return { alg: map[algorithm], content };
}

function deterministicSerialNumber(components) {
  const digest = createHash("sha256").update(JSON.stringify(components)).digest("hex");
  return `urn:uuid:${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-${((parseInt(digest.slice(16,18),16)&0x3f)|0x80).toString(16)}${digest.slice(18,20)}-${digest.slice(20,32)}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeSbom()
    .then((r) => {
      console.log(`Created ${r.outputPath}`);
      console.log(`Components ${r.componentCount}`);
      console.log(`Packages ${r.totalPackages}`);
      console.log(`SHA-256 ${r.sha256}`);
    })
    .catch((error) => {
      console.error(error?.message || "SBOM generation failed.");
      process.exit(1);
    });
}
