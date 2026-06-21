import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const sessions = new Map();

export const SECURITY_HEADERS = {
  "content-security-policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'"
  ].join("; "),
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "x-permitted-cross-domain-policies": "none",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
  "permissions-policy": "geolocation=(), microphone=(), camera=()"
};

export const API_NO_STORE_HEADERS = {
  "cache-control": "no-store",
  pragma: "no-cache"
};

export function withSecurityHeaders(headers = {}, config = {}) {
  const next = { ...SECURITY_HEADERS, ...headers };
  if (shouldSendHsts(config)) {
    const maxAge = Number(config.hstsMaxAge || process.env.ADMIN_HSTS_MAX_AGE || 15552000);
    next["strict-transport-security"] = `max-age=${Math.max(0, maxAge)}; includeSubDomains`;
  }
  return next;
}

function shouldSendHsts(config = {}) {
  return config.hstsEnabled ||
    process.env.ADMIN_HSTS_ENABLED === "1" ||
    /^https:\/\//i.test(String(process.env.ADMIN_PUBLIC_BASE_URL || ""));
}

export function parseCookies(header = "") {
  const cookies = new Map();
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  }
  return cookies;
}

export function createAuth(config) {
  function sign(value) {
    return createHmac("sha256", config.sessionSecret).update(value).digest("base64url");
  }

  function makeSession() {
    const id = randomBytes(32).toString("base64url");
    const csrf = randomBytes(24).toString("base64url");
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
    sessions.set(id, { id, csrf, expiresAt });
    return { id, csrf, expiresAt, cookie: `${id}.${sign(id)}` };
  }

  function readSession(req) {
    if (config.authDisabled) return { id: "dev", csrf: "dev", expiresAt: Number.MAX_SAFE_INTEGER };
    const raw = parseCookies(req.headers.cookie || "").get("asc_session");
    if (!raw) return null;
    const [id, sig] = raw.split(".");
    if (!id || !sig || sign(id) !== sig) return null;
    const session = sessions.get(id);
    if (!session || session.expiresAt < Date.now()) {
      sessions.delete(id);
      return null;
    }
    return session;
  }

  function passwordMatches(value) {
    const left = Buffer.from(String(value || ""));
    const right = Buffer.from(config.adminPassword);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  function requireAuth(req, res) {
    const session = readSession(req);
    if (!session) {
      json(res, 401, { error: "Your console session expired or the console restarted. Refresh the page, then sign in again." }, {}, config);
      return null;
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method || "")) {
      const csrf = req.headers["x-csrf-token"];
      if (!config.authDisabled && csrf !== session.csrf) {
        json(res, 403, { error: "CSRF token is missing or invalid" }, {}, config);
        return null;
      }
      if (!config.authDisabled && !hasTrustedRequestOrigin(req, config)) {
        json(res, 403, { error: "Request origin is not trusted" }, {}, config);
        return null;
      }
    }
    return session;
  }

  return { makeSession, readSession, passwordMatches, requireAuth };
}

export function setSessionCookie(res, session, config = {}) {
  const secure = config.secureCookies ? "; Secure" : "";
  const sameSite = cookieSameSite(config);
  res.setHeader("Set-Cookie", `asc_session=${encodeURIComponent(session.cookie)}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=43200${secure}`);
}

export function clearSessionCookie(res, config = {}) {
  const secure = config.secureCookies ? "; Secure" : "";
  const sameSite = cookieSameSite(config);
  res.setHeader("Set-Cookie", `asc_session=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`);
}

function cookieSameSite(config = {}) {
  const value = String(config.cookieSameSite || (config.secureCookies ? "Strict" : "Lax"));
  return /^(Strict|Lax)$/i.test(value) ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "Lax";
}

export function json(res, status, body, headers = {}, config = {}) {
  res.writeHead(status, withSecurityHeaders({ "content-type": "application/json; charset=utf-8", ...API_NO_STORE_HEADERS, ...headers }, config));
  res.end(JSON.stringify(body));
}

export function isTrustedHost(req, config = {}) {
  const allowed = (config.allowedHosts || []).map((item) => String(item).toLowerCase()).filter(Boolean);
  if (!allowed.length) return true;
  const host = firstHeaderValue(req.headers?.host).toLowerCase();
  if (!host) return false;
  const bare = hostWithoutPort(host);
  return allowed.some((candidate) => candidate === host || candidate === bare);
}

export function hasTrustedRequestOrigin(req, config = {}) {
  const source = req.headers?.origin || req.headers?.referer;
  if (!source) return true;
  const origin = normalizeOrigin(firstHeaderValue(source));
  if (!origin) return false;
  const allowed = new Set([...(config.allowedOrigins || []), config.publicBaseUrl, inferredRequestOrigin(req, config)].filter(Boolean).map(normalizeOrigin).filter(Boolean));
  return allowed.has(origin);
}

function inferredRequestOrigin(req, config = {}) {
  const host = firstHeaderValue(config.trustProxy ? req.headers?.["x-forwarded-host"] || req.headers?.host : req.headers?.host);
  if (!host) return "";
  const proto = (config.trustProxy && firstHeaderValue(req.headers?.["x-forwarded-proto"])) || (req.socket?.encrypted ? "https" : "http");
  return normalizeOrigin(`${proto}://${host}`);
}

function normalizeOrigin(value) {
  try {
    return new URL(String(value || "")).origin;
  } catch {
    return "";
  }
}

function firstHeaderValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || "").split(",")[0].trim();
}

function hostWithoutPort(value) {
  const host = String(value || "").trim();
  if (host.startsWith("[")) return host.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1");
  return host.replace(/:\d+$/, "");
}
