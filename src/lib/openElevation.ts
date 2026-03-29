import type { MapCoord } from "@/lib/geoUtils";

/** Échantillonne au plus `max` points le long du trajet (indices réguliers). */
export function samplePathCoords(points: MapCoord[], max: number): MapCoord[] {
  if (points.length <= max) return [...points];
  const out: MapCoord[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    const idx = Math.round(i * step);
    out.push(points[Math.min(idx, points.length - 1)]!);
  }
  return out;
}

/**
 * Altitudes (m) via Open-Elevation (public, best-effort). Retourne tableau aligné sur `sampled`.
 */
export async function fetchElevationsForCoords(sampled: MapCoord[]): Promise<number[]> {
  if (sampled.length === 0) return [];
  try {
    const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: sampled.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { results?: { elevation: number }[] };
    const list = data.results?.map((r) => r.elevation) ?? [];
    if (list.length !== sampled.length) {
      return sampled.map(() => 0);
    }
    return list;
  } catch {
    return sampled.map(() => 0);
  }
}
