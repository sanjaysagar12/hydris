export type RiskLevel = "high" | "med" | "low";
export type TierTrend = "up" | "down" | "flat";
export type Tier = "Level 1" | "Level 2" | "Level 3";
export type AwsCert = "Uncertified" | "Core" | "Gold" | "Platinum";
export type AlertSeverity = "Critical" | "Major" | "Minor";

export interface SupplierAlert {
  id: string;
  title: string;
  meta: string;
  severity: AlertSeverity;
  type: string;
  createdAt: string;
}

/** Mirrors the API's PlantHealthResult (apps/api/src/app/suppliers/plant-health.util.ts). */
export type PlantHealthBand = "Healthy" | "Watch" | "At Risk" | "Critical";

export interface PlantHealthComponent {
  value: number;
  weight: number;
  contribution: number;
}

export interface PlantHealth {
  score: number;
  band: PlantHealthBand;
  hardFailReason: string | null;
  trustCapApplied: boolean;
  breakdown: {
    complianceBase: PlantHealthComponent;
    trajectory: PlantHealthComponent;
    alertBurden: PlantHealthComponent;
    governance: PlantHealthComponent;
    peerRelative: PlantHealthComponent;
  };
}

export const HEALTH_BAND_ORDER: Record<PlantHealthBand, number> = {
  Critical: 0,
  "At Risk": 1,
  Watch: 2,
  Healthy: 3,
};

export function healthBadgeClass(band: PlantHealthBand): string {
  if (band === "Healthy") return "health-healthy";
  if (band === "Watch") return "health-watch";
  if (band === "At Risk") return "health-at-risk";
  return "health-critical";
}

/** Mirrors the API's PwiResult (apps/api/src/app/suppliers/pwi.util.ts). */
export type PwiBand = "Strong" | "Adequate" | "Needs Improvement" | "Weak";

export interface PwiComponent {
  value: number;
  weight: number;
  contribution: number;
}

export interface Pwi {
  score: number;
  band: PwiBand;
  breakdown: {
    tierScore: PwiComponent;
    permitScore: PwiComponent;
    waterQualityScore: PwiComponent;
    correctiveActionScore: PwiComponent;
  };
}

export function pwiBadgeClass(band: PwiBand): string {
  if (band === "Strong") return "health-healthy";
  if (band === "Adequate") return "health-watch";
  if (band === "Needs Improvement") return "health-at-risk";
  return "health-critical";
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
  health: PlantHealth;
  pwi: Pwi;
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
