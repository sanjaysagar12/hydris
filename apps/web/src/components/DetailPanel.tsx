"use client";

import { useState } from "react";
import { Supplier, tierLabel, healthBadgeClass, PlantHealth } from "@/lib/suppliers";

interface DetailPanelProps {
  supplier: Supplier | null;
}

function trendArrow(t: Supplier["tierTrend"]) {
  if (t === "down") return <span className="tier-arrow" style={{ color: "var(--brick)" }}>▼</span>;
  if (t === "up") return <span className="tier-arrow" style={{ color: "var(--sage)" }}>▲</span>;
  return null;
}

const STANDARD_TAGS = [
  "ZDHC InCheck", "ZDHC ClearStream", "MRSL v3", "AWS Standard v2", "Higg FEM", "WRI Aqueduct", "GRI 303",
];

const HEALTH_COMPONENT_LABELS: Record<keyof PlantHealth["breakdown"], string> = {
  complianceBase: "Compliance base (MRSL tier)",
  trajectory: "Trajectory (tier trend)",
  alertBurden: "Alert burden",
  governance: "Governance maturity (AWS)",
  peerRelative: "Peer-relative Higg performance",
};

export default function DetailPanel({ supplier }: DetailPanelProps) {
  const [availOpen, setAvailOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  if (!supplier) {
    return (
      <aside className="detail">
        <div className="detail-empty">Select a supplier from the<br />table to view its full profile,<br />PWI breakdown and audit trail.</div>
      </aside>
    );
  }

  const s = supplier;

  return (
    <aside className="detail">
      <div className="d-head">
        <div className="d-name">{s.name}</div>
        <div className="d-loc">{s.loc} · {s.basin}</div>
      </div>

      <div className="d-section">
        <div className="d-section-title">Plant Health</div>
        <div className="d-row">
          <span className="k">Overall status</span>
          <span className="v">
            <span className={`health-badge ${healthBadgeClass(s.health.band)}`}>{s.health.band}</span>
          </span>
        </div>
        <div className="d-row">
          <span className="k">Score</span>
          <span className="v">{s.health.score} / 100{s.health.trustCapApplied && (
            <span style={{ color: "var(--text-faint)" }}> (self-reported, capped)</span>
          )}</span>
        </div>

        {s.health.hardFailReason && (
          <div className="alert-item" style={{ marginTop: 8 }}>
            <div className="a-title">Forced to Critical</div>
            <div className="a-meta">{s.health.hardFailReason}</div>
          </div>
        )}

        <button type="button" className="audit-toggle" onClick={() => setHealthOpen((o) => !o)}>
          {healthOpen ? "▾ hide score breakdown" : "▸ view score breakdown"}
        </button>
        <div className={`audit-trail${healthOpen ? " open" : ""}`}>
          {(Object.keys(s.health.breakdown) as (keyof PlantHealth["breakdown"])[]).map((key) => {
            const component = s.health.breakdown[key];
            return (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{HEALTH_COMPONENT_LABELS[key]}</span>
                <span>
                  {component.value.toFixed(1)} × {component.weight} = {component.contribution.toFixed(1)}
                </span>
              </div>
            );
          })}
          <br />
          trust cap applied: {s.health.trustCapApplied ? "yes (self-reported data capped at 70)" : "no"}
        </div>
      </div>

      <div className="d-section">
        <div className="d-section-title">Compliance status</div>
        <div className="d-row"><span className="k">MRSL conformance</span><span className="v">{s.tier} ({tierLabel(s.tier)}) {trendArrow(s.tierTrend)}</span></div>
        <div className="d-row"><span className="k">AWS certification</span><span className="v">{s.aws}</span></div>
        <div className="d-row"><span className="k">Higg FEM score</span><span className="v">{s.higg} <span style={{ color: "var(--text-faint)" }}>(peer avg {s.higgAvg})</span></span></div>
        <div className="d-row"><span className="k">Basin risk (WRI Aqueduct)</span><span className="v">{s.riskScore} / 5</span></div>
        <div className="d-row"><span className="k">Last audit</span><span className="v">{s.auditDate}</span></div>
        <div className="d-row"><span className="k">Auditor</span><span className="v">{s.auditor}</span></div>
      </div>

      <div className="d-section">
        <div className="d-section-title">Water balance</div>
        <div className="d-row"><span className="k">Withdrawal</span><span className="v">{s.withdrawal}</span></div>
        <div className="d-row"><span className="k">Discharge</span><span className="v">{s.discharge}</span></div>
        <div className="d-row"><span className="k">Reuse rate</span><span className="v">{s.reuse}%</span></div>
      </div>

      <div className="d-section">
        <div className="d-section-title">PWI contribution (WQBA output)</div>

        <div className="pwi-card">
          <div className="pwi-top"><span className="pwi-name">Availability</span><span className="pwi-val">{s.pwiAvail}</span></div>
          <div className="pwi-conf">confidence {s.pwiConf}</div>
          <button type="button" className="audit-toggle" onClick={() => setAvailOpen((o) => !o)}>
            {availOpen ? "▾ hide audit trail" : "▸ view audit trail"}
          </button>
          <div className={`audit-trail${availOpen ? " open" : ""}`}>
            source: WQBA engine v2.1 · formula: (Δ withdrawal × basin scarcity multiplier)<br />
            input: withdrawal baseline vs current period · verification: {s.auditor}
          </div>
        </div>

        <div className="pwi-card">
          <div className="pwi-top"><span className="pwi-name">Quality</span><span className="pwi-val">{s.pwiQuality}</span></div>
          <div className="pwi-conf">confidence {s.pwiQConf}</div>
          <button type="button" className="audit-toggle" onClick={() => setQualityOpen((o) => !o)}>
            {qualityOpen ? "▾ hide audit trail" : "▸ view audit trail"}
          </button>
          <div className={`audit-trail${qualityOpen ? " open" : ""}`}>
            source: WQBA engine v2.1 · formula: (Δ pollutant load × receiving-water baseline factor)<br />
            params: BOD, COD, TSS, AOX · verification: {s.auditor}
          </div>
        </div>

        <div className="pwi-card">
          <div className="pwi-top"><span className="pwi-name">Access</span><span className="pwi-val">{s.pwiAccess}</span></div>
        </div>
      </div>

      <div className="d-section">
        <div className="d-section-title">Open alerts</div>
        {s.alerts.length ? (
          s.alerts.map((a) => (
            <div className="alert-item" key={a.id}>
              <div className="a-title">{a.title}</div>
              <div className="a-meta">{a.meta}</div>
            </div>
          ))
        ) : (
          <div style={{ color: "var(--text-faint)", fontSize: "12px" }}>No open alerts.</div>
        )}
      </div>

      <div className="d-section">
        <div className="d-section-title">Standards referenced</div>
        <div className="std-tags">
          {STANDARD_TAGS.map((tag) => (
            <span className="std-tag" key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}
