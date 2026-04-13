import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mountain,
  TrendingUp,
  Route as RouteIcon,
  ChevronRight,
} from 'lucide-react';
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

interface RouteCardProps {
  route: {
    id: string;
    name: string;
    description: string | null;
    total_distance: number | null;
    total_elevation_gain: number | null;
    created_at: string;
    coordinates: any;
  };
}

export const RouteCard = ({ route }: RouteCardProps) => {
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
  const { formatMeters } = useDistanceUnits();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const userLocationMarkerRef = useRef<Marker | null>(null);
  const { position } = useGeolocation();

  const formatElevation = (meters: number | null) => {
    if (!meters) return '—';
    return `${Math.round(meters)} m`;
  };

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

  const terrainLabel = useMemo(() => {
    const distKm = Math.max((route.total_distance ?? 0) / 1000, 0.1);
    const gainPerKm = (route.total_elevation_gain ?? 0) / distKm;
    if (gainPerKm >= 80) return 'Montagne';
    if (gainPerKm >= 35) return 'Vallonné';
    return 'Plutôt plat';
  }, [route.total_distance, route.total_elevation_gain]);

  const elevationPath = useMemo(() => {
    const width = 76;
    const height = 34;
    if (elevations.length < 2) return `M0 ${height / 2} L${width} ${height / 2}`;
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const range = Math.max(1, max - min);
    const pts = elevations
      .map((e, i) => {
        const x = (i / (elevations.length - 1)) * width;
        const y = height - ((e - min) / range) * height;
        return { x, y };
      });
    return smoothPathFromPoints(pts);
  }, [elevations]);

  const elevationFillPath = useMemo(() => {
    const width = 76;
    const height = 34;
    if (!elevationPath) return '';
    return `${elevationPath} L ${width} ${height} L 0 ${height} Z`;
  }, [elevationPath]);

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
        m.setPaintProperty('background', 'background-color', '#eef2f7');
        m.setPaintProperty('background', 'background-opacity', 1);
        setOrUpdateLineLayer(m, ROUTE_CARD_LINE_SRC, ROUTE_CARD_LINE_LAYER, path, {
          color: '#2d6bff',
          width: 4.4,
        });
        const start = path[0]!;
        const end = path[path.length - 1]!;
        const pointsData = {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { kind: 'start' }, geometry: { type: 'Point', coordinates: [start.lng, start.lat] } },
            { type: 'Feature', properties: { kind: 'end' }, geometry: { type: 'Point', coordinates: [end.lng, end.lat] } },
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
              'circle-radius': 3.6,
              'circle-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#2d6bff',
            },
          } as any);
          m.addLayer({
            id: ROUTE_CARD_POINTS_END,
            type: 'circle',
            source: ROUTE_CARD_POINTS_SRC,
            filter: ['==', ['get', 'kind'], 'end'],
            paint: {
              'circle-radius': 3.8,
              'circle-color': '#2d6bff',
              'circle-stroke-width': 1.6,
              'circle-stroke-color': '#ffffff',
            },
          } as any);
        }
        void fitMapToCoords(m, path, 30);
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
  }, [route.coordinates]);

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
      className="ios-list-row w-full border border-white dark:border-white/10 text-left"
      aria-label={`Voir le détail de ${route.name}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-[72px] w-[96px] shrink-0 overflow-hidden rounded-xl border border-border/50 bg-secondary shadow-sm">
          {hasCoordinates ? (
            <div ref={mapContainer} className="pointer-events-none h-full w-full saturate-75" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-foreground">{route.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground/95">
              <RouteIcon className="h-3.5 w-3.5" />
              {formatMeters(route.total_distance)}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground/95">
              <Mountain className="h-3.5 w-3.5" />
              D+ {formatElevation(route.total_elevation_gain)}
            </span>
          </div>
          <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {terrainLabel}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="h-[52px] w-[76px] rounded-xl border border-border/50 bg-secondary/70 px-1.5 py-1">
            <svg viewBox="0 0 76 34" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id={`routeCardFill-${route.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d={elevationFillPath} fill={`url(#routeCardFill-${route.id})`} />
              <path d={elevationPath} fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>
    </button>
  );
};
