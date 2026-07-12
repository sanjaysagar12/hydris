export type MrslTier = 'Level 1' | 'Level 2' | 'Level 3';
export type TierTrend = 'up' | 'down' | 'flat';
export type AwsStatus = 'Uncertified' | 'Core' | 'Gold' | 'Platinum';
export type AlertSeverity = 'Critical' | 'Major' | 'Minor';
export type VerificationSource = 'Self-reported' | '3rd-party';
export type PlantHealthBand = 'Healthy' | 'Watch' | 'At Risk' | 'Critical';

export interface PlantHealthAlert {
  severity: AlertSeverity;
  /** When the alert was opened — age is computed against the `asOf` param, never against the current wall-clock time. */
  openedAt: Date;
  type: string;
}

export interface PlantHealthInput {
  tier: MrslTier;
  tierTrend: TierTrend;
  aws: AwsStatus;
  higg: number;
  /** Peer average Higg score. Sourced from the existing "higgAvg" field on Supplier. */
  higgPeerAvg: number;
  verificationSource: VerificationSource;
  alerts: PlantHealthAlert[];
}

export interface PlantHealthComponent {
  value: number;
  weight: number;
  contribution: number;
}

export interface PlantHealthResult {
  score: number;
  band: PlantHealthBand;
  hardFailReason: string | null;
  breakdown: {
    complianceBase: PlantHealthComponent;
    trajectory: PlantHealthComponent;
    alertBurden: PlantHealthComponent;
    governance: PlantHealthComponent;
    peerRelative: PlantHealthComponent;
  };
  trustCapApplied: boolean;
}

const COMPLIANCE_BASE: Record<MrslTier, number> = { 'Level 1': 30, 'Level 2': 65, 'Level 3': 95 };
const TRAJECTORY: Record<TierTrend, number> = { up: 100, flat: 60, down: 10 };
const GOVERNANCE: Record<AwsStatus, number> = { Platinum: 100, Gold: 85, Core: 60, Uncertified: 20 };
const SEVERITY_WEIGHT: Record<AlertSeverity, number> = { Critical: 40, Major: 25, Minor: 10 };

const TRUST_CAP = 70;
const WEIGHTS = {
  complianceBase: 0.35,
  trajectory: 0.1,
  alertBurden: 0.25,
  governance: 0.15,
  peerRelative: 0.15,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ageInDays(openedAt: Date, asOf: Date): number {
  return Math.floor((asOf.getTime() - openedAt.getTime()) / (24 * 60 * 60 * 1000));
}

function ageFactor(days: number): number {
  if (days < 7) return 1.0;
  if (days <= 30) return 1.3;
  return 1.6;
}

function humanizeType(type: string): string {
  return type.replace(/_/g, ' ');
}

/** Evaluates the hard-fail rules in priority order; returns the first reason that fires, or null. */
function findHardFailReason(alerts: (PlantHealthAlert & { age: number })[]): string | null {
  const criticalOverdue = alerts.find((a) => a.severity === 'Critical' && a.age > 10);
  if (criticalOverdue) {
    return `Critical ${humanizeType(criticalOverdue.type)} alert open ${criticalOverdue.age} days`;
  }

  const anomaly = alerts.find((a) => a.type === 'data_anomaly');
  if (anomaly) {
    return 'Data anomaly flagged in an open alert';
  }

  const enforcement = alerts.find((a) => a.type === 'enforcement_action');
  if (enforcement) {
    return 'An enforcement action alert is open';
  }

  return null;
}

function bandForScore(score: number): PlantHealthBand {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Watch';
  if (score >= 40) return 'At Risk';
  return 'Critical';
}

/**
 * Composite "is this plant okay right now" score, distinct from MRSL
 * conformance (tier) and PWI stewardship benefit — both of which already
 * exist and are left untouched. Five weighted components (compliance
 * baseline, tier trajectory, open-alert burden, AWS governance maturity, and
 * Higg performance vs. peers) combine into a 0-100 score; a self-reported
 * verification source caps the result at 70 regardless of the raw score
 * (unverified data can't earn a top score); and a small set of hard-fail
 * conditions — an overdue Critical alert, a data anomaly, or an enforcement
 * action — force the "Critical" band outright, overriding the numeric band
 * boundaries (the score itself is still reported for context).
 *
 * `asOf` is required (not defaulted to `new Date()`) so this stays a pure,
 * deterministic function safe to unit test and reuse anywhere.
 */
export function computePlantHealth(input: PlantHealthInput, asOf: Date): PlantHealthResult {
  const alertsWithAge = input.alerts.map((a) => ({ ...a, age: ageInDays(a.openedAt, asOf) }));

  const complianceBaseValue = COMPLIANCE_BASE[input.tier];
  const trajectoryValue = TRAJECTORY[input.tierTrend];
  const governanceValue = GOVERNANCE[input.aws];
  const peerRelativeValue = clamp(50 + (input.higg - input.higgPeerAvg) * 2, 0, 100);

  const alertBurdenValue = clamp(
    100 - alertsWithAge.reduce((sum, a) => sum + SEVERITY_WEIGHT[a.severity] * ageFactor(a.age), 0),
    0,
    100,
  );

  const breakdown = {
    complianceBase: {
      value: complianceBaseValue,
      weight: WEIGHTS.complianceBase,
      contribution: complianceBaseValue * WEIGHTS.complianceBase,
    },
    trajectory: {
      value: trajectoryValue,
      weight: WEIGHTS.trajectory,
      contribution: trajectoryValue * WEIGHTS.trajectory,
    },
    alertBurden: {
      value: alertBurdenValue,
      weight: WEIGHTS.alertBurden,
      contribution: alertBurdenValue * WEIGHTS.alertBurden,
    },
    governance: {
      value: governanceValue,
      weight: WEIGHTS.governance,
      contribution: governanceValue * WEIGHTS.governance,
    },
    peerRelative: {
      value: peerRelativeValue,
      weight: WEIGHTS.peerRelative,
      contribution: peerRelativeValue * WEIGHTS.peerRelative,
    },
  };

  const weightedScore =
    breakdown.complianceBase.contribution +
    breakdown.trajectory.contribution +
    breakdown.alertBurden.contribution +
    breakdown.governance.contribution +
    breakdown.peerRelative.contribution;

  const isSelfReported = input.verificationSource === 'Self-reported';
  const trustCapApplied = isSelfReported && weightedScore > TRUST_CAP;
  const cappedScore = isSelfReported ? Math.min(weightedScore, TRUST_CAP) : weightedScore;

  const hardFailReason = findHardFailReason(alertsWithAge);
  const band = hardFailReason ? 'Critical' : bandForScore(cappedScore);

  return {
    score: Math.round(cappedScore * 10) / 10,
    band,
    hardFailReason,
    breakdown,
    trustCapApplied,
  };
}

/** Adapter: derives verificationSource from the existing "auditor" field (e.g. "SGS (3rd-party)" vs "Self-reported"). */
export function deriveVerificationSource(auditor: string): VerificationSource {
  return auditor === 'Self-reported' ? 'Self-reported' : '3rd-party';
}

/** Band severity order for sorting — Critical first. */
export const BAND_SORT_ORDER: Record<PlantHealthBand, number> = {
  Critical: 0,
  'At Risk': 1,
  Watch: 2,
  Healthy: 3,
};
