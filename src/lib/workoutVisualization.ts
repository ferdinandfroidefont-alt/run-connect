import {
  classifyRunningBlockIntensity,
  resolveRunningReferences,
  type AthleteIntensityContext,
  type IntensityBand,
} from "@/lib/athleteIntensity";
import { bandToComputedZone, zoneToColorToken, type ComputedZone } from "@/lib/athleteWorkoutContext";

export type WorkoutSegmentKind = "warmup" | "steady" | "rep" | "recovery" | "cooldown" | "rest";

export interface WorkoutSegment {
  kind: WorkoutSegmentKind;
  durationMin: number;
  distanceKm: number;
  intensityBand: IntensityBand;
  computedZone?: ComputedZone;
  color?: string;
  intensitySource?: "coach_validated" | "athlete_record" | "auto_estimate" | "fallback";
  repeatCount?: number;
  visualStyle?: "default" | "pyramid" | "variation";
  progressiveStartZone?: ComputedZone;
  progressiveEndZone?: ComputedZone;
}

export interface MiniProfileBlock {
  width: number;
  height: number;
  color: string;
  opacity?: number;
  /** 1=Z1 … 6=Z6 — hauteur relative aux bandes (mode schéma séance) */
  zoneBandLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

interface RenderWorkoutMiniProfileOptions {
  density?: "default" | "compact";
  /** Barres = Z1=1/6 … Z6=hauteur utile, pour aligner l’ordonnée sur 6 bandes */
  sessionSchema?: boolean;
}

type ParsedLikeBlock = {
  type: string;
  duration?: number;
  distance?: number;
  repetitions?: number;
  blockRepetitions?: number;
  recoveryDuration?: number;
  recoveryDistance?: number;
  blockRecoveryDuration?: number;
  blockRecoveryDistance?: number;
  pace?: string;
  paceStart?: string;
  paceEnd?: string;
  zone?: string;
  notes?: string;
};

type SessionLikeBlock = {
  type: string;
  durationSec?: number;
  distanceM?: number;
  repetitions?: number;
  blockRepetitions?: number;
  recoveryDurationSec?: number;
  recoveryDistanceM?: number;
  blockRecoveryDurationSec?: number;
  blockRecoveryDistanceM?: number;
  paceSecPerKm?: number;
  paceStartSecPerKm?: number;
  paceEndSecPerKm?: number;
  zone?: string;
  notes?: string;
};

const DEFAULT_RECOVERY_SPEED_KM_PER_MIN = 1 / 7.2; // ~7:12/km
const DEFAULT_STEADY_PACE_SEC_PER_KM = 330;
const DEFAULT_RECOVERY_DISTANCE_KM = 0.15;
const DEFAULT_TEMPO_PACE_SEC_PER_KM = 285;
const DEFAULT_INTERVAL_PACE_SEC_PER_KM = 240;
/** Minuscule durée (min) pour le rendu profil seulement — somme ≈0 après arrondi, n’influe pas le volume réel. */
const PREVIEW_EPS_MIN = 0.01;

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

/** Gabarit « carte Ajouter un bloc » : 4 barres effort / récup / effort / récup (même grammaire visuelle). */
function placeholderIntervalProfileSegments(
  options: { sport: BuildWorkoutSegmentsOptions["sport"]; zone?: string; refs: ReturnType<typeof resolveRunningReferences>["refs"] | null; refSource: "athlete_record" | "coach_validated" | "auto_estimate" | "fallback" }
): WorkoutSegment[] {
  const { sport, zone, refs, refSource } = options;
  const repIntensity =
    sport === "running"
      ? classifyRunningBlockIntensity({
          type: "interval",
          zone: (zone as ComputedZone | undefined) ?? "Z3",
          paceSecPerKm: null,
          distanceM: 0,
          durationSec: 0,
          references: refs,
          source: refSource,
        })
      : { band: "interval" as const, zone: "Z4" as ComputedZone, source: "fallback" as const };
  const recZone = bandToComputedZone("recovery");
  const segs: WorkoutSegment[] = [
    {
      kind: "rep",
      durationMin: PREVIEW_EPS_MIN,
      distanceKm: 0,
      intensityBand: repIntensity.band,
      computedZone: repIntensity.zone,
      color: zoneToColorToken(repIntensity.zone),
      intensitySource: repIntensity.source,
    },
    {
      kind: "recovery",
      durationMin: PREVIEW_EPS_MIN,
      distanceKm: 0,
      intensityBand: "recovery",
      computedZone: recZone,
      color: zoneToColorToken(recZone),
      intensitySource: refSource,
    },
    {
      kind: "rep",
      durationMin: PREVIEW_EPS_MIN,
      distanceKm: 0,
      intensityBand: repIntensity.band,
      computedZone: repIntensity.zone,
      color: zoneToColorToken(repIntensity.zone),
      intensitySource: repIntensity.source,
    },
    {
      kind: "recovery",
      durationMin: PREVIEW_EPS_MIN,
      distanceKm: 0,
      intensityBand: "recovery",
      computedZone: recZone,
      color: zoneToColorToken(recZone),
      intensitySource: refSource,
    },
  ];
  return segs;
}

function estimateDistanceFromFallback(durationMin: number, kind: WorkoutSegmentKind): number {
  if (durationMin <= 0) return 0;
  if (kind === "recovery" || kind === "cooldown") return durationMin * DEFAULT_RECOVERY_SPEED_KM_PER_MIN;
  if (kind === "warmup" || kind === "steady" || kind === "rep") return durationMin * (60 / DEFAULT_STEADY_PACE_SEC_PER_KM);
  return 0;
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
    const seriesCount = Math.max(1, ("blockRepetitions" in raw ? raw.blockRepetitions : parsedRaw.blockRepetitions) || 1);
    const durationMin =
      "durationSec" in raw
        ? clampPositive((sessionRaw.durationSec || 0) / 60)
        : clampPositive(parsedRaw.duration || 0);
    const recoveryDurationMin =
      "recoveryDurationSec" in raw
        ? clampPositive((sessionRaw.recoveryDurationSec || 0) / 60)
        : clampPositive((parsedRaw.recoveryDuration || 0) / 60);
    const recoveryDistanceKm =
      "recoveryDistanceM" in raw
        ? clampPositive((sessionRaw.recoveryDistanceM || 0) / 1000)
        : clampPositive((parsedRaw.recoveryDistance || 0) / 1000);
    const blockRecoveryDurationMin =
      "blockRecoveryDurationSec" in raw
        ? clampPositive((sessionRaw.blockRecoveryDurationSec || 0) / 60)
        : clampPositive(((parsedRaw.blockRecoveryDuration || 0)) / 60);
    const blockRecoveryDistanceKm =
      "blockRecoveryDistanceM" in raw
        ? clampPositive((sessionRaw.blockRecoveryDistanceM || 0) / 1000)
        : clampPositive((parsedRaw.blockRecoveryDistance || 0) / 1000);
    const distanceKm =
      "distanceM" in raw
        ? clampPositive((sessionRaw.distanceM || 0) / 1000)
        : clampPositive((parsedRaw.distance || 0) / 1000);
    const paceSecPerKm =
      "paceSecPerKm" in raw ? sessionRaw.paceSecPerKm || null : toPaceSecPerKmFromString(parsedRaw.pace);
    const paceStartSecPerKm =
      "paceStartSecPerKm" in raw
        ? sessionRaw.paceStartSecPerKm || null
        : toPaceSecPerKmFromString(parsedRaw.paceStart);
    const paceEndSecPerKm =
      "paceEndSecPerKm" in raw
        ? sessionRaw.paceEndSecPerKm || null
        : toPaceSecPerKmFromString(parsedRaw.paceEnd);
    const effectivePaceSecPerKm =
      paceSecPerKm ||
      (paceStartSecPerKm && paceEndSecPerKm
        ? Math.max(1, Math.round((paceStartSecPerKm + paceEndSecPerKm) / 2))
        : paceStartSecPerKm || paceEndSecPerKm || null);
    const isPyramid = Boolean(("notes" in raw ? raw.notes : parsedRaw.notes)?.includes("[Pyramid]"));
    const isVariation = Boolean(
      ("notes" in raw ? raw.notes : parsedRaw.notes)?.includes("[Variation]") ||
        ("notes" in raw ? raw.notes : parsedRaw.notes)?.includes("[Progressif]") ||
        ("notes" in raw ? raw.notes : parsedRaw.notes)?.includes("[Dégressif]")
    );

    if (raw.type === "interval") {
      const durationFromDistance =
        distanceKm > 0 && effectivePaceSecPerKm ? distanceKm * (effectivePaceSecPerKm / 60) : 0;
      const hasEffortVolume = durationMin > 0 || distanceKm > 0 || durationFromDistance > 0;
      if (!hasEffortVolume) {
        segments.push(
          ...placeholderIntervalProfileSegments({
            sport,
            zone: typeof raw.zone === "string" ? raw.zone : undefined,
            refs: refResolution.refs,
            refSource: refResolution.source,
          })
        );
        continue;
      }
      const perRepDuration = durationMin > 0 ? durationMin : durationFromDistance;
      const effortDistancePerRep =
        distanceKm > 0
          ? distanceKm
          : estimateDistanceKm(perRepDuration, effectivePaceSecPerKm) || estimateDistanceFromFallback(perRepDuration, "rep");

      const repIntensity =
        sport === "running"
          ? classifyRunningBlockIntensity({
              type: "interval",
              zone: raw.zone,
              paceSecPerKm: effectivePaceSecPerKm,
              distanceM: distanceKm * 1000,
              durationSec: perRepDuration * 60,
              references: refResolution.refs,
              source: refResolution.source,
            })
          : { band: "interval" as const, zone: "Z5" as const, source: "fallback" as const };
      for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex += 1) {
        segments.push({
          kind: "rep",
          durationMin: clampPositive(perRepDuration * repetitions),
          distanceKm: clampPositive(effortDistancePerRep * repetitions),
          intensityBand: repIntensity.band,
          computedZone: repIntensity.zone,
          color: zoneToColorToken(repIntensity.zone),
          intensitySource: repIntensity.source,
          repeatCount: repetitions,
        });

        if (repetitions > 1 && (recoveryDurationMin > 0 || recoveryDistanceKm > 0)) {
          const totalRecoveryDuration = recoveryDurationMin * (repetitions - 1);
          const totalRecoveryDistance =
            recoveryDistanceKm > 0
              ? recoveryDistanceKm * (repetitions - 1)
              : totalRecoveryDuration > 0
                ? totalRecoveryDuration * DEFAULT_RECOVERY_SPEED_KM_PER_MIN
                : Math.max(0, repetitions - 1) * DEFAULT_RECOVERY_DISTANCE_KM;
          segments.push({
            kind: "recovery",
            durationMin: clampPositive(totalRecoveryDuration),
            distanceKm: clampPositive(totalRecoveryDistance),
            intensityBand: "recovery",
            computedZone: bandToComputedZone("recovery"),
            color: zoneToColorToken(bandToComputedZone("recovery")),
            intensitySource: refResolution.source,
            repeatCount: Math.max(0, repetitions - 1),
          });
        }

        if (seriesIndex < seriesCount - 1 && (blockRecoveryDurationMin > 0 || blockRecoveryDistanceKm > 0)) {
          const resolvedBlockRecoveryDistance =
            blockRecoveryDistanceKm > 0
              ? blockRecoveryDistanceKm
              : blockRecoveryDurationMin > 0
                ? blockRecoveryDurationMin * DEFAULT_RECOVERY_SPEED_KM_PER_MIN
                : DEFAULT_RECOVERY_DISTANCE_KM;
          segments.push({
            kind: "recovery",
            durationMin: clampPositive(blockRecoveryDurationMin),
            distanceKm: clampPositive(resolvedBlockRecoveryDistance),
            intensityBand: "recovery",
            computedZone: bandToComputedZone("recovery"),
            color: zoneToColorToken(bandToComputedZone("recovery")),
            intensitySource: refResolution.source,
          });
        }
      }
      continue;
    }

    const kind: WorkoutSegmentKind =
      raw.type === "warmup" || raw.type === "steady" || raw.type === "cooldown" || raw.type === "recovery"
        ? (raw.type as WorkoutSegmentKind)
        : "steady";
    const segDuration = durationMin * repetitions;
    const segDistance =
      distanceKm > 0
        ? distanceKm * repetitions
        : estimateDistanceKm(segDuration, effectivePaceSecPerKm) || estimateDistanceFromFallback(segDuration, kind);

    const steadyIntensity =
      sport === "running"
        ? classifyRunningBlockIntensity({
            type: kind,
            zone: raw.zone,
            paceSecPerKm: effectivePaceSecPerKm,
            distanceM: distanceKm * 1000,
            durationSec: segDuration * 60,
            references: refResolution.refs,
            source: refResolution.source,
          })
        : { band: "endurance" as const, zone: "Z2" as const, source: "fallback" as const };
    const progressiveStartZone =
      sport === "running" && paceStartSecPerKm
        ? classifyRunningBlockIntensity({
            type: kind,
            zone: raw.zone,
            paceSecPerKm: paceStartSecPerKm,
            distanceM: distanceKm * 1000,
            durationSec: segDuration * 60,
            references: refResolution.refs,
            source: refResolution.source,
          }).zone
        : undefined;
    const progressiveEndZone =
      sport === "running" && paceEndSecPerKm
        ? classifyRunningBlockIntensity({
            type: kind,
            zone: raw.zone,
            paceSecPerKm: paceEndSecPerKm,
            distanceM: distanceKm * 1000,
            durationSec: segDuration * 60,
            references: refResolution.refs,
            source: refResolution.source,
          }).zone
        : undefined;

    const hasSteadyVolume = segDuration > 0 || segDistance > 0;
    if (!hasSteadyVolume) {
      segments.push({
        kind,
        durationMin: PREVIEW_EPS_MIN,
        distanceKm: 0,
        intensityBand: steadyIntensity.band,
        computedZone: steadyIntensity.zone,
        color: zoneToColorToken(steadyIntensity.zone),
        intensitySource: steadyIntensity.source,
        repeatCount: repetitions > 1 ? repetitions : undefined,
        visualStyle: isPyramid ? "pyramid" : isVariation ? "variation" : "default",
        progressiveStartZone,
        progressiveEndZone,
      });
      continue;
    }

    segments.push({
      kind,
      durationMin: clampPositive(segDuration),
      distanceKm: clampPositive(segDistance),
      intensityBand: steadyIntensity.band,
      computedZone: steadyIntensity.zone,
      color: zoneToColorToken(steadyIntensity.zone),
      intensitySource: steadyIntensity.source,
      repeatCount: repetitions > 1 ? repetitions : undefined,
      visualStyle: isPyramid ? "pyramid" : isVariation ? "variation" : "default",
      progressiveStartZone,
      progressiveEndZone,
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

function zoneToBandLevel(zone: ComputedZone): 1 | 2 | 3 | 4 | 5 | 6 {
  if (zone === "Z1") return 1;
  if (zone === "Z2") return 2;
  if (zone === "Z3") return 3;
  if (zone === "Z4") return 4;
  if (zone === "Z5") return 5;
  return 6;
}

export function renderWorkoutMiniProfile(
  segments: WorkoutSegment[],
  options: RenderWorkoutMiniProfileOptions = {}
): MiniProfileBlock[] {
  const compactDensity = options.density === "compact";
  const sessionSchema = options.sessionSchema === true;
  const meaningful = segments.filter((s) => s.kind !== "rest");
  if (!meaningful.length) return [{ width: 100, height: 8, color: "hsl(var(--muted))", opacity: 0.8 }];

  // Keep simple sessions simple: one steady-like segment => one block.
  if (
    meaningful.length === 1 &&
    meaningful[0].repeatCount == null &&
    meaningful[0].visualStyle !== "pyramid" &&
    (meaningful[0].kind === "steady" || meaningful[0].kind === "warmup" || meaningful[0].kind === "cooldown")
  ) {
    const only = meaningful[0];
    const zone = only.computedZone ?? bandToComputedZone(only.intensityBand);
    const block: MiniProfileBlock = { width: 100, height: heightForZone(zone), color: colorForZone(zone), opacity: 1 };
    if (sessionSchema) block.zoneBandLevel = zoneToBandLevel(zone);
    return [block];
  }

  const expanded = expandSegmentsForMiniProfile(meaningful);
  const minWeight = compactDensity ? 0.28 : 0.6;
  return expanded.map((seg) => {
    const weight = Math.max(seg.durationMin, seg.distanceKm * 8, minWeight);
    const previewZone = seg.computedZone ?? bandToComputedZone(seg.intensityBand);
    const block: MiniProfileBlock = {
      width: weight,
      height: heightForZone(previewZone),
      color: colorForZone(previewZone),
      opacity: seg.kind === "warmup" || seg.kind === "cooldown" ? 0.8 : seg.kind === "recovery" ? 0.75 : 1,
    };
    if (sessionSchema) block.zoneBandLevel = zoneToBandLevel(previewZone);
    return block;
  });
}

function expandSegmentsForMiniProfile(segments: WorkoutSegment[]): WorkoutSegment[] {
  const expanded: WorkoutSegment[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const seg = segments[index];

    if (seg.visualStyle === "pyramid") {
      // 5 paliers : aligné sur la carte « Pyramide » (montée puis descente)
      const steps = [0.45, 0.68, 1, 0.68, 0.45];
      steps.forEach((ratio) => {
        expanded.push({
          ...seg,
          durationMin: seg.durationMin / steps.length,
          distanceKm: seg.distanceKm / steps.length,
          intensityBand: ratio > 0.88 ? "interval" : ratio > 0.68 ? "tempo" : seg.intensityBand,
          repeatCount: undefined,
        });
      });
      continue;
    }
    if (seg.visualStyle === "variation") {
      // Bloc unique en rampe pour un rendu "variation" sur le schéma.
      const startRank = zoneRank(seg.progressiveStartZone ?? seg.computedZone ?? bandToComputedZone(seg.intensityBand));
      const endRank = zoneRank(seg.progressiveEndZone ?? seg.computedZone ?? bandToComputedZone(seg.intensityBand));
      const increasing = endRank >= startRank;
      const steps = increasing ? [0.45, 0.62, 0.8, 1] : [1, 0.8, 0.62, 0.45];
      const startZone = seg.progressiveStartZone ?? seg.computedZone ?? bandToComputedZone(seg.intensityBand);
      const endZone = seg.progressiveEndZone ?? seg.computedZone ?? bandToComputedZone(seg.intensityBand);
      steps.forEach((ratio) => {
        const stepZone = interpolateZone(startZone, endZone, ratio);
        expanded.push({
          ...seg,
          durationMin: seg.durationMin / steps.length,
          distanceKm: seg.distanceKm / steps.length,
          computedZone: stepZone,
          color: zoneToColorToken(stepZone),
          intensityBand: bandForZone(stepZone),
          repeatCount: undefined,
        });
      });
      continue;
    }

    const next = segments[index + 1];
    const repCount = Math.max(1, seg.repeatCount || 1);
    const recoveryCount = Math.max(0, next?.repeatCount || 0);
    const hasLinkedRecovery =
      seg.kind === "rep" &&
      repCount > 1 &&
      next?.kind === "recovery" &&
      recoveryCount === repCount - 1;

    if (hasLinkedRecovery) {
      const effortDuration = seg.durationMin / repCount;
      const effortDistance = seg.distanceKm / repCount;
      const recoveryDuration = recoveryCount > 0 ? next.durationMin / recoveryCount : 0;
      const recoveryDistance = recoveryCount > 0 ? next.distanceKm / recoveryCount : 0;

      for (let repIndex = 0; repIndex < repCount; repIndex += 1) {
        expanded.push({
          ...seg,
          durationMin: clampPositive(effortDuration),
          distanceKm: clampPositive(effortDistance),
          repeatCount: undefined,
        });

        if (repIndex < recoveryCount) {
          expanded.push({
            ...next,
            durationMin: clampPositive(recoveryDuration),
            distanceKm: clampPositive(recoveryDistance),
            repeatCount: undefined,
          });
        }
      }

      index += 1;
      continue;
    }

    expanded.push({ ...seg, repeatCount: undefined });
  }

  return expanded;
}

function zoneRank(zone: ComputedZone): number {
  if (zone === "Z1") return 1;
  if (zone === "Z2") return 2;
  if (zone === "Z3") return 3;
  if (zone === "Z4") return 4;
  if (zone === "Z5") return 5;
  return 6;
}

function rankToZone(rank: number): ComputedZone {
  if (rank <= 1) return "Z1";
  if (rank === 2) return "Z2";
  if (rank === 3) return "Z3";
  if (rank === 4) return "Z4";
  if (rank === 5) return "Z5";
  return "Z6";
}

function interpolateZone(start: ComputedZone, end: ComputedZone, ratio: number): ComputedZone {
  const s = zoneRank(start);
  const e = zoneRank(end);
  const raw = s + (e - s) * Math.max(0, Math.min(1, ratio));
  return rankToZone(Math.max(1, Math.min(6, Math.round(raw))));
}

function bandForZone(zone: ComputedZone): IntensityBand {
  if (zone === "Z1") return "recovery";
  if (zone === "Z2") return "endurance";
  if (zone === "Z3") return "tempo";
  return "interval";
}

function colorForZone(zone: ComputedZone): string {
  if (zone === "Z1") return "#2563EB";
  if (zone === "Z2") return "#10B981";
  if (zone === "Z3") return "#FACC15";
  if (zone === "Z4") return "#F97316";
  if (zone === "Z5") return "#EF4444";
  return "#000000";
}

/** Couleur des barres et des libellés d’axes zone (aligné sur le mini profil) */
export function miniProfileZoneColor(zone: ComputedZone): string {
  return colorForZone(zone);
}

function heightForZone(zone: ComputedZone): number {
  if (zone === "Z1") return 10;
  if (zone === "Z2") return 14;
  if (zone === "Z3") return 18;
  if (zone === "Z4") return 22;
  if (zone === "Z5") return 28;
  return 34;
}
