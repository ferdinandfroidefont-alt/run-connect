import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ActivityIcon } from '@/lib/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import { Route, Mountain, Star, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedRoute } from '@/hooks/useRoutesFeed';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createUserLocationMapboxMarker } from '@/lib/mapUserLocationIcon';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import type { Map, Marker } from 'mapbox-gl';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer } from '@/lib/mapboxEmbed';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';

interface RoutesFeedCardProps {
  route: FeedRoute;
  onClick: (route: FeedRoute) => void;
  index?: number;
  /** Position courante (ex. fournie par le feed — une seule requête GPS pour la liste). */
  mapUserPosition?: { lat: number; lng: number } | null;
}

const formatElevation = (meters: number | null) => {
  if (!meters) return "N/A";
  return `${Math.round(meters)} m`;
};

const ROUTE_SRC = 'routes-feed-mini-line';
const ROUTE_LAYER = 'routes-feed-mini-line-layer';

export const RoutesFeedCard = ({ route, onClick, index = 0, mapUserPosition }: RoutesFeedCardProps) => {
  const { formatMeters, formatKm } = useDistanceUnits();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const userLocationMarkerRef = useRef<Marker | null>(null);
  const [miniMapReady, setMiniMapReady] = useState(false);
  const { position: hookPosition, getCurrentPosition } = useGeolocation();
  const position = mapUserPosition !== undefined ? mapUserPosition : hookPosition;

  useEffect(() => {
    if (mapUserPosition !== undefined) return;
    void getCurrentPosition();
  }, [mapUserPosition, getCurrentPosition]);

  useEffect(() => {
    if (!mapContainer.current || !route.coordinates?.length || !getMapboxAccessToken()) return;

    let cancelled = false;
    setMiniMapReady(false);
    userLocationMarkerRef.current?.remove();
    userLocationMarkerRef.current = null;
    mapRef.current?.remove();
    mapRef.current = null;

    void (async () => {
      const path = route.coordinates
        .map((coord: unknown) => {
          const c = coord as Record<string, unknown> | unknown[];
          if (c && typeof c === 'object' && !Array.isArray(c) && c.lat != null && c.lng != null) {
            return { lat: Number(c.lat), lng: Number(c.lng) } as MapCoord;
          }
          if (Array.isArray(coord) && coord.length >= 2) {
            return { lat: Number(coord[0]), lng: Number(coord[1]) } as MapCoord;
          }
          return null;
        })
        .filter((p): p is MapCoord => p !== null && Number.isFinite(p.lat) && Number.isFinite(p.lng));

      if (path.length === 0 || !mapContainer.current) return;

      try {
        const mapInstance = await createEmbeddedMapboxMap(mapContainer.current, {
          center: path[0],
          zoom: 10,
          interactive: false,
        });
        if (cancelled) {
          mapInstance.remove();
          return;
        }
        mapRef.current = mapInstance;
        const afterLoad = () => {
          if (cancelled || !mapRef.current) return;
          setOrUpdateLineLayer(mapRef.current, ROUTE_SRC, ROUTE_LAYER, path, {
            color: '#5B7CFF',
            width: 3,
          });
          void fitMapToCoords(mapRef.current, path, 20);
          if (!cancelled) setMiniMapReady(true);
        };
        if (mapInstance.isStyleLoaded()) afterLoad();
        else mapInstance.once('load', afterLoad);
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setMiniMapReady(false);
    };
  }, [route.coordinates]);

  useEffect(() => {
    if (!miniMapReady || !mapRef.current) return;
    if (!position) {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      return;
    }
    userLocationMarkerRef.current?.remove();
    void (async () => {
      const mk = await createUserLocationMapboxMarker(position.lng, position.lat);
      if (!mapRef.current) {
        mk.remove();
        return;
      }
      userLocationMarkerRef.current = mk.addTo(mapRef.current);
    })();
  }, [position, miniMapReady]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-3.5 w-3.5",
          i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
        )}
      />
    ));
  };

  return (
    <div
      className="ios-card rounded-ios-lg border border-border overflow-hidden cursor-pointer active:opacity-90 transition-opacity shadow-sm animate-fade-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
      onClick={() => onClick(route)}
    >
      <div className="relative h-40 bg-secondary">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '160px' }} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card/90 via-card/40 to-transparent dark:from-card/85 dark:via-card/35"
          aria-hidden
        />
        <div className="absolute top-ios-2 left-ios-2 z-[1]">
          <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm text-ios-caption1 gap-ios-1 rounded-full border border-border/60">
            <ActivityIcon activityType={route.activity_type} size="sm" />
            {ACTIVITY_TYPES.find((a) => a.value === route.activity_type)?.label || route.activity_type}
          </Badge>
        </div>
        {route.distance_from_user > 0 && (
          <div className="absolute top-ios-2 right-ios-2 z-[1]">
            <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm text-ios-caption1 tabular-nums rounded-full border border-border/60">
              {formatKm(route.distance_from_user)}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-ios-4 space-y-ios-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-ios-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-border/50">
              <AvatarImage src={route.creator.avatar_url || undefined} />
              <AvatarFallback className="text-ios-footnote">
                {route.creator.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-ios-title3 font-semibold truncate leading-tight">{route.name}</h3>
              <p className="text-ios-footnote text-muted-foreground truncate mt-0.5">
                par {route.creator.display_name || route.creator.username}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-ios-4 gap-y-ios-1">
          <div className="flex items-center gap-ios-1 text-ios-footnote">
            <Route className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">{formatMeters(route.total_distance)}</span>
          </div>
          <div className="flex items-center gap-ios-1 text-ios-footnote">
            <Mountain className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-foreground">{formatElevation(route.total_elevation_gain)}</span>
          </div>
          {route.photo_count > 0 && (
            <div className="flex items-center gap-ios-1 text-ios-footnote">
              <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">{route.photo_count}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-ios-2">
          <div className="flex items-center gap-0.5">{renderStars(route.avg_rating)}</div>
          {route.rating_count > 0 && (
            <span className="text-ios-footnote text-muted-foreground">
              ({route.avg_rating.toFixed(1)}) · {route.rating_count} avis
            </span>
          )}
          {route.rating_count === 0 && <span className="text-ios-footnote text-muted-foreground">Aucun avis</span>}
        </div>

        {route.description && (
          <p className="text-ios-footnote text-muted-foreground line-clamp-2 leading-snug">{route.description}</p>
        )}
      </div>
    </div>
  );
};
