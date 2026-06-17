import { buildDuneArgs, runDune } from "../../runner.js";
import { sanitizeDiscordPublicStatus, sanitizeDiscordValue } from "./sanitize.js";

export async function discordStatusProvider(config, { diagnostic = false } = {}) {
  const result = await runDune(config, buildDuneArgs("status"), {
    timeoutMs: 15000,
    allowedExitCodes: [0]
  });
  const parsed = parseStatusJson(result.stdout);
  if (diagnostic) return sanitizeDiagnosticStatus(parsed);
  return sanitizeDiscordPublicStatus(parsed);
}

export function parseStatusJson(stdout = "") {
  const text = String(stdout || "").trim();
  if (!text) return {};

  // Prefer the last JSON object in case the underlying script prints a banner first.
  const candidates = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "{") candidates.push(text.slice(i));
  }
  for (const candidate of candidates.reverse()) {
    try {
      const value = JSON.parse(candidate);
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      // Try the next opening brace.
    }
  }
  return { output: sanitizeDiscordValue(text).slice(0, 1500) };
}

function sanitizeDiagnosticStatus(value = {}) {
  // Diagnostic output may retain operational fields, but still never returns secrets or raw connection strings.
  return sanitizeDiscordValue(value);
}
