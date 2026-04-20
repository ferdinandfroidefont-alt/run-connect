import type { ParsedBlock } from "@/lib/rccParser";

/** @deprecated Ancien modèle 3 phases — conservé pour migration JSON. */
export type SessionRpePhases = {
  warmup: number;
  main: number;
  cooldown: number;
};

/** RPE 0–10 par bloc de séance (aligné sur l’ordre des blocs RCC parsés). */
export type BlockRpeList = number[];

export const RPE_JSON_VERSION = 2;

export const DEFAULT_SESSION_RPE_PHASES: SessionRpePhases = { warmup: 4, main: 6, cooldown: 3 };

/** Valeur par défaut pour un nouveau bloc (échelle 0–10). */
export const DEFAULT_BLOCK_RPE_VALUE = 5;

function clampStep(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return DEFAULT_BLOCK_RPE_VALUE;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function normalizeBlockRpeLength(prev: number[] | undefined, n: number): BlockRpeList {
  if (n <= 0) return [];
  const base = [...(prev || [])];
  while (base.length < n) base.push(DEFAULT_BLOCK_RPE_VALUE);
  if (base.length > n) return base.slice(0, n);
  return base.map(clampStep);
}

/** Migration brouillons / templates qui stockent encore `rpePhases` (warmup/main/cooldown). */
export function migrateLegacyPhasesToBlockRpe(phases: SessionRpePhases, blockCount: number): BlockRpeList {
  return normalizeBlockRpeLength(legacyPhasesToBlocks(phases, blockCount), blockCount);
}

function legacyPhasesToBlocks(p: SessionRpePhases, n: number): BlockRpeList {
  const w = p.warmup,
    m = p.main,
    c = p.cooldown;
  if (n <= 0) return [];
  if (n === 1) return [m];
  if (n === 2) return [w, c];
  return Array.from({ length: n }, (_, i) => (i === 0 ? w : i === n - 1 ? c : m));
}

export function parseSessionRpePhases(raw: unknown): Partial<SessionRpePhases> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if ("v" in o && o.v === RPE_JSON_VERSION) return null;
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

/**
 * Lit `rpe_phases` (JSON) + longueur des blocs RCC.
 * Gère : `{ v:2, blocks:number[] }`, ancien `{ warmup, main, cooldown }`, tableaux numériques.
 */
export function parseBlockRpeFromStorage(raw: unknown, blockCount: number): BlockRpeList {
  const n = Math.max(0, blockCount);
  if (n === 0) return [];

  if (Array.isArray(raw) && raw.every((x) => typeof x === "number")) {
    return normalizeBlockRpeLength(raw.map(clampStep), n);
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.v === RPE_JSON_VERSION && Array.isArray(o.blocks)) {
      return normalizeBlockRpeLength((o.blocks as unknown[]).map((x) => clampStep(Number(x))), n);
    }
    const partial = parseSessionRpePhases(raw);
    if (partial && (partial.warmup != null || partial.main != null || partial.cooldown != null)) {
      const full = normalizeSessionRpePhases(partial);
      return normalizeBlockRpeLength(legacyPhasesToBlocks(full, n), n);
    }
  }

  return normalizeBlockRpeLength([], n);
}

/** Hydratation éditeur / affichage : JSON + fallback `rpe` global. */
export function blockRpeFromCoachingRow(
  cs: { rpe?: number | null; rpe_phases?: unknown },
  blockCount: number,
): BlockRpeList {
  const n = Math.max(0, blockCount);
  if (n === 0) return [];
  let fromStorage = parseBlockRpeFromStorage(cs.rpe_phases, n);
  const hadV2 =
    cs.rpe_phases &&
    typeof cs.rpe_phases === "object" &&
    !Array.isArray(cs.rpe_phases) &&
    (cs.rpe_phases as Record<string, unknown>).v === RPE_JSON_VERSION;
  const hadLegacyPhases = parseSessionRpePhases(cs.rpe_phases) != null;
  if (!hadV2 && !hadLegacyPhases && cs.rpe_phases == null && typeof cs.rpe === "number" && cs.rpe >= 1 && cs.rpe <= 10) {
    fromStorage = Array.from({ length: n }, () => Math.round(cs.rpe!));
  }
  return normalizeBlockRpeLength(fromStorage, n);
}

export function blockRpeToJson(blocks: number[]): Record<string, unknown> {
  return { v: RPE_JSON_VERSION, blocks: normalizeBlockRpeLength(blocks, blocks.length) };
}

export function averageFromBlockRpe(blocks: number[]): number {
  if (!blocks.length) return DEFAULT_BLOCK_RPE_VALUE;
  return Math.round(blocks.reduce((a, b) => a + b, 0) / blocks.length);
}

/** @deprecated Utiliser blockRpeFromCoachingRow */
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

/** @deprecated Utiliser blockRpeToJson */
export function rpePhasesToJson(p: SessionRpePhases): Record<string, number> {
  return { warmup: p.warmup, main: p.main, cooldown: p.cooldown };
}

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
 * Colonne coaching_sessions.rpe : moyenne des RPE par bloc (0–10 arrondi), bornée 1–10 pour rétrocompat stats.
 */
export function resolveSessionRpeForInsert(
  sessionRpe: number | undefined | null,
  blocksBeforeStrip: unknown,
  blockRpe?: number[] | null,
): number | null {
  if (blockRpe && blockRpe.length > 0) {
    const avg = blockRpe.reduce((a, b) => a + b, 0) / blockRpe.length;
    const rounded = Math.round(avg);
    return Math.max(1, Math.min(10, rounded));
  }
  if (typeof sessionRpe === "number" && sessionRpe >= 1 && sessionRpe <= 10) {
    return Math.round(sessionRpe);
  }
  return aggregateRpeFromSessionBlocks(blocksBeforeStrip);
}

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

export type AthleteRpeFelt = Partial<SessionRpePhases>;

/** @deprecated — préférer parseBlockRpeFromStorage pour le ressenti par bloc */
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

export function parseAthleteBlockRpeFelt(raw: unknown, blockCount: number): BlockRpeList {
  return parseBlockRpeFromStorage(raw, blockCount);
}

export function athleteBlockRpeFeltToJson(blocks: number[]): Record<string, unknown> {
  return blockRpeToJson(blocks);
}

/** @deprecated Utiliser athleteBlockRpeFeltToJson */
export function athleteRpeFeltToJson(felt: SessionRpePhases): Record<string, number> {
  return { warmup: felt.warmup, main: felt.main, cooldown: felt.cooldown };
}
