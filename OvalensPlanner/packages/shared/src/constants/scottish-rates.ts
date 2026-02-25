import type { TaxBand } from "../types/tax";

export const SCOTTISH_INCOME_TAX_BANDS: TaxBand[] = [
  { name: "Personal Allowance", lowerLimit: 0, upperLimit: 12_570, rate: 0 },
  { name: "Starter Rate", lowerLimit: 12_571, upperLimit: 14_876, rate: 0.19 },
  { name: "Basic Rate", lowerLimit: 14_877, upperLimit: 26_561, rate: 0.20 },
  { name: "Intermediate Rate", lowerLimit: 26_562, upperLimit: 43_662, rate: 0.21 },
  { name: "Higher Rate", lowerLimit: 43_663, upperLimit: 75_000, rate: 0.42 },
  { name: "Advanced Rate", lowerLimit: 75_001, upperLimit: 125_140, rate: 0.45 },
  { name: "Top Rate", lowerLimit: 125_141, upperLimit: null, rate: 0.48 },
];
