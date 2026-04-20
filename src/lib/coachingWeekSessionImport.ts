import { mergeStoredSessionBlocksIntoParsed, parseRCC } from "@/lib/rccParser";
import { blockRpeFromCoachingRow } from "@/lib/sessionBlockRpe";
import type { WeekSession } from "@/components/coaching/WeeklyPlanSessionEditor";

/** Construit une entrée d’éditeur hebdo à partir d’une ligne coaching_sessions (reprogrammation, import). */
export function coachingRowToWeekSession(cs: {
  scheduled_at: string;
  activity_type?: string | null;
  objective?: string | null;
  title?: string | null;
  rcc_code?: string | null;
  session_blocks?: unknown;
  coach_notes?: string | null;
  default_location_name?: string | null;
  rpe?: number | null;
  rpe_phases?: unknown;
}): WeekSession {
  const scheduledDate = new Date(cs.scheduled_at);
  const dayOfWeek = scheduledDate.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const parsedBlocks = cs.rcc_code
    ? mergeStoredSessionBlocksIntoParsed(parseRCC(cs.rcc_code).blocks, cs.session_blocks)
    : [];
  return {
    dayIndex,
    activityType: cs.activity_type || "running",
    objective: cs.objective || cs.title || "",
    rccCode: cs.rcc_code || "",
    parsedBlocks,
    coachNotes: cs.coach_notes || "",
    locationName: cs.default_location_name || "",
    athleteOverrides: {},
    blockRpe: blockRpeFromCoachingRow(cs, parsedBlocks.length),
  };
}
