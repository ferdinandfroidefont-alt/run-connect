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

  // Try interval format: "3x1000>3'00"
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

export function parseRCC(code: string): RCCResult {
  if (!code.trim()) return { blocks: [], errors: [] };

  // Split by comma or plus
  const rawBlocks = code.split(/[,+]/).map(s => s.trim()).filter(Boolean);
  const blocks: ParsedBlock[] = [];
  const errors: RCCError[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const { block, error } = parseSingleBlock(rawBlocks[i], i, rawBlocks.length);
    if (block) blocks.push(block);
    if (error) errors.push(error);
  }

  return { blocks, errors };
}

// Convert ParsedBlock[] to the SessionBlock format used in the DB
export function rccToSessionBlocks(blocks: ParsedBlock[]): any[] {
  return blocks.map(b => {
    if (b.type === 'interval') {
      return {
        type: 'interval',
        repetitions: b.repetitions,
        effortDuration: b.distance ? `${b.distance}m` : undefined,
        effortPace: b.pace,
        recoveryDuration: b.recoveryDuration ? `${b.recoveryDuration}s` : undefined,
        recoveryType: b.recoveryType || 'trot',
      };
    }
    return {
      type: b.type,
      duration: b.duration ? `${b.duration}` : undefined,
      pace: b.pace,
    };
  });
}
