export const THRESHOLDS = {
  personalAllowance: 12_570,
  higherRateThreshold: 50_270,
  hicbcStart: 60_000,
  hicbcFullClawback: 80_000,
  paTaperStart: 100_000,
  paFullyLost: 125_140,
  additionalRateStart: 125_140,
  pensionTaperThresholdIncome: 200_000,
  pensionTaperAdjustedIncome: 260_000,
} as const;

export const IHT_THRESHOLDS = {
  nilRateBand: 325_000,
  residenceNilRateBand: 175_000,
  rate: 0.40,
  maxTaxFreeCouple: 1_000_000,
} as const;
