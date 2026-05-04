import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cumulativeDistanceAlongPath, sampleAlongPathAtDistance } from '@/lib/routePersistence';
import type { MapCoord } from '@/lib/geoUtils';

export type RouteElevationScrubMeta = {
  index: number;
  lat: number;
  lng: number;
  distFromStartM: number;
  elevM: number;
};

type Props = {
  elevations: number[];
  coords: MapCoord[];
  totalDistanceM: number;
  elevationGain: number;
  elevationLoss: number;
  formatDistanceKm: (km: number) => string;
  formatDistanceAlongPath: (meters: number) => string;
  isLoadingElevation?: boolean;
  className?: string;
  onScrub: (meta: RouteElevationScrubMeta | null) => void;
  defaultExpanded?: boolean;
  autoExpandToken?: number;
  /** Maquette 07 � variante � Itin�raire � : en-t�te fixe, sans replis. */
  layout?: 'default' | 'itinerary';
};

const VB_W = 332;
const VB_H = 148;
const PAD = { l: 30, r: 10, t: 14, b: 20 };
const DRAW_ANIM_MS = 800;

function movingAverage(values: number[], windowSize: number): number[] {
  if (values.length <= 2 || windowSize <= 1) return values;
  const half = Math.floor(windowSize / 2);
  const out = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    const a = Math.max(0, i - half);
    const b = Math.min(values.length - 1, i + half);
    for (let j = a; j <= b; j++) {
      sum += values[j]!;
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

function catmullRomPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  let d = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function polylinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

function areaPath(curvePath: string, firstX: number, lastX: number, baseY: number): string {
  if (!curvePath) return '';
  return `${curvePath} L ${lastX.toFixed(2)} ${baseY.toFixed(2)} L ${firstX.toFixed(2)} ${baseY.toFixed(2)} Z`;
}

export function RouteElevationPanel({
  elevations,
  coords,
  totalDistanceM,
  elevationGain,
  elevationLoss,
  formatDistanceKm,
  formatDistanceAlongPath,
  isLoadingElevation = false,
  className,
  onScrub,
  defaultExpanded = false,
  autoExpandToken,
  layout = 'default',
}: Props) {
  const gradId = useId().replace(/:/g, '');
  const [expanded, setExpanded] = useState(layout === 'itinerary' ? true : defaultExpanded);
  const [scrubDistM, setScrubDistM] = useState<number | null>(null);
  const [drawLength, setDrawLength] = useState(0);
  const [drawReady, setDrawReady] = useState(false);
  const activePointer = useRef<number | null>(null);
  const mainPathRef = useRef<SVGPathElement | null>(null);

  const distCum = useMemo(() => (coords.length >= 2 ? cumulativeDistanceAlongPath(coords) : []), [coords]);
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

  useEffect(() => {
    if (autoExpandToken == null) return;
    setExpanded(true);
  }, [autoExpandToken]);

  useEffect(() => {
    if (layout === 'itinerary') setExpanded(true);
  }, [layout]);

  const smoothElevations = useMemo(() => {
    if (!seriesOk) return [] as number[];
    const adaptiveWindow =
      elevations.length > 1400 ? 13 : elevations.length > 900 ? 11 : elevations.length > 500 ? 9 : elevations.length > 220 ? 7 : 5;
    const pass1 = movingAverage(elevations, adaptiveWindow);
    return movingAverage(pass1, Math.max(3, adaptiveWindow - 2));
  }, [elevations, seriesOk]);

  const minElevRaw = seriesOk ? Math.min(...smoothElevations) : 0;
  const maxElevRaw = seriesOk ? Math.max(...smoothElevations) : 1;
  const elevSpanRaw = seriesOk ? Math.max(maxElevRaw - minElevRaw, 1) : 1;
  const yPad = Math.max(6, elevSpanRaw * 0.18);
  const chartMinElev = minElevRaw - yPad;
  const chartMaxElev = maxElevRaw + yPad;
  const chartSpan = Math.max(chartMaxElev - chartMinElev, 1);

  const xAtDist = useCallback((d: number) => PAD.l + (d / chartTotalM) * innerW, [chartTotalM, innerW]);
  const yAtElev = useCallback(
    (e: number) => PAD.t + innerH - ((e - chartMinElev) / chartSpan) * innerH,
    [chartMinElev, chartSpan, innerH],
  );

  const curvePoints = useMemo(() => {
    if (!seriesOk) return [] as Array<{ x: number; y: number; distM: number; elevM: number }>;
    return smoothElevations.map((e, i) => ({
      x: xAtDist(distCum[i] ?? 0),
      y: yAtElev(e),
      distM: distCum[i] ?? 0,
      elevM: e,
    }));
  }, [seriesOk, smoothElevations, xAtDist, yAtElev, distCum]);

  const precisePath = useMemo(() => polylinePath(curvePoints.map((p) => ({ x: p.x, y: p.y }))), [curvePoints]);
  const curvePath = useMemo(() => catmullRomPath(curvePoints.map((p) => ({ x: p.x, y: p.y }))), [curvePoints]);
  const fillPath = useMemo(() => {
    if (curvePoints.length < 2) return '';
    return areaPath(precisePath, curvePoints[0]!.x, curvePoints[curvePoints.length - 1]!.x, PAD.t + innerH);
  }, [precisePath, curvePoints, innerH]);

  const xTicksTop = useMemo(() => {
    if (!seriesOk) return [] as Array<{ x: number; label: string; anchor: 'start' | 'end' | 'middle' }>;
    if (layout === 'itinerary') {
      const n = 5;
      return Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const distM = t * chartTotalM;
        const x = PAD.l + t * innerW;
        return {
          x,
          label: formatDistanceAlongPath(distM),
          anchor: (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') as 'start' | 'end' | 'middle',
        };
      });
    }
    return [
      { x: PAD.l, label: formatDistanceAlongPath(0), anchor: 'start' as const },
      { x: PAD.l + innerW, label: formatDistanceAlongPath(chartTotalM), anchor: 'end' as const },
    ];
  }, [seriesOk, chartTotalM, innerW, formatDistanceAlongPath, layout]);

  const chartMaxHeight = layout === 'itinerary' ? 110 : VB_H;

  const applyScrub = useCallback(
    (distM: number | null) => {
      if (distM == null || !seriesOk) {
        setScrubDistM(null);
        onScrub(null);
        return;
      }
      const sample = sampleAlongPathAtDistance(coords, smoothElevations, distCum, distM);
      if (!sample) {
        setScrubDistM(null);
        onScrub(null);
        return;
      }
      setScrubDistM(sample.distFromStartM);
      onScrub({
        index: sample.segmentIndex,
        lat: sample.lat,
        lng: sample.lng,
        distFromStartM: sample.distFromStartM,
        elevM: sample.elevM,
      });
    },
    [coords, distCum, smoothElevations, onScrub, seriesOk],
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

  const scrubSample =
    seriesOk && scrubDistM != null ? sampleAlongPathAtDistance(coords, smoothElevations, distCum, scrubDistM) : null;
  const cursorX = scrubSample != null ? xAtDist(scrubSample.distFromStartM) : null;
  const cursorY = scrubSample != null ? yAtElev(scrubSample.elevM) : null;

  useEffect(() => {
    if (!expanded || !precisePath) {
      setDrawReady(false);
      return;
    }
    const raf = requestAnimationFrame(() => {
      const len = mainPathRef.current?.getTotalLength() ?? 0;
      setDrawLength(len);
      setDrawReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [expanded, precisePath, elevations.length, totalDistanceM]);

  const itineraryHeader = layout === 'itinerary' && (
    <div className="mb-2.5 flex min-w-0 items-baseline justify-between gap-2">
      <div className="text-[13px] font-medium tracking-tight text-muted-foreground">Profil d&apos;�l�vation</div>
      <div className="flex shrink-0 gap-3 text-[12px] text-muted-foreground">
        {isLoadingElevation ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          </span>
        ) : (
          <>
            <span>
              ? <span className="font-semibold text-foreground">{Math.round(elevationGain)} m</span>
            </span>
            <span>
              ? <span className="font-semibold text-foreground">{Math.round(elevationLoss)} m</span>
            </span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        layout === 'itinerary'
          ? 'rounded-[14px] bg-card p-4'
          : 'overflow-hidden rounded-ios-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      {layout !== 'itinerary' ? (
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-1.5 px-2.5 py-2 text-left transition-colors active:bg-slate-50"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] leading-tight tabular-nums text-slate-900">
              <span className="font-semibold">{formatDistanceKm(totalDistanceM / 1000)}</span>
              <span className="text-slate-400">�</span>
              {isLoadingElevation ? (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                  <span className="text-[11px]">D�nivel�</span>
                </span>
              ) : (
                <>
                  <span className="text-emerald-600">D+ {Math.round(elevationGain)} m</span>
                  <span className="text-slate-400">�</span>
                  <span className="text-rose-600">D- {Math.round(elevationLoss)} m</span>
                </>
              )}
            </p>
          </div>
          {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
        </button>
      ) : null}

      {layout === 'itinerary' ? itineraryHeader : null}

      {expanded && (
        <div className={cn(layout === 'itinerary' ? '' : 'border-t border-slate-200 px-2 pb-2 pt-1')}>
          {!seriesOk ? (
            <div className="flex items-center justify-center gap-2 px-0.5 py-5 text-[11px] text-slate-500">
              {isLoadingElevation ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                  <span>Calcul du profil�</span>
                </>
              ) : (
                <span>Profil indisponible.</span>
              )}
            </div>
          ) : (
            <>
              {layout !== 'itinerary' ? (
                <div className="flex min-h-[1.375rem] flex-wrap items-center gap-x-3 gap-y-0 px-0.5 py-0.5 text-[11px] tabular-nums text-slate-500">
                  {scrubSample != null ? (
                    <>
                      <span className="font-medium text-slate-900">{formatDistanceAlongPath(scrubSample.distFromStartM)}</span>
                      <span className="text-slate-800">{Math.round(scrubSample.elevM)} m</span>
                    </>
                  ) : (
                    <span className="text-[10px] leading-tight text-slate-500">Glissez sur le profil pour voir distance et altitude</span>
                  )}
                </div>
              ) : null}

              <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                className="w-full touch-none select-none"
                style={{ maxHeight: chartMaxHeight }}
                role="img"
                aria-label="Profil d'�l�vation"
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
                    // ignore
                  }
                  applyScrub(null);
                }}
              >
                <defs>
                  <linearGradient id={`elevLine-${gradId}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={layout === 'itinerary' ? '#0066cc' : '#2563eb'} />
                    <stop offset="100%" stopColor={layout === 'itinerary' ? '#0066cc' : '#2563eb'} />
                  </linearGradient>
                  <linearGradient id={`elevFillPremium-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={layout === 'itinerary' ? '#0066cc' : '#2563eb'} stopOpacity={layout === 'itinerary' ? 0.35 : 0.18} />
                    <stop offset="100%" stopColor={layout === 'itinerary' ? '#0066cc' : '#2563eb'} stopOpacity={layout === 'itinerary' ? 0 : 0.02} />
                  </linearGradient>
                </defs>

                {layout === 'itinerary' &&
                  [PAD.t + innerH * 0.25, PAD.t + innerH * 0.55, PAD.t + innerH * 0.8].map((y, gi) => (
                    <line
                      key={`g-${gi}`}
                      x1={PAD.l}
                      x2={PAD.l + innerW}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={0.5}
                      strokeDasharray="2 3"
                      className="text-border"
                    />
                  ))}

                {layout !== 'itinerary' &&
                  xTicksTop.map((t, i) => (
                    <text
                      key={`x-top-${i}`}
                      x={t.x}
                      y={9}
                      textAnchor={t.anchor === 'middle' ? 'middle' : t.anchor}
                      fontSize="8"
                      fill="currentColor"
                      className="text-muted-foreground"
                    >
                      {t.label}
                    </text>
                  ))}

                <path d={fillPath} fill={`url(#elevFillPremium-${gradId})`} stroke="none" />

                <path
                  ref={mainPathRef}
                  d={precisePath}
                  fill="none"
                  stroke={`url(#elevLine-${gradId})`}
                  strokeWidth={layout === 'itinerary' ? 2 : 2.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={
                    drawReady && drawLength > 0
                      ? {
                          strokeDasharray: drawLength,
                          strokeDashoffset: 0,
                          transition: `stroke-dashoffset ${DRAW_ANIM_MS}ms cubic-bezier(0.32,0.72,0,1)`,
                        }
                      : drawLength > 0
                        ? { strokeDasharray: drawLength, strokeDashoffset: drawLength }
                        : undefined
                  }
                />

                <path
                  d={curvePath}
                  fill="none"
                  stroke={layout === 'itinerary' ? '#0066cc' : '#2563eb'}
                  strokeOpacity={layout === 'itinerary' ? 0.12 : 0.22}
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {cursorX != null && cursorY != null && (
                  <g>
                    <line x1={cursorX} y1={PAD.t} x2={cursorX} y2={PAD.t + innerH} stroke="#93c5fd" strokeWidth="0.9" />
                    <circle
                      cx={cursorX}
                      cy={cursorY}
                      r="3.6"
                      fill={layout === 'itinerary' ? '#0066cc' : '#2563eb'}
                      stroke="white"
                      strokeWidth="1.25"
                    />
                  </g>
                )}
              </svg>
              {layout === 'itinerary' && seriesOk ? (
                <div className="mt-1 flex justify-between gap-1 text-[10px] tabular-nums text-muted-foreground/80">
                  {xTicksTop.map((t, i) => (
                    <span key={`x-bot-${i}`} className="min-w-0 truncate">
                      {t.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}