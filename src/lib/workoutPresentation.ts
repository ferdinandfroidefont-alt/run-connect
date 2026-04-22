import type { WorkoutSegment } from "@/lib/workoutVisualization";
import { computeWorkoutDistance, computeWorkoutDuration } from "@/lib/workoutVisualization";
import { zoneToFeedback } from "@/lib/athleteWorkoutContext";

type SportHint = "running" | "cycling" | "swimming" | "strength" | "other";

export function formatWorkoutDurationMinutes(totalMin: number): string | undefined {
  if (!Number.isFinite(totalMin) || totalMin <= 0) return undefined;
  if (totalMin < 60) return `${Math.round(totalMin)} min`;
  const hours = Math.floor(totalMin / 60);
  const minutes = Math.round(totalMin % 60);
  return minutes === 0 ? `${hours}h` : `${hours}h${minutes.toString().padStart(2, "0")}`;
}

export function formatWorkoutDistanceKm(distanceKm: number): string | undefined {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return undefined;
  return `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1).replace(".", ",")} km`;
}

export function inferWorkoutIntensityLabel(segments: WorkoutSegment[]): string | undefined {
  const meaningful = segments.filter((segment) => segment.kind !== "rest");
  if (!meaningful.length) return undefined;
  if (meaningful.every((segment) => segment.intensityBand === "recovery" || segment.intensityBand === "transition")) {
    return "Récup";
  }
  const intervalCount = meaningful.filter((segment) => segment.kind === "rep" && segment.intensityBand === "interval").length;
  if (intervalCount > 0) {
    return intervalCount >= 4 ? "Fractionné" : "Fractionné court";
  }
  if (meaningful.some((segment) => segment.intensityBand === "tempo")) {
    return "Tempo / seuil";
  }
  return "Endurance";
}

export function inferWorkoutFeedback(segments: WorkoutSegment[]): string | undefined {
  const meaningful = segments.filter((segment) => segment.kind !== "rest");
  if (!meaningful.length) return undefined;
  const leadZone = meaningful
    .slice()
    .sort((a, b) => (b.durationMin + b.distanceKm) - (a.durationMin + a.distanceKm))[0]?.computedZone;
  return leadZone ? zoneToFeedback(leadZone) : undefined;
}

export function buildWorkoutHeadline(params: {
  title?: string;
  segments: WorkoutSegment[];
  sport?: SportHint;
  isRestDay?: boolean;
}): string {
  const { title, segments, sport = "running", isRestDay = false } = params;
  if (isRestDay) return "Repos";

  const meaningful = segments.filter((segment) => segment.kind !== "rest");
  if (!meaningful.length) return title || "Séance";

  const intervalReps = meaningful.filter((segment) => segment.kind === "rep" && segment.intensityBand === "interval");
  if (intervalReps.length > 0) return intervalReps.length >= 4 ? "Fractionné court" : "Fractionné";

  const tempoReps = meaningful.filter((segment) => segment.kind === "rep" && segment.intensityBand === "tempo");
  if (tempoReps.length > 0) return "Sortie tempo";

  if (meaningful.every((segment) => segment.intensityBand === "recovery" || segment.intensityBand === "transition")) {
    return "Récupération";
  }

  const totalDuration = computeWorkoutDuration(meaningful);
  if (sport === "running" && totalDuration >= 75) return "Sortie longue";
  if (sport === "swimming") return title || "Séance natation";
  if (sport === "cycling") return title || "Sortie vélo";
  if (sport === "strength") return title || "Renforcement";
  return "Footing endurance";
}

export function resolveWorkoutMetrics(params: {
  segments: WorkoutSegment[];
  explicitDistanceKm?: number | null;
  explicitDurationMin?: number | null;
}) {
  const computedDurationMin = computeWorkoutDuration(params.segments);
  const computedDistanceKm = computeWorkoutDistance(params.segments);
  const explicitDurationMin = params.explicitDurationMin ?? null;
  const explicitDistanceKm = params.explicitDistanceKm ?? null;
  const durationMin = explicitDurationMin && explicitDurationMin > computedDurationMin
    ? Math.round(explicitDurationMin)
    : computedDurationMin;
  const distanceKm = explicitDistanceKm && explicitDistanceKm > computedDistanceKm
    ? Math.round(explicitDistanceKm * 10) / 10
    : computedDistanceKm;

  return {
    durationMin,
    distanceKm,
    durationLabel: formatWorkoutDurationMinutes(durationMin),
    distanceLabel: formatWorkoutDistanceKm(distanceKm),
    intensityLabel: inferWorkoutIntensityLabel(params.segments),
    feedbackLabel: inferWorkoutFeedback(params.segments),
  };
}

export function workoutAccentColor(segments: WorkoutSegment[], sport?: SportHint, isRestDay?: boolean): string {
  if (isRestDay) return "hsl(var(--muted-foreground))";
  const lead = segments.find((segment) => segment.kind !== "rest");
  if (!lead) return "hsl(var(--muted-foreground))";
  if (lead.intensityBand === "interval") return "hsl(var(--destructive))";
  if (lead.intensityBand === "tempo") return "hsl(var(--chart-4))";
  if (lead.intensityBand === "recovery") return "hsl(var(--chart-2))";
  if (lead.intensityBand === "transition") return "hsl(var(--muted-foreground))";
  if (sport === "cycling") return "hsl(var(--chart-5))";
  return "hsl(var(--primary))";
}