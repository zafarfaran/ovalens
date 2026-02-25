import type { ClientInfo } from "./client";
import type { IncomeSummary, TaxCalculation, AdjustedNetIncome } from "./tax";
import type { AllowancesTracker } from "./allowances";
import type { Observation } from "./observations";
import type { Scenario } from "./scenarios";

export interface RelevantTaxData {
  client: ClientInfo;
  income: IncomeSummary;
  tax: TaxCalculation;
  adjustedNetIncome: AdjustedNetIncome;
  allowances: AllowancesTracker;
  observations: Observation[];
  scenarios: Scenario[];
}
