"use client";

import { useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { previewWaterQuality } from "@/lib/water-quality";
import { AwsCert, RiskLevel, Supplier, SupplierSelfUpdate, Tier, tierClass, tierLabel } from "@/lib/suppliers";

const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: "Level 1", label: "Level 1 — Foundational" },
  { value: "Level 2", label: "Level 2 — Progressive" },
  { value: "Level 3", label: "Level 3 — Aspirational" },
];
const AWS_OPTIONS: AwsCert[] = ["Uncertified", "Core", "Gold", "Platinum"];
const AUDITOR_OPTIONS = ["Bureau Veritas (3rd-party)", "SGS (3rd-party)", "Intertek (3rd-party)", "Self-reported"];
const STANDARD_TAGS = ["ZDHC InCheck", "ZDHC ClearStream", "MRSL v3", "AWS Standard v2", "Higg FEM", "WRI Aqueduct", "GRI 303"];

const RISK_LABEL: Record<RiskLevel, string> = { high: "High", med: "Medium", low: "Low" };

function editableFieldsOf(s: Supplier): Required<SupplierSelfUpdate> {
  return {
    tier: s.tier as Tier,
    aws: s.aws as AwsCert,
    higg: s.higg,
    auditDate: s.auditDate,
    auditor: s.auditor,
    withdrawalLpd: s.withdrawalLpd,
    dischargeLpd: s.dischargeLpd,
    reuseVolumeLpd: s.reuseVolumeLpd,
  };
}

export default function SupplierProfile({ supplier: initialSupplier }: { supplier: Supplier }) {
  const [supplier, setSupplier] = useState(initialSupplier);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => editableFieldsOf(initialSupplier));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [trailOpen, setTrailOpen] = useState(false);

  const [newAlertText, setNewAlertText] = useState("");
  const [addingAlert, setAddingAlert] = useState(false);
  const [removingAlertId, setRemovingAlertId] = useState<string | null>(null);

  const preview = previewWaterQuality({
    withdrawalLpd: form.withdrawalLpd,
    dischargeLpd: form.dischargeLpd,
    reuseVolumeLpd: form.reuseVolumeLpd,
    riskScore: supplier.riskScore,
    auditor: form.auditor,
  });

  function startEditing() {
    setForm(editableFieldsOf(supplier));
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setForm(editableFieldsOf(supplier));
    setError(null);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "Save failed");
        return;
      }
      setSupplier(data);
      setEditing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAlert() {
    const title = newAlertText.trim();
    if (!title) return;
    setAddingAlert(true);
    try {
      const res = await fetch("/api/suppliers/me/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, meta: "Manually added · just now" }),
      });
      if (res.ok) {
        setSupplier(await res.json());
        setNewAlertText("");
      }
    } finally {
      setAddingAlert(false);
    }
  }

  async function handleRemoveAlert(alertId: string) {
    setRemovingAlertId(alertId);
    try {
      const res = await fetch(`/api/suppliers/me/alerts/${alertId}`, { method: "DELETE" });
      if (res.ok) setSupplier(await res.json());
    } finally {
      setRemovingAlertId(null);
    }
  }

  return (
    <div className="profile-wrap">
      {showToast && <div className="save-toast">✓ Changes saved to supplier record</div>}

      <div className="profile-topbar">
        <div>
          <div className="breadcrumb">Portfolio / {supplier.region} / <span>{supplier.name}</span></div>
          <h1>{supplier.name}</h1>
          <div className="profile-loc">{supplier.loc}</div>
          <div className="basin-tag">{supplier.basin} · {supplier.riskSrc}</div>
          <div className="badge-row">
            <span className={`tier-badge ${tierClass(supplier.tier)}`}>{supplier.tier} — {tierLabel(supplier.tier)}</span>
            <span className="aws-badge">AWS: {supplier.aws}</span>
            <span className="risk-badge">Basin risk: {RISK_LABEL[supplier.risk]} ({supplier.riskScore})</span>
          </div>
        </div>
        <div className="profile-btn-row">
          {!editing ? (
            <button type="button" className="mode-btn" onClick={startEditing}>✎ Modify data</button>
          ) : (
            <>
              <button type="button" className="mode-btn editing" onClick={cancelEditing}>✕ Cancel</button>
              <button type="button" className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "✓ Save changes"}
              </button>
            </>
          )}
          <LogoutButton />
        </div>
      </div>

      {editing && (
        <div className="edit-hint">
          You&apos;re editing your facility&apos;s record. Fields with a teal border can be modified — update them and press <b>Save changes</b>. PWI figures below recalculate automatically from your edits.
        </div>
      )}
      {error && <div className="auth-error">{error}</div>}

      <div className="profile-grid">
        <div className="p-card">
          <div className="p-card-title">Compliance status</div>
          <div className="field-row">
            <span className="k">MRSL conformance</span>
            {editing ? (
              <select value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as Tier }))}>
                {TIER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <span className="v">{supplier.tier} ({tierLabel(supplier.tier)})</span>
            )}
          </div>
          <div className="field-row">
            <span className="k">AWS certification</span>
            {editing ? (
              <select value={form.aws} onChange={(e) => setForm((f) => ({ ...f, aws: e.target.value as AwsCert }))}>
                {AWS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <span className="v">{supplier.aws}</span>
            )}
          </div>
          <div className="field-row">
            <span className="k">Higg FEM score</span>
            {editing ? (
              <input
                type="number"
                value={form.higg}
                onChange={(e) => setForm((f) => ({ ...f, higg: Number(e.target.value) }))}
              />
            ) : (
              <span className="v">{supplier.higg} <span style={{ color: "var(--text-faint)" }}>(peer avg {supplier.higgAvg})</span></span>
            )}
          </div>
          <div className="field-row">
            <span className="k">Last audit date</span>
            {editing ? (
              <input type="text" value={form.auditDate} onChange={(e) => setForm((f) => ({ ...f, auditDate: e.target.value }))} />
            ) : (
              <span className="v">{supplier.auditDate}</span>
            )}
          </div>
          <div className="field-row">
            <span className="k">Auditor</span>
            {editing ? (
              <select value={form.auditor} onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))}>
                {AUDITOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <span className="v">{supplier.auditor}</span>
            )}
          </div>
        </div>

        <div className="p-card">
          <div className="p-card-title">Water balance <span className="hint">liters / day</span></div>
          <div className="field-row">
            <span className="k">Withdrawal</span>
            {editing ? (
              <input
                type="number"
                value={form.withdrawalLpd}
                onChange={(e) => setForm((f) => ({ ...f, withdrawalLpd: Number(e.target.value) }))}
              />
            ) : (
              <span className="v">{supplier.withdrawal}</span>
            )}
          </div>
          <div className="field-row">
            <span className="k">Discharge</span>
            {editing ? (
              <input
                type="number"
                value={form.dischargeLpd}
                onChange={(e) => setForm((f) => ({ ...f, dischargeLpd: Number(e.target.value) }))}
              />
            ) : (
              <span className="v">{supplier.discharge}</span>
            )}
          </div>
          <div className="field-row">
            <span className="k">Reused internally</span>
            {editing ? (
              <input
                type="number"
                value={form.reuseVolumeLpd}
                onChange={(e) => setForm((f) => ({ ...f, reuseVolumeLpd: Number(e.target.value) }))}
              />
            ) : (
              <span className="v">{supplier.reuseVolumeLpd.toLocaleString("en-US")} L/day ({supplier.reuse}%)</span>
            )}
          </div>
          {editing && preview.balanceAnomaly && (
            <div className="field-note">
              ⚠ Discharge + reuse exceeds withdrawal by more than 5% — this would be flagged as an impossible-data anomaly.
            </div>
          )}
        </div>

        <div className="p-card full">
          <div className="p-card-title">
            PWI contribution <span className="hint">WQBA engine v2.1 output{editing ? " — live preview from your edits" : ""}</span>
          </div>
          <div className="pwi-card">
            <div className="pwi-top">
              <span className="pwi-name">Availability</span>
              <span className="pwi-val">{editing ? preview.pwiAvail : supplier.pwiAvail}</span>
            </div>
            <div className="pwi-conf">confidence {editing ? preview.pwiConf : supplier.pwiConf}</div>
            <button type="button" className="audit-toggle" onClick={() => setTrailOpen((o) => !o)}>
              {trailOpen ? "▾ hide audit trail" : "▸ view audit trail"}
            </button>
            <div className={`audit-trail${trailOpen ? " open" : ""}`}>
              source: WQBA engine v2.1 · formula: (Δ withdrawal × basin scarcity multiplier, {supplier.riskScore})<br />
              input: reuse volume vs prior-period withdrawal baseline · verification: {editing ? form.auditor : supplier.auditor}
            </div>
          </div>
          <div className="pwi-card">
            <div className="pwi-top"><span className="pwi-name">Quality</span><span className="pwi-val">{supplier.pwiQuality}</span></div>
            <div className="pwi-conf">confidence {supplier.pwiQConf}</div>
          </div>
          <div className="pwi-card">
            <div className="pwi-top">
              <span className="pwi-name">Access</span>
              <span className="pwi-val" style={{ color: "var(--text-faint)" }}>{supplier.pwiAccess}</span>
            </div>
          </div>
        </div>

        <div className="p-card full">
          <div className="p-card-title">Open alerts</div>
          {supplier.alerts.length === 0 && !editing && (
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>No open alerts.</div>
          )}
          {supplier.alerts.map((a) => (
            <div className="p-alert-item" key={a.id}>
              <div>
                <div className="a-title">{a.title}</div>
                <div className="a-meta">{a.meta}</div>
              </div>
              {editing && (
                <button
                  type="button"
                  className="alert-remove"
                  onClick={() => handleRemoveAlert(a.id)}
                  disabled={removingAlertId === a.id}
                >
                  ✕ remove
                </button>
              )}
            </div>
          ))}
          {editing && (
            <div className="add-alert-row">
              <input
                placeholder="Describe new alert, e.g. Permit renewal due in 30 days"
                value={newAlertText}
                onChange={(e) => setNewAlertText(e.target.value)}
              />
              <button type="button" onClick={handleAddAlert} disabled={addingAlert || !newAlertText.trim()}>
                + Add alert
              </button>
            </div>
          )}
        </div>

        <div className="p-card full">
          <div className="p-card-title">Standards referenced</div>
          <div className="std-tags">
            {STANDARD_TAGS.map((tag) => <span className="std-tag" key={tag}>{tag}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
