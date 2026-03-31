import {
  distanceMeters,
  interpolateGreatCircle,
  pathLengthMeters,
  type MapCoord,
} from '@/lib/geoUtils';

/** Aligné sur le filtrage RouteCreation (réduit le bruit MNE). */
const ELEV_NOISE_M = 2;

export function buildCoordinatesWithElevation(
  pathCoords: MapCoord[],
  elevations: number[],
): Array<{ lat: number; lng: number; elevation: number }> {
  const nCoord = pathCoords.length;
  const elev = elevations;
  return pathCoords.map((coord, index) => {
    let el = 0;
    if (elev.length > 0 && nCoord > 0) {
      if (elev.length === nCoord) {
        el = elev[index] ?? 0;
      } else {
        const t = nCoord <= 1 ? 0 : index / (nCoord - 1);
        const ePos = t * (elev.length - 1);
        const a = Math.floor(ePos);
        const b = Math.min(elev.length - 1, a + 1);
        const f = ePos - a;
        el = (elev[a] ?? 0) * (1 - f) + (elev[b] ?? 0) * f;
      }
    }
    return { lat: coord.lat, lng: coord.lng, elevation: Math.round(el) };
  });
}

export function computeRouteStats(pathCoords: MapCoord[], elevations: number[]): {
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
} | null {
  if (pathCoords.length < 2) return null;
  const totalDistance = Math.round(pathLengthMeters(pathCoords));
  if (elevations.length < 2) {
    return {
      totalDistance,
      elevationGain: 0,
      elevationLoss: 0,
      minElevation: 0,
      maxElevation: 0,
    };
  }
  let elevationGain = 0;
  let elevationLoss = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i]! - elevations[i - 1]!;
    if (diff > ELEV_NOISE_M) elevationGain += diff;
    else if (diff < -ELEV_NOISE_M) elevationLoss += Math.abs(diff);
  }
  const minElevation = Math.round(Math.min(...elevations));
  const maxElevation = Math.round(Math.max(...elevations));
  return {
    totalDistance,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    minElevation,
    maxElevation,
  };
}

export function cumulativeDistanceAlongPath(coords: MapCoord[]): number[] {
  const acc: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    acc.push(acc[i - 1]! + distanceMeters(coords[i - 1]!, coords[i]!));
  }
  return acc;
}

/** Pente locale (segment précédent → point courant), en %. */
export function localGradePercent(
  coords: MapCoord[],
  elevations: number[],
  index: number,
): number {
  if (coords.length < 2 || elevations.length < 2) return 0;
  const i = Math.max(0, Math.min(index, coords.length - 1));
  if (i === 0) {
    const run = distanceMeters(coords[0]!, coords[1]!);
    if (run < 0.5) return 0;
    return ((elevations[1]! - elevations[0]!) / run) * 100;
  }
  const run = distanceMeters(coords[i - 1]!, coords[i]!);
  if (run < 0.5) return 0;
  return ((elevations[i]! - elevations[i - 1]!) / run) * 100;
}

export type PathSampleAtDistance = {
  lat: number;
  lng: number;
  elevM: number;
  gradePct: number;
  segmentIndex: number;
  distFromStartM: number;
};

/**
 * Position, altitude interpolée et pente du **segment actif** (entre deux échantillons proches),
 * à une distance donnée le long du tracé — pour curseur profil / carte alignée.
 */
export function sampleAlongPathAtDistance(
  coords: MapCoord[],
  elevations: number[],
  distCum: number[],
  distM: number,
): PathSampleAtDistance | null {
  const n = coords.length;
  if (n < 2 || elevations.length !== n || distCum.length !== n) return null;
  const total = distCum[n - 1] ?? 0;
  if (total < 1e-6) return null;
  const d = Math.max(0, Math.min(distM, total));

  let j = 0;
  while (j < n - 1 && distCum[j + 1]! < d) j++;

  const d0 = distCum[j]!;
  const d1 = distCum[j + 1]!;
  const span = d1 - d0;
  const t = span < 1e-6 ? 0 : (d - d0) / span;

  const j1 = Math.min(j + 1, n - 1);
  const pos = interpolateGreatCircle(coords[j]!, coords[j1]!, t);
  const elevM = elevations[j]! + (elevations[j1]! - elevations[j]!) * t;

  const run = distanceMeters(coords[j]!, coords[j1]!);
  let gradePct = 0;
  if (run >= 0.5) {
    gradePct = ((elevations[j1]! - elevations[j]!) / run) * 100;
  }

  return {
    lat: pos.lat,
    lng: pos.lng,
    elevM,
    gradePct,
    segmentIndex: j,
    distFromStartM: d,
  };
}
