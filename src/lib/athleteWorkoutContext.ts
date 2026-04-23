import {
  buildAthleteIntensityContext as buildContextFromRecords,
  computeAthletePaces as computeRunningPaces,
  type AthleteIntensityContext,
  type ComputedZone,
  type RunningReferenceSet,
} from "@/lib/athleteIntensity";

export type AthletePerformanceProfile = {
  runningRecords?: Record<string, unknown> | null;
  coachRunningRecords?: Record<string, unknown> | null;
};

export type WorkoutIntensityFeedback = "séance trop facile" | "séance adaptée" | "séance très intense";

export function computeAthletePaces(profile?: AthletePerformanceProfile | null): RunningReferenceSet | null {
  return computeRunningPaces(profile?.runningRecords ?? null);
}

export function buildAthleteIntensityContext(profile?: AthletePerformanceProfile | null): AthleteIntensityContext | null {
  return buildContextFromRecords(profile);
}

export function bandToComputedZone(band: "recovery" | "endurance" | "tempo" | "interval" | "transition"): ComputedZone {
  if (band === "recovery") return "Z1";
  if (band === "endurance") return "Z2";
  if (band === "tempo") return "Z4";
  if (band === "interval") return "Z5";
  return "Z3";
}

export function zoneToFeedback(zone: ComputedZone): WorkoutIntensityFeedback {
  if (zone === "Z1" || zone === "Z2") return "séance trop facile";
  if (zone === "Z5" || zone === "Z6") return "séance très intense";
  return "séance adaptée";
}

export function zoneToColorToken(zone: ComputedZone): string {
  switch (zone) {
    case "Z1":
      return "hsl(var(--chart-2) / 0.22)";
    case "Z2":
      return "hsl(var(--primary))";
    case "Z3":
      return "hsl(var(--chart-2))";
    case "Z4":
      return "hsl(var(--chart-4))";
    case "Z5":
      return "hsl(var(--chart-5))";
    case "Z6":
      return "hsl(var(--destructive))";
  }
}