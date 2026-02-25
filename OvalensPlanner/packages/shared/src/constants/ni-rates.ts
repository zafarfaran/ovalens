export const NI_CLASS_1 = {
  primaryThreshold: 12_570,
  upperEarningsLimit: 50_270,
  employeeMainRate: 0.08,
  employeeUpperRate: 0.02,
  employerSecondaryThreshold: 9_100,
  employerRate: 0.138,
} as const;

export const NI_CLASS_2 = {
  weeklyRate: 3.45,
  profitThreshold: 12_570,
} as const;

export const NI_CLASS_4 = {
  lowerProfitLimit: 12_570,
  upperProfitLimit: 50_270,
  mainRate: 0.06,
  upperRate: 0.02,
} as const;
