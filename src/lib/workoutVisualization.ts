import {
  classifyRunningBlockIntensity,
  resolveRunningReferences,
  type AthleteIntensityContext,
  type IntensityBand,
} from "@/lib/athleteIntensity";

export type WorkoutSegmentKind = "warmup" | "steady" | "rep" | "recovery" | "cooldown" | "rest";

export interface WorkoutSegment {
  kind: WorkoutSegmentKind;
  durationMin: number;
  distanceKm: number;
  intensityBand: IntensityBand;
  intensitySource?: "coach_validated" | "athlete_record" | "auto_estimate" | "fallback";
}

export interface MiniProfileBlock {
  width: number;
  height: number;
  color: string;
}

type ParsedLikeBlock = {
  type: string;
  duration?: number;
  distance?: number;
  repetitions?: number;
  recoveryDuration?: number;
  pace?: string;
  zone?: string;
};

type SessionLikeBlock = {
  type: string;
  durationSec?: number;
  distanceM?: number;
  repetitions?: number;
  recoveryDurationSec?: number;
  paceSecPerKm?: number;
  zone?: string;
};

const DEFAULT_RECOVERY_SPEED_KM_PER_MIN = 1 / 7.2; // ~7:12/km

function toPaceSecPerKmFromString(pace?: string): number | null {
  if (!pace) return null;
  const [m, s] = pace.split(":").map(Number);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return m * 60 + s;
}

function estimateDistanceKm(durationMin: number, paceSecPerKm: number | null): number {
  if (durationMin <= 0) return 0;
  if (!paceSecPerKm || paceSecPerKm <= 0) return 0;
  const speedKmPerMin = 60 / paceSecPerKm;
  return durationMin * speedKmPerMin;
}

function clampPositive(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export interface BuildWorkoutSegmentsOptions {
  sport?: "running" | "cycling" | "swimming" | "strength" | "other";
  athleteIntensity?: AthleteIntensityContext;
}

export function buildWorkoutSegments(
  inputBlocks: ParsedLikeBlock[] | SessionLikeBlock[] | undefined | null,
  options?: BuildWorkoutSegmentsOptions
): WorkoutSegment[] {
  if (!inputBlocks?.length) return [{ kind: "rest", durationMin: 0, distanceKm: 0, intensityBand: "transition" }];

  const sport = options?.sport ?? "running";
  const refResolution = sport === "running" ? resolveRunningReferences(options?.athleteIntensity) : { refs: null, source: "fallback" as const };
  const segments: WorkoutSegment[] = [];
  for (const raw of inputBlocks) {
    const parsedRaw = raw as ParsedLikeBlock;
    const sessionRaw = raw as SessionLikeBlock;
    const repetitions = Math.max(1, raw.repetitions || 1);
    const durationMin =
      "durationSec" in raw
        ? clampPositive((sessionRaw.durationSec || 0) / 60)
        : clampPositive(parsedRaw.duration || 0);
    const recoveryDurationMin =
      "recoveryDurationSec" in raw
        ? clampPositive((sessionRaw.recoveryDurationSec || 0) / 60)
        : clampPositive((parsedRaw.recoveryDuration || 0) / 60);
    const distanceKm =
      "distanceM" in raw
        ? clampPositive((sessionRaw.distanceM || 0) / 1000)
        : clampPositive((parsedRaw.distance || 0) / 1000);
    const paceSecPerKm =
      "paceSecPerKm" in raw ? sessionRaw.paceSecPerKm || null : toPaceSecPerKmFromString(parsedRaw.pace);

    if (raw.type === "interval") {
      const durationFromDistance =
        distanceKm > 0 && paceSecPerKm ? distanceKm * (paceSecPerKm / 60) : 0;
      const perRepDuration = durationMin > 0 ? durationMin : durationFromDistance;
      const effortDuration = perRepDuration * repetitions;
      const effortDistance =
        distanceKm > 0
          ? distanceKm * repetitions
          : estimateDistanceKm(durationMin * repetitions, paceSecPerKm);

      const repIntensity =
        sport === "running"
          ? classifyRunningBlockIntensity({
              type: "interval",
              zone: raw.zone,
              paceSecPerKm,
              distanceM: distanceKm * 1000,
              durationSec: perRepDuration * 60,
              references: refResolution.refs,
              source: refResolution.source,
            })
          : { band: "interval" as const, source: "fallback" as const };
      segments.push({
        kind: "rep",
        durationMin: clampPositive(effortDuration || durationMin * repetitions),
        distanceKm: clampPositive(effortDistance),
        intensityBand: repIntensity.band,
        intensitySource: repIntensity.source,
      });

      if (recoveryDurationMin > 0 && repetitions > 1) {
        const totalRecoveryDuration = recoveryDurationMin * (repetitions - 1);
        segments.push({
          kind: "recovery",
          durationMin: totalRecoveryDuration,
          distanceKm: totalRecoveryDuration * DEFAULT_RECOVERY_SPEED_KM_PER_MIN,
          intensityBand: "recovery",
          intensitySource: refResolution.source,
        });
      }
      continue;
    }

    const kind: WorkoutSegmentKind =
      raw.type === "warmup" || raw.type === "steady" || raw.type === "cooldown" || raw.type === "recovery"
        ? (raw.type as WorkoutSegmentKind)
        : "steady";
    const segDuration = durationMin * repetitions;
    const segDistance =
      distanceKm > 0 ? distanceKm * repetitions : estimateDistanceKm(segDuration, paceSecPerKm);

    const steadyIntensity =
      sport === "running"
        ? classifyRunningBlockIntensity({
            type: kind,
            zone: raw.zone,
            paceSecPerKm,
            distanceM: distanceKm * 1000,
            durationSec: segDuration * 60,
            references: refResolution.refs,
            source: refResolution.source,
          })
        : { band: "endurance" as const, source: "fallback" as const };
    segments.push({
      kind,
      durationMin: clampPositive(segDuration),
      distanceKm: clampPositive(segDistance),
      intensityBand: steadyIntensity.band,
      intensitySource: steadyIntensity.source,
    });
  }

  return segments.filter((s) => s.durationMin > 0 || s.distanceKm > 0 || s.kind === "rest");
}

export function computeWorkoutDistance(segments: WorkoutSegment[]): number {
  const total = segments.reduce((acc, s) => acc + s.distanceKm, 0);
  return Math.round(total * 10) / 10;
}

export function computeWorkoutDuration(segments: WorkoutSegment[]): number {
  return Math.round(segments.reduce((acc, s) => acc + s.durationMin, 0));
}

export function renderWorkoutMiniProfile(segments: WorkoutSegment[]): MiniProfileBlock[] {
  const meaningful = segments.filter((s) => s.kind !== "rest");
  if (!meaningful.length) return [{ width: 100, height: 8, color: "#9CA3AF" }];

  // Keep simple sessions simple: one steady-like segment => one block.
  if (meaningful.length === 1 && (meaningful[0].kind === "steady" || meaningful[0].kind === "warmup" || meaningful[0].kind === "cooldown")) {
    const only = meaningful[0];
    return [{ width: 100, height: heightForBand(only.intensityBand), color: colorForBand(only.intensityBand) }];
  }

  const total = Math.max(
    meaningful.reduce((acc, s) => acc + Math.max(s.durationMin, s.distanceKm * 8), 0),
    1
  );

  // Compact repeated work: large rep + recovery pairs become alternating chunks.
  const compact: WorkoutSegment[] = [];
  for (const seg of meaningful) {
    if (seg.kind === "rep" && seg.durationMin >= 15) {
      const chunks = 4;
      for (let i = 0; i < chunks; i += 1) {
        compact.push({ ...seg, durationMin: seg.durationMin / chunks, distanceKm: seg.distanceKm / chunks });
        if (i < chunks - 1) {
          compact.push({ kind: "recovery", durationMin: 0.8, distanceKm: 0.1, intensityBand: "recovery" });
        }
      }
      continue;
    }
    compact.push(seg);
  }

  return compact.slice(0, 12).map((seg) => {
    const weight = Math.max(seg.durationMin, seg.distanceKm * 8);
    return {
      width: Math.max(8, Math.round((weight / total) * 100)),
      height: heightForBand(seg.intensityBand),
      color: colorForBand(seg.intensityBand),
    };
  });
}

function colorForBand(band: WorkoutSegment["intensityBand"]): string {
  if (band === "interval") return "#F97316";
  if (band === "tempo") return "#8B5CF6";
  if (band === "recovery") return "#22C55E";
  if (band === "transition") return "#9CA3AF";
  return "#60A5FA";
}

function heightForBand(band: WorkoutSegment["intensityBand"]): number {
  if (band === "interval") return 30;
  if (band === "tempo") return 26;
  if (band === "recovery") return 12;
  if (band === "transition") return 10;
  return 16;
}
