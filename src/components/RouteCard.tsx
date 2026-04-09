import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import {
  Route,
  TrendingUp,
  Mountain,
  Edit,
  Trash2,
  Download,
  Box,
  Navigation,
  Globe,
  Clock,
  CalendarPlus,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToGPX, shareOrDownloadGPX, GPXTrackPoint } from '@/lib/gpxExport';
import { ElevationProfile3DDialog } from './ElevationProfile3DDialog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createUserLocationMapboxMarker } from '@/lib/mapUserLocationIcon';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import type { Map, Marker } from 'mapbox-gl';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer } from '@/lib/mapboxEmbed';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';
import { cn } from '@/lib/utils';

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
  onEdit: (route: any) => void;
  onDelete: (routeId: string) => void;
  onPublishToggle?: (isPublic: boolean) => void;
  isPublic?: boolean;
}

export const RouteCard = ({ route, onEdit, onDelete, onPublishToggle, isPublic = false }: RouteCardProps) => {
  const navigate = useNavigate();
  const { formatMeters } = useDistanceUnits();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const userLocationMarkerRef = useRef<Marker | null>(null);
  const { position } = useGeolocation();
  const [show3DDialog, setShow3DDialog] = useState(false);

  const formatElevation = (meters: number | null) => {
    if (!meters) return '—';
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (distance: number | null) => {
    if (!distance) return '—';
    const hours = (distance / 1000) / 10;
    const totalMinutes = hours * 60;
    const h = Math.floor(totalMinutes / 60);
    const min = Math.round(totalMinutes % 60);
    if (h > 0) return `${h}h${min.toString().padStart(2, '0')}`;
    return `${min} min`;
  };

  const handleExportGPX = async () => {
    if (!route.coordinates || !Array.isArray(route.coordinates)) return;
    const trackPoints: GPXTrackPoint[] = route.coordinates
      .map((coord: any) => {
        if (coord.lat !== undefined && coord.lng !== undefined) {
          return {
            lat: Number(coord.lat),
            lng: Number(coord.lng),
            elevation: coord.elevation ? Number(coord.elevation) : undefined,
          };
        } else if (Array.isArray(coord) && coord.length >= 2) {
          return {
            lat: Number(coord[0]),
            lng: Number(coord[1]),
            elevation: coord.length > 2 ? Number(coord[2]) : undefined,
          };
        }
        return null;
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);
    if (trackPoints.length === 0) return;
    const gpxContent = exportToGPX(route.name, trackPoints, route.description || undefined);
    await shareOrDownloadGPX(route.name, gpxContent, { title: route.name });
  };

  const openSessionWithRoute = () => {
    navigate({ pathname: '/', search: `?presetRoute=${encodeURIComponent(route.id)}` });
  };

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

  const hasCoordinates = route.coordinates?.length > 0;

  const chipPrimary = cn(
    'inline-flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold shadow-sm transition-colors active:scale-[0.98] sm:flex-none sm:px-4',
    'bg-primary text-primary-foreground active:bg-primary/90'
  );

  const chipSecondary = cn(
    'inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-secondary/70 px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-sm active:bg-secondary active:scale-[0.98]'
  );

  return (
    <>
      <div className="ios-card overflow-hidden border border-border/60">
        <button
          type="button"
          onClick={() => navigate(`/itinerary/route/${route.id}`)}
          className="block w-full text-left transition-opacity active:opacity-90"
          aria-label={`Voir le détail de ${route.name}`}
        >
          {hasCoordinates ? (
            <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl">
              <div ref={mapContainer} className="pointer-events-none h-44 w-full" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

              <div className="pointer-events-none absolute left-3 top-3">
                <span className="rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
                  {format(new Date(route.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1.5 text-[12px] font-semibold text-foreground backdrop-blur-sm">
                  <Route className="h-3 w-3" /> {formatMeters(route.total_distance)}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1.5 text-[12px] font-semibold text-foreground backdrop-blur-sm">
                  <Mountain className="h-3 w-3" /> {formatElevation(route.total_elevation_gain)}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1.5 text-[12px] font-semibold text-foreground backdrop-blur-sm">
                  <Clock className="h-3 w-3" /> {formatDuration(route.total_distance)}
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-4 mt-4 flex h-32 items-center justify-center rounded-2xl bg-secondary">
              <Route className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
        </button>

        <div className="px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={() => navigate(`/itinerary/route/${route.id}`)}
            className="flex w-full min-w-0 items-start gap-2 text-left transition-colors active:opacity-80"
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1">
                <h3 className="truncate text-[17px] font-semibold text-foreground">{route.name}</h3>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
              {route.description && (
                <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{route.description}</p>
              )}
            </div>
          </button>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatMeters(route.total_distance)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
              <Mountain className="h-3.5 w-3.5" />D+ {formatElevation(route.total_elevation_gain)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(route.total_distance)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={chipPrimary} onClick={() => setShow3DDialog(true)}>
              <Box className="h-4 w-4 shrink-0" />
              Survol 3D
            </button>
            <button
              type="button"
              className={chipPrimary}
              onClick={() => navigate(`/training/route/${route.id}`)}
            >
              <Navigation className="h-4 w-4 shrink-0" />
              Entraînement
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" className={chipSecondary} onClick={handleExportGPX}>
              <Download className="h-3.5 w-3.5 shrink-0" />
              GPX
            </button>
            <button type="button" className={chipSecondary} onClick={openSessionWithRoute}>
              <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
              Séance
            </button>
            <button type="button" className={chipSecondary} onClick={() => onEdit(route)}>
              <Edit className="h-3.5 w-3.5 shrink-0" />
              Modifier
            </button>
            <button
              type="button"
              className={cn(chipSecondary, 'border-destructive/30 text-destructive')}
              onClick={() => onDelete(route.id)}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Supprimer
            </button>
          </div>

          {onPublishToggle && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/50 bg-secondary/40 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-[13px] font-medium text-foreground">
                  {isPublic ? 'Itinéraire public' : 'Rendre public'}
                </span>
              </div>
              <Switch checked={isPublic} onCheckedChange={onPublishToggle} />
            </div>
          )}
        </div>
      </div>

      <ElevationProfile3DDialog
        open={show3DDialog}
        onOpenChange={setShow3DDialog}
        coordinates={
          Array.isArray(route.coordinates)
            ? route.coordinates.map((c: any) => ({ lat: Number(c.lat ?? c[0]), lng: Number(c.lng ?? c[1]) }))
            : []
        }
        elevations={
          Array.isArray(route.coordinates)
            ? route.coordinates.map((c: any) => Number(c.elevation ?? c[2] ?? 0))
            : []
        }
        routeName={route.name}
        routeStats={
          route.total_distance || route.total_elevation_gain
            ? {
                totalDistance: route.total_distance || 0,
                elevationGain: route.total_elevation_gain || 0,
                elevationLoss: 0,
              }
            : null
        }
      />
    </>
  );
};
