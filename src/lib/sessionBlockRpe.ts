import type { ParsedBlock } from "@/lib/rccParser";

/**
 * RPE agrégé pour la colonne coaching_sessions.rpe (rétrocompatibilité / stats).
 * Moyenne arrondie de tous les RPE de blocs (effort + récup fractionné si présent).
 */
export function aggregateRpeFromSessionBlocks(blocks: unknown): number | null {
  if (!Array.isArray(blocks)) return null;
  const values: number[] = [];
  for (const bl of blocks) {
    if (!bl || typeof bl !== "object") continue;
    const o = bl as Record<string, unknown>;
    if (typeof o.rpe === "number" && o.rpe >= 1 && o.rpe <= 10) values.push(o.rpe);
    if (o.type === "interval" && typeof o.recoveryRpe === "number" && o.recoveryRpe >= 1 && o.recoveryRpe <= 10) {
      values.push(o.recoveryRpe);
    }
  }
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Même logique que l’agrégat JSON, sur les blocs parsés (aperçu sans régénérer d’IDs). */
export function aggregateRpeFromParsedBlocks(blocks: ParsedBlock[]): number | null {
  if (!blocks?.length) return null;
  const values: number[] = [];
  for (const b of blocks) {
    if (typeof b.rpe === "number" && b.rpe >= 1 && b.rpe <= 10) values.push(b.rpe);
    if (b.type === "interval" && typeof b.recoveryRpe === "number" && b.recoveryRpe >= 1 && b.recoveryRpe <= 10) {
      values.push(b.recoveryRpe);
    }
  }
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Colonne coaching_sessions.rpe : priorité au RPE saisi pour toute la séance,
 * sinon moyenne des RPE encore présents sur les blocs (anciennes séances).
 */
export function resolveSessionRpeForInsert(sessionRpe: number | undefined | null, blocksBeforeStrip: unknown): number | null {
  if (typeof sessionRpe === "number" && sessionRpe >= 1 && sessionRpe <= 10) {
    return Math.round(sessionRpe);
  }
  return aggregateRpeFromSessionBlocks(blocksBeforeStrip);
}

/** Retire rpe / recoveryRpe des session_blocks avant persistance (RPE global uniquement). */
export function stripPerBlockRpeFromSessionBlocks(blocks: unknown): unknown {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((bl) => {
    if (!bl || typeof bl !== "object") return bl;
    const o = { ...(bl as Record<string, unknown>) };
    delete o.rpe;
    delete o.recoveryRpe;
    return o;
  });
}

export function rpeChipColor(rpe: number): string {
  if (rpe <= 3) return "hsl(142, 71%, 45%)";
  if (rpe <= 6) return "hsl(45, 93%, 47%)";
  if (rpe <= 8) return "hsl(25, 95%, 53%)";
  return "hsl(0, 84%, 60%)";
}
