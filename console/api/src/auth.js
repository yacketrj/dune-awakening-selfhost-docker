import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { discordActorTier, CAPABILITY_BY_TIER } from "./integrations/discord/policy.js";

const sessions = new Map();
const AUDIT_ENABLED = process.env.RBAC_AUDIT_ENABLED !== "0";

export const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "geolocation=(), microphone=(), camera=()"
};

export function withSecurityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers };
}

export function parseCookies(header = "") {
  const cookies = new Map();
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    cookies.set(part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim()));
  }
  return cookies;
}

// ── RBAC Capability Session Stamping ──
// Web UI sessions use admin password → owner tier → ALL capabilities.
// When Discord OAuth2 is added (Phase 3), sessions will resolve capabilities
// from the user's Discord roles + dune.rbac_role_capabilities table.

let ALL_CAPABILITIES = null;

export function setCapabilityRegistry(capabilities) {
  ALL_CAPABILITIES = new Set(capabilities);
}

export function getAllCapabilities() {
  return ALL_CAPABILITIES || new Set();
}

export function resolveSessionCapabilities(session, rbacConfig = {}) {
  if (!session) return new Set();
  // Local admin password → full owner tier
  if (session.authSource === "local") return ALL_CAPABILITIES ? new Set(ALL_CAPABILITIES) : new Set();
  // Discord OAuth2 → resolve from role mapping (env vars or config override)
  if (session.authSource === "discord" && session.roleIds?.length > 0) {
    const mapping = rbacConfig.rbacRoleMapping || resolveRoleMappingFromEnv();
    const tier = discordActorTier({ roleIds: session.roleIds }, mapping);
    return CAPABILITY_BY_TIER[tier] || CAPABILITY_BY_TIER.public || new Set();
  }
  // Unknown source → public tier only
  return new Set();
}

function resolveRoleMappingFromEnv() {
  return {
    ownerRoleIds: parseCsv(process.env.DISCORD_OWNER_ROLE_IDS),
    adminRoleIds: parseCsv(process.env.DISCORD_ADMIN_ROLE_IDS),
    moderatorRoleIds: parseCsv(process.env.DISCORD_MODERATOR_ROLE_IDS),
    observerRoleIds: parseCsv(process.env.DISCORD_OBSERVER_ROLE_IDS)
  };
}

function parseCsv(value) {
  return String(value || "").split(",").map(s => s.trim()).filter(Boolean);
}

export function requireCapability(session, capability, route) {
  if (!session) return false;
  if (!session.capabilities) return false;
  const hasCap = session.capabilities.has(capability);
  if (!hasCap && AUDIT_ENABLED) {
    const entry = {
      timestamp: new Date().toISOString(),
      actor_id: session.actorId || "unknown",
      action: capability,
      route: route || "unknown",
      result: "denied"
    };
    process.emit?.("rbac-audit", entry);
  }
  return hasCap;
}

export function stampSessionCapabilities(session) {
  if (!session) return session;
  session.capabilities = resolveSessionCapabilities(session);
  return session;
}

// ── Auth Factory ──

export function createAuth(config) {
  function sign(value) {
    return createHmac("sha256", config.sessionSecret).update(value).digest("base64url");
  }

  function makeSession() {
    const id = randomBytes(32).toString("base64url");
    const csrf = randomBytes(24).toString("base64url");
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
    const session = { id, csrf, expiresAt, actorId: "local:admin", authSource: "local" };
    stampSessionCapabilities(session);
    session.cookie = `${id}.${sign(id)}`;
    sessions.set(id, session);
    return session;
  }

  function readSession(req) {
    if (config.authDisabled) {
      const s = { id: "dev", csrf: "dev", expiresAt: Number.MAX_SAFE_INTEGER, actorId: "local:dev", authSource: "local" };
      stampSessionCapabilities(s);
      return s;
    }
    const raw = parseCookies(req.headers.cookie || "").get("asc_session");
    if (!raw) return null;
    const [id, sig] = raw.split(".");
    if (!id || !sig || sign(id) !== sig) return null;
    const session = sessions.get(id);
    if (!session || session.expiresAt < Date.now()) {
      sessions.delete(id);
      return null;
    }
    session.expiresAt = Date.now() + 12 * 60 * 60 * 1000;
    if (!session.capabilities) stampSessionCapabilities(session);
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
      json(res, 401, { error: "Your browser login session expired. Refresh the page, then sign in again." });
      return null;
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method || "")) {
      const csrf = req.headers["x-csrf-token"];
      if (!config.authDisabled && csrf !== session.csrf) {
        json(res, 403, { error: "Your browser login session expired. Refresh the page, then sign in again." });
        return null;
      }
    }
    return session;
  }

  return { makeSession, readSession, passwordMatches, requireAuth };
}

export function setSessionCookie(res, session, config = {}) {
  const secure = config.secureCookies ? "; Secure" : "";
  res.setHeader("Set-Cookie", `asc_session=${encodeURIComponent(session.cookie)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`);
}

export function clearSessionCookie(res, config = {}) {
  const secure = config.secureCookies ? "; Secure" : "";
  res.setHeader("Set-Cookie", `asc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

export function json(res, status, body, headers = {}) {
  res.writeHead(status, withSecurityHeaders({ "content-type": "application/json; charset=utf-8", ...headers }));
  res.end(JSON.stringify(body));
}
