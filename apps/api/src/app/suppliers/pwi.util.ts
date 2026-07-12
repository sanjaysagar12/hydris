import { ageFactor, ageInDays, clamp, SEVERITY_WEIGHT, type AlertSeverity, type AwsStatus, type MrslTier } from './plant-health.util';

export type PwiBand = 'Strong' | 'Adequate' | 'Needs Improvement' | 'Weak';

export interface PwiAlert {
  severity: AlertSeverity;
  /** When the alert was opened — age is computed against the `asOf` param, never against wall-clock time. */
  openedAt: Date;
  type: string;
}

export interface PwiInput {
  tier: MrslTier;
  aws: AwsStatus;
  /** The existing WQBA "PWI Quality" figure, e.g. "+0.31 idx" or "-0.19 idx" (see water-quality.util.ts / Supplier.pwiQuality). */
  pwiQuality: string;
  alerts: PwiAlert[];
}

export interface PwiComponent {
  value: number;
  weight: number;
  contribution: number;
}

export interface PwiResult {
  score: number;
  band: PwiBand;
  breakdown: {
    tierScore: PwiComponent;
    permitScore: PwiComponent;
    waterQualityScore: PwiComponent;
    correctiveActionScore: PwiComponent;
  };
}

// Tier Score: MRSL conformance level is the single biggest lever a supplier has
// over its own PWI, so it gets the full 0-100 range (best tier reaches the ceiling).
const TIER_SCORE: Record<MrslTier, number> = { 'Level 1': 30, 'Level 2': 65, 'Level 3': 100 };

// Permit Score base: AWS (Alliance for Water Stewardship) certification is the
// closest existing signal to "does this facility hold valid water-use permits /
// third-party-verified stewardship credentials".
const PERMIT_BASE: Record<AwsStatus, number> = { Platinum: 100, Gold: 85, Core: 60, Uncertified: 20 };
// Each open "permit expiry"-type alert knocks points off the certification base —
// a facility can be AWS-certified overall and still have a specific permit lapsing.
const PERMIT_EXPIRY_PENALTY = 15;

const WEIGHTS = {
  tierScore: 0.4,
  permitScore: 0.2,
  waterQualityScore: 0.25,
  correctiveActionScore: 0.15,
} as const;

function bandForScore(score: number): PwiBand {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Adequate';
  if (score >= 40) return 'Needs Improvement';
  return 'Weak';
}

/** Parses the WQBA "±idx" figure (e.g. "+0.31 idx", "-0.19 idx") into a bare float; unparseable input reads as neutral (0). */
function parseQualityIndex(pwiQuality: string): number {
  const match = pwiQuality.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Composite Partnership Water Index (PWI): a 0-100 supplier scorecard distinct
 * from Plant Health (apps' internal "is this plant okay" signal) — PWI is the
 * outward-facing score suppliers are coached to improve.
 *
 * PWI = 0.40 x Tier Score + 0.20 x Permit Score + 0.25 x Water Quality Score + 0.15 x Corrective Action Score
 *
 *  - Tier Score: MRSL conformance level (Level 1/2/3).
 *  - Permit Score: AWS certification maturity, penalized per open permit-expiry alert.
 *  - Water Quality Score: normalizes the existing WQBA "PWI Quality" index (roughly -0.5..+0.5) onto 0-100.
 *  - Corrective Action Score: open-alert burden (severity x staleness) — the same
 *    signal Plant Health's alertBurden uses, reused here because "how promptly are
 *    open issues being resolved" is exactly what "corrective action" means.
 *
 * `asOf` is required (not defaulted to `new Date()`) so this stays a pure,
 * deterministic function safe to unit test and reuse anywhere.
 */
export function computePwiScore(input: PwiInput, asOf: Date): PwiResult {
  const alertsWithAge = input.alerts.map((a) => ({ ...a, age: ageInDays(a.openedAt, asOf) }));

  const tierScoreValue = TIER_SCORE[input.tier];

  const permitExpiryCount = alertsWithAge.filter((a) => a.type === 'permit_expiry').length;
  const permitScoreValue = clamp(PERMIT_BASE[input.aws] - permitExpiryCount * PERMIT_EXPIRY_PENALTY, 0, 100);

  const waterQualityScoreValue = clamp(50 + parseQualityIndex(input.pwiQuality) * 100, 0, 100);

  const correctiveActionScoreValue = clamp(
    100 - alertsWithAge.reduce((sum, a) => sum + SEVERITY_WEIGHT[a.severity] * ageFactor(a.age), 0),
    0,
    100,
  );

  const breakdown = {
    tierScore: { value: tierScoreValue, weight: WEIGHTS.tierScore, contribution: tierScoreValue * WEIGHTS.tierScore },
    permitScore: {
      value: permitScoreValue,
      weight: WEIGHTS.permitScore,
      contribution: permitScoreValue * WEIGHTS.permitScore,
    },
    waterQualityScore: {
      value: waterQualityScoreValue,
      weight: WEIGHTS.waterQualityScore,
      contribution: waterQualityScoreValue * WEIGHTS.waterQualityScore,
    },
    correctiveActionScore: {
      value: correctiveActionScoreValue,
      weight: WEIGHTS.correctiveActionScore,
      contribution: correctiveActionScoreValue * WEIGHTS.correctiveActionScore,
    },
  };

  const score =
    breakdown.tierScore.contribution +
    breakdown.permitScore.contribution +
    breakdown.waterQualityScore.contribution +
    breakdown.correctiveActionScore.contribution;

  return {
    score: Math.round(score * 10) / 10,
    band: bandForScore(score),
    breakdown,
  };
}
