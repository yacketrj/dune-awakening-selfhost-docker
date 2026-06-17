#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "src/index.ts",
  "src/config.ts",
  "src/security/redaction.ts",
  "src/security/authorization.ts",
  "test/redaction.test.mjs",
  "Dockerfile",
  "package-lock.json"
];

const missing = requiredFiles.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`Missing required scaffold files: ${missing.join(", ")}`);
  process.exit(1);
}

const dockerfile = readFileSync("Dockerfile", "utf8");
if (dockerfile.includes("/var/run/docker.sock")) {
  console.error("Docker socket mount is forbidden for the Discord bot.");
  process.exit(1);
}
if (/privileged:\s*true/i.test(dockerfile)) {
  console.error("Privileged container mode is forbidden for the Discord bot.");
  process.exit(1);
}

console.log("Discord bot scaffold validation passed.");
