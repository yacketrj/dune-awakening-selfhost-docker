import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { api } from "../../api/client";
import { DataTable } from "../../components/common/DataTable";
import { formatUiSentence } from "../../lib/display";

type BlueprintRow = Record<string, unknown> & { id: number; name: string; owner_name?: string; item_id?: number; pieces: number; placeables: number };

export function BlueprintsPanel({ onError, confirmAction, dbPlayerId = "", playerName = "" }: { onError: (text: string) => void; confirmAction: (message: string, options?: Record<string, unknown>) => Promise<boolean>; dbPlayerId?: string; playerName?: string }) {
  const [rows, setRows] = useState<BlueprintRow[]>([]);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    onError("");
    try {
      const result = await api<BlueprintRow[] | { rows: BlueprintRow[] }>("/api/blueprints");
      const data = Array.isArray(result) ? result : ((result as { rows: BlueprintRow[] }).rows || []);
      if (dbPlayerId) {
        setRows(data.filter((row) => String(row.owner_id ?? row.owner_name ?? "") === dbPlayerId || String(row.player_id ?? "") === dbPlayerId));
      } else {
        setRows(data);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleExport(row: Record<string, unknown>) {
    const id = Number(row.id || 0);
    const name = String(row.name || "");
    try {
      const response = await fetch(`/api/blueprints/${id}/export`);
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name ? `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json` : `blueprint_${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleExportAll() {
    if (rows.length === 0) return;
    setExportingAll(true);
    try {
      for (const row of rows) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await handleExport(row);
      }
    } finally {
      setExportingAll(false);
    }
  }

  async function handleImport() {
    if (!importFile || !dbPlayerId) return;
    if (!(await confirmAction(`Import blueprint for ${playerName || "this player"}? Player must be offline.`, {}))) return;
    setImporting(true);
    const form = new FormData();
    form.append("file", importFile);
    form.append("player_id", dbPlayerId);
    try {
      const result = await api<{ ok: boolean; message?: string; error?: string }>("/api/blueprints/import", { method: "POST", body: form });
      setMessage(result.message || result.error || "Import completed");
      setImportFile(null);
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  }

  return <section>
    {message && <div className="result-panel transient-result"><strong>Import Result.</strong><p>{formatUiSentence(message)}</p></div>}
    <div className="action-line" style={{ marginBottom: 10 }}>
      <label className="file-upload-label" style={{ flex: 1 }}>Blueprint JSON<input type="file" accept=".json,application/json" onChange={(e) => setImportFile(e.target.files?.[0] || null)} /></label>
      <button disabled={!importFile || !dbPlayerId || importing} onClick={handleImport}>
        {importing ? "Importing..." : <><Upload size={16} /> Import</>}
      </button>
      <button disabled={rows.length === 0 || exportingAll} onClick={handleExportAll} className="success">
        {exportingAll ? "Exporting..." : <><Download size={16} /> Export All</>}
      </button>
    </div>
    <p className="action-help-note" style={{ marginBottom: 10 }}>{playerName || "Player"} must be offline to import. Blueprint is added as a Solido Replicator item to their backpack.</p>
    <DataTable
      rows={rows}
      emptyMessage="No blueprints found. Import one above."
      action={(row: Record<string, unknown>) => <span className="icon-toggle-group">
        <button className="icon-toggle-button success" title="Download Blueprint" aria-label="Download Blueprint" onClick={(event) => { event.stopPropagation(); handleExport(row); }}><Download size={16} /></button>
      </span>}
      rowKey={(row) => String(row.id)}
    />
  </section>;
}
