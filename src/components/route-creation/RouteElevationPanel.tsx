import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cumulativeDistanceAlongPath, sampleAlongPathAtDistance } from '@/lib/routePersistence';
import type { MapCoord } from '@/lib/geoUtils';

export type RouteElevationScrubMeta = {
  index: number;
  lat: number;
  lng: number;
  distFromStartM: number;
  elevM: number;
  gradePct: number;
};

type Props = {
  elevations: number[];
  coords: MapCoord[];
  totalDistanceM: number;
  elevationGain: number;
  elevationLoss: number;
  formatDistanceKm: (km: number) => string;
  /** Distance le long du tracé (curseur), plus précis que le résumé km. */
  formatDistanceAlongPath: (meters: number) => string;
  className?: string;
  onScrub: (meta: RouteElevationScrubMeta | null) => void;
  defaultExpanded?: boolean;
};

const VB_W = 320;
const VB_H = 62;
const PAD = { l: 3, r: 3, t: 2, b: 11 };

function roundGrade(g: number): number {
  return Math.round(g * 100) / 100;
}

export function RouteElevationPanel({
  elevations,
  coords,
  totalDistanceM,
  elevationGain,
  elevationLoss,
  formatDistanceKm,
  formatDistanceAlongPath,
  className,
  onScrub,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [scrubDistM, setScrubDistM] = useState<number | null>(null);
  const activePointer = useRef<number | null>(null);

  const distCum = useMemo(
    () => (coords.length >= 2 ? cumulativeDistanceAlongPath(coords) : []),
    [coords],
  );

  const chartTotalM = distCum.length > 0 ? distCum[distCum.length - 1]! : 0;

  const innerW = VB_W - PAD.l - PAD.r;
  const innerH = VB_H - PAD.t - PAD.b;

  const seriesOk =
    elevations.length >= 2 &&
    coords.length >= 2 &&
    coords.length === elevations.length &&
    distCum.length === coords.length &&
    chartTotalM > 1e-6;

  useEffect(() => {
    if (!expanded) {
      setScrubDistM(null);
      onScrub(null);
    }
  }, [expanded, onScrub]);

  const applyScrub = useCallback(
    (distM: number | null) => {
      if (distM == null || !seriesOk) {
        setScrubDistM(null);
        onScrub(null);
        return;
      }
      const sample = sampleAlongPathAtDistance(coords, elevations, distCum, distM);
      if (!sample) {
        setScrubDistM(null);
        onScrub(null);
        return;
      }
      setScrubDistM(sample.distFromStartM);
      const g = roundGrade(sample.gradePct);
      onScrub({
        index: sample.segmentIndex,
        lat: sample.lat,
        lng: sample.lng,
        distFromStartM: sample.distFromStartM,
        elevM: sample.elevM,
        gradePct: g,
      });
    },
    [coords, distCum, elevations, onScrub, seriesOk],
  );

  const pointerToDistM = useCallback(
    (clientX: number, svg: SVGSVGElement) => {
      const rect = svg.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / Math.max(rect.width, 1)) * VB_W;
      const t = innerW > 0 ? (svgX - PAD.l) / innerW : 0;
      const clampedT = Math.max(0, Math.min(1, t));
      return clampedT * chartTotalM;
    },
    [chartTotalM, innerW],
  );

  if (!seriesOk) return null;

  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevSpan = Math.max(maxElev - minElev, 1);

  const xAtDist = (d: number) => PAD.l + (d / chartTotalM) * innerW;

  const pointsStr = elevations
    .map((elev, index) => {
      const x = xAtDist(distCum[index] ?? 0);
      const y = PAD.t + innerH - ((elev - minElev) / elevSpan) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  const scrubSample =
    scrubDistM != null ? sampleAlongPathAtDistance(coords, elevations, distCum, scrubDistM) : null;

  const cursorX = scrubSample != null ? xAtDist(scrubSample.distFromStartM) : null;
  const cursorY =
    scrubSample != null
      ? PAD.t + innerH - ((scrubSample.elevM - minElev) / elevSpan) * innerH
      : null;

  const formatGrade = (g: number) => `${g >= 0 ? '+' : ''}${g.toFixed(2)}%`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-ios-lg border border-border/50 bg-background/92',
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-1.5 px-2 py-1.5 text-left transition-colors active:bg-secondary/60"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] leading-tight tabular-nums text-foreground">
            <span className="font-semibold">{formatDistanceKm(totalDistanceM / 1000)}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">D+ {Math.round(elevationGain)}</span>
            <span className="text-muted-foreground/80"> m</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-rose-600 dark:text-rose-400">D− {Math.round(elevationLoss)}</span>
            <span className="text-muted-foreground/80"> m</span>
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-1.5 pb-1.5 pt-0">
          <div className="flex min-h-[1.375rem] flex-wrap items-center gap-x-2.5 gap-y-0 px-0.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {scrubSample != null ? (
              <>
                <span className="font-medium text-foreground">
                  {formatDistanceAlongPath(scrubSample.distFromStartM)}
                </span>
                <span className="text-foreground/90">{scrubSample.elevM.toFixed(1)} m</span>
                <span
                  className={cn(
                    scrubSample.gradePct >= 0
                      ? 'font-medium text-emerald-600 dark:text-emerald-400'
                      : 'font-medium text-rose-600 dark:text-rose-400',
                  )}
                >
                  {formatGrade(roundGrade(scrubSample.gradePct))}
                </span>
              </>
            ) : (
              <span className="text-[10px] leading-tight text-muted-foreground/90">
                Glissez sur le profil — distance, altitude et pente
              </span>
            )}
          </div>

          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="w-full touch-none select-none"
            style={{ maxHeight: VB_H }}
            role="img"
            aria-label="Profil d'élévation"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              activePointer.current = e.pointerId;
              applyScrub(pointerToDistM(e.clientX, e.currentTarget));
            }}
            onPointerMove={(e) => {
              if (activePointer.current !== e.pointerId) return;
              applyScrub(pointerToDistM(e.clientX, e.currentTarget));
            }}
            onPointerUp={(e) => {
              if (activePointer.current === e.pointerId) {
                activePointer.current = null;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
            }}
            onPointerCancel={(e) => {
              activePointer.current = null;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              applyScrub(null);
            }}
          >
            <defs>
              <linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(37 99 235)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(37 99 235)" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            <polyline
              points={`${PAD.l},${PAD.t + innerH} ${pointsStr} ${PAD.l + innerW},${PAD.t + innerH}`}
              fill="url(#elevFill)"
              stroke="none"
            />
            <g className="text-blue-700 dark:text-blue-400">
              <polyline
                points={pointsStr}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
            {cursorX != null && cursorY != null && (
              <g>
                <line
                  x1={cursorX}
                  y1={PAD.t}
                  x2={cursorX}
                  y2={PAD.t + innerH}
                  stroke="currentColor"
                  className="text-foreground/45"
                  strokeWidth="0.9"
                />
                <circle
                  cx={cursorX}
                  cy={cursorY}
                  r="3.25"
                  className="fill-blue-600 dark:fill-blue-400"
                  stroke="white"
                  strokeWidth="1.25"
                />
              </g>
            )}
            <text
              x={PAD.l}
              y={PAD.t + 9}
              fontSize="8"
              fill="currentColor"
              className="text-muted-foreground/95"
            >
              {Math.round(maxElev)} m
            </text>
            <text
              x={PAD.l}
              y={VB_H - 2}
              fontSize="8"
              fill="currentColor"
              className="text-muted-foreground/95"
            >
              {Math.round(minElev)} m
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}
