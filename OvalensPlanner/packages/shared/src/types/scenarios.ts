export interface Scenario {
  id: string;
  name: string;
  description: string;
  changes: Record<string, number>;
  projectedTax: number;
  currentTax: number;
  saving: number;
}
