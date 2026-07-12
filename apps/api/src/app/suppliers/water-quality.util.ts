export interface WaterBalanceInput {
  withdrawalLpd: number;
  dischargeLpd: number;
  reuseVolumeLpd: number;
  riskScore: string;
  auditor: string;
}

export interface WaterQualityResult {
  reusePercent: number;
  pwiAvail: string;
  pwiConf: string;
  balanceAnomaly: boolean;
}

/**
 * Stand-in for the WQBA engine (v2.1): derives the PWI Availability figure
 * and its confidence band from the raw water-balance numbers, rather than
 * trusting a client-submitted value. Mirrors the formula demonstrated in the
 * supplier profile reference UI so live client-side previews and the
 * persisted server value agree.
 */
export function computeWaterQuality({
  withdrawalLpd,
  dischargeLpd,
  reuseVolumeLpd,
  riskScore,
  auditor,
}: WaterBalanceInput): WaterQualityResult {
  const reusePercent = withdrawalLpd > 0 ? Math.round((reuseVolumeLpd / withdrawalLpd) * 100) : 0;

  const basinMultiplier = parseFloat(riskScore) || 0;
  const annualM3 = Math.round(((reuseVolumeLpd * 365) / 1000) * (basinMultiplier / 10));
  const pwiAvail = `${annualM3 >= 0 ? '+' : ''}${annualM3.toLocaleString('en-US')} m³/yr`;

  const pwiConf = auditor === 'Self-reported' ? '±28%' : '±15%';

  const balanceAnomaly = dischargeLpd + reuseVolumeLpd > withdrawalLpd * 1.05;

  return { reusePercent, pwiAvail, pwiConf, balanceAnomaly };
}

export function formatLpd(n: number): string {
  return `${n.toLocaleString('en-US')} L/day`;
}
