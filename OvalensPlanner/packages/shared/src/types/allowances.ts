export interface AllowanceItem {
  name: string;
  annualLimit: number;
  used: number;
  remaining: number;
  carryForward?: number;
}

export interface AllowancesTracker {
  personalAllowance: AllowanceItem;
  isaAllowance: AllowanceItem;
  pensionAnnualAllowance: AllowanceItem;
  cgtAnnualExempt: AllowanceItem;
  dividendAllowance: AllowanceItem;
}
