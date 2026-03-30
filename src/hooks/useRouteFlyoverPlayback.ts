import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapCoord } from '@/lib/geoUtils';
import {
  clamp,
  computeCumulativeDistances,
  computeFlyoverFrame,
  computeRouteStats,
  computeSlopeSeries,
  interpolateSeriesValue,
  positionAlongRouteAtDistance,
  prepareFlyoverPath,
  remapSeriesToLength,
  type FlyoverPerformanceTier,
  type FlyoverRouteStats,
} from '@/lib/routeFlyover';

type PlaybackSpeed = 1 | 2 | 3;

function detectPerformanceTier(): FlyoverPerformanceTier {
  if (typeof window === 'undefined') return 'balanced';
  const navigatorWithMemory = window.navigator as Navigator & { deviceMemory?: number };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return 'battery';

  const memory = navigatorWithMemory.deviceMemory ?? 4;
  const cores = navigatorWithMemory.hardwareConcurrency ?? 4;
  if (memory <= 3 || cores <= 4) return 'battery';
  if (memory <= 4 || cores <= 6) return 'balanced';
  return 'high';
}

export function useRouteFlyoverPlayback(args: {
  coordinates: MapCoord[];
  elevations: number[];
  routeStats?: FlyoverRouteStats;
  autoPlay?: boolean;
}) {
  const { coordinates, elevations, routeStats = null, autoPlay = false } = args;

  const [performanceTier] = useState<FlyoverPerformanceTier>(detectPerformanceTier);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const progressRef = useRef(progress);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  const animationFrameRef = useRef<number | null>(null);

  progressRef.current = progress;
  isPlayingRef.current = isPlaying;
  speedRef.current = speed;

  const maxPathPoints = useMemo(() => {
    if (performanceTier === 'battery') return 420;
    if (performanceTier === 'balanced') return 620;
    return 820;
  }, [performanceTier]);

  const flyoverCoordinates = useMemo(
    () => prepareFlyoverPath(coordinates, maxPathPoints),
    [coordinates, maxPathPoints],
  );

  const flyoverElevations = useMemo(
    () => remapSeriesToLength(elevations, flyoverCoordinates.length),
    [elevations, flyoverCoordinates.length],
  );

  const cumulativeDistances = useMemo(
    () => computeCumulativeDistances(flyoverCoordinates),
    [flyoverCoordinates],
  );

  const totalDistance = useMemo(
    () => routeStats?.totalDistance || cumulativeDistances[cumulativeDistances.length - 1] || 0,
    [cumulativeDistances, routeStats],
  );

  const slopes = useMemo(
    () => computeSlopeSeries(flyoverCoordinates, flyoverElevations),
    [flyoverCoordinates, flyoverElevations],
  );

  const resolvedStats = useMemo(
    () => computeRouteStats(flyoverElevations, totalDistance, routeStats),
    [flyoverElevations, routeStats, totalDistance],
  );

  const frame = useMemo(
    () =>
      computeFlyoverFrame({
        coordinates: flyoverCoordinates,
        cumulativeDistances,
        elevations: flyoverElevations,
        slopes,
        distanceM: progress * totalDistance,
        performanceTier,
      }),
    [cumulativeDistances, flyoverCoordinates, flyoverElevations, performanceTier, progress, slopes, totalDistance],
  );

  useEffect(() => {
    if (!isPlaying || totalDistance <= 0 || flyoverCoordinates.length < 2) {
      return undefined;
    }

    let lastTimestamp = 0;
    const targetDurationSeconds = clamp(totalDistance / 72, 34, 160);
    const baseMetersPerSecond = totalDistance / targetDurationSeconds;

    const step = (timestamp: number) => {
      if (!isPlayingRef.current) return;
      if (!lastTimestamp) lastTimestamp = timestamp;

      const rawDeltaSeconds = (timestamp - lastTimestamp) / 1000;
      const deltaSeconds = Math.min(0.05, rawDeltaSeconds);
      lastTimestamp = timestamp;

      const distanceNow = progressRef.current * totalDistance;
      const routePosition = positionAlongRouteAtDistance(flyoverCoordinates, cumulativeDistances, distanceNow);
      const slopeNow = interpolateSeriesValue(slopes, routePosition.segmentIndex, routePosition.segmentT);
      const terrainFactor = clamp(1 - slopeNow * 0.018, 0.88, 1.14);
      const distanceStep = deltaSeconds * baseMetersPerSecond * speedRef.current * terrainFactor;
      const nextProgress =
        totalDistance > 0 ? clamp(progressRef.current + distanceStep / totalDistance, 0, 1) : 1;

      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        setIsPlaying(false);
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [cumulativeDistances, flyoverCoordinates, isPlaying, slopes, totalDistance]);

  const reset = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
    progressRef.current = 0;
  }, []);

  const togglePlayback = useCallback(() => {
    if (progressRef.current >= 1) {
      setProgress(0);
      progressRef.current = 0;
    }
    setIsPlaying((previous) => !previous);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((previous) => (previous === 1 ? 2 : previous === 2 ? 3 : 1));
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    performanceTier,
    isPlaying,
    progress,
    speed,
    frame,
    totalDistance,
    currentDistance: progress * totalDistance,
    stats: resolvedStats,
    flyoverCoordinates,
    flyoverElevations,
    cumulativeDistances,
    reset,
    togglePlayback,
    cycleSpeed,
  };
}
