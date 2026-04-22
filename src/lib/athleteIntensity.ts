export type IntensityBand = "recovery" | "endurance" | "tempo" | "interval" | "transition";

export interface RunningReferenceSet {
  easyPaceSecPerKm?: number | null;
  thresholdPaceSecPerKm?: number | null;
  intervalPaceSecPerKm?: number | null;
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
  source: "coach_validated" | "athlete_record" | "auto_estimate" | "fallback";
};

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
  source: "coach_validated" | "athlete_record" | "auto_estimate" | "fallback";
} {
  if (input.type === "cooldown" || input.type === "recovery") {
    return { band: "recovery", source: input.source };
  }

  if (input.type === "warmup") {
    if (input.paceSecPerKm && input.references?.easyPaceSecPerKm) {
      return {
        band: input.paceSecPerKm <= input.references.easyPaceSecPerKm * 0.93 ? "endurance" : "recovery",
        source: input.source,
      };
    }
    return { band: "recovery", source: input.source };
  }

  if (input.zone === "Z4" || input.zone === "Z5" || input.zone === "Z6" || input.type === "interval") {
    return { band: "interval", source: input.source };
  }

  if (input.zone === "Z3") {
    return { band: "tempo", source: input.source };
  }

  if (input.paceSecPerKm && input.references?.thresholdPaceSecPerKm) {
    if (input.paceSecPerKm <= input.references.thresholdPaceSecPerKm * 0.95) {
      return { band: "interval", source: input.source === "fallback" ? "auto_estimate" : input.source };
    }
    if (input.paceSecPerKm <= input.references.thresholdPaceSecPerKm * 1.03) {
      return { band: "tempo", source: input.source === "fallback" ? "auto_estimate" : input.source };
    }
    if (input.references.easyPaceSecPerKm && input.paceSecPerKm >= input.references.easyPaceSecPerKm * 1.06) {
      return { band: "recovery", source: input.source === "fallback" ? "auto_estimate" : input.source };
    }
  }

  return { band: "endurance", source: input.source };
}