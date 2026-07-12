import { useCallback, useEffect, useState } from "react";
import { Shield, RefreshCw, Save } from "lucide-react";
import {
  getRoleCapabilities,
  setRoleCapabilities,
  getAuditLog,
  RBAC_ROLES,
  CAPABILITY_LABELS,
  CAPABILITY_DOMAINS,
  type RbacRole,
  type RbacRoleCapability,
  type RbacAuditEntry,
} from "../../api/rbac";

type SubTab = "roles" | "audit";

export function RbacAdminPanel() {
  const [subTab, setSubTab] = useState<SubTab>("roles");
  const [roleCaps, setRoleCaps] = useState<RbacRoleCapability[]>([]);
  const [selectedRole, setSelectedRole] = useState<RbacRole>("public");
  const [selectedCaps, setSelectedCaps] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [auditLog, setAuditLog] = useState<RbacAuditEntry[]>([]);

  const loadRoleCaps = useCallback(async () => {
    try {
      const data = await getRoleCapabilities();
      setRoleCaps(data.rows);
    } catch {
      setError("Failed to load role capabilities");
    }
  }, []);

  const loadAuditLog = useCallback(async () => {
    try {
      const data = await getAuditLog();
      setAuditLog(data.rows);
    } catch {
      setError("Failed to load audit log");
    }
  }, []);

  useEffect(() => {
    void loadRoleCaps();
  }, [loadRoleCaps]);

  useEffect(() => {
    if (subTab === "audit") void loadAuditLog();
  }, [subTab, loadAuditLog]);

  useEffect(() => {
    const caps = roleCaps
      .filter((r) => r.role_id === selectedRole)
      .map((r) => r.capability);
    setSelectedCaps(new Set(caps));
    setDirty(false);
  }, [selectedRole, roleCaps]);

  function toggleCap(cap: string) {
    const next = new Set(selectedCaps);
    if (next.has(cap)) next.delete(cap);
    else next.add(cap);
    setSelectedCaps(next);
    setDirty(true);
  }

  async function saveRole() {
    setSaving(true);
    setError("");
    try {
      await setRoleCapabilities(selectedRole, [...selectedCaps]);
      await loadRoleCaps();
      setDirty(false);
    } catch {
      setError("Failed to save role capabilities");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <header className="topbar">
        <div>
          <strong>RBAC Administration</strong>
          <span>Manage role-based access control</span>
        </div>
      </header>

      <div className="rbac-subtabs">
        <button
          className={`rbac-subtab ${subTab === "roles" ? "active" : ""}`}
          onClick={() => setSubTab("roles")}
        >
          <Shield size={16} /> Roles
        </button>
        <button
          className={`rbac-subtab ${subTab === "audit" ? "active" : ""}`}
          onClick={() => setSubTab("audit")}
        >
          <RefreshCw size={16} /> Audit Log
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {subTab === "roles" && (
        <RolesTab
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          selectedCaps={selectedCaps}
          toggleCap={toggleCap}
          dirty={dirty}
          saving={saving}
          saveRole={saveRole}
          roleCaps={roleCaps}
        />
      )}

      {subTab === "audit" && <AuditTab auditLog={auditLog} />}
    </div>
  );
}

function RolesTab({
  selectedRole,
  setSelectedRole,
  selectedCaps,
  toggleCap,
  dirty,
  saving,
  saveRole,
  roleCaps,
}: {
  selectedRole: RbacRole;
  setSelectedRole: (r: RbacRole) => void;
  selectedCaps: Set<string>;
  toggleCap: (cap: string) => void;
  dirty: boolean;
  saving: boolean;
  saveRole: () => void;
  roleCaps: RbacRoleCapability[];
}) {
  return (
    <div className="rbac-roles-layout">
      <div className="rbac-role-selector">
        {RBAC_ROLES.map((role) => {
          const count = roleCaps.filter((r) => r.role_id === role).length;
          return (
            <button
              key={role}
              className={`rbac-role-chip ${selectedRole === role ? "active" : ""}`}
              onClick={() => setSelectedRole(role)}
            >
              <span className="rbac-role-name">{role}</span>
              <span className="rbac-role-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="rbac-cap-grid">
        {Object.entries(CAPABILITY_DOMAINS).map(([domain, caps]) => (
          <div key={domain} className="rbac-cap-domain">
            <h4>{domain}</h4>
            {caps.map((cap) => (
              <label key={cap} className="rbac-cap-toggle">
                <input
                  type="checkbox"
                  checked={selectedCaps.has(cap)}
                  onChange={() => toggleCap(cap)}
                />
                <span>{CAPABILITY_LABELS[cap] || cap}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="rbac-save-bar">
        <button className="success" disabled={!dirty || saving} onClick={() => void saveRole()}>
          <Save size={16} />
          {saving ? "Saving..." : "Save"}
        </button>
        <span className="rbac-save-note">
          {dirty ? "Changes not saved" : "All changes saved"}
        </span>
      </div>
    </div>
  );
}

function AuditTab({ auditLog }: { auditLog: RbacAuditEntry[] }) {
  return (
    <div className="rbac-audit-tab">
      <div className="table-wrap" style={{ maxHeight: "min(64vh, 520px)" }}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>
                  No audit entries yet
                </td>
              </tr>
            )}
            {auditLog.map((entry) => (
              <tr key={entry.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
                <td>{entry.actor_name}</td>
                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.action}
                </td>
                <td>
                  {entry.target_type}/{entry.target_id}
                </td>
                <td>
                  <span className={`badge ${entry.result === "success" ? "success" : "warn"}`}>
                    {entry.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
