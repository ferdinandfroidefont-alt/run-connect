import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createUserLocationMapboxMarker } from '@/lib/mapUserLocationIcon';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import type { Map, Marker } from 'mapbox-gl';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer } from '@/lib/mapboxEmbed';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';

const ROUTE_CARD_LINE_SRC = 'route-card-preview-line';
const ROUTE_CARD_LINE_LAYER = 'route-card-preview-line-layer';
const ROUTE_CARD_POINTS_SRC = 'route-card-preview-points';
const ROUTE_CARD_POINTS_START = 'route-card-preview-start';
const ROUTE_CARD_POINTS_END = 'route-card-preview-end';

const ACCENT_PALETTE = ['#0066CC', '#34c759', '#ff9500', '#5ac8fa', '#af52de'] as const;

interface RouteCardProps {
  route: {
    id: string;
    name: string;
    description: string | null;
    total_distance: number | null;
    total_elevation_gain: number | null;
    max_elevation: number | null;
    created_at: string;
    coordinates: any;
  };
  /** Index dans la liste (couleur d’accent façon maquette 07b). */
  listIndex?: number;
  /** Sous-titre sous le nom (ex. « Modifié il y a 2j »). */
  subtitle?: string;
}

export const RouteCard = ({ route, listIndex = 0, subtitle }: RouteCardProps) => {
  const smoothPathFromPoints = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return '';
    let d = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]!;
      const p1 = points[i]!;
      const cx = (p0.x + p1.x) / 2;
      const cy = (p0.y + p1.y) / 2;
      d += ` Q ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)}`;
    }
    const last = points[points.length - 1]!;
    d += ` T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
    return d;
  };

  const navigate = useNavigate();
  const { formatKm } = useDistanceUnits();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const userLocationMarkerRef = useRef<Marker | null>(null);
  const { position } = useGeolocation();

  const accent = ACCENT_PALETTE[listIndex % ACCENT_PALETTE.length]!;

  const elevations = useMemo(() => {
    if (!Array.isArray(route.coordinates)) return [] as number[];
    return route.coordinates
      .map((coord: any) => {
        if (coord?.elevation != null) return Number(coord.elevation);
        if (Array.isArray(coord) && coord.length > 2) return Number(coord[2]);
        return NaN;
      })
      .filter((v) => Number.isFinite(v));
  }, [route.coordinates]);

  const elevationPath = useMemo(() => {
    const width = 64;
    const height = 32;
    if (elevations.length < 2) return `M0 ${height / 2} L${width} ${height / 2}`;
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const range = Math.max(1, max - min);
    const pts = elevations.map((e, i) => {
      const x = (i / (elevations.length - 1)) * width;
      const y = height - ((e - min) / range) * height;
      return { x, y };
    });
    return smoothPathFromPoints(pts);
  }, [elevations]);

  const elevationFillPath = useMemo(() => {
    const width = 64;
    const height = 32;
    if (!elevationPath) return '';
    return `${elevationPath} L ${width} ${height} L 0 ${height} Z`;
  }, [elevationPath]);

  const kmLabel = useMemo(() => {
    const km = Math.max(0, (route.total_distance ?? 0) / 1000);
    return formatKm(km);
  }, [route.total_distance, formatKm]);

  const dPlusLabel = Math.round(route.total_elevation_gain ?? 0);
  const peakM = route.max_elevation != null ? Math.round(route.max_elevation) : null;

  useEffect(() => {
    if (!mapContainer.current || !route.coordinates?.length || !getMapboxAccessToken()) return;
    userLocationMarkerRef.current?.remove();
    userLocationMarkerRef.current = null;
    mapInstanceRef.current?.remove();
    mapInstanceRef.current = null;

    let cancelled = false;
    void (async () => {
      const path = route.coordinates
        .map((coord: any) => {
          if (coord.lat !== undefined && coord.lng !== undefined) {
            return { lat: Number(coord.lat), lng: Number(coord.lng) } as MapCoord;
          } else if (Array.isArray(coord) && coord.length >= 2) {
            return { lat: Number(coord[0]), lng: Number(coord[1]) } as MapCoord;
          }
          return null;
        })
        .filter((coord): coord is MapCoord => coord !== null);
      if (path.length === 0 || !mapContainer.current) return;

      const m = await createEmbeddedMapboxMap(mapContainer.current, {
        center: path[0],
        zoom: 10,
        interactive: false,
      });
      if (cancelled) {
        m.remove();
        return;
      }
      mapInstanceRef.current = m;

      const applyRoute = () => {
        try {
          m.setPaintProperty('background', 'background-color', '#e8efe5');
          m.setPaintProperty('background', 'background-opacity', 1);
        } catch {
          // style sans couche background
        }
        setOrUpdateLineLayer(m, ROUTE_CARD_LINE_SRC, ROUTE_CARD_LINE_LAYER, path, {
          color: accent,
          width: 2.6,
        });
        const start = path[0]!;
        const end = path[path.length - 1]!;
        const pointsData = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { kind: 'start' },
              geometry: { type: 'Point', coordinates: [start.lng, start.lat] },
            },
            {
              type: 'Feature',
              properties: { kind: 'end' },
              geometry: { type: 'Point', coordinates: [end.lng, end.lat] },
            },
          ],
        } as any;
        if (m.getSource(ROUTE_CARD_POINTS_SRC)) {
          (m.getSource(ROUTE_CARD_POINTS_SRC) as any).setData(pointsData);
        } else {
          m.addSource(ROUTE_CARD_POINTS_SRC, { type: 'geojson', data: pointsData } as any);
          m.addLayer({
            id: ROUTE_CARD_POINTS_START,
            type: 'circle',
            source: ROUTE_CARD_POINTS_SRC,
            filter: ['==', ['get', 'kind'], 'start'],
            paint: {
              'circle-radius': 3,
              'circle-color': accent,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
            },
          } as any);
          m.addLayer({
            id: ROUTE_CARD_POINTS_END,
            type: 'circle',
            source: ROUTE_CARD_POINTS_SRC,
            filter: ['==', ['get', 'kind'], 'end'],
            paint: {
              'circle-radius': 3,
              'circle-color': accent,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
            },
          } as any);
        }
        void fitMapToCoords(m, path, 8);
      };
      if (m.isStyleLoaded()) applyRoute();
      else m.once('load', applyRoute);
    })();

    return () => {
      cancelled = true;
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [route.coordinates, accent]);

  useEffect(() => {
    const m = mapInstanceRef.current;
    if (!m) return;
    if (!position) {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      return;
    }
    userLocationMarkerRef.current?.remove();
    void (async () => {
      const mk = await createUserLocationMapboxMarker(position.lng, position.lat);
      if (mapInstanceRef.current !== m) {
        mk.remove();
        return;
      }
      userLocationMarkerRef.current = mk.addTo(m);
    })();
  }, [position, route.coordinates]);

  const hasCoordinates = Array.isArray(route.coordinates) && route.coordinates.length > 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/itinerary/route/${route.id}`)}
      className="flex w-full min-w-0 items-stretch gap-3 rounded-[18px] bg-card p-3 text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] active:opacity-90 dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08)] [-webkit-tap-highlight-color:transparent]"
      aria-label={`Voir le détail de ${route.name}`}
    >
      <div className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-xl bg-[#e8efe5]">
        {hasCoordinates ? (
          <div ref={mapContainer} className="pointer-events-none h-full w-full" />
        ) : null}
      </div>

      <div className="flex min-h-[78px] min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-foreground">{route.name}</h3>
          {subtitle ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span className="text-[17px] font-semibold tabular-nums tracking-tight text-foreground">
            {kmLabel}
            <span className="ml-0.5 text-[10px] font-medium text-muted-foreground"> km</span>
          </span>
          <div className="h-3 w-px shrink-0 bg-border" aria-hidden />
          <span className="text-[17px] font-semibold tabular-nums tracking-tight text-foreground">
            {dPlusLabel}
            <span className="ml-0.5 text-[10px] font-medium text-muted-foreground"> m</span>
          </span>
        </div>
      </div>

      <div className="flex w-16 shrink-0 flex-col items-end justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">D+</div>
        <svg viewBox="0 0 64 32" className="h-8 w-16" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={`routeCardFill-${route.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={elevationFillPath} fill={`url(#routeCardFill-${route.id})`} />
          <path
            d={elevationPath}
            fill="none"
            stroke={accent}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {peakM != null ? (
          <div className="text-[11px] font-semibold tabular-nums" style={{ color: accent }}>
            ↗{peakM}m
          </div>
        ) : (
          <div className="text-[11px] font-semibold tabular-nums text-muted-foreground">—</div>
        )}
      </div>
    </button>
  );
};
