// RCC (RunConnect Code) Parser
// Format: "20'>5'15, 3x1000>3'00 r1'15>trot, 5'>6'00"

export interface ParsedBlock {
  type: 'warmup' | 'interval' | 'steady' | 'cooldown' | 'recovery';
  raw: string;
  duration?: number; // minutes
  pace?: string; // "5:15"
  distance?: number; // meters (for intervals)
  repetitions?: number;
  recoveryDuration?: number; // seconds
  recoveryType?: 'trot' | 'marche' | 'statique';
  /** RPE 1–10 pour ce segment (saisi par le coach, hors parsing RCC) */
  rpe?: number;
  /** RPE de la récup entre répétitions (blocs interval uniquement) */
  recoveryRpe?: number;
}

export interface RCCError {
  blockIndex: number;
  raw: string;
  message: string;
}

export interface RCCResult {
  blocks: ParsedBlock[];
  errors: RCCError[];
}

function parsePace(paceStr: string): string | null {
  // "5'15" -> "5:15", "3'00" -> "3:00", "6'00" -> "6:00"
  const match = paceStr.match(/^(\d+)'(\d{2})$/);
  if (match) return `${match[1]}:${match[2]}`;
  // Already in "5:15" format
  const match2 = paceStr.match(/^(\d+):(\d{2})$/);
  if (match2) return `${match2[1]}:${match2[2]}`;
  return null;
}

function paceToSeconds(pace: string): number {
  const [min, sec] = pace.split(':').map(Number);
  return min * 60 + (sec || 0);
}

function parseRecovery(recoveryStr: string): { duration: number; type: 'trot' | 'marche' | 'statique' } | null {
  // "r1'15>trot" or "r1'00>marche" or "r90>trot" or "r1'30"
  const match = recoveryStr.match(/^r(\d+)'?(\d{0,2})(?:>(trot|marche|statique))?$/i);
  if (!match) return null;
  
  const minutes = parseInt(match[1]);
  const seconds = match[2] ? parseInt(match[2]) : 0;
  const totalSeconds = match[2] && !recoveryStr.includes("'") 
    ? minutes // if no apostrophe, treat as seconds directly (e.g., r90)
    : minutes * 60 + seconds;
  
  const type = (match[3]?.toLowerCase() as 'trot' | 'marche' | 'statique') || 'trot';
  return { duration: totalSeconds, type };
}

function parseSingleBlock(raw: string, index: number, totalBlocks: number): { block: ParsedBlock | null; error: RCCError | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { block: null, error: null };

  // Split block from optional recovery: "3x1000>3'00 r1'15>trot"
  const parts = trimmed.split(/\s+/);
  const mainPart = parts[0];
  const recoveryPart = parts.find(p => /^r\d/i.test(p));

  let recovery: { duration: number; type: 'trot' | 'marche' | 'statique' } | null = null;
  if (recoveryPart) {
    recovery = parseRecovery(recoveryPart);
  }

  // Try interval by time: "6x3'>3'30" (6 reps of 3min at 3:30 pace)
  const intervalTimeMatch = mainPart.match(/^(\d+)x(\d+)'>(.+)$/);
  if (intervalTimeMatch) {
    const repetitions = parseInt(intervalTimeMatch[1]);
    const duration = parseInt(intervalTimeMatch[2]);
    const pace = parsePace(intervalTimeMatch[3]);
    if (!pace) {
      return { block: null, error: { blockIndex: index, raw: trimmed, message: `Allure invalide: "${intervalTimeMatch[3]}"` } };
    }
    return {
      block: {
        type: 'interval',
        raw: trimmed,
        duration,
        repetitions,
        pace,
        recoveryDuration: recovery?.duration,
        recoveryType: recovery?.type,
      },
      error: null,
    };
  }

  // Try interval by distance: "3x1000>3'00"
  const intervalMatch = mainPart.match(/^(\d+)x(\d+)>(.+)$/);
  if (intervalMatch) {
    const repetitions = parseInt(intervalMatch[1]);
    const distance = parseInt(intervalMatch[2]);
    const pace = parsePace(intervalMatch[3]);
    if (!pace) {
      return { block: null, error: { blockIndex: index, raw: trimmed, message: `Allure invalide: "${intervalMatch[3]}"` } };
    }
    return {
      block: {
        type: 'interval',
        raw: trimmed,
        distance,
        repetitions,
        pace,
        recoveryDuration: recovery?.duration,
        recoveryType: recovery?.type,
      },
      error: null,
    };
  }

  // Try duration format: "20'>5'15"
  const durationMatch = mainPart.match(/^(\d+)'>(.+)$/);
  if (durationMatch) {
    const duration = parseInt(durationMatch[1]);
    const pace = parsePace(durationMatch[2]);
    if (!pace) {
      return { block: null, error: { blockIndex: index, raw: trimmed, message: `Allure invalide: "${durationMatch[2]}"` } };
    }

    // Auto-detect type based on pace and position
    const paceSeconds = paceToSeconds(pace);
    let type: ParsedBlock['type'] = 'steady';
    if (index === 0 && paceSeconds >= 330) type = 'warmup'; // >= 5:30
    else if (index === totalBlocks - 1 && paceSeconds >= 330) type = 'cooldown';

    return {
      block: {
        type,
        raw: trimmed,
        duration,
        pace,
        recoveryDuration: recovery?.duration,
        recoveryType: recovery?.type,
      },
      error: null,
    };
  }

  // Try duration-only: "20'" (no pace)
  const durationOnly = mainPart.match(/^(\d+)'$/);
  if (durationOnly) {
    const duration = parseInt(durationOnly[1]);
    let type: ParsedBlock['type'] = 'steady';
    if (index === 0) type = 'warmup';
    else if (index === totalBlocks - 1) type = 'cooldown';
    return {
      block: { type, raw: trimmed, duration },
      error: null,
    };
  }

  return { block: null, error: { blockIndex: index, raw: trimmed, message: `Format non reconnu: "${trimmed}"` } };
}

// Normalize all unicode apostrophe variants to standard ASCII apostrophe
function normalizeApostrophes(text: string): string {
  return text.replace(/[\u2018\u2019\u2032\u0027\u02B9\u02BC\u02BB\u02BD\u02BE\u055A\u07F4\u07F5\uFF07\u0060\u00B4\u2018\u2019\u201A\u201B\u2035\u2039\u203A]/g, "'");
}

export function parseRCC(code: string | null | undefined | unknown): RCCResult {
  if (code == null) return { blocks: [], errors: [] };
  const str = typeof code === "string" ? code : String(code);
  if (!str.trim()) return { blocks: [], errors: [] };

  // Normalize apostrophes for mobile/PC compatibility
  const normalizedCode = normalizeApostrophes(str);

  // Split by comma or plus
  const rawBlocks = normalizedCode.split(/[,+]/).map(s => s.trim()).filter(Boolean);
  const blocks: ParsedBlock[] = [];
  const errors: RCCError[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const { block, error } = parseSingleBlock(rawBlocks[i], i, rawBlocks.length);
    if (block) blocks.push(block);
    if (error) errors.push(error);
  }

  return { blocks, errors };
}

/** Conserve les RPE par index quand le code RCC change (best-effort). */
export function mergeParsedBlocksByIndex(
  newBlocks: ParsedBlock[],
  previous: ParsedBlock[]
): ParsedBlock[] {
  return newBlocks.map((b, i) => ({
    ...b,
    rpe: previous[i]?.rpe,
    recoveryRpe: b.type === "interval" ? previous[i]?.recoveryRpe : undefined,
  }));
}

/** Restaure les RPE depuis session_blocks (DB) après parse RCC. */
export function mergeStoredSessionBlocksIntoParsed(
  blocks: ParsedBlock[],
  stored: unknown
): ParsedBlock[] {
  if (!Array.isArray(stored)) return blocks;
  return blocks.map((b, i) => {
    const row = stored[i] as Record<string, unknown> | undefined;
    return {
      ...b,
      rpe: typeof row?.rpe === "number" ? row.rpe : undefined,
      recoveryRpe:
        b.type === "interval" && typeof row?.recoveryRpe === "number" ? row.recoveryRpe : undefined,
    };
  });
}

/** Libellé lisible d’un bloc parsé (aperçu). */
export function formatParsedBlockSummary(block: ParsedBlock): string {
  if (block.type === "interval") {
    const effort =
      block.distance != null ? `${block.distance}m` : block.duration != null ? `${block.duration} min` : "?";
    const pace = block.pace ? ` @ ${block.pace}` : "";
    let rec = "";
    if (block.recoveryDuration != null) {
      const m = Math.floor(block.recoveryDuration / 60);
      const s = block.recoveryDuration % 60;
      rec =
        m > 0
          ? ` — récup ${m}'${String(s).padStart(2, "0")} ${block.recoveryType || "trot"}`
          : ` — récup ${block.recoveryDuration}s`;
    }
    return `${block.repetitions ?? "?"}×${effort}${pace}${rec}`;
  }
  if (block.duration != null) {
    const pace = block.pace ? ` — ${block.pace}` : "";
    return `${block.duration} min${pace}`;
  }
  return block.raw || "—";
}

// Compute summary stats from parsed blocks
export interface RCCSummary {
  totalDistanceKm: number;
  totalDurationMin: number;
  intensity: 'Facile' | 'Modérée' | 'Intense' | 'Très intense';
}

function paceToKmPerMin(pace: string): number {
  // pace "5:15" means 5min15s per km → speed = 1/5.25 km/min
  const [min, sec] = pace.split(':').map(Number);
  const totalMin = min + (sec || 0) / 60;
  return totalMin > 0 ? 1 / totalMin : 0;
}

export function computeRCCSummary(blocks: ParsedBlock[]): RCCSummary {
  let totalDistanceKm = 0;
  let totalDurationMin = 0;
  let fastestPaceSec = Infinity;
  let slowestPaceSec = 0;

  for (const b of blocks) {
    if (b.type === 'interval' && b.distance && b.repetitions) {
      // Distance from intervals
      const distKm = (b.distance * b.repetitions) / 1000;
      totalDistanceKm += distKm;

      // Duration: estimate from pace if available
      if (b.pace) {
        const paceSec = paceToSeconds(b.pace);
        const timePerRepMin = (b.distance / 1000) * (paceSec / 60);
        totalDurationMin += timePerRepMin * b.repetitions;
        fastestPaceSec = Math.min(fastestPaceSec, paceSec);
        slowestPaceSec = Math.max(slowestPaceSec, paceSec);
      }

      // Add recovery time
      if (b.recoveryDuration) {
        totalDurationMin += (b.recoveryDuration * (b.repetitions - 1)) / 60;
      }
    } else if (b.duration) {
      totalDurationMin += b.duration;
      if (b.pace) {
        const speed = paceToKmPerMin(b.pace);
        totalDistanceKm += speed * b.duration;
        const paceSec = paceToSeconds(b.pace);
        fastestPaceSec = Math.min(fastestPaceSec, paceSec);
        slowestPaceSec = Math.max(slowestPaceSec, paceSec);
      }
    }
  }

  // Intensity based on fastest pace
  let intensity: RCCSummary['intensity'] = 'Facile';
  if (fastestPaceSec < Infinity) {
    if (fastestPaceSec < 210) intensity = 'Très intense'; // < 3:30
    else if (fastestPaceSec < 270) intensity = 'Intense'; // < 4:30
    else if (fastestPaceSec < 330) intensity = 'Modérée'; // < 5:30
    else intensity = 'Facile';
  }

  return {
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalDurationMin: Math.round(totalDurationMin),
    intensity,
  };
}

function newBlockId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Convert ParsedBlock[] to the SessionBlock format used in the DB
export function rccToSessionBlocks(blocks: ParsedBlock[]): any[] {
  return blocks.map((b) => {
    if (b.type === "interval") {
      const effortDuration = b.distance != null ? `${b.distance}m` : b.duration != null ? `${b.duration}` : undefined;
      const effortType = b.distance != null ? "distance" : "time";
      return {
        id: newBlockId(),
        type: "interval",
        repetitions: b.repetitions,
        effortDuration,
        effortType,
        effortPace: b.pace,
        recoveryDuration: b.recoveryDuration ? `${b.recoveryDuration}s` : undefined,
        recoveryType: b.recoveryType || "trot",
        rpe: typeof b.rpe === "number" ? b.rpe : undefined,
        recoveryRpe: typeof b.recoveryRpe === "number" ? b.recoveryRpe : undefined,
      };
    }
    return {
      id: newBlockId(),
      type: b.type,
      duration: b.duration ? `${b.duration}` : undefined,
      pace: b.pace,
      rpe: typeof b.rpe === "number" ? b.rpe : undefined,
    };
  });
}
