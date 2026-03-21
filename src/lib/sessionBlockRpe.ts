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

export function rpeChipColor(rpe: number): string {
  if (rpe <= 3) return "hsl(142, 71%, 45%)";
  if (rpe <= 6) return "hsl(45, 93%, 47%)";
  if (rpe <= 8) return "hsl(25, 95%, 53%)";
  return "hsl(0, 84%, 60%)";
}
