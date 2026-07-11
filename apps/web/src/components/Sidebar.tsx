"use client";

import { NavView, REGIONS, RegionFilter, TIERS, TierFilter, SEVERITIES, SeverityFilter } from "@/lib/types";

interface SidebarProps {
  navView: NavView;
  onNavChange: (v: NavView) => void;
  region: RegionFilter;
  onRegionChange: (r: RegionFilter) => void;
  tier: TierFilter;
  onTierChange: (t: TierFilter) => void;
  severity: SeverityFilter;
  onSeverityChange: (s: SeverityFilter) => void;
}

const navItems: { key: NavView; label: string; count?: string }[] = [
  { key: "portfolio", label: "Portfolio", count: "142" },
  { key: "alerts", label: "Alerts", count: "9" },
  { key: "cert-expiry", label: "Certification expiry", count: "6" },
  { key: "cdp", label: "CDP readiness" },
  { key: "gri", label: "GRI 303 export" },
];

export default function Sidebar({
  navView, onNavChange,
  region, onRegionChange,
  tier, onTierChange,
  severity, onSeverityChange,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="wordmark">
        <div className="drop"></div>
        <div>
          <span>HYDRIS</span>
          <small>SUPPLIER COMMAND CENTER</small>
        </div>
      </div>

      <div className="nav-group">
        <div className="nav-label">Views</div>
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item${navView === item.key ? " active" : ""}`}
            onClick={() => onNavChange(item.key)}
          >
            {item.label}
            {item.count && <span className="nav-count">{item.count}</span>}
          </button>
        ))}
      </div>

      <div className="nav-group">
        <div className="nav-label">Region</div>
        <div className="filter-block">
          <div className="chip-row">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip${region === r ? " on" : ""}`}
                onClick={() => onRegionChange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="nav-group">
        <div className="nav-label">MRSL Tier</div>
        <div className="filter-block">
          <div className="chip-row">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip${tier === t ? " on" : ""}`}
                onClick={() => onTierChange(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="nav-group">
        <div className="nav-label">Severity</div>
        <div className="filter-block">
          <div className="chip-row">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip${severity === s ? " on" : ""}`}
                onClick={() => onSeverityChange(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="source-note">
        <b>Data sources</b><br />
        ZDHC Gateway (InCheck / ClearStream) · AWS · Higg FEM ·
        WRI Aqueduct · WQBA engine v2.1
      </div>
    </div>
  );
}
