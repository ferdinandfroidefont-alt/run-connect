import {
  bearingDegrees,
  densifyMapCoords,
  destinationPointMeters,
  distanceMeters,
  resamplePathEvenlyMapCoords,
  type MapCoord,
} from '@/lib/geoUtils';

export type FlyoverPerformanceTier = 'high' | 'balanced' | 'battery';

export type FlyoverRouteStats = {
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
} | null;

export type FlyoverFrame = {
  currentPosition: MapCoord;
  focusCenter: MapCoord;
  bearing: number;
  pitch: number;
  zoom: number;
  turnStrength: number;
  turnDirection: -1 | 1;
  segmentIndex: number;
  segmentT: number;
  currentElevation: number;
  currentSlope: number;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function normalizeAngleDiff(diff: number): number {
  let output = diff;
  while (output > 180) output -= 360;
  while (output < -180) output += 360;
  return output;
}

export function lineStringFeature(points: MapCoord[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((point) => [point.lng, point.lat]),
    },
  };
}

export function pointFeature(point: MapCoord): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [point.lng, point.lat],
    },
  };
}

export function multiPointFeature(points: MapCoord[]): GeoJSON.Feature<GeoJSON.MultiPoint> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPoint',
      coordinates: points.map((point) => [point.lng, point.lat]),
    },
  };
}

export function prepareFlyoverPath(points: MapCoord[], maxPoints: number): MapCoord[] {
  if (points.length < 2) return [...points];
  const dense = densifyMapCoords(points, 28);
  if (dense.length <= maxPoints) return dense;
  return resamplePathEvenlyMapCoords(dense, maxPoints);
}

export function remapSeriesToLength(values: number[], targetLength: number): number[] {
  if (targetLength <= 0) return [];
  if (values.length === 0) return Array.from({ length: targetLength }, () => 0);
  if (values.length === targetLength) return values;
  if (values.length === 1) return Array.from({ length: targetLength }, () => values[0] ?? 0);

  const lastSourceIndex = values.length - 1;
  const lastTargetIndex = targetLength - 1;
  const output = new Array<number>(targetLength);

  for (let index = 0; index < targetLength; index += 1) {
    const sourcePosition = (index / lastTargetIndex) * lastSourceIndex;
    const start = Math.floor(sourcePosition);
    const end = Math.min(lastSourceIndex, start + 1);
    const t = sourcePosition - start;
    output[index] = lerp(values[start] ?? 0, values[end] ?? values[start] ?? 0, t);
  }

  return output;
}

export function computeCumulativeDistances(points: MapCoord[]): number[] {
  const output = [0];
  for (let index = 1; index < points.length; index += 1) {
    output.push(output[index - 1]! + distanceMeters(points[index - 1]!, points[index]!));
  }
  return output;
}

export function positionAlongRouteAtDistance(
  points: MapCoord[],
  cumulativeDistances: number[],
  distanceM: number,
): { position: MapCoord; segmentIndex: number; segmentT: number } {
  if (points.length < 2) {
    const fallback = points[0] ?? { lat: 0, lng: 0 };
    return { position: fallback, segmentIndex: 0, segmentT: 0 };
  }

  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  const clampedDistance = clamp(distanceM, 0, totalDistance);

  if (clampedDistance <= 0) {
    return { position: points[0]!, segmentIndex: 0, segmentT: 0 };
  }

  if (clampedDistance >= totalDistance) {
    return {
      position: points[points.length - 1]!,
      segmentIndex: Math.max(0, points.length - 2),
      segmentT: 1,
    };
  }

  let segmentIndex = 0;
  while (segmentIndex < points.length - 1 && (cumulativeDistances[segmentIndex + 1] ?? 0) < clampedDistance) {
    segmentIndex += 1;
  }

  const segmentStartDistance = cumulativeDistances[segmentIndex] ?? 0;
  const segmentEndDistance = cumulativeDistances[segmentIndex + 1] ?? segmentStartDistance;
  const segmentT =
    segmentEndDistance > segmentStartDistance
      ? (clampedDistance - segmentStartDistance) / (segmentEndDistance - segmentStartDistance)
      : 0;

  const start = points[segmentIndex]!;
  const end = points[segmentIndex + 1]!;

  return {
    position: {
      lat: lerp(start.lat, end.lat, segmentT),
      lng: lerp(start.lng, end.lng, segmentT),
    },
    segmentIndex,
    segmentT,
  };
}

export function interpolateSeriesValue(values: number[], segmentIndex: number, segmentT: number): number {
  const start = values[segmentIndex] ?? values[values.length - 1] ?? 0;
  const end = values[Math.min(values.length - 1, segmentIndex + 1)] ?? start;
  return lerp(start, end, segmentT);
}

export function computeSlopeSeries(points: MapCoord[], elevations: number[]): number[] {
  if (points.length === 0) return [];
  const slopes: number[] = [0];

  for (let index = 1; index < points.length; index += 1) {
    const elevationDiff = (elevations[index] ?? elevations[index - 1] ?? 0) - (elevations[index - 1] ?? 0);
    const distance = distanceMeters(points[index - 1]!, points[index]!);
    slopes.push(distance > 1 ? (elevationDiff / distance) * 100 : 0);
  }

  return slopes;
}

export function computeRouteStats(
  elevations: number[],
  totalDistance: number,
  fallbackStats: FlyoverRouteStats,
): NonNullable<FlyoverRouteStats> {
  if (fallbackStats && fallbackStats.totalDistance > 0) {
    return fallbackStats;
  }

  let elevationGain = 0;
  let elevationLoss = 0;

  for (let index = 1; index < elevations.length; index += 1) {
    const diff = (elevations[index] ?? 0) - (elevations[index - 1] ?? 0);
    if (diff > 0) elevationGain += diff;
    else elevationLoss += Math.abs(diff);
  }

  return {
    totalDistance,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
  };
}

function lookAheadDistance(totalDistance: number): number {
  if (totalDistance <= 0) return 180;
  return clamp(totalDistance * 0.055, 180, 360);
}

function lookBehindDistance(totalDistance: number): number {
  if (totalDistance <= 0) return 40;
  return clamp(totalDistance * 0.016, 40, 85);
}

function basePitchForTier(performanceTier: FlyoverPerformanceTier): number {
  if (performanceTier === 'battery') return 65;
  if (performanceTier === 'balanced') return 69;
  return 72;
}

function baseZoomForDistance(totalDistance: number): number {
  if (totalDistance > 30000) return 14.2;
  if (totalDistance > 18000) return 14.55;
  if (totalDistance > 10000) return 14.9;
  if (totalDistance > 5000) return 15.25;
  return 15.65;
}

export function computeFlyoverFrame(args: {
  coordinates: MapCoord[];
  cumulativeDistances: number[];
  elevations: number[];
  slopes: number[];
  distanceM: number;
  performanceTier: FlyoverPerformanceTier;
}): FlyoverFrame {
  const { coordinates, cumulativeDistances, elevations, slopes, distanceM, performanceTier } = args;
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  const current = positionAlongRouteAtDistance(coordinates, cumulativeDistances, distanceM);
  const lookAhead = lookAheadDistance(totalDistance);
  const lookBehind = lookBehindDistance(totalDistance);

  const lookTarget = positionAlongRouteAtDistance(
    coordinates,
    cumulativeDistances,
    Math.min(totalDistance, distanceM + lookAhead),
  ).position;
  const previousTarget = positionAlongRouteAtDistance(
    coordinates,
    cumulativeDistances,
    Math.max(0, distanceM - lookBehind),
  ).position;

  const currentBearing = bearingDegrees(previousTarget, lookTarget);
  const nearBearing = bearingDegrees(current.position, lookTarget);
  const previousBearing = bearingDegrees(previousTarget, current.position);
  const turnDelta = normalizeAngleDiff(nearBearing - previousBearing);
  const turnStrength = clamp(Math.abs(turnDelta) / 44, 0, 1);
  const turnDirection: -1 | 1 = turnDelta < 0 ? -1 : 1;

  const focusAhead = positionAlongRouteAtDistance(
    coordinates,
    cumulativeDistances,
    Math.min(totalDistance, distanceM + lookAhead * 0.44),
  ).position;

  let focusCenter = {
    lat: current.position.lat * 0.34 + focusAhead.lat * 0.66,
    lng: current.position.lng * 0.34 + focusAhead.lng * 0.66,
  };

  const sideShiftMeters = 14 + 28 * turnStrength;
  focusCenter = destinationPointMeters(focusCenter, currentBearing + 90, sideShiftMeters * turnDirection);

  const currentSlope = interpolateSeriesValue(slopes, current.segmentIndex, current.segmentT);
  const currentElevation = interpolateSeriesValue(elevations, current.segmentIndex, current.segmentT);

  const pitch = clamp(
    basePitchForTier(performanceTier) - turnStrength * 5 + clamp(-currentSlope * 0.14, -2, 2),
    62,
    74,
  );
  const zoom = clamp(baseZoomForDistance(totalDistance) - turnStrength * 0.32, 14, 16.2);

  return {
    currentPosition: current.position,
    focusCenter,
    bearing: currentBearing,
    pitch,
    zoom,
    turnStrength,
    turnDirection,
    segmentIndex: current.segmentIndex,
    segmentT: current.segmentT,
    currentElevation,
    currentSlope,
  };
}
