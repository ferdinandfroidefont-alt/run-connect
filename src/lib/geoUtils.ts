export type MapCoord = { lat: number; lng: number };

/** Distance géodésique approximative en mètres (Haversine). */
export function distanceMeters(a: MapCoord, b: MapCoord): number {
  const R = 6371000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pathLengthMeters(points: MapCoord[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += distanceMeters(points[i - 1]!, points[i]!);
  }
  return d;
}

/** Cap géodésique initial (0–360°), de `from` vers `to`. */
export function bearingDegrees(from: MapCoord, to: MapCoord): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Point à `distanceM` mètres du `origin` suivant le cap `bearingDeg` (0 = nord). */
export function destinationPointMeters(origin: MapCoord, bearingDeg: number, distanceM: number): MapCoord {
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lon1 = (origin.lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) + Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI };
}

/** Interpolation géodésique entre `a` et `b`, `t` ∈ [0,1]. */
export function interpolateGreatCircle(a: MapCoord, b: MapCoord, t: number): MapCoord {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const d = distanceMeters(a, b);
  if (d < 1e-6) return a;
  const brg = bearingDegrees(a, b);
  return destinationPointMeters(a, brg, d * t);
}

/** Densifie une polyligne (échantillons réguliers ≤ `maxSegmentM` m par segment). */
export function densifyMapCoords(points: MapCoord[], maxSegmentM = 45): MapCoord[] {
  if (points.length < 2) return [...points];
  const out: MapCoord[] = [points[0]!];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dist = distanceMeters(a, b);
    const steps = Math.max(1, Math.ceil(dist / maxSegmentM));
    for (let k = 1; k <= steps; k++) {
      out.push(interpolateGreatCircle(a, b, k / steps));
    }
  }
  return out;
}

/** Rééchantillonne le chemin à `sampleCount` points espacés en distance le long du tracé. */
export function resamplePathEvenlyMapCoords(points: MapCoord[], sampleCount: number): MapCoord[] {
  if (points.length < 2 || sampleCount < 2) {
    return points.map((p) => ({ ...p }));
  }
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distanceMeters(points[i]!, points[i + 1]!);
    cumulative.push(total);
  }
  if (total < 1e-6) return points.map((p) => ({ ...p }));
  const out: MapCoord[] = [];
  for (let s = 0; s < sampleCount; s++) {
    const distAlong = (total * s) / (sampleCount - 1);
    let j = 0;
    while (j < cumulative.length - 1 && cumulative[j + 1]! < distAlong) j++;
    const segStart = points[j]!;
    const segEnd = points[j + 1]!;
    const c0 = cumulative[j]!;
    const c1 = cumulative[j + 1]!;
    const segLen = c1 - c0;
    const t = segLen < 1e-6 ? 0 : (distAlong - c0) / segLen;
    out.push(interpolateGreatCircle(segStart, segEnd, Math.min(1, Math.max(0, t))));
  }
  return out;
}
