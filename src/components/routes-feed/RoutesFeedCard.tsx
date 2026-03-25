import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { getKeyBody } from '@/lib/googleMapsKey';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ActivityIcon } from '@/lib/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import { Route, Mountain, Star, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceKm, formatDistanceMeters } from '@/lib/distanceUnits';
import { useDistanceUnit } from '@/contexts/DistanceUnitContext';
import type { FeedRoute } from '@/hooks/useRoutesFeed';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getUserLocationMarkerIcon } from '@/lib/mapUserLocationIcon';

interface RoutesFeedCardProps {
  route: FeedRoute;
  onClick: (route: FeedRoute) => void;
  index?: number;
}

const formatElevation = (meters: number | null) => {
  if (!meters) return "N/A";
  return `${Math.round(meters)} m`;
};

export const RoutesFeedCard = ({ route, onClick, index = 0 }: RoutesFeedCardProps) => {
  const { distanceUnit } = useDistanceUnit();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [miniMapReady, setMiniMapReady] = useState(false);
  const { position } = useGeolocation();

  useEffect(() => {
    if (!mapContainer.current || !route.coordinates?.length) return;

    let cancelled = false;
    setMiniMapReady(false);
    userLocationMarkerRef.current?.setMap(null);
    userLocationMarkerRef.current = null;
    mapRef.current = null;

    const initMap = async () => {
      if (!window.google?.maps) {
        try {
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: getKeyBody()
          });
          const googleMapsApiKey = apiKeyData?.apiKey || '';
          if (!googleMapsApiKey) return;
          const loader = new Loader({ apiKey: googleMapsApiKey, version: 'weekly', libraries: ['geometry'] });
          await loader.importLibrary('maps');
        } catch (e) {
          console.error('Failed to load Google Maps', e);
          return;
        }
      }
      if (!mapContainer.current || cancelled) return;
    const path = route.coordinates.map((coord: any) => {
      if (coord.lat !== undefined && coord.lng !== undefined) {
        return { lat: Number(coord.lat), lng: Number(coord.lng) };
      } else if (Array.isArray(coord) && coord.length >= 2) {
        return { lat: Number(coord[0]), lng: Number(coord[1]) };
      }
      return null;
    }).filter(Boolean);

    if (path.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    path.forEach((coord: any) => bounds.extend(coord));

    const mapInstance = new google.maps.Map(mapContainer.current, {
      center: bounds.getCenter(),
      zoom: 10,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      gestureHandling: 'none',
      clickableIcons: false,
      keyboardShortcuts: false,
      styles: [
        { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ]
    });
    mapRef.current = mapInstance;

    new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#5B7CFF',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapInstance,
    });

    mapInstance.fitBounds(bounds, 20);
    if (!cancelled) setMiniMapReady(true);
    };

    initMap();

    return () => {
      cancelled = true;
      userLocationMarkerRef.current?.setMap(null);
      userLocationMarkerRef.current = null;
      mapRef.current = null;
      setMiniMapReady(false);
    };
  }, [route.coordinates]);

  useEffect(() => {
    if (!miniMapReady || !mapRef.current) return;
    if (!position) {
      userLocationMarkerRef.current?.setMap(null);
      userLocationMarkerRef.current = null;
      return;
    }
    userLocationMarkerRef.current?.setMap(null);
    userLocationMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: position.lat, lng: position.lng },
      icon: getUserLocationMarkerIcon(),
      zIndex: 1000,
      title: 'Votre position',
    });
  }, [position, miniMapReady]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-3.5 w-3.5",
          i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
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
      {/* Mini map */}
      <div className="relative h-40 bg-secondary">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '160px' }} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card/90 via-card/40 to-transparent dark:from-card/85 dark:via-card/35"
          aria-hidden
        />
        <div className="absolute top-ios-2 left-ios-2 z-[1]">
          <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm text-ios-caption1 gap-ios-1 rounded-full border border-border/60">
            <ActivityIcon activityType={route.activity_type} size="sm" />
            {ACTIVITY_TYPES.find(a => a.value === route.activity_type)?.label || route.activity_type}
          </Badge>
        </div>
        {route.distance_from_user > 0 && (
          <div className="absolute top-ios-2 right-ios-2 z-[1]">
            <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm text-ios-caption1 tabular-nums rounded-full border border-border/60">
              {formatDistanceKm(route.distance_from_user, distanceUnit)}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-ios-4 space-y-ios-3">
        {/* Header with avatar */}
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

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-ios-4 gap-y-ios-1">
          <div className="flex items-center gap-ios-1 text-ios-footnote">
            <Route className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">
              {route.total_distance != null && route.total_distance > 0
                ? formatDistanceMeters(route.total_distance, distanceUnit)
                : 'N/A'}
            </span>
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

        {/* Rating */}
        <div className="flex flex-wrap items-center gap-ios-2">
          <div className="flex items-center gap-0.5">
            {renderStars(route.avg_rating)}
          </div>
          {route.rating_count > 0 && (
            <span className="text-ios-footnote text-muted-foreground">
              ({route.avg_rating.toFixed(1)}) · {route.rating_count} avis
            </span>
          )}
          {route.rating_count === 0 && (
            <span className="text-ios-footnote text-muted-foreground">Aucun avis</span>
          )}
        </div>

        {route.description && (
          <p className="text-ios-footnote text-muted-foreground line-clamp-2 leading-snug">{route.description}</p>
        )}
      </div>
    </div>
  );
};
