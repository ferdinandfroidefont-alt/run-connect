export type IntensityBand = "endurance" | "interval" | "tempo" | "recovery" | "transition";

export interface RunningReferences {
  easyPaceSecPerKm: number;
  tempoPaceSecPerKm: number;
  thresholdPaceSecPerKm: number;
  vo2PaceSecPerKm: number;
  sprintPaceSecPerKm: number;
}

export interface AthleteIntensityContext {
  coachValidatedRecords?: unknown;
  athleteRecords?: unknown;
  autoEstimatedRecords?: unknown;
}

export interface IntensityResolution {
  band: IntensityBand;
  source: "coach_validated" | "athlete_record" | "auto_estimate" | "fallback";
}

function parseTimeToSeconds(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().split(" - ")[0]?.trim() ?? "";
  if (!s) return null;

  const hhmmss = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hhmmss) return Number(hhmmss[1]) * 3600 + Number(hhmmss[2]) * 60 + Number(hhmmss[3]);

  const mmss = s.match(/^(\d+):(\d{1,2})$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);

  const apostrophe = s.match(/^(\d+)'(\d{1,2})$/);
  if (apostrophe) return Number(apostrophe[1]) * 60 + Number(apostrophe[2]);

  return null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readRecordSeconds(records: unknown, keys: string[]): number | null {
  const obj = asObject(records);
  for (const key of keys) {
    const direct = parseTimeToSeconds(obj[key]);
    if (direct != null) return direct;
    const nested = asObject(obj[key]);
    const nestedTime = parseTimeToSeconds(nested.time ?? nested.value ?? nested.record);
    if (nestedTime != null) return nestedTime;
  }
  return null;
}

function buildRunningReferences(records: unknown): RunningReferences | null {
  const sec5k = readRecordSeconds(records, ["5k", "5000", "5000m"]);
  const sec10k = readRecordSeconds(records, ["10k", "10000", "10000m"]);
  const sec3k = readRecordSeconds(records, ["3k", "3000", "3000m"]);
  const sec1500 = readRecordSeconds(records, ["1500", "1500m"]);
  const sec800 = readRecordSeconds(records, ["800", "800m"]);

  // Build a robust 5k equivalent pace if direct data is missing.
  let pace5k: number | null = sec5k != null ? sec5k / 5 : null;
  if (pace5k == null && sec10k != null) pace5k = (sec10k / 10) * 0.96;
  if (pace5k == null && sec3k != null) pace5k = (sec3k / 3) * 1.06;
  if (pace5k == null && sec1500 != null) pace5k = (sec1500 / 1.5) * 1.1;
  if (pace5k == null && sec800 != null) pace5k = (sec800 / 0.8) * 1.18;
  if (pace5k == null) return null;

  return {
    easyPaceSecPerKm: Math.round(pace5k * 1.34),
    tempoPaceSecPerKm: Math.round(pace5k * 1.12),
    thresholdPaceSecPerKm: Math.round(pace5k * 1.07),
    vo2PaceSecPerKm: Math.round(pace5k * 0.94),
    sprintPaceSecPerKm: Math.round(pace5k * 0.83),
  };
}

export function resolveRunningReferences(
  context: AthleteIntensityContext | undefined
): { refs: RunningReferences | null; source: IntensityResolution["source"] } {
  const coach = buildRunningReferences(context?.coachValidatedRecords);
  if (coach) return { refs: coach, source: "coach_validated" };
  const athlete = buildRunningReferences(context?.athleteRecords);
  if (athlete) return { refs: athlete, source: "athlete_record" };
  const estimate = buildRunningReferences(context?.autoEstimatedRecords);
  if (estimate) return { refs: estimate, source: "auto_estimate" };
  return { refs: null, source: "fallback" };
}

export function classifyRunningBlockIntensity(params: {
  type: string;
  zone?: string;
  paceSecPerKm?: number | null;
  distanceM?: number;
  durationSec?: number;
  references: RunningReferences | null;
  source: IntensityResolution["source"];
}): IntensityResolution {
  const zone = (params.zone || "").toUpperCase();
  if (zone === "Z1") return { band: "recovery", source: params.source };
  if (zone === "Z2") return { band: "endurance", source: params.source };
  if (zone === "Z3" || zone === "Z4") return { band: "tempo", source: params.source };
  if (zone === "Z5" || zone === "Z6") return { band: "interval", source: params.source };

  if (params.type === "recovery") return { band: "recovery", source: params.source };
  if (params.type === "warmup" || params.type === "cooldown" || params.type === "rest") {
    return { band: "transition", source: params.source };
  }

  if (!params.references || !params.paceSecPerKm) {
    // Stable fallback by block semantic when data is missing.
    if (params.type === "interval") return { band: "interval", source: "fallback" };
    return { band: "endurance", source: "fallback" };
  }

  if (params.type === "interval") {
    const shortRep = (params.distanceM || 0) > 0 && (params.distanceM || 0) <= 200;
    if (shortRep || params.paceSecPerKm <= params.references.sprintPaceSecPerKm) {
      return { band: "interval", source: params.source };
    }
    if (params.paceSecPerKm <= params.references.vo2PaceSecPerKm) {
      return { band: "interval", source: params.source };
    }
    if (params.paceSecPerKm <= params.references.thresholdPaceSecPerKm) {
      return { band: "tempo", source: params.source };
    }
    return { band: "endurance", source: params.source };
  }

  if (params.paceSecPerKm <= params.references.vo2PaceSecPerKm) return { band: "interval", source: params.source };
  if (params.paceSecPerKm <= params.references.thresholdPaceSecPerKm) return { band: "tempo", source: params.source };
  if (params.paceSecPerKm <= params.references.tempoPaceSecPerKm) return { band: "tempo", source: params.source };
  return { band: "endurance", source: params.source };
}
