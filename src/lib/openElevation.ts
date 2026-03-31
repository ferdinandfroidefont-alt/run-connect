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

const OPEN_METEO_BATCH = 100;
const OPEN_ELEVATION_BATCH = 80;
const FETCH_TIMEOUT_MS = 22_000;

function withTimeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  const t = window.setTimeout(() => c.abort(), ms);
  c.signal.addEventListener("abort", () => window.clearTimeout(t));
  return c.signal;
}

/** Moyenne mobile légère (réduit « créneaux » sans trop lisser les bosses). */
export function smoothElevationSeries(values: number[], halfWindow: number): number[] {
  const n = values.length;
  if (n < 4 || halfWindow < 1) return [...values];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const k = i + j;
      if (k >= 0 && k < n) {
        s += values[k]!;
        c++;
      }
    }
    out.push(s / c);
  }
  return out;
}

/**
 * Altitudes via Open-Meteo (rapide, modèle SRTM/terrain, sans clé).
 * https://open-meteo.com/en/docs/elevation-api
 */
async function fetchOpenMeteoElevations(coords: MapCoord[]): Promise<number[] | null> {
  if (coords.length === 0) return [];
  const all: number[] = [];
  const signal = withTimeoutSignal(FETCH_TIMEOUT_MS);

  for (let i = 0; i < coords.length; i += OPEN_METEO_BATCH) {
    const chunk = coords.slice(i, i + OPEN_METEO_BATCH);
    const lat = chunk.map((p) => p.lat.toFixed(6)).join(",");
    const lng = chunk.map((p) => p.lng.toFixed(6)).join(",");
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { elevation?: number[] };
    const list = data.elevation;
    if (!Array.isArray(list) || list.length !== chunk.length) return null;
    for (const z of list) {
      if (typeof z !== "number" || !Number.isFinite(z)) return null;
      all.push(z);
    }
  }
  return all;
}

/** Fallback lent : Open-Elevation public (souvent saturé). */
async function fetchOpenElevationLookup(coords: MapCoord[]): Promise<number[] | null> {
  if (coords.length === 0) return [];
  const all: number[] = [];
  const signal = withTimeoutSignal(Math.min(FETCH_TIMEOUT_MS, 18_000));

  for (let i = 0; i < coords.length; i += OPEN_ELEVATION_BATCH) {
    const chunk = coords.slice(i, i + OPEN_ELEVATION_BATCH);
    const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        locations: chunk.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { elevation: number }[] };
    const list = data.results?.map((r) => r.elevation) ?? [];
    if (list.length !== chunk.length) return null;
    all.push(...list);
  }
  return all;
}

/**
 * Altitudes (m) alignées sur `sampled` — Open-Meteo en priorité, léger lissage.
 */
export async function fetchElevationsForCoords(sampled: MapCoord[]): Promise<number[]> {
  if (sampled.length === 0) return [];
  try {
    let raw = await fetchOpenMeteoElevations(sampled);
    if (raw == null) raw = await fetchOpenElevationLookup(sampled);
    if (raw == null || raw.length !== sampled.length) {
      return sampled.map(() => 0);
    }
    const smoothed =
      raw.length >= 16 ? smoothElevationSeries(raw, Math.min(2, Math.floor(raw.length / 200) + 1)) : raw;
    return smoothed;
  } catch {
    return sampled.map(() => 0);
  }
}
