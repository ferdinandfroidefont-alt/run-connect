import type { ParsedBlock } from "@/lib/rccParser";

/** RPE 1–10 par phase (planification). */
export type SessionRpePhases = {
  warmup: number;
  main: number;
  cooldown: number;
};

export const DEFAULT_SESSION_RPE_PHASES: SessionRpePhases = { warmup: 4, main: 6, cooldown: 3 };

export function parseSessionRpePhases(raw: unknown): Partial<SessionRpePhases> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<SessionRpePhases> = {};
  for (const k of ["warmup", "main", "cooldown"] as const) {
    const v = o[k];
    if (typeof v === "number" && v >= 1 && v <= 10) out[k] = Math.round(v);
  }
  return Object.keys(out).length ? out : null;
}

export function normalizeSessionRpePhases(p: Partial<SessionRpePhases> | null | undefined): SessionRpePhases {
  const w = p?.warmup,
    m = p?.main,
    c = p?.cooldown;
  return {
    warmup: typeof w === "number" && w >= 1 && w <= 10 ? Math.round(w) : 5,
    main: typeof m === "number" && m >= 1 && m <= 10 ? Math.round(m) : 5,
    cooldown: typeof c === "number" && c >= 1 && c <= 10 ? Math.round(c) : 5,
  };
}

/** Hydratation UI : JSON DB ou ancien `rpe` unique (triplé). */
export function rpePhasesFromCoachingRow(cs: { rpe?: number | null; rpe_phases?: unknown }): SessionRpePhases {
  const partial = parseSessionRpePhases(cs.rpe_phases);
  if (partial && (partial.warmup != null || partial.main != null || partial.cooldown != null)) {
    return normalizeSessionRpePhases(partial);
  }
  const leg = typeof cs.rpe === "number" && cs.rpe >= 1 && cs.rpe <= 10 ? Math.round(cs.rpe) : null;
  const b = leg ?? 5;
  return { warmup: b, main: b, cooldown: b };
}

export function averageFromRpePhases(p: SessionRpePhases): number {
  return Math.round((p.warmup + p.main + p.cooldown) / 3);
}

export function rpePhasesToJson(p: SessionRpePhases): Record<string, number> {
  return { warmup: p.warmup, main: p.main, cooldown: p.cooldown };
}

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
 * Colonne coaching_sessions.rpe : priorité à la moyenne des 3 phases,
 * puis ancien RPE global, puis moyenne des blocs.
 */
export function resolveSessionRpeForInsert(
  sessionRpe: number | undefined | null,
  blocksBeforeStrip: unknown,
  rpePhases?: SessionRpePhases | null,
): number | null {
  if (rpePhases) {
    const n = normalizeSessionRpePhases(rpePhases);
    return averageFromRpePhases(n);
  }
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

/** RPE ressenti athlète (sous-ensemble des phases possibles). */
export type AthleteRpeFelt = Partial<SessionRpePhases>;

export function parseAthleteRpeFelt(raw: unknown): AthleteRpeFelt | null {
  const p = parseSessionRpePhases(raw);
  if (!p) return null;
  const out: AthleteRpeFelt = {};
  for (const k of ["warmup", "main", "cooldown"] as const) {
    const v = p[k];
    if (typeof v === "number" && v >= 1 && v <= 10) out[k] = Math.round(v);
  }
  return Object.keys(out).length ? out : null;
}

export function athleteRpeFeltToJson(felt: SessionRpePhases): Record<string, number> {
  return { warmup: felt.warmup, main: felt.main, cooldown: felt.cooldown };
}
