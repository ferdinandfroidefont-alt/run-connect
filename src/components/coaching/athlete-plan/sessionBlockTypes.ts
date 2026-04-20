/** Sous-ensemble des blocs coaching pour le résumé structure (aligné sur CoachPlanningExperience). */
export type BlockType = "warmup" | "interval" | "steady" | "recovery" | "cooldown";
export type IntensityMode = "zones" | "rpe";
export type ZoneKey = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";

export type SessionBlockLite = {
  id: string;
  order: number;
  type: BlockType;
  durationSec?: number;
  distanceM?: number;
  paceSecPerKm?: number;
  speedKmh?: number;
  powerWatts?: number;
  repetitions?: number;
  recoveryDurationSec?: number;
  recoveryDistanceM?: number;
  recoveryType?: "walk" | "jog" | "easy";
  intensityMode?: IntensityMode;
  zone?: ZoneKey;
  rpe?: number;
  notes?: string;
};
