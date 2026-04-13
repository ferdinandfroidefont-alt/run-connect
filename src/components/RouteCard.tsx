import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mountain,
  TrendingUp,
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

  const elevationPath = useMemo(() => {
    const width = 64;
    const height = 28;
    if (elevations.length < 2) return `M0 ${height / 2} L${width} ${height / 2}`;
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const range = Math.max(1, max - min);
    return elevations
      .map((e, i) => {
        const x = (i / (elevations.length - 1)) * width;
        const y = height - ((e - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [elevations]);

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
        setOrUpdateLineLayer(m, ROUTE_CARD_LINE_SRC, ROUTE_CARD_LINE_LAYER, path, {
          color: '#5B7CFF',
          width: 3,
        });
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
      <div className="flex items-center gap-ios-2">
        <div className="h-[64px] w-[88px] shrink-0 overflow-hidden rounded-ios-md border border-border/60 bg-secondary">
          {hasCoordinates ? (
            <div ref={mapContainer} className="pointer-events-none h-full w-full" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-ios-headline font-semibold text-foreground">{route.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatMeters(route.total_distance)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
              <Mountain className="h-3.5 w-3.5" />
              D+ {formatElevation(route.total_elevation_gain)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="h-[44px] w-[64px] rounded-ios-md bg-secondary/70 px-1.5 py-1">
            <svg viewBox="0 0 64 28" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
              <path d={elevationPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>
    </button>
  );
};
