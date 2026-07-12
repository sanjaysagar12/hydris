/**
 * Client-side mirror of the API's WQBA preview formula (apps/api/src/app/suppliers/water-quality.util.ts).
 * Used only to preview PWI/reuse figures live while editing — the server
 * recomputes and persists the authoritative values on save.
 */
export function previewWaterQuality({
  withdrawalLpd,
  dischargeLpd,
  reuseVolumeLpd,
  riskScore,
  auditor,
}: {
  withdrawalLpd: number;
  dischargeLpd: number;
  reuseVolumeLpd: number;
  riskScore: string;
  auditor: string;
}) {
  const reusePercent = withdrawalLpd > 0 ? Math.round((reuseVolumeLpd / withdrawalLpd) * 100) : 0;

  const basinMultiplier = parseFloat(riskScore) || 0;
  const annualM3 = Math.round(((reuseVolumeLpd * 365) / 1000) * (basinMultiplier / 10));
  const pwiAvail = `${annualM3 >= 0 ? "+" : ""}${annualM3.toLocaleString("en-US")} m³/yr`;

  const pwiConf = auditor === "Self-reported" ? "±28%" : "±15%";

  const balanceAnomaly = dischargeLpd + reuseVolumeLpd > withdrawalLpd * 1.05;

  return { reusePercent, pwiAvail, pwiConf, balanceAnomaly };
}
