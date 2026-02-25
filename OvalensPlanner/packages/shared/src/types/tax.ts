export interface TaxBand {
  name: string;
  lowerLimit: number;
  upperLimit: number | null;
  rate: number;
}

export interface IncomeSummary {
  employment: number;
  selfEmployment: number;
  pension: number;
  rental: number;
  savings: number;
  dividends: number;
  other: number;
  totalIncome: number;
}

export interface TaxCalculation {
  taxableIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  bands: TaxBand[];
}

export interface AdjustedNetIncome {
  totalIncome: number;
  pensionContributions: number;
  giftAid: number;
  adjustedNetIncome: number;
}
