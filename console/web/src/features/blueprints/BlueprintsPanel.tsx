import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { api } from "../../api/client";
import { DataTable } from "../../components/common/DataTable";
import { formatUiSentence } from "../../lib/display";

type BlueprintRow = Record<string, unknown> & { id: number; name: string; owner_name?: string; owner_id?: string; player_id?: string; item_id?: number; pieces: number; placeables: number };

export function BlueprintsPanel({ onError, confirmAction, dbPlayerId = "", playerName = "" }: { onError: (text: string) => void; confirmAction: (message: string, options?: Record<string, unknown>) => Promise<boolean>; dbPlayerId?: string; playerName?: string }) {
  const [rows, setRows] = useState<BlueprintRow[]>([]);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    onError("");
    try {
      const result = await api<BlueprintRow[] | { rows: BlueprintRow[] }>("/api/blueprints");
      const data = Array.isArray(result) ? result : ((result as { rows: BlueprintRow[] })?.rows || []);
      if (data.length && dbPlayerId) {
        setRows(data.filter((row) => row && String(row.owner_id ?? row.owner_name ?? row.player_id ?? "") === dbPlayerId));
      } else {
        setRows(data);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function doExport(row: BlueprintRow) {
    const id = Number(row.id || 0);
    const name = String(row.name || "");
    const response = await fetch(`/api/blueprints/${id}/export`);
    if (!response.ok) throw new Error(`Export failed: ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name ? `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json` : `blueprint_${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportSingle(row: BlueprintRow) {
    try { await doExport(row); } catch (error) { onError(error instanceof Error ? error.message : String(error)); }
  }

  async function handleExportSelected() {
    const toExport = rows.filter((row) => selected.has(Number(row.id)));
    if (toExport.length === 0) return;
    setExporting(true);
    try {
      for (const row of toExport) {
        await doExport(row);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportAll() {
    setSelected(new Set(rows.map((r) => Number(r.id))));
    setExporting(true);
    try {
      for (const row of rows) {
        await doExport(row);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }

  function toggleSelect(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === rows.length && rows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => Number(r.id))));
    }
  }

  async function handleImport() {
    if (importFiles.length === 0 || !dbPlayerId) return;
    if (!(await confirmAction(`Import ${importFiles.length} blueprint(s) for ${playerName || "this player"}? Player must be offline.`, {}))) return;
    setImporting(true);
    let ok = 0;
    let failed: string[] = [];
    for (const file of importFiles) {
      const form = new FormData();
      form.append("file", file);
      form.append("player_id", dbPlayerId);
      try {
        const result = await api<{ ok: boolean; message?: string; error?: string }>("/api/blueprints/import", { method: "POST", body: form });
        if (result.ok) ok++; else failed.push(file.name);
      } catch (error) {
        failed.push(`${file.name}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
    setMessage(failed.length ? `${ok} imported, ${failed.length} failed: ${failed.join(", ")}` : `${ok} blueprint(s) imported`);
    setImportFiles([]);
    load();
    setImporting(false);
  }

  const selCount = selected.size;

  return <section>
    {message && <div className="result-panel transient-result"><strong>Import.</strong><p>{formatUiSentence(message)}</p></div>}

    <div className="action-line" style={{ marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
      <label className="file-upload-label" style={{ flex: 1, minWidth: 200 }}>
        Import Blueprint(s)
        <input type="file" accept=".json,application/json" multiple onChange={(e) => setImportFiles(Array.from(e.target.files || []))} />
      </label>
      <button disabled={importFiles.length === 0 || !dbPlayerId || importing} onClick={handleImport}>
        <Upload size={16} /> {importing ? "..." : `Import ${importFiles.length || ""}`}
      </button>
      <button disabled={selCount === 0 || exporting} onClick={handleExportSelected}>
        <Download size={16} /> {exporting ? "..." : selCount > 0 ? `Export ${selCount}` : "Export"}
      </button>
      <button disabled={rows.length === 0 || exporting} onClick={handleExportAll} className="success">
        <Download size={16} /> Export All
      </button>
    </div>
    <p className="action-help-note" style={{ marginBottom: 10 }}>
      {playerName || "Player"} must be offline to import. Blueprints are added as Solido Replicator items to their backpack.
    </p>

    {rows.length > 0 && (
      <div style={{ marginBottom: 6, fontSize: 12, color: "var(--muted)" }}>
        <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={selCount === rows.length && rows.length > 0} onChange={toggleSelectAll} />
          {selCount > 0 ? `${selCount} selected` : "Select all"}
        </label>
      </div>
    )}

    <DataTable
      rows={rows}
      emptyMessage="No blueprints found. Import one above."
      rowKey={(row) => String((row as BlueprintRow).id)}
      secondaryAction={(row: Record<string, unknown>) => (
        <input type="checkbox" checked={selected.has(Number((row as BlueprintRow).id))} onChange={() => toggleSelect(Number((row as BlueprintRow).id))} style={{ width: "auto", margin: 0 }} />
      )}
      secondaryActionLabel="Select"
      secondaryActionClassName="actions-column"
      action={(row: Record<string, unknown>) => <span className="icon-toggle-group">
        <button className="icon-toggle-button success" title="Download" aria-label="Download Blueprint" onClick={(event) => { event.stopPropagation(); handleExportSingle(row as BlueprintRow); }}><Download size={16} /></button>
      </span>}
    />
  </section>;
}
