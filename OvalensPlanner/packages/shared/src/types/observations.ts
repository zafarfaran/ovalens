export type ObservationSeverity = "info" | "warning" | "opportunity" | "action_required";

export interface Observation {
  id: string;
  title: string;
  description: string;
  severity: ObservationSeverity;
  category: string;
  potentialSaving?: number;
}
