/** Normalise les coordonnées JSON des itinéraires (lat/lng ou tuples) pour le survol 3D / cartes. */
export function routeJsonToPoints(coords: unknown): { lat: number; lng: number }[] {
  if (!Array.isArray(coords)) return [];
  return coords
    .map((c: unknown) => {
      if (c && typeof c === 'object' && 'lat' in c && 'lng' in c) {
        const o = c as { lat: unknown; lng: unknown };
        return { lat: Number(o.lat), lng: Number(o.lng) };
      }
      if (Array.isArray(c) && c.length >= 2) {
        return { lat: Number(c[0]), lng: Number(c[1]) };
      }
      return null;
    })
    .filter((p): p is { lat: number; lng: number } => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

export function routeJsonToElevations(coords: unknown): number[] {
  if (!Array.isArray(coords)) return [];
  return coords.map((c: unknown) => {
    if (c && typeof c === 'object' && 'elevation' in c) {
      return Number((c as { elevation?: unknown }).elevation ?? 0);
    }
    if (Array.isArray(c) && c.length > 2) return Number(c[2]);
    return 0;
  });
}
