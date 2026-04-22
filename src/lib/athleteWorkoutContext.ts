import type { AthleteIntensityContext, RunningReferenceSet } from "@/lib/athleteIntensity";

export type AthletePerformanceProfile = {
  runningRecords?: Record<string, unknown> | null;
};

export type ComputedZone = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";

export type WorkoutIntensityFeedback = "séance trop facile" | "séance adaptée" | "séance très intense";

function parseTimeToSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const hms = raw.split(":").map((part) => Number(part));
  if (hms.every((part) => Number.isFinite(part))) {
    if (hms.length === 3) return hms[0] * 3600 + hms[1] * 60 + hms[2];
    if (hms.length === 2) return hms[0] * 60 + hms[1];
  }

  const normalized = raw.replace(/\s+/g, "");
  const hours = /(?:(\d+)h)/.exec(normalized);
  const minutes = /(?:(\d+)(?:'|m))/i.exec(normalized);
  const seconds = /(?:(\d+)(?:\"|''|s))/i.exec(normalized);
  const total = (hours ? Number(hours[1]) * 3600 : 0) + (minutes ? Number(minutes[1]) * 60 : 0) + (seconds ? Number(seconds[1]) : 0);
  return total > 0 ? total : null;
}

function paceFromRecord(distanceKm: number, raw: unknown): number | null {
  const totalSec = parseTimeToSeconds(raw);
  if (!totalSec || distanceKm <= 0) return null;
  return totalSec / distanceKm;
}

function pickBestRunningRecord(records?: Record<string, unknown> | null) {
  if (!records) return null;
  const fiveKm = paceFromRecord(5, records["5k"] ?? records["5km"] ?? records["5000m"]);
  const tenKm = paceFromRecord(10, records["10k"] ?? records["10km"]);
  const threeKm = paceFromRecord(3, records["3k"] ?? records["3000m"]);
  return { fiveKm, tenKm, threeKm };
}

export function computeAthletePaces(profile?: AthletePerformanceProfile | null): RunningReferenceSet | null {
  const best = pickBestRunningRecord(profile?.runningRecords ?? null);
  if (!best) return null;

  const thresholdPaceSecPerKm = best.tenKm ?? (best.fiveKm ? best.fiveKm * 1.045 : null);
  const intervalPaceSecPerKm = best.threeKm ?? (best.fiveKm ? best.fiveKm * 0.94 : null);
  const easyPaceSecPerKm = thresholdPaceSecPerKm ? thresholdPaceSecPerKm * 1.22 : best.fiveKm ? best.fiveKm * 1.16 : null;

  if (!easyPaceSecPerKm && !thresholdPaceSecPerKm && !intervalPaceSecPerKm) return null;

  return {
    easyPaceSecPerKm,
    thresholdPaceSecPerKm,
    intervalPaceSecPerKm,
  };
}

export function buildAthleteIntensityContext(profile?: AthletePerformanceProfile | null): AthleteIntensityContext | null {
  const athleteRecords = computeAthletePaces(profile);
  if (!athleteRecords) return null;
  return { athleteRecords };
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
      return "hsl(var(--chart-2) / 0.35)";
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