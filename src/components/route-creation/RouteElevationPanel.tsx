import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  gradePct: number;
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
};

const VB_W = 332;
const VB_H = 148;
const PAD = { l: 30, r: 10, t: 10, b: 26 };
const LINE_STROKE = 2.8;
const DRAW_ANIM_MS = 800;

function roundGrade(g: number): number {
  return Math.round(g * 100) / 100;
}

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

function areaPath(curvePath: string, firstX: number, lastX: number, baseY: number): string {
  if (!curvePath) return '';
  return `${curvePath} L ${lastX.toFixed(2)} ${baseY.toFixed(2)} L ${firstX.toFixed(2)} ${baseY.toFixed(2)} Z`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace('#', '');
  const n = Number.parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

function gradeColor(gradePct: number): string {
  // Descente -> vert, 0-3% jaune, 3-6% orange, 6-10% rouge, >10% rouge trùs sombre.
  if (gradePct <= -2) return '#16a34a';
  if (gradePct < 0) return lerpColor('#16a34a', '#84cc16', (gradePct + 2) / 2);
  if (gradePct <= 3) return lerpColor('#fde047', '#facc15', gradePct / 3);
  if (gradePct <= 6) return lerpColor('#facc15', '#fb923c', (gradePct - 3) / 3);
  if (gradePct <= 10) return lerpColor('#fb923c', '#ef4444', (gradePct - 6) / 4);
  if (gradePct <= 14) return lerpColor('#ef4444', '#7f1d1d', (gradePct - 10) / 4);
  return '#3b0a0a';
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
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
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

  // Echelle intelligente: zoom sur les variations + padding visuel premium
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

  const curvePath = useMemo(
    () => catmullRomPath(curvePoints.map((p) => ({ x: p.x, y: p.y }))),
    [curvePoints],
  );

  const fillPath = useMemo(() => {
    if (curvePoints.length < 2) return '';
    return areaPath(curvePath, curvePoints[0]!.x, curvePoints[curvePoints.length - 1]!.x, PAD.t + innerH);
  }, [curvePath, curvePoints, innerH]);

  const gradeSegments = useMemo(() => {
    if (curvePoints.length < 2) return [] as Array<{ d: string; color: string }>;
    const out: Array<{ d: string; color: string }> = [];
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const a = curvePoints[i]!;
      const b = curvePoints[i + 1]!;
      const run = Math.max(1, b.distM - a.distM);
      const grade = ((b.elevM - a.elevM) / run) * 100;
      out.push({ d: `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`, color: gradeColor(grade) });
    }
    return out;
  }, [curvePoints]);

  const yTicks = useMemo(() => {
    if (!seriesOk) return [] as Array<{ y: number; label: string }>;
    const steps = 3;
    return new Array(steps).fill(0).map((_, i) => {
      const t = i / (steps - 1);
      const value = chartMinElev + (1 - t) * chartSpan;
      return { y: PAD.t + t * innerH, label: `${Math.round(value)} m` };
    });
  }, [seriesOk, chartMinElev, chartSpan, innerH]);

  const xTicks = useMemo(() => {
    if (!seriesOk) return [] as Array<{ x: number; label: string }>;
    const desired = 4;
    return new Array(desired).fill(0).map((_, i) => {
      const t = i / (desired - 1);
      const distM = chartTotalM * t;
      return { x: PAD.l + t * innerW, label: formatDistanceAlongPath(distM) };
    });
  }, [seriesOk, chartTotalM, innerW, formatDistanceAlongPath]);

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
        gradePct: roundGrade(sample.gradePct),
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
    if (!expanded || !curvePath) {
      setDrawReady(false);
      return;
    }
    const raf = requestAnimationFrame(() => {
      const len = mainPathRef.current?.getTotalLength() ?? 0;
      setDrawLength(len);
      setDrawReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [expanded, curvePath, elevations.length, totalDistanceM]);

  return (
    <div className={cn('overflow-hidden rounded-ios-lg border border-border/50 bg-background/92 shadow-sm', className)}>
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-1.5 px-2.5 py-2 text-left transition-colors active:bg-secondary/60"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] leading-tight tabular-nums text-foreground">
            <span className="font-semibold">{formatDistanceKm(totalDistanceM / 1000)}</span>
            <span className="text-muted-foreground">ù</span>
            {isLoadingElevation ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                <span className="text-[11px]">Dùnivelù</span>
              </span>
            ) : (
              <>
                <span className="text-emerald-600 dark:text-emerald-400">D+ {Math.round(elevationGain)} m</span>
                <span className="text-muted-foreground">ù</span>
                <span className="text-rose-600 dark:text-rose-400">D- {Math.round(elevationLoss)} m</span>
              </>
            )}
          </p>
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-2 pb-2 pt-1">
          {!seriesOk ? (
            <div className="flex items-center justify-center gap-2 px-0.5 py-5 text-[11px] text-muted-foreground">
              {isLoadingElevation ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                  <span>Calcul du profilù</span>
                </>
              ) : (
                <span>Profil indisponible.</span>
              )}
            </div>
          ) : (
            <>
              <div className="flex min-h-[1.375rem] flex-wrap items-center gap-x-3 gap-y-0 px-0.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {scrubSample != null ? (
                  <>
                    <span className="font-medium text-foreground">{formatDistanceAlongPath(scrubSample.distFromStartM)}</span>
                    <span className="text-foreground/90">{scrubSample.elevM.toFixed(1)} m</span>
                    <span className={cn(scrubSample.gradePct >= 0 ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-rose-600 dark:text-rose-400')}>
                      {`${scrubSample.gradePct >= 0 ? '+' : ''}${roundGrade(scrubSample.gradePct).toFixed(2)}%`}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] leading-tight text-muted-foreground/90">Glissez sur le profil ù distance, altitude et pente</span>
                )}
              </div>

              <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                className="w-full touch-none select-none"
                style={{ maxHeight: VB_H }}
                role="img"
                aria-label="Profil d'ùlùvation"
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
                  <linearGradient id="elevLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                  <linearGradient id="elevFillPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.52" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {yTicks.map((t, i) => (
                  <g key={`y-${i}`}>
                    <line x1={PAD.l} y1={t.y} x2={PAD.l + innerW} y2={t.y} stroke="currentColor" className="text-border/55" strokeWidth="0.6" />
                    <text x={2} y={t.y + 2.5} fontSize="8" fill="currentColor" className="text-muted-foreground/90">
                      {t.label}
                    </text>
                  </g>
                ))}

                {xTicks.map((t, i) => (
                  <text key={`x-${i}`} x={t.x} y={VB_H - 4} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} fontSize="8" fill="currentColor" className="text-muted-foreground/90">
                    {t.label}
                  </text>
                ))}

                <path d={fillPath} fill="url(#elevFillPremium)" stroke="none" />

                {gradeSegments.map((seg, i) => (
                  <path key={`g-${i}`} d={seg.d} fill="none" stroke={seg.color} strokeWidth={2.6} strokeLinecap="round" opacity={0.96} />
                ))}

                <path
                  ref={mainPathRef}
                  d={curvePath}
                  fill="none"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={1.2}
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

                {cursorX != null && cursorY != null && (
                  <g>
                    <line x1={cursorX} y1={PAD.t} x2={cursorX} y2={PAD.t + innerH} stroke="currentColor" className="text-foreground/45" strokeWidth="0.9" />
                    <circle cx={cursorX} cy={cursorY} r="3.6" fill="#2563eb" stroke="white" strokeWidth="1.25" />
                  </g>
                )}
              </svg>
            </>
          )}
        </div>
      )}
    </div>
  );
}