import type { TaxBand } from "../types/tax";

export const TAX_YEAR = "2025/26";

export const INCOME_TAX_BANDS: TaxBand[] = [
  { name: "Personal Allowance", lowerLimit: 0, upperLimit: 12_570, rate: 0 },
  { name: "Basic Rate", lowerLimit: 12_571, upperLimit: 50_270, rate: 0.20 },
  { name: "Higher Rate", lowerLimit: 50_271, upperLimit: 125_140, rate: 0.40 },
  { name: "Additional Rate", lowerLimit: 125_141, upperLimit: null, rate: 0.45 },
];

export const DIVIDEND_TAX_RATES = {
  allowance: 500,
  basicRate: 0.0875,
  higherRate: 0.3375,
  additionalRate: 0.3935,
} as const;

export const CGT_RATES = {
  annualExemptAmount: 3_000,
  basicRate: 0.18,
  higherRate: 0.24,
  residentialBasicRate: 0.18,
  residentialHigherRate: 0.24,
  badrRate: 0.10,
  badrLifetimeLimit: 1_000_000,
  investorsReliefRate: 0.10,
  investorsReliefLimit: 10_000_000,
} as const;
