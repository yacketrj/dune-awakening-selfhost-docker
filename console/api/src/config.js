import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";

export const APP_NAME = "Dune Docker Console";

export function loadConfig() {
  const repoRoot = resolve(process.env.DUNE_DOCKER_DIR || process.env.RUNTIME_DIR || process.cwd());
  const generatedDir = resolve(repoRoot, "runtime/generated");
  const secretsDir = resolve(repoRoot, "runtime/secrets");
  const secureCookieEnv = process.env.ADMIN_SECURE_COOKIES;
  const publicBaseUrl = normalizePublicBaseUrl(process.env.ADMIN_PUBLIC_BASE_URL || "");
  mkdirSync(generatedDir, { recursive: true });
  mkdirSync(secretsDir, { recursive: true });

  const adminPasswordFile = resolve(secretsDir, "admin-web-password.txt");
  const adminPasswordEnvManaged = Boolean(process.env.ADMIN_PASSWORD);
  const secureCookies = resolveSecureCookies(secureCookieEnv, publicBaseUrl);
  const authDisabled = process.env.ADMIN_AUTH_DISABLED === "1";
  if (authDisabled && publicBaseUrl && process.env.ADMIN_ALLOW_AUTH_DISABLED_WITH_PUBLIC_URL !== "1") {
    throw new Error("ADMIN_AUTH_DISABLED=1 is not allowed when ADMIN_PUBLIC_BASE_URL is set.");
  }
  return {
    appName: APP_NAME,
    repoRoot,
    duneScript: resolve(repoRoot, "runtime/scripts/dune"),
    host: resolveAdminBindHost(process.env.ADMIN_BIND_HOST),
    port: Number(process.env.ADMIN_BIND_PORT || 8088),
    authDisabled,
    secureCookies,
    cookieSameSite: resolveCookieSameSite(process.env.ADMIN_COOKIE_SAMESITE, secureCookies),
    publicBaseUrl,
    allowedOrigins: parseList(process.env.ADMIN_ALLOWED_ORIGINS, publicBaseUrl),
    allowedHosts: parseAllowedHosts(process.env.ADMIN_ALLOWED_HOSTS, publicBaseUrl),
    trustProxy: process.env.ADMIN_TRUST_PROXY === "1",
    publicHealthEnabled: process.env.ADMIN_PUBLIC_HEALTH_ENABLED === "1",
    hstsEnabled: process.env.ADMIN_HSTS_ENABLED === "1" || Boolean(publicBaseUrl?.startsWith("https://")),
    hstsMaxAge: Number(process.env.ADMIN_HSTS_MAX_AGE || 15552000),
    allowHostBootstrap: process.env.ALLOW_HOST_BOOTSTRAP === "true",
    mockMode: process.env.ADMIN_MOCK_MODE === "1",
    sessionSecret: getOrCreateSecret(resolve(secretsDir, "admin-web-session-secret.txt"), 48),
    adminPassword: process.env.ADMIN_PASSWORD || getOrCreateSecret(adminPasswordFile, 18),
    adminPasswordFile,
    adminPasswordEnvManaged,
    generatedDir,
    secretsDir,
    auditLog: resolve(generatedDir, "web-admin-audit.jsonl"),
    taskRetention: Number(process.env.ADMIN_TASK_RETENTION || 200),
    maxJsonBytes: Number(process.env.ADMIN_MAX_JSON_BYTES || 2 * 1024 * 1024),
    maxUploadBytes: Number(process.env.ADMIN_MAX_UPLOAD_BYTES || 1024 * 1024 * 1024),
    commandTimeoutMs: Number(process.env.ADMIN_COMMAND_TIMEOUT_MS || 120000),
    requestTimeoutMs: Number(process.env.ADMIN_REQUEST_TIMEOUT_MS || 120000),
    headersTimeoutMs: Number(process.env.ADMIN_HEADERS_TIMEOUT_MS || 10000),
    keepAliveTimeoutMs: Number(process.env.ADMIN_KEEP_ALIVE_TIMEOUT_MS || 10000),
    maxHeaderBytes: Number(process.env.ADMIN_MAX_HEADER_BYTES || 16384),
    apiRateLimitWindowMs: readPositiveInt(process.env.ADMIN_API_RATE_LIMIT_WINDOW_MS, 60000),
    apiRateLimitMax: readPositiveInt(process.env.ADMIN_API_RATE_LIMIT_MAX, 600),
    apiMutationRateLimitMax: readPositiveInt(process.env.ADMIN_API_MUTATION_RATE_LIMIT_MAX, 120),
    apiExpensiveRateLimitMax: readPositiveInt(process.env.ADMIN_API_EXPENSIVE_RATE_LIMIT_MAX, 120),
    staticDir: process.env.ADMIN_STATIC_DIR || resolve(repoRoot, "console/web/dist")
  };
}

function resolveSecureCookies(value, publicBaseUrl) {
  if (value === undefined) return process.env.NODE_ENV === "production" || Boolean(publicBaseUrl?.startsWith("https://"));
  const raw = String(value || "auto").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return Boolean(publicBaseUrl?.startsWith("https://"));
}

function resolveCookieSameSite(value, secureCookies) {
  const raw = String(value || (secureCookies ? "Strict" : "Lax")).trim();
  if (/^(strict|lax)$/i.test(raw)) return raw[0].toUpperCase() + raw.slice(1).toLowerCase();
  return secureCookies ? "Strict" : "Lax";
}

function normalizePublicBaseUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function parseList(value, extra = "") {
  const entries = String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (extra) entries.push(extra);
  return [...new Set(entries)];
}

function parseAllowedHosts(value, publicBaseUrl = "") {
  const hosts = parseList(value).map((item) => item.toLowerCase());
  if (publicBaseUrl) {
    try {
      hosts.push(new URL(publicBaseUrl).host.toLowerCase());
    } catch {
      // Ignored; normalizePublicBaseUrl already validates this path.
    }
  }
  return [...new Set(hosts)];
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveAdminBindHost(value) {
  const raw = String(value || "0.0.0.0").trim();
  if (raw && raw !== "auto") return raw;
  return detectPrivateIpv4() || "127.0.0.1";
}

function detectPrivateIpv4() {
  let interfaces = {};
  try {
    interfaces = networkInterfaces();
  } catch {
    return "";
  }
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses || []) {
      if (address.family !== "IPv4" || address.internal || !isPrivateIpv4(address.address)) continue;
      return address.address;
    }
  }
  return "";
}

function isPrivateIpv4(value) {
  const parts = String(value || "").split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function getOrCreateSecret(path, bytes) {
  if (existsSync(path)) {
    return readFileSync(path, "utf8").trim();
  }
  mkdirSync(dirname(path), { recursive: true });
  const value = randomBytes(bytes).toString("base64url");
  writeFileSync(path, `${value}\n`, { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort on non-POSIX development hosts.
  }
  return value;
}

export function publicConfig(config) {
  return {
    appName: config.appName,
    host: config.host,
    port: config.port,
    authDisabled: config.authDisabled,
    adminPasswordEnvManaged: config.adminPasswordEnvManaged,
    secureCookies: config.secureCookies,
    cookieSameSite: config.cookieSameSite,
    publicBaseUrl: config.publicBaseUrl,
    hstsEnabled: config.hstsEnabled,
    allowHostBootstrap: config.allowHostBootstrap,
    mockMode: config.mockMode
  };
}
