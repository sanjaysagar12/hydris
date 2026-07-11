"use client";

import { Supplier, tierClass } from "@/lib/suppliers";

interface SupplierTableProps {
  suppliers: Supplier[];
  selected: Supplier | null;
  onSelect: (s: Supplier) => void;
}

function riskDot(r: Supplier["risk"]) {
  return <span className={`risk-dot risk-${r}`}></span>;
}

function trendArrow(t: Supplier["tierTrend"]) {
  if (t === "down") return <span className="tier-arrow" style={{ color: "var(--brick)" }}>▼</span>;
  if (t === "up") return <span className="tier-arrow" style={{ color: "var(--sage)" }}>▲</span>;
  return null;
}

export default function SupplierTable({ suppliers, selected, onSelect }: SupplierTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Region</th>
            <th>Basin risk ⓘ</th>
            <th>MRSL tier</th>
            <th>AWS</th>
            <th>Higg FEM</th>
            <th>Reuse rate</th>
            <th>PWI (Avail.)</th>
            <th>Alerts</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.length === 0 && (
            <tr>
              <td colSpan={9} className="empty-row">No suppliers match the current filters.</td>
            </tr>
          )}
          {suppliers.map((s) => (
            <tr
              key={s.name}
              className={selected?.name === s.name ? "selected" : ""}
              onClick={() => onSelect(s)}
            >
              <td>
                <div className="sup-name">{s.name}</div>
                <div className="sup-loc">{s.loc}</div>
              </td>
              <td>{s.region}</td>
              <td>
                {riskDot(s.risk)}
                <span className="mono-num">{s.riskScore}</span>
              </td>
              <td>
                <span className={`tier-badge ${tierClass(s.tier)}`}>
                  {s.tier} {trendArrow(s.tierTrend)}
                </span>
              </td>
              <td>{s.aws}</td>
              <td className="mono-num">{s.higg}</td>
              <td>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${s.reuse}%` }}></span>
                </span>
                <span className="mono-num">{s.reuse}%</span>
              </td>
              <td className="mono-num">{s.pwiAvail}</td>
              <td>
                {s.alerts.length ? (
                  <span className="alert-flag">● {s.alerts.length}</span>
                ) : (
                  <span style={{ color: "var(--text-faint)" }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
