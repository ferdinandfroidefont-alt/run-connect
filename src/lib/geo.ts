/** Distance à vol d'oiseau entre deux points (mètres) */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function formatDistanceLabel(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

/** Fenêtre : du début prévu de la séance jusqu'à fin (scheduled + maxDuration minutes) */
export function isWithinSessionLiveWindow(
  scheduledAt: string,
  maxDurationMinutes: number,
  nowMs: number = Date.now()
): boolean {
  const start = new Date(scheduledAt).getTime();
  const end = start + maxDurationMinutes * 60 * 1000;
  return nowMs >= start && nowMs <= end;
}
