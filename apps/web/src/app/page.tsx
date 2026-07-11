"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import KpiRow from "@/components/KpiRow";
import SupplierTable from "@/components/SupplierTable";
import DetailPanel from "@/components/DetailPanel";
import Copilot from "@/components/Copilot";
import { Supplier, suppliers } from "@/lib/suppliers";
import { NavView, RegionFilter, TierFilter, SeverityFilter } from "@/lib/types";

const SEVERITY_TO_RISK: Record<string, Supplier["risk"]> = {
  High: "high",
  Medium: "med",
  Low: "low",
};

const CERT_ALERT_PATTERN = /expir|permit renewal/i;

function exportGriCsv(rows: Supplier[]) {
  const header = ["Supplier", "Region", "Basin", "Withdrawal", "Discharge", "Reuse rate (%)", "MRSL tier", "AWS", "Higg FEM"];
  const lines = rows.map((s) => [
    s.name, s.region, s.basin, s.withdrawal, s.discharge, String(s.reuse), s.tier, s.aws, String(s.higg),
  ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gri-303-water-disclosure.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const VIEW_COPY: Record<NavView, { title: string; sub: (n: number) => string }> = {
  portfolio: { title: "Supplier Portfolio", sub: (n) => `${n} facilities shown · 5 regions · last synced 14 minutes ago` },
  alerts: { title: "Open Alerts", sub: (n) => `${n} supplier${n === 1 ? "" : "s"} with active alerts` },
  "cert-expiry": { title: "Certification Expiry", sub: (n) => `${n} supplier${n === 1 ? "" : "s"} with certifications or permits expiring soon` },
  cdp: { title: "CDP Readiness", sub: () => "7 of 9 CDP Water Security questions ready · gaps: W1.2, W4.1" },
  gri: { title: "GRI 303 Export", sub: (n) => `${n} facilities ready to include in the GRI 303 water disclosure export` },
};

export default function Home() {
  const [navView, setNavView] = useState<NavView>("portfolio");
  const [region, setRegion] = useState<RegionFilter>("All");
  const [tier, setTier] = useState<TierFilter>("All");
  const [severity, setSeverity] = useState<SeverityFilter>("All");
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(suppliers[0]?.name ?? null);

  const commonFiltered = useMemo(() => {
    return suppliers.filter((s) => {
      if (region !== "All" && s.region !== region) return false;
      if (tier !== "All" && !s.tier.startsWith(tier)) return false;
      if (severity !== "All" && s.risk !== SEVERITY_TO_RISK[severity]) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${s.name} ${s.loc} ${s.region} ${s.tier}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [region, tier, severity, search]);

  const filtered = useMemo(() => {
    if (navView === "alerts") return commonFiltered.filter((s) => s.alerts.length > 0);
    if (navView === "cert-expiry") return commonFiltered.filter((s) => s.alerts.some((a) => CERT_ALERT_PATTERN.test(a.title)));
    return commonFiltered;
  }, [navView, commonFiltered]);

  const selected = useMemo<Supplier | null>(() => {
    return filtered.find((s) => s.name === selectedName) ?? filtered[0] ?? null;
  }, [filtered, selectedName]);

  function handleNavChange(v: NavView) {
    setNavView(v);
    if (v === "gri") {
      exportGriCsv(commonFiltered);
    }
  }

  const copy = VIEW_COPY[navView];

  return (
    <div className="app">
      <Sidebar
        navView={navView}
        onNavChange={handleNavChange}
        region={region}
        onRegionChange={setRegion}
        tier={tier}
        onTierChange={setTier}
        severity={severity}
        onSeverityChange={setSeverity}
      />

      <main>
        <div className="topbar">
          <div>
            <h1>{copy.title}</h1>
            <div className="sub">{copy.sub(filtered.length)}</div>
          </div>
          <input
            className="search"
            placeholder="Search supplier, region, tier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <KpiRow />

        <SupplierTable suppliers={filtered} selected={selected} onSelect={(s) => setSelectedName(s.name)} />
      </main>

      <DetailPanel supplier={selected} key={selected?.name ?? "empty"} />

      <Copilot />
    </div>
  );
}
