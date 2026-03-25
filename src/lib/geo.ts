import type { DistanceUnit } from '@/lib/distanceUnits';
import { formatDistanceMeters } from '@/lib/distanceUnits';

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

/** @param unit défaut km si appel depuis code sans contexte (ex. scripts). */
export function formatDistanceLabel(meters: number, unit: DistanceUnit = 'km'): string {
  return formatDistanceMeters(meters, unit);
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
