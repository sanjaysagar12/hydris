export type NavView = "portfolio" | "alerts" | "cert-expiry" | "cdp" | "gri";

export const REGIONS = ["All", "Bangladesh", "Vietnam", "India", "Turkey", "China"] as const;
export type RegionFilter = (typeof REGIONS)[number];

export const TIERS = ["All", "Level 1", "Level 2", "Level 3"] as const;
export type TierFilter = (typeof TIERS)[number];

export const SEVERITIES = ["All", "High", "Medium", "Low"] as const;
export type SeverityFilter = (typeof SEVERITIES)[number];
