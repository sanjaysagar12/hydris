export type RiskLevel = "high" | "med" | "low";
export type TierTrend = "up" | "down" | "flat";

export interface SupplierAlert {
  title: string;
  meta: string;
}

export interface Supplier {
  name: string;
  loc: string;
  region: string;
  risk: RiskLevel;
  riskScore: string;
  riskSrc: string;
  tier: string;
  tierTrend: TierTrend;
  tierFrom: string;
  aws: string;
  higg: number;
  higgAvg: number;
  reuse: number;
  pwiAvail: string;
  pwiConf: string;
  pwiQuality: string;
  pwiQConf: string;
  pwiAccess: string;
  alerts: SupplierAlert[];
  withdrawal: string;
  discharge: string;
  basin: string;
  auditDate: string;
  auditor: string;
}

export const suppliers: Supplier[] = [
  {
    name: "Anchor Dye Works", loc: "Tirupur, India", region: "India", risk: "high", riskScore: "4.2", riskSrc: "WRI Aqueduct",
    tier: "Level 2", tierTrend: "down", tierFrom: "Level 3", aws: "Core", higg: 68, higgAvg: 61, reuse: 41,
    pwiAvail: "+1,240 m³/yr", pwiConf: "±15%", pwiQuality: "+0.31 idx", pwiQConf: "±10%", pwiAccess: "Not assessed",
    alerts: [{ title: "MRSL chemical flag — InCheck", meta: "Restricted azo dye detected, lot #2291 · 3 days open" }],
    withdrawal: "820,000 L/day", discharge: "540,000 L/day", basin: "Noyyal sub-basin", auditDate: "12 Jun 2026", auditor: "Bureau Veritas (3rd-party)",
  },
  {
    name: "Delta River Textiles", loc: "Dhaka, Bangladesh", region: "Bangladesh", risk: "high", riskScore: "4.5", riskSrc: "WRI Aqueduct",
    tier: "Level 1", tierTrend: "down", tierFrom: "Level 2", aws: "Uncertified", higg: 52, higgAvg: 58, reuse: 18,
    pwiAvail: "+310 m³/yr", pwiConf: "±28%", pwiQuality: "-0.08 idx", pwiQConf: "±22%", pwiAccess: "Not assessed",
    alerts: [
      { title: "Tier downgrade — ClearStream", meta: "BOD exceeded limit by 30 mg/L · audit 04 Jul 2026" },
      { title: "Certification expiring", meta: "ZDHC InCheck valid until 02 Aug 2026 (29 days)" },
    ],
    withdrawal: "1,150,000 L/day", discharge: "980,000 L/day", basin: "Buriganga basin", auditDate: "04 Jul 2026", auditor: "Self-reported",
  },
  {
    name: "Song Ha Garment Co.", loc: "Bien Hoa, Vietnam", region: "Vietnam", risk: "med", riskScore: "3.1", riskSrc: "WRI Aqueduct",
    tier: "Level 3", tierTrend: "up", tierFrom: "Level 2", aws: "Gold", higg: 81, higgAvg: 66, reuse: 57,
    pwiAvail: "+2,900 m³/yr", pwiConf: "±8%", pwiQuality: "+0.44 idx", pwiQConf: "±9%", pwiAccess: "+340 households",
    alerts: [],
    withdrawal: "640,000 L/day", discharge: "390,000 L/day", basin: "Dong Nai basin", auditDate: "29 Jun 2026", auditor: "SGS (3rd-party)",
  },
  {
    name: "Marmara Weaving", loc: "Bursa, Turkey", region: "Turkey", risk: "med", riskScore: "2.8", riskSrc: "WRI Aqueduct",
    tier: "Level 2", tierTrend: "flat", tierFrom: "Level 2", aws: "Core", higg: 64, higgAvg: 60, reuse: 35,
    pwiAvail: "+880 m³/yr", pwiConf: "±16%", pwiQuality: "+0.12 idx", pwiQConf: "±14%", pwiAccess: "Not assessed",
    alerts: [{ title: "Permit renewal due", meta: "Groundwater extraction license · 41 days remaining" }],
    withdrawal: "410,000 L/day", discharge: "300,000 L/day", basin: "Nilüfer basin", auditDate: "18 Jun 2026", auditor: "Intertek (3rd-party)",
  },
  {
    name: "Pearl River Finishing", loc: "Foshan, China", region: "China", risk: "low", riskScore: "1.9", riskSrc: "WRI Aqueduct",
    tier: "Level 3", tierTrend: "flat", tierFrom: "Level 3", aws: "Platinum", higg: 88, higgAvg: 66, reuse: 72,
    pwiAvail: "+3,600 m³/yr", pwiConf: "±7%", pwiQuality: "+0.51 idx", pwiQConf: "±6%", pwiAccess: "+1,120 households",
    alerts: [],
    withdrawal: "390,000 L/day", discharge: "180,000 L/day", basin: "Pearl River delta", auditDate: "02 Jul 2026", auditor: "Bureau Veritas (3rd-party)",
  },
  {
    name: "Ganga Blue Processing", loc: "Kanpur, India", region: "India", risk: "high", riskScore: "4.7", riskSrc: "WRI Aqueduct",
    tier: "Level 1", tierTrend: "flat", tierFrom: "Level 1", aws: "Uncertified", higg: 44, higgAvg: 61, reuse: 12,
    pwiAvail: "-140 m³/yr", pwiConf: "±35%", pwiQuality: "-0.19 idx", pwiQConf: "±30%", pwiAccess: "Not assessed",
    alerts: [
      { title: "MRSL chemical flag — InCheck", meta: "Heavy metal (Cr VI) above threshold · 11 days open" },
      { title: "Tier downgrade — ClearStream", meta: "Discharge/withdrawal mismatch flagged as anomaly" },
    ],
    withdrawal: "960,000 L/day", discharge: "890,000 L/day", basin: "Ganga basin (Kanpur stretch)", auditDate: "30 Jun 2026", auditor: "Self-reported",
  },
  {
    name: "Chao Phraya Mills", loc: "Samut Sakhon, Thailand", region: "Vietnam", risk: "med", riskScore: "3.4", riskSrc: "WRI Aqueduct",
    tier: "Level 2", tierTrend: "up", tierFrom: "Level 1", aws: "Core", higg: 59, higgAvg: 60, reuse: 29,
    pwiAvail: "+520 m³/yr", pwiConf: "±20%", pwiQuality: "+0.09 idx", pwiQConf: "±18%", pwiAccess: "Not assessed",
    alerts: [],
    withdrawal: "330,000 L/day", discharge: "250,000 L/day", basin: "Chao Phraya basin", auditDate: "21 Jun 2026", auditor: "SGS (3rd-party)",
  },
];

export function tierClass(t: string) {
  if (t.startsWith("Level 1")) return "tier-foundational";
  if (t.startsWith("Level 2")) return "tier-progressive";
  return "tier-aspirational";
}

export function tierLabel(t: string) {
  if (t.startsWith("Level 1")) return "Foundational";
  if (t.startsWith("Level 2")) return "Progressive";
  return "Aspirational";
}
