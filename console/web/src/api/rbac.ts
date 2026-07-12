import { api, post, put } from "./client";

export interface RbacRoleCapability {
  role_id: string;
  capability: string;
}

export interface RbacAuditEntry {
  id: number;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  route: string;
  result: string;
  detail: Record<string, unknown>;
}

export const CAPABILITY_LABELS: Record<string, string> = {
  "status:read": "Status",
  "readiness:read": "Readiness",
  "services:read": "Services",
  "population:read": "Population",
  "maps:read": "Maps & Live Map",
  "logs:read": "Logs",
  "diagnostics:read": "Diagnostics & Addons",
  "backups:read": "Backups (list)",
  "backups:manage": "Backups (manage)",
  "database:read": "Database (schema)",
  "database:query": "Database (query)",
  "players:read": "Players (read)",
  "players:write": "Players (write)",
  "players:delete": "Players (delete)",
  "inventory:read": "Inventory",
  "storage:read": "Storage",
  "guild:read": "Guilds (read)",
  "guild:write": "Guilds & Landsraad (write)",
  "server:control": "Server Control",
  "broadcast:send": "Broadcast",
  "auth:manage": "RBAC Admin",
};

export const CAPABILITY_DOMAINS: Record<string, string[]> = {
  "Status & Health": [
    "status:read",
    "readiness:read",
    "services:read",
  ],
  "Population & Maps": [
    "population:read",
    "maps:read",
  ],
  "Logs & Diagnostics": [
    "logs:read",
    "diagnostics:read",
  ],
  "Database & Backups": [
    "backups:read",
    "backups:manage",
    "database:read",
    "database:query",
  ],
  "Player Management": [
    "players:read",
    "players:write",
    "players:delete",
  ],
  "Inventory & Storage": [
    "inventory:read",
    "storage:read",
  ],
  "Guild & Social": [
    "guild:read",
    "guild:write",
  ],
  "Server Control": [
    "server:control",
    "broadcast:send",
  ],
  "Administration": [
    "auth:manage",
  ],
};

export const RBAC_ROLES = ["public", "observer", "moderator", "admin", "owner"] as const;
export type RbacRole = (typeof RBAC_ROLES)[number];

export async function getRoleCapabilities() {
  return api<{ ok: boolean; rows: RbacRoleCapability[] }>("/api/rbac/roles");
}

export async function setRoleCapabilities(roleId: string, capabilities: string[]) {
  return put<{ ok: boolean; roleId: string; capabilities: string[] }>(`/api/rbac/roles/${encodeURIComponent(roleId)}`, { capabilities });
}

export async function getAuditLog() {
  return api<{ ok: boolean; rows: RbacAuditEntry[] }>("/api/rbac/audit");
}
