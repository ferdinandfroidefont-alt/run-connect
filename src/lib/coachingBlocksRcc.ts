import type { CoachingSessionBlock } from "@/components/coaching/CoachingBlockEditorPanel";
import type { SessionBlock } from "@/components/session-creation/types";
import {
  formatDurationSeconds,
  normalizeBlocksForStorage,
  parseDurationSeconds,
  parseDistanceMeters,
  parsePaceToSecondsPerKm,
  sessionBlocksToParsedBlocks,
} from "@/lib/sessionBlockCalculations";
import { serializeParsedBlocksToRcc } from "@/lib/rccParser";

function isCoachingPositive(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function paceSecPerKmToRunPaceString(sec?: number): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function blockIntensityToZone(intensity?: string | null): NonNullable<CoachingSessionBlock["zone"]> {
  const z = intensity?.trim().toLowerCase();
  if (z === "z1") return "Z1";
  if (z === "z2") return "Z2";
  if (z === "z3") return "Z3";
  if (z === "z4") return "Z4";
  if (z === "z5") return "Z5";
  if (z === "z6") return "Z6";
  return "Z2";
}

export function coachingBlocksToSessionBlocks(blocks: CoachingSessionBlock[]): SessionBlock[] {
  return blocks.map((block) => {
    if (block.type === "interval") {
      const pace = paceSecPerKmToRunPaceString(block.paceSecPerKm);
      const hasDistance = isCoachingPositive(block.distanceM);
      return {
        id: block.id,
        type: "interval",
        repetitions: Math.max(1, block.repetitions ?? 1),
        blockRepetitions: Math.max(1, block.blockRepetitions ?? 1),
        effortType: hasDistance ? "distance" : "time",
        effortDistance: hasDistance ? String(Math.round(block.distanceM!)) : "",
        effortDuration: hasDistance ? "" : formatDurationSeconds(block.durationSec),
        effortPace: pace,
        recoveryDuration: formatDurationSeconds(block.recoveryDurationSec),
        recoveryType: "trot",
        effortIntensity: block.zone ? block.zone.toLowerCase() : undefined,
      };
    }
    const sessionType: "warmup" | "steady" | "cooldown" =
      block.type === "warmup" ? "warmup" : block.type === "cooldown" ? "cooldown" : "steady";
    const pace = paceSecPerKmToRunPaceString(block.paceSecPerKm);
    return {
      id: block.id,
      type: sessionType,
      durationType: isCoachingPositive(block.distanceM) && !isCoachingPositive(block.durationSec) ? "distance" : "time",
      duration: formatDurationSeconds(block.durationSec),
      distance: block.distanceM != null ? String(Math.round(block.distanceM)) : "",
      pace,
      intensity: block.zone?.toLowerCase(),
    };
  });
}

/** Sérialise les blocs de l’éditeur coaching en code RCC pour `coaching_templates`. */
export function coachingBlocksToRccCode(blocks: CoachingSessionBlock[]): string {
  const sessionBlocks = normalizeBlocksForStorage(coachingBlocksToSessionBlocks(blocks));
  const parsed = sessionBlocksToParsedBlocks(sessionBlocks);
  return serializeParsedBlocksToRcc(parsed);
}

export function sessionBlocksToCoachingBlocks(blocks: SessionBlock[]): CoachingSessionBlock[] {
  return blocks.map((b, index) => {
    if (b.type === "interval") {
      const effortDuration = parseDurationSeconds(b.effortDuration);
      const effortDistance = parseDistanceMeters(b.effortDistance);
      const recoveryDuration = parseDurationSeconds(b.recoveryDuration);
      return {
        id: b.id || `${Date.now()}-${index}`,
        order: index + 1,
        type: "interval",
        durationSec: b.effortType === "distance" ? undefined : effortDuration ?? undefined,
        distanceM: effortDistance ?? undefined,
        paceSecPerKm: parsePaceToSecondsPerKm(b.effortPace) ?? undefined,
        repetitions: b.repetitions,
        blockRepetitions: b.blockRepetitions,
        recoveryDurationSec: recoveryDuration ?? undefined,
        intensityMode: "zones",
        zone: blockIntensityToZone(b.effortIntensity),
      };
    }
    const mapType = (): CoachingSessionBlock["type"] => {
      if (b.type === "warmup") return "warmup";
      if (b.type === "cooldown") return "cooldown";
      return "steady";
    };
    const durationSec = parseDurationSeconds(b.duration);
    const distanceM = parseDistanceMeters(b.distance);
    return {
      id: b.id || `${Date.now()}-${index}`,
      order: index + 1,
      type: mapType(),
      durationSec: durationSec ?? undefined,
      distanceM: distanceM ?? undefined,
      paceSecPerKm: parsePaceToSecondsPerKm(b.pace) ?? undefined,
      intensityMode: "zones",
      zone: blockIntensityToZone(b.intensity),
    };
  });
}
