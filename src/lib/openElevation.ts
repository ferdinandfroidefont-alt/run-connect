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
/** Requêtes Open-Meteo en parallèle par vague (évite ~250 ms × N lots = plusieurs secondes d’attente). */
const OPEN_METEO_WAVE_CONCURRENCY = 6;
const OPEN_METEO_CHUNK_RETRIES = 3;
const OPEN_METEO_CHUNK_TIMEOUT_MS = 45_000;
const OPEN_ELEVATION_CHUNK_TIMEOUT_MS = 35_000;

function withTimeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  const t = window.setTimeout(() => c.abort(), ms);
  c.signal.addEventListener("abort", () => window.clearTimeout(t));
  return c.signal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

/** Moyenne mobile (réduit créneaux sans trop lisser les bosses). */
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

async function fetchOpenMeteoChunk(chunk: MapCoord[]): Promise<number[] | null> {
  const lat = chunk.map((p) => p.lat.toFixed(5)).join(",");
  const lng = chunk.map((p) => p.lng.toFixed(5)).join(",");
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;

  for (let attempt = 0; attempt < OPEN_METEO_CHUNK_RETRIES; attempt++) {
    const signal = withTimeoutSignal(OPEN_METEO_CHUNK_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal });
      let data: { elevation?: number[]; error?: boolean };
      try {
        data = (await res.json()) as { elevation?: number[]; error?: boolean };
      } catch {
        await sleep(400 * (attempt + 1));
        continue;
      }
      if (!res.ok || data.error === true) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      const list = data.elevation;
      if (!Array.isArray(list) || list.length !== chunk.length) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      if (list.some((z) => typeof z !== "number" || !Number.isFinite(z))) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      return list as number[];
    } catch {
      await sleep(400 * (attempt + 1));
    }
  }
  return null;
}

/** Fallback : Open-Elevation (un seul chunk). */
async function fetchOpenElevationChunk(chunk: MapCoord[]): Promise<number[] | null> {
  if (chunk.length === 0) return [];
  const signal = withTimeoutSignal(OPEN_ELEVATION_CHUNK_TIMEOUT_MS);
  try {
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
    return list;
  } catch {
    return null;
  }
}

/**
 * Fetch elevations with per-chunk resilience:
 * 1. Try Open-Meteo for each chunk
 * 2. If a chunk fails, fallback to Open-Elevation for that chunk only
 * 3. If both fail for a chunk, interpolate from surrounding good data
 */
export async function fetchElevationsForCoords(sampled: MapCoord[]): Promise<number[]> {
  if (sampled.length === 0) return [];

  const results = new Array<number | null>(sampled.length).fill(null);
  const failedChunkRanges: Array<[number, number]> = [];

  // Pass 1: Open-Meteo (primary) — lots en parallèle par vagues au lieu d’un délai fixe entre chaque lot
  const chunkStarts: number[] = [];
  for (let i = 0; i < sampled.length; i += OPEN_METEO_BATCH) {
    chunkStarts.push(i);
  }
  const waveSize = Math.min(OPEN_METEO_WAVE_CONCURRENCY, Math.max(1, chunkStarts.length));
  for (let w = 0; w < chunkStarts.length; w += waveSize) {
    const wave = chunkStarts.slice(w, w + waveSize);
    const settled = await Promise.all(
      wave.map(async (start) => {
        const end = Math.min(start + OPEN_METEO_BATCH, sampled.length);
        const chunk = sampled.slice(start, end);
        const elevs = await fetchOpenMeteoChunk(chunk);
        return { start, end, elevs } as const;
      }),
    );
    for (const { start, end, elevs } of settled) {
      if (elevs) {
        for (let j = 0; j < elevs.length; j++) results[start + j] = elevs[j]!;
      } else {
        failedChunkRanges.push([start, end]);
      }
    }
  }

  // Pass 2: Open-Elevation fallback for failed chunks
  for (const [start, end] of failedChunkRanges) {
    await sleep(150);
    const chunk = sampled.slice(start, end);

    const subBatch = OPEN_ELEVATION_BATCH;
    let allGood = true;
    for (let i = 0; i < chunk.length; i += subBatch) {
      const subChunk = chunk.slice(i, i + subBatch);
      const elevs = await fetchOpenElevationChunk(subChunk);
      if (elevs) {
        for (let j = 0; j < elevs.length; j++) results[start + i + j] = elevs[j]!;
      } else {
        allGood = false;
      }
    }
    if (!allGood) {
      console.warn(`[Elevation] Chunk ${start}-${end} failed both providers, will interpolate`);
    }
  }

  // Pass 3: Interpolate any remaining nulls from neighbors
  const filled = results.map((v) => v ?? NaN);
  for (let i = 0; i < filled.length; i++) {
    if (!Number.isNaN(filled[i]!)) continue;

    let leftIdx = i - 1;
    while (leftIdx >= 0 && Number.isNaN(filled[leftIdx]!)) leftIdx--;
    let rightIdx = i + 1;
    while (rightIdx < filled.length && Number.isNaN(filled[rightIdx]!)) rightIdx++;

    const leftVal = leftIdx >= 0 ? filled[leftIdx]! : NaN;
    const rightVal = rightIdx < filled.length ? filled[rightIdx]! : NaN;

    if (!Number.isNaN(leftVal) && !Number.isNaN(rightVal)) {
      const t = (i - leftIdx) / (rightIdx - leftIdx);
      filled[i] = leftVal + (rightVal - leftVal) * t;
    } else if (!Number.isNaN(leftVal)) {
      filled[i] = leftVal;
    } else if (!Number.isNaN(rightVal)) {
      filled[i] = rightVal;
    } else {
      filled[i] = 0;
    }
  }

  return filled;
}
