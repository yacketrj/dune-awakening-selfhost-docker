// Discord Role-Based Access Control — Capability Model
//
// 20 capabilities across 8 domains. Roles map to capability sets.
// Owners and admins bypass — always get ALL capabilities.
// Write capabilities are gated behind DUNE_DISCORD_WRITES_ENABLED.

export const DISCORD_ROLE_TIERS = ["public", "observer", "moderator", "admin", "owner"];

// ── Capability Definitions ──

export const DISCORD_CAPABILITIES = Object.freeze({
  // Status & Health
  STATUS_READ: "status:read",
  READINESS_READ: "readiness:read",
  SERVICES_READ: "services:read",

  // Population & Maps
  POPULATION_READ: "population:read",
  MAPS_READ: "maps:read",
  BACKUPS_READ: "backups:read",
  BROADCAST_SEND: "broadcast:send",
  LOGS_READ: "logs:read",
});

export const EXPERIMENTAL_READ_ONLY_CAPABILITIES = Object.freeze(
  new Set(Object.values(DISCORD_CAPABILITIES).filter((c) => c !== DISCORD_CAPABILITIES.BROADCAST_SEND))
);

export const DISCORD_WRITE_CAPABILITIES = Object.freeze(
  new Set([DISCORD_CAPABILITIES.BROADCAST_SEND])
);

const CAPABILITY_BY_TIER = Object.freeze({
  public: new Set([
    DISCORD_CAPABILITIES.STATUS_READ
  ]),

  observer: new Set([
    DISCORD_CAPABILITIES.STATUS_READ,
    DISCORD_CAPABILITIES.READINESS_READ,
    DISCORD_CAPABILITIES.SERVICES_READ
  ]),

  moderator: new Set([
    // Status & Health
    DISCORD_CAPABILITIES.STATUS_READ,
    DISCORD_CAPABILITIES.READINESS_READ,
    DISCORD_CAPABILITIES.SERVICES_READ,
    // Population & Maps
    DISCORD_CAPABILITIES.POPULATION_READ,
    DISCORD_CAPABILITIES.MAPS_READ,
    // Database & Backups
    DISCORD_CAPABILITIES.BACKUPS_READ,
    // Player Management
    DISCORD_CAPABILITIES.PLAYERS_READ,
    // Inventory & Storage
    DISCORD_CAPABILITIES.INVENTORY_READ,
    DISCORD_CAPABILITIES.STORAGE_READ,
    // Guild & Social
    DISCORD_CAPABILITIES.GUILD_READ
  ]),

  admin: new Set([
    // Status & Health
    DISCORD_CAPABILITIES.STATUS_READ,
    DISCORD_CAPABILITIES.READINESS_READ,
    DISCORD_CAPABILITIES.SERVICES_READ,
    // Population & Maps
    DISCORD_CAPABILITIES.POPULATION_READ,
    DISCORD_CAPABILITIES.MAPS_READ,
    // Logs & Diagnostics
    DISCORD_CAPABILITIES.LOGS_READ,
    DISCORD_CAPABILITIES.DIAGNOSTICS_READ,
    // Database & Backups
    DISCORD_CAPABILITIES.BACKUPS_READ,
    DISCORD_CAPABILITIES.DATABASE_READ,
    // Player Management
    DISCORD_CAPABILITIES.PLAYERS_READ,
    DISCORD_CAPABILITIES.PLAYERS_WRITE,
    // Inventory & Storage
    DISCORD_CAPABILITIES.INVENTORY_READ,
    DISCORD_CAPABILITIES.STORAGE_READ,
    // Guild & Social
    DISCORD_CAPABILITIES.GUILD_READ,
    DISCORD_CAPABILITIES.GUILD_WRITE,
    // Server Control
    DISCORD_CAPABILITIES.BROADCAST_SEND
  ]),

  owner: new Set([...Object.values(DISCORD_CAPABILITIES)])
});

// ── Role Mapping ──

export function normalizeRoleMapping(value = {}) {
  return {
    observerRoleIds: normalizeStringList(value.observerRoleIds),
    moderatorRoleIds: normalizeStringList(value.moderatorRoleIds),
    adminRoleIds: normalizeStringList(value.adminRoleIds),
    ownerRoleIds: normalizeStringList(value.ownerRoleIds)
  };
}

// ── Actor Normalization ──

export function normalizeDiscordActor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw policyError("missing_actor", "Discord actor context is required.");
  const actor = {
    guildId: requiredString(value.guildId, "actor.guildId"),
    channelId: requiredString(value.channelId, "actor.channelId"),
    userId: requiredString(value.userId, "actor.userId"),
    username: requiredString(value.username, "actor.username"),
    roleIds: normalizeStringList(value.roleIds),
    interactionId: optionalString(value.interactionId),
    commandName: optionalString(value.commandName)
  };
  return actor;
}

// ── Tier Resolution ──

export function discordActorTier(actor, mapping) {
  const roleIds = new Set(normalizeStringList(actor?.roleIds));
  const normalized = normalizeRoleMapping(mapping);
  if (normalized.ownerRoleIds.some((roleId) => roleIds.has(roleId))) return "owner";
  if (normalized.adminRoleIds.some((roleId) => roleIds.has(roleId))) return "admin";
  if (normalized.moderatorRoleIds.some((roleId) => roleIds.has(roleId))) return "moderator";
  if (normalized.observerRoleIds.some((roleId) => roleIds.has(roleId))) return "observer";
  return "public";
}

// ── Capability Checks ──

export function discordActorCapabilities(actor, mapping) {
  const tier = discordActorTier(actor, mapping);
  return CAPABILITY_BY_TIER[tier];
}

export function discordActorCan(actor, mapping, capability) {
  const normalizedCapability = requiredString(capability, "capability");
  if (!Object.values(DISCORD_CAPABILITIES).includes(normalizedCapability)) throw policyError("invalid_capability", `Unsupported Discord capability: ${normalizedCapability}`);
  return discordActorCapabilities(actor, mapping).has(normalizedCapability);
}

export function requireDiscordCapability(actor, mapping, capability) {
  requireExperimentalReadOnlyCapability(capability);
  if (!discordActorCan(actor, mapping, capability)) {
    throw policyError("not_authorized", `Discord actor is not authorized for ${capability}.`, 403);
  }
}

export function requireExperimentalReadOnlyCapability(capability) {
  const normalizedCapability = requiredString(capability, "capability");
  if (DISCORD_WRITE_CAPABILITIES.has(normalizedCapability)) return; // checked separately via write enablement
  if (!EXPERIMENTAL_READ_ONLY_CAPABILITIES.has(normalizedCapability)) {
    throw policyError("not_read_only", `Capability is not allowed in experimental read-only mode: ${normalizedCapability}`, 403);
  }
}

// ── Error Helpers ──

export function policyError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function requiredString(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw policyError("invalid_actor", `${name} is required.`);
  if (text.length > 256) throw policyError("invalid_actor", `${name} is too long.`);
  return text;
}

function optionalString(value) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 256) : "";
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 100);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 100);
  return [];
}
