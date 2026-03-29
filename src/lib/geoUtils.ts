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
