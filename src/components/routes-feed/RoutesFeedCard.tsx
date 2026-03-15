import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { getKeyBody } from '@/lib/googleMapsKey';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityIcon } from '@/lib/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import { Route, Mountain, TrendingUp, Star, Camera, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedRoute } from '@/hooks/useRoutesFeed';

interface RoutesFeedCardProps {
  route: FeedRoute;
  onClick: (route: FeedRoute) => void;
  index?: number;
}

const formatDistance = (meters: number | null) => {
  if (!meters) return "N/A";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatElevation = (meters: number | null) => {
  if (!meters) return "N/A";
  return `${Math.round(meters)} m`;
};

export const RoutesFeedCard = ({ route, onClick, index = 0 }: RoutesFeedCardProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !route.coordinates?.length) return;

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
      if (!mapContainer.current) return;
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

    mapRef.current = new google.maps.Map(mapContainer.current, {
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

    new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#5B7CFF',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapRef.current,
    });

    mapRef.current.fitBounds(bounds, 20);

    return () => { mapRef.current = null; };
    };

    initMap();

    return () => { mapRef.current = null; };
  }, [route.coordinates]);

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
      className="bg-card border-b border-border overflow-hidden cursor-pointer active:bg-secondary/50 transition-colors animate-fade-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
      onClick={() => onClick(route)}
    >
      {/* Mini map */}
      <div className="relative h-40 bg-secondary">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '160px' }} />
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-card/90 text-xs gap-1">
            <ActivityIcon activityType={route.activity_type} size="sm" />
            {ACTIVITY_TYPES.find(a => a.value === route.activity_type)?.label || route.activity_type}
          </Badge>
        </div>
        {route.distance_from_user > 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-card/90 text-xs gap-1">
              <MapPin className="h-3 w-3" />
              {route.distance_from_user.toFixed(1)} km
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Header with avatar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={route.creator.avatar_url || undefined} />
              <AvatarFallback className="text-[13px]">
                {route.creator.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-[17px] font-semibold truncate">{route.name}</h3>
              <p className="text-[13px] text-muted-foreground truncate">
                par {route.creator.display_name || route.creator.username}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-[13px]">
            <Route className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{formatDistance(route.total_distance)}</span>
          </div>
          <div className="flex items-center gap-1 text-[13px]">
            <Mountain className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{formatElevation(route.total_elevation_gain)}</span>
          </div>
          {route.photo_count > 0 && (
            <div className="flex items-center gap-1 text-[13px]">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{route.photo_count}</span>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {renderStars(route.avg_rating)}
          </div>
          {route.rating_count > 0 && (
            <span className="text-[13px] text-muted-foreground">
              ({route.avg_rating.toFixed(1)}) · {route.rating_count} avis
            </span>
          )}
          {route.rating_count === 0 && (
            <span className="text-[13px] text-muted-foreground">Aucun avis</span>
          )}
        </div>

        {route.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2">{route.description}</p>
        )}
      </div>
    </div>
  );
};
