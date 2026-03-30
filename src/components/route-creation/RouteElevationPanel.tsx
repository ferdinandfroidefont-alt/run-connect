import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cumulativeDistanceAlongPath, localGradePercent } from '@/lib/routePersistence';
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
  className?: string;
  onScrub: (meta: RouteElevationScrubMeta | null) => void;
  defaultExpanded?: boolean;
};

const VB_W = 320;
const VB_H = 86;
const PAD = { l: 6, r: 6, t: 8, b: 16 };

export function RouteElevationPanel({
  elevations,
  coords,
  totalDistanceM,
  elevationGain,
  elevationLoss,
  formatDistanceKm,
  className,
  onScrub,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const activePointer = useRef<number | null>(null);

  const distCum = useMemo(
    () => (coords.length >= 2 ? cumulativeDistanceAlongPath(coords) : []),
    [coords],
  );

  const innerW = VB_W - PAD.l - PAD.r;
  const innerH = VB_H - PAD.t - PAD.b;

  const applyScrub = useCallback(
    (index: number | null) => {
      if (index == null || coords.length < 2 || elevations.length < 2) {
        setScrubIndex(null);
        onScrub(null);
        return;
      }
      const i = Math.max(0, Math.min(index, coords.length - 1));
      setScrubIndex(i);
      const gradePct = localGradePercent(coords, elevations, i);
      onScrub({
        index: i,
        lat: coords[i]!.lat,
        lng: coords[i]!.lng,
        distFromStartM: distCum[i] ?? 0,
        elevM: elevations[i] ?? 0,
        gradePct: Math.round(gradePct * 10) / 10,
      });
    },
    [coords, distCum, elevations, onScrub],
  );

  const pointerToIndex = useCallback(
    (clientX: number, svg: SVGSVGElement) => {
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const t = rect.width > 0 ? x / rect.width : 0;
      const n = coords.length;
      if (n < 2) return 0;
      return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
    },
    [coords.length],
  );

  if (elevations.length < 2 || coords.length < 2) return null;

  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevSpan = Math.max(maxElev - minElev, 1);

  const pointsStr = elevations
    .map((elev, index) => {
      const x = PAD.l + (index / Math.max(elevations.length - 1, 1)) * innerW;
      const y = PAD.t + innerH - ((elev - minElev) / elevSpan) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  const cursorX =
    scrubIndex != null
      ? PAD.l + (scrubIndex / Math.max(elevations.length - 1, 1)) * innerW
      : null;

  const formatGrade = (g: number) => `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-ios-lg border border-border/60 bg-background/95 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left transition-colors active:bg-secondary/80"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] tabular-nums text-foreground">
            <span className="font-semibold">{formatDistanceKm(totalDistanceM / 1000)}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">D+ {Math.round(elevationGain)} m</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-rose-600 dark:text-rose-400">D− {Math.round(elevationLoss)} m</span>
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-2 pb-2 pt-0">
          <div className="flex min-h-[2.25rem] flex-wrap items-center gap-x-3 gap-y-0.5 px-1 py-1.5 text-[11px] tabular-nums text-muted-foreground">
            {scrubIndex != null ? (
              <>
                <span className="font-medium text-foreground">
                  {formatDistanceKm((distCum[scrubIndex] ?? 0) / 1000)}
                </span>
                <span>{Math.round(elevations[scrubIndex]!)} m</span>
                <span
                  className={cn(
                    localGradePercent(coords, elevations, scrubIndex) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {formatGrade(localGradePercent(coords, elevations, scrubIndex))}
                </span>
              </>
            ) : (
              <span className="text-[11px]">Glissez sur le profil pour placer le curseur sur le tracé</span>
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
              const idx = pointerToIndex(e.clientX, e.currentTarget);
              applyScrub(idx);
            }}
            onPointerMove={(e) => {
              if (activePointer.current !== e.pointerId) return;
              const idx = pointerToIndex(e.clientX, e.currentTarget);
              applyScrub(idx);
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
                <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline
              points={`${PAD.l},${PAD.t + innerH} ${pointsStr} ${PAD.l + innerW},${PAD.t + innerH}`}
              fill="url(#elevFill)"
              stroke="none"
            />
            <polyline
              points={pointsStr}
              fill="none"
              stroke="rgb(59 130 246)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {cursorX != null && scrubIndex != null && (
              <g>
                <line
                  x1={cursorX}
                  y1={PAD.t}
                  x2={cursorX}
                  y2={PAD.t + innerH}
                  stroke="rgb(15 23 42)"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                />
                <circle
                  cx={cursorX}
                  cy={
                    PAD.t +
                    innerH -
                    ((elevations[scrubIndex]! - minElev) / elevSpan) * innerH
                  }
                  r="4.5"
                  fill="rgb(37 99 235)"
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            )}
            <text x={PAD.l} y={12} fontSize="9" fill="currentColor" className="text-muted-foreground">
              {Math.round(maxElev)} m
            </text>
            <text x={PAD.l} y={VB_H - 4} fontSize="9" fill="currentColor" className="text-muted-foreground">
              {Math.round(minElev)} m
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}
