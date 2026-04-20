export type ModelSportFilter = "all" | "running" | "cycling" | "strength";
export type ModelSource = "mine" | "base";

export interface SessionModelItem {
  id: string;
  source: ModelSource;
  title: string;
  activityType: string;
  objective?: string | null;
  rccCode: string;
  category?: "endurance" | "threshold" | "vo2" | "recovery";
}

