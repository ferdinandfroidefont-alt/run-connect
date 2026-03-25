/** Stockage côté client (aligné sur les autres préférences Paramètres). */
export const DISTANCE_UNIT_STORAGE_KEY = 'runconnect-distance-unit';

export type DistanceUnit = 'km' | 'mi';

export const KM_PER_MILE = 1.609344;

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function milesToKm(mi: number): number {
  return mi * KM_PER_MILE;
}

export function readDistanceUnitFromStorage(): DistanceUnit {
  try {
    return localStorage.getItem(DISTANCE_UNIT_STORAGE_KEY) === 'mi' ? 'mi' : 'km';
  } catch {
    return 'km';
  }
}

/** Sous le kilomètre : toujours en mètres (usages courts identiques). */
export function formatDistanceMeters(
  meters: number | null | undefined,
  unit: DistanceUnit
): string {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) {
    return `${Math.round(meters)}\u00a0m`;
  }
  return formatDistanceKm(meters / 1000, unit);
}

/**
 * @param km distance en kilomètres (données API / BDD)
 */
export function formatDistanceKm(km: number | null | undefined, unit: DistanceUnit): string {
  if (km == null || !Number.isFinite(km)) return '—';
  if (unit === 'mi') {
    const mi = kmToMiles(km);
    const decimals = mi < 10 ? 1 : 0;
    return `${mi.toFixed(decimals)}\u00a0mi`;
  }
  const decimals = km < 10 ? 1 : 0;
  return `${km.toFixed(decimals)}\u00a0km`;
}

export function distanceUnitSuffix(unit: DistanceUnit): string {
  return unit === 'mi' ? 'mi' : 'km';
}

/** Affichage champ filtre : la valeur stockée reste en km. */
export function filterKmToDisplayValue(km: number, unit: DistanceUnit): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (unit === 'mi') {
    const mi = kmToMiles(km);
    return mi % 1 === 0 ? String(Math.round(mi)) : mi.toFixed(1);
  }
  return String(Math.round(km));
}

export function parseFilterDisplayToKm(raw: string, unit: DistanceUnit): number {
  const v = parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(v) || v < 0) return 0;
  const km = unit === 'mi' ? milesToKm(v) : v;
  return Math.round(km * 1000) / 1000;
}

/** Vitesse affichée : km/h ou mph selon l’unité de distance. */
export function formatSpeedKmh(kmh: number | null | undefined, unit: DistanceUnit): string {
  if (kmh == null || !Number.isFinite(kmh)) return '—';
  if (unit === 'mi') {
    const mph = kmh / KM_PER_MILE;
    const decimals = mph < 10 ? 1 : 0;
    return `${mph.toFixed(decimals)}\u00a0mph`;
  }
  const decimals = kmh < 10 ? 1 : 0;
  return `${kmh.toFixed(decimals)}\u00a0km/h`;
}
