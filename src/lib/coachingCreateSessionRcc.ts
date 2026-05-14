/** Segmentation RCC alignée sur `parseRCC` (virgule ou +). */
export function splitRccSegments(code: string): string[] {
  const normalized = normalizeApostrophes(code);
  return normalized
    .split(/[,+]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinRccSegments(segments: string[]): string {
  return segments.join(", ");
}

export function replaceRccSegment(code: string, index: number, newSegment: string): string {
  const parts = splitRccSegments(code);
  if (index < 0 || index >= parts.length) return code;
  parts[index] = newSegment.trim();
  return joinRccSegments(parts);
}

export function removeRccSegment(code: string, index: number): string {
  const parts = splitRccSegments(code);
  parts.splice(index, 1);
  return joinRccSegments(parts);
}

export type PaletteBlockType = "continu" | "intervalle" | "pyramide" | "variation";

export function inferPaletteFromSegment(raw: string): PaletteBlockType {
  const t = raw.trim().toLowerCase();
  if (/^\d+x\d+/.test(t)) return "intervalle";
  if (/\bde\b/.test(t) && /\bà\b/.test(t)) return "variation";
  if (t.includes(",")) return "pyramide";
  return "continu";
}

export function paceColonToRccApostrophe(paceColon: string): string {
  const [mm = "5", ss = "00"] = paceColon.split(":").map((x) => x.trim());
  const n = Number.parseInt(mm, 10) || 0;
  const sec = Number.parseInt(ss, 10) || 0;
  return `${n}'${String(sec).padStart(2, "0")}`;
}

export function rebuildSteadyLikeSegment(durationMin: number, paceColon: string): string {
  const pace = paceColonToRccApostrophe(paceColon);
  return `${durationMin}'>${pace}`;
}

/** Bloc « durée seule » (`20'`) */
export function rebuildDurationOnlyMinutes(minutes: number): string {
  return `${Math.max(1, Math.round(minutes))}'`;
}

export function rebuildIntervalDistanceSegment(
  repetitions: number,
  distanceM: number,
  paceColon: string,
  recoverySec?: number,
  recoveryType: "trot" | "marche" | "statique" = "trot"
): string {
  const pace = paceColonToRccApostrophe(paceColon);
  let s = `${Math.max(1, repetitions)}x${Math.max(1, distanceM)}>${pace}`;
  if (recoverySec != null && recoverySec > 0) {
    const m = Math.floor(recoverySec / 60);
    const sec = recoverySec % 60;
    s += ` r${m}'${String(sec).padStart(2, "0")}>${recoveryType}`;
  }
  return s;
}

export function rebuildIntervalTimeSegment(
  repetitions: number,
  durationMinPerRep: number,
  paceColon: string,
  recoverySec?: number,
  recoveryType: "trot" | "marche" | "statique" = "trot"
): string {
  const pace = paceColonToRccApostrophe(paceColon);
  let s = `${Math.max(1, repetitions)}x${Math.max(1, durationMinPerRep)}'>${pace}`;
  if (recoverySec != null && recoverySec > 0) {
    const m = Math.floor(recoverySec / 60);
    const sec = recoverySec % 60;
    s += ` r${m}'${String(sec).padStart(2, "0")}>${recoveryType}`;
  }
  return s;
}

function normalizeApostrophes(text: string): string {
  return text.replace(/[\u2018\u2019\u2032\u0027\u02B9\u02BC\u02BB\u02BD\u02BE\u055A\u07F4\u07F5\uFF07\u0060\u00B4\u201A\u201B\u2035\u2039\u203A]/g, "'");
}
