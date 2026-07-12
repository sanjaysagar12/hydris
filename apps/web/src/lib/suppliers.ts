export type RiskLevel = "high" | "med" | "low";
export type TierTrend = "up" | "down" | "flat";
export type Tier = "Level 1" | "Level 2" | "Level 3";
export type AwsCert = "Uncertified" | "Core" | "Gold" | "Platinum";

export interface SupplierAlert {
  id: string;
  title: string;
  meta: string;
}

export interface Supplier {
  id: string;
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
  withdrawalLpd: number;
  dischargeLpd: number;
  reuseVolumeLpd: number;
  basin: string;
  auditDate: string;
  auditor: string;
}

/** Fields a supplier may edit on their own profile — mirrors the API's UpdateOwnSupplierDto. */
export interface SupplierSelfUpdate {
  tier?: Tier;
  aws?: AwsCert;
  higg?: number;
  auditDate?: string;
  auditor?: string;
  withdrawalLpd?: number;
  dischargeLpd?: number;
  reuseVolumeLpd?: number;
}

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
