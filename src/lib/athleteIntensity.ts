export type IntensityBand = "recovery" | "endurance" | "tempo" | "interval" | "transition";
export type ComputedZone = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";
export type RecordSource = "coach_validated" | "athlete_record" | "auto_estimate" | "fallback";
export type RunningRecordKey = "800m" | "1500m" | "3000m" | "5k" | "10k" | "half_marathon";

export interface ParsedRunningRecord {
  key: RunningRecordKey;
  distance: string;
  distanceM: number;
  distanceKm: number;
  timeSec: number;
  speed: number;
  paceSecPerKm: number;
}

export interface ReferenceSpeedSet {
  vSprintRef: number | null;
  vVo2Ref: number | null;
  vThresholdRef: number | null;
  vEnduranceRef: number | null;
}

export interface ZoneRange {
  minSpeed: number;
  maxSpeed: number;
  minPace: number;
  maxPace: number;
}

export interface RunningZones {
  Z1: ZoneRange;
  Z2: ZoneRange;
  Z3: ZoneRange;
  Z4: ZoneRange;
  Z5: ZoneRange;
  Z6: ZoneRange;
}

export interface RunningReferenceSet {
  easyPaceSecPerKm?: number | null;
  thresholdPaceSecPerKm?: number | null;
  intervalPaceSecPerKm?: number | null;
  sprintPaceSecPerKm?: number | null;
  records?: ParsedRunningRecord[];
  referenceSpeeds?: ReferenceSpeedSet | null;
  zones?: RunningZones | null;
}

export interface AthleteIntensityContext {
  coachValidatedRecords?: RunningReferenceSet | null;
  athleteRecords?: RunningReferenceSet | null;
}

type RunningBlockInput = {
  type: string;
  zone?: string;
  paceSecPerKm?: number | null;
  distanceM?: number;
  durationSec?: number;
  references: RunningReferenceSet | null;
  source: RecordSource;
};

type RecordDefinition = {
  key: RunningRecordKey;
  distance: string;
  distanceM: number;
  aliases: string[];
};

const RECORD_DEFINITIONS: RecordDefinition[] = [
  { key: "800m", distance: "800", distanceM: 800, aliases: ["800m", "800 m"] },
  { key: "1500m", distance: "1500", distanceM: 1500, aliases: ["1500m", "1500 m", "1 500 m"] },
  { key: "3000m", distance: "3000", distanceM: 3000, aliases: ["3000m", "3000 m", "3k", "3km"] },
  { key: "5k", distance: "5000", distanceM: 5000, aliases: ["5k", "5km", "5000m", "5000 m"] },
  { key: "10k", distance: "10000", distanceM: 10000, aliases: ["10k", "10km", "10000m", "10000 m"] },
  {
    key: "half_marathon",
    distance: "21097.5",
    distanceM: 21097.5,
    aliases: ["semi-marathon", "semi marathon", "semi", "half marathon", "half_marathon", "21.1k", "21,1k"],
  },
];

const ZONE_ORDER: ComputedZone[] = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"];
const DEFAULT_REFERENCE_SPEEDS: ReferenceSpeedSet = {
  vSprintRef: 5.9,
  vVo2Ref: 5.35,
  vThresholdRef: 4.7,
  vEnduranceRef: 4.05,
};

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

function speedToPaceSecPerKm(speed: number | null | undefined): number | null {
  if (!speed || !Number.isFinite(speed) || speed <= 0) return null;
  return 1000 / speed;
}

function paceToSpeed(paceSecPerKm: number | null | undefined): number | null {
  if (!paceSecPerKm || !Number.isFinite(paceSecPerKm) || paceSecPerKm <= 0) return null;
  return 1000 / paceSecPerKm;
}

function normalizeRecordMap(records?: Record<string, unknown> | null): Record<string, unknown> {
  if (!records) return {};
  return Object.entries(records).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = value;
    return acc;
  }, {});
}

function estimateEquivalentTimeSec(record: ParsedRunningRecord, targetDistanceM: number): number {
  return record.timeSec * Math.pow(targetDistanceM / record.distanceM, 1.06);
}

function similarityWeight(distanceM: number, targetDistanceM: number): number {
  const ratio = Math.abs(Math.log(targetDistanceM / distanceM));
  return 1 / (1 + ratio);
}

function priorityWeight(key: RunningRecordKey, priorities: RunningRecordKey[]): number {
  const rank = priorities.indexOf(key);
  if (rank === -1) return 0.38;
  return 1.18 - rank * 0.16;
}

function createZoneRange(minSpeed: number, maxSpeed: number): ZoneRange {
  const safeMin = Math.max(0.1, minSpeed);
  const safeMax = Math.max(safeMin, maxSpeed);
  return {
    minSpeed: safeMin,
    maxSpeed: safeMax,
    minPace: speedToPaceSecPerKm(safeMax) ?? 0,
    maxPace: speedToPaceSecPerKm(safeMin) ?? 0,
  };
}

function normalizeZone(zone?: string | null): ComputedZone | null {
  const upper = zone?.toUpperCase();
  return upper && ZONE_ORDER.includes(upper as ComputedZone) ? (upper as ComputedZone) : null;
}

function zoneIndex(zone: ComputedZone): number {
  return ZONE_ORDER.indexOf(zone);
}

function clampZone(zone: ComputedZone, min: ComputedZone, max: ComputedZone): ComputedZone {
  const index = Math.min(Math.max(zoneIndex(zone), zoneIndex(min)), zoneIndex(max));
  return ZONE_ORDER[index];
}

function resolveZoneBand(zone: ComputedZone): IntensityBand {
  if (zone === "Z1") return "recovery";
  if (zone === "Z2") return "endurance";
  if (zone === "Z3" || zone === "Z4") return "tempo";
  return "interval";
}

function chooseReferenceSpeed(records: ParsedRunningRecord[], targetDistanceM: number, priorities: RunningRecordKey[]): number | null {
  if (!records.length) return null;

  const prioritized = records.filter((record) => priorities.includes(record.key));
  const pool = prioritized.length ? prioritized : records;
  const aggregates = pool.reduce(
    (acc, record) => {
      const estimatedTime = estimateEquivalentTimeSec(record, targetDistanceM);
      const estimatedSpeed = targetDistanceM / estimatedTime;
      const weight = priorityWeight(record.key, priorities) * similarityWeight(record.distanceM, targetDistanceM);
      if (!Number.isFinite(estimatedSpeed) || estimatedSpeed <= 0 || weight <= 0) return acc;
      acc.weightedSpeed += estimatedSpeed * weight;
      acc.totalWeight += weight;
      return acc;
    },
    { weightedSpeed: 0, totalWeight: 0 }
  );

  if (aggregates.totalWeight <= 0) return null;
  return aggregates.weightedSpeed / aggregates.totalWeight;
}

function stabilizeReferenceSpeeds(raw: ReferenceSpeedSet): ReferenceSpeedSet {
  const endurance = raw.vEnduranceRef ?? DEFAULT_REFERENCE_SPEEDS.vEnduranceRef;
  const threshold = Math.max(raw.vThresholdRef ?? endurance * 1.1, endurance * 1.04);
  const vo2 = Math.max(raw.vVo2Ref ?? threshold * 1.12, threshold * 1.04);
  const sprint = Math.max(raw.vSprintRef ?? vo2 * 1.08, vo2 * 1.03);

  return {
    vEnduranceRef: endurance,
    vThresholdRef: threshold,
    vVo2Ref: vo2,
    vSprintRef: sprint,
  };
}

export function parseAthleteRecords(records?: Record<string, unknown> | null): ParsedRunningRecord[] {
  const normalized = normalizeRecordMap(records);

  return RECORD_DEFINITIONS.flatMap((definition) => {
    const rawValue = definition.aliases.map((alias) => normalized[alias.toLowerCase()]).find((value) => value != null);
    const timeSec = parseTimeToSeconds(rawValue);
    if (!timeSec) return [];

    const speed = definition.distanceM / timeSec;
    const paceSecPerKm = timeSec / (definition.distanceM / 1000);
    return [{ key: definition.key, distance: definition.distance, distanceM: definition.distanceM, distanceKm: definition.distanceM / 1000, timeSec, speed, paceSecPerKm }];
  });
}

export function computeReferenceSpeeds(records: ParsedRunningRecord[]): ReferenceSpeedSet | null {
  if (!records.length) return null;

  return stabilizeReferenceSpeeds({
    vSprintRef: chooseReferenceSpeed(records, 800, ["800m", "1500m"]),
    vVo2Ref: chooseReferenceSpeed(records, 1500, ["1500m", "3000m", "800m"]),
    vThresholdRef: chooseReferenceSpeed(records, 5000, ["5k", "10k", "3000m"]),
    vEnduranceRef: chooseReferenceSpeed(records, 21097.5, ["half_marathon", "10k", "5k"]),
  });
}

export function computeZonesFromReferences(referenceSpeeds?: ReferenceSpeedSet | null): RunningZones | null {
  if (!referenceSpeeds) return null;

  const highIntensityRef = referenceSpeeds.vSprintRef ?? referenceSpeeds.vVo2Ref;
  if (!referenceSpeeds.vEnduranceRef || !referenceSpeeds.vThresholdRef || !referenceSpeeds.vVo2Ref || !highIntensityRef) return null;

  return {
    Z1: createZoneRange(referenceSpeeds.vEnduranceRef * 0.6, referenceSpeeds.vEnduranceRef * 0.72),
    Z2: createZoneRange(referenceSpeeds.vEnduranceRef * 0.72, referenceSpeeds.vEnduranceRef * 0.82),
    Z3: createZoneRange(referenceSpeeds.vThresholdRef * 0.82, referenceSpeeds.vThresholdRef * 0.9),
    Z4: createZoneRange(referenceSpeeds.vThresholdRef * 0.9, referenceSpeeds.vThresholdRef * 0.96),
    Z5: createZoneRange(referenceSpeeds.vVo2Ref * 0.96, referenceSpeeds.vVo2Ref * 1.03),
    Z6: createZoneRange(highIntensityRef * 1.03, highIntensityRef * 1.12),
  };
}

export function computeAthletePaces(runningRecords?: Record<string, unknown> | null): RunningReferenceSet | null {
  const records = parseAthleteRecords(runningRecords);
  if (!records.length) return null;

  const referenceSpeeds = computeReferenceSpeeds(records);
  const zones = computeZonesFromReferences(referenceSpeeds);
  if (!referenceSpeeds || !zones) return null;

  return {
    easyPaceSecPerKm: zones.Z2.maxPace,
    thresholdPaceSecPerKm: speedToPaceSecPerKm(referenceSpeeds.vThresholdRef),
    intervalPaceSecPerKm: speedToPaceSecPerKm(referenceSpeeds.vVo2Ref),
    sprintPaceSecPerKm: speedToPaceSecPerKm(referenceSpeeds.vSprintRef),
    records,
    referenceSpeeds,
    zones,
  };
}

export function buildAthleteIntensityContext(profile?: {
  runningRecords?: Record<string, unknown> | null;
  coachRunningRecords?: Record<string, unknown> | null;
} | null): AthleteIntensityContext | null {
  const athleteRecords = computeAthletePaces(profile?.runningRecords ?? null);
  const coachValidatedRecords = computeAthletePaces(profile?.coachRunningRecords ?? null);
  if (!athleteRecords && !coachValidatedRecords) return null;
  return { athleteRecords, coachValidatedRecords };
}

export function getZoneFromPace(paceSecPerKm: number | null | undefined, zones?: RunningZones | null): ComputedZone | null {
  const speed = paceToSpeed(paceSecPerKm);
  if (!speed || !zones) return null;

  if (speed < zones.Z1.minSpeed) return "Z1";
  if (speed > zones.Z6.maxSpeed) return "Z6";

  for (const zone of ZONE_ORDER) {
    const range = zones[zone];
    if (speed >= range.minSpeed && speed <= range.maxSpeed) return zone;
  }

  return null;
}

export function getZoneFromDistanceAndTime(distanceM: number | undefined, timeSec: number | undefined, zones?: RunningZones | null): ComputedZone | null {
  if (!distanceM || !timeSec || distanceM <= 0 || timeSec <= 0) return null;
  const paceSecPerKm = timeSec / (distanceM / 1000);
  return getZoneFromPace(paceSecPerKm, zones);
}

export function resolveRunningReferences(context?: AthleteIntensityContext | null) {
  if (context?.coachValidatedRecords) {
    return { refs: context.coachValidatedRecords, source: "coach_validated" as const };
  }

  if (context?.athleteRecords) {
    return { refs: context.athleteRecords, source: "athlete_record" as const };
  }

  return { refs: null, source: "fallback" as const };
}

export function classifyRunningBlockIntensity(input: RunningBlockInput): {
  band: IntensityBand;
  zone: ComputedZone;
  source: RecordSource;
} {
  const zones = input.references?.zones ?? null;
  const explicitZone = normalizeZone(input.zone);
  const paceZone = getZoneFromPace(input.paceSecPerKm, zones);
  const effortZone = paceZone ?? getZoneFromDistanceAndTime(input.distanceM, input.durationSec, zones);

  let resolvedZone: ComputedZone;
  if (explicitZone && effortZone) {
    resolvedZone = Math.abs(zoneIndex(explicitZone) - zoneIndex(effortZone)) >= 2 ? effortZone : explicitZone;
  } else {
    resolvedZone = effortZone ?? explicitZone ?? (input.type === "interval" ? "Z5" : input.type === "warmup" ? "Z1" : "Z2");
  }

  if (input.type === "recovery" || input.type === "cooldown") {
    resolvedZone = clampZone(effortZone ?? explicitZone ?? "Z1", "Z1", "Z2");
  } else if (input.type === "warmup") {
    resolvedZone = clampZone(effortZone ?? explicitZone ?? "Z1", "Z1", "Z3");
  } else if (input.type === "interval" && !effortZone && !explicitZone) {
    resolvedZone = "Z5";
  }

  return {
    band: resolveZoneBand(resolvedZone),
    zone: resolvedZone,
    source: input.source === "fallback" && (effortZone || explicitZone) ? "auto_estimate" : input.source,
  };
}