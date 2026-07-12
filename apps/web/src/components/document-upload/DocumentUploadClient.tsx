"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Supplier } from "@/lib/suppliers";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.xlsx,.docx";
const MAX_FILES = 5;

const TIER_OPTIONS = ["Level 1", "Level 2", "Level 3"];
const TIER_TREND_OPTIONS = ["up", "flat", "down"];
const AWS_OPTIONS = ["Uncertified", "Core", "Gold", "Platinum"];

interface ExtractedAlert {
  title: string;
  meta: string;
  severity: "Critical" | "Major" | "Minor";
  type: string;
}

interface ExtractedFields {
  tier?: string;
  tierTrend?: string;
  aws?: string;
  higg?: number;
  riskScore?: string;
  auditDate?: string;
  auditor?: string;
  withdrawalLpd?: number;
  dischargeLpd?: number;
  reuseVolumeLpd?: number;
  alerts?: ExtractedAlert[];
  notes: string;
}

interface FormState {
  tier: string;
  tierTrend: string;
  aws: string;
  higg: string;
  riskScore: string;
  auditDate: string;
  auditor: string;
  withdrawalLpd: string;
  dischargeLpd: string;
  reuseVolumeLpd: string;
}

const EMPTY_FORM: FormState = {
  tier: "", tierTrend: "", aws: "", higg: "", riskScore: "",
  auditDate: "", auditor: "", withdrawalLpd: "", dischargeLpd: "", reuseVolumeLpd: "",
};

type Stage = "select" | "review" | "done";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploadClient({ suppliers }: { suppliers: Supplier[] }) {
  const [supplierId, setSupplierId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedFields | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [alertsIncluded, setAlertsIncluded] = useState<boolean[]>([]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) ?? null;

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleExtract() {
    if (!supplierId || files.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("supplierId", supplierId);
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/documents/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "Extraction failed.");
        return;
      }

      const result: ExtractedFields = data.extracted;
      setExtracted(result);
      setForm({
        tier: result.tier ?? "",
        tierTrend: result.tierTrend ?? "",
        aws: result.aws ?? "",
        higg: result.higg !== undefined ? String(result.higg) : "",
        riskScore: result.riskScore ?? "",
        auditDate: result.auditDate ?? "",
        auditor: result.auditor ?? "",
        withdrawalLpd: result.withdrawalLpd !== undefined ? String(result.withdrawalLpd) : "",
        dischargeLpd: result.dischargeLpd !== undefined ? String(result.dischargeLpd) : "",
        reuseVolumeLpd: result.reuseVolumeLpd !== undefined ? String(result.reuseVolumeLpd) : "",
      });
      setAlertsIncluded((result.alerts ?? []).map(() => true));
      setStage("review");
    } catch {
      setError("Couldn't reach the extraction service.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setError(null);
    setLoading(true);
    try {
      const updates: Record<string, string | number> = {};
      if (form.tier) updates.tier = form.tier;
      if (form.tierTrend) updates.tierTrend = form.tierTrend;
      if (form.aws) updates.aws = form.aws;
      if (form.higg) updates.higg = Number(form.higg);
      if (form.riskScore) updates.riskScore = form.riskScore;
      if (form.auditDate) updates.auditDate = form.auditDate;
      if (form.auditor) updates.auditor = form.auditor;
      if (form.withdrawalLpd) updates.withdrawalLpd = Number(form.withdrawalLpd);
      if (form.dischargeLpd) updates.dischargeLpd = Number(form.dischargeLpd);
      if (form.reuseVolumeLpd) updates.reuseVolumeLpd = Number(form.reuseVolumeLpd);

      const newAlerts = (extracted?.alerts ?? []).filter((_, i) => alertsIncluded[i]);

      const res = await fetch("/api/documents/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, updates, newAlerts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "Failed to apply changes.");
        return;
      }
      setStage("done");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSupplierId("");
    setFiles([]);
    setStage("select");
    setExtracted(null);
    setForm(EMPTY_FORM);
    setAlertsIncluded([]);
    setError(null);
  }

  return (
    <div className="profile-wrap">
      <div className="profile-topbar">
        <div>
          <h1>Upload Compliance Documents</h1>
          <div className="sub">Upload audit reports or certificates, pick the facility they belong to, and the copilot will extract the compliance data for you to review before it's saved.</div>
        </div>
        <div className="profile-btn-row">
          <Link href="/" className="mode-btn">← Back to dashboard</Link>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {stage !== "done" && (
        <div className="p-card">
          <div className="p-card-title">1. Select facility &amp; documents</div>

          <div className="upload-field">
            <label htmlFor="supplier">Facility</label>
            <select
              id="supplier"
              className="auth-input"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={stage === "review"}
            >
              <option value="">Select a supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.loc}</option>
              ))}
            </select>
          </div>

          {stage === "select" && (
            <div className="upload-field">
              <label>Documents</label>
              <label className="upload-dropzone">
                <input type="file" multiple accept={ACCEPT} onChange={handleFilesChange} />
                📄 Click to choose files — PDF, PNG, JPEG, WEBP, plain text, CSV, XLSX, or DOCX (up to {MAX_FILES})
              </label>
              {files.length > 0 && (
                <div className="upload-file-list">
                  {files.map((f, i) => (
                    <div className="upload-file-item" key={`${f.name}-${i}`}>
                      <span>{f.name} <span style={{ color: "var(--text-faint)" }}>({formatBytes(f.size)})</span></span>
                      <button type="button" onClick={() => removeFile(i)}>✕ remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {stage === "select" && (
            <button
              type="button"
              className="save-btn"
              onClick={handleExtract}
              disabled={loading || !supplierId || files.length === 0}
            >
              {loading ? "Extracting…" : "✎ Extract data"}
            </button>
          )}
        </div>
      )}

      {stage === "review" && extracted && (
        <div className="p-card" style={{ marginTop: 16 }}>
          <div className="p-card-title">
            2. Review extracted data for {selectedSupplier?.name}
            <span className="hint">edit anything before applying — blank fields are left unchanged</span>
          </div>

          <div className="notes-callout">
            <b>Copilot notes:</b> {extracted.notes}
          </div>

          <div className="field-row">
            <span className="k">MRSL conformance</span>
            <select value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}>
              <option value="">— leave unchanged —</option>
              {TIER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field-row">
            <span className="k">Tier trend</span>
            <select value={form.tierTrend} onChange={(e) => setForm((f) => ({ ...f, tierTrend: e.target.value }))}>
              <option value="">— leave unchanged —</option>
              {TIER_TREND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field-row">
            <span className="k">AWS certification</span>
            <select value={form.aws} onChange={(e) => setForm((f) => ({ ...f, aws: e.target.value }))}>
              <option value="">— leave unchanged —</option>
              {AWS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field-row">
            <span className="k">Higg FEM score</span>
            <input type="number" value={form.higg} onChange={(e) => setForm((f) => ({ ...f, higg: e.target.value }))} placeholder="unchanged" />
          </div>
          <div className="field-row">
            <span className="k">Basin risk score</span>
            <input type="text" value={form.riskScore} onChange={(e) => setForm((f) => ({ ...f, riskScore: e.target.value }))} placeholder="unchanged" />
          </div>
          <div className="field-row">
            <span className="k">Last audit date</span>
            <input type="text" value={form.auditDate} onChange={(e) => setForm((f) => ({ ...f, auditDate: e.target.value }))} placeholder="unchanged" />
          </div>
          <div className="field-row">
            <span className="k">Auditor</span>
            <input type="text" value={form.auditor} onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))} placeholder="unchanged" />
          </div>
          <div className="field-row">
            <span className="k">Withdrawal (L/day)</span>
            <input type="number" value={form.withdrawalLpd} onChange={(e) => setForm((f) => ({ ...f, withdrawalLpd: e.target.value }))} placeholder="unchanged" />
          </div>
          <div className="field-row">
            <span className="k">Discharge (L/day)</span>
            <input type="number" value={form.dischargeLpd} onChange={(e) => setForm((f) => ({ ...f, dischargeLpd: e.target.value }))} placeholder="unchanged" />
          </div>
          <div className="field-row">
            <span className="k">Reused internally (L/day)</span>
            <input type="number" value={form.reuseVolumeLpd} onChange={(e) => setForm((f) => ({ ...f, reuseVolumeLpd: e.target.value }))} placeholder="unchanged" />
          </div>

          {extracted.alerts && extracted.alerts.length > 0 && (
            <>
              <div className="p-card-title" style={{ marginTop: 18 }}>New alerts found in the documents</div>
              {extracted.alerts.map((a, i) => (
                <label className="alert-check-row" key={`${a.title}-${i}`}>
                  <input
                    type="checkbox"
                    checked={alertsIncluded[i] ?? true}
                    onChange={(e) => setAlertsIncluded((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))}
                  />
                  <div className="p-alert-item">
                    <div>
                      <div className="a-title">{a.title} <span style={{ color: "var(--text-faint)", fontFamily: "var(--mono)", fontSize: 10 }}>· {a.severity}</span></div>
                      <div className="a-meta">{a.meta}</div>
                    </div>
                  </div>
                </label>
              ))}
            </>
          )}

          <div className="profile-btn-row" style={{ marginTop: 16 }}>
            <button type="button" className="mode-btn" onClick={reset} disabled={loading}>✕ Start over</button>
            <button type="button" className="save-btn" onClick={handleApply} disabled={loading}>
              {loading ? "Applying…" : "✓ Apply to database"}
            </button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="p-card">
          <div className="p-card-title">Done</div>
          <div className="notes-callout">
            ✓ Changes applied to <b>{selectedSupplier?.name}</b>&apos;s record.
          </div>
          <div className="profile-btn-row">
            <button type="button" className="mode-btn" onClick={reset}>Process another document</button>
            <Link href="/" className="save-btn" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
              Back to dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
