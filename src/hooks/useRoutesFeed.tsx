import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { toast } from 'sonner';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';

export interface FeedRoute {
  id: string;
  name: string;
  description: string | null;
  total_distance: number | null;
  total_elevation_gain: number | null;
  activity_type: string;
  coordinates: any;
  created_at: string;
  created_by: string;
  distance_from_user: number;
  avg_rating: number;
  rating_count: number;
  photo_count: number;
  creator: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Find the minimum distance from user position to any point along the route */
const getMinDistanceToRoute = (
  userLat: number,
  userLng: number,
  coordinates: any
): number => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return Infinity;
  let minDist = Infinity;
  for (const point of coordinates) {
    let lat: number, lng: number;
    if (point?.lat !== undefined && point?.lng !== undefined) {
      lat = Number(point.lat);
      lng = Number(point.lng);
    } else if (Array.isArray(point) && point.length >= 2) {
      lat = Number(point[0]);
      lng = Number(point[1]);
    } else {
      continue;
    }
    const d = calculateDistance(userLat, userLng, lat, lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

export const useRoutesFeed = () => {
  const { user } = useAuth();
  const { position, loading: locationLoading, getCurrentPosition } = useGeolocation();
  const [routes, setRoutes] = useState<FeedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxProximity, setMaxProximity] = useState(50);
  const [maxRouteDistance, setMaxRouteDistance] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    ACTIVITY_TYPES.map(a => a.value)
  );
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    if (!hasRequestedLocation.current && !position && !locationLoading) {
      hasRequestedLocation.current = true;
      getCurrentPosition();
    }
  }, [position, locationLoading, getCurrentPosition]);

  const loadRoutes = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: routesData, error } = await supabase
        .from('routes')
        .select('*')
        .eq('is_public', true)
        .neq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!routesData || routesData.length === 0) {
        setRoutes([]);
        return;
      }

      const creatorIds = [...new Set(routesData.map(r => r.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds);

      const routeIds = routesData.map(r => r.id);
      const { data: ratings } = await supabase
        .from('route_ratings')
        .select('route_id, rating')
        .in('route_id', routeIds);

      const { data: photos } = await supabase
        .from('route_photos')
        .select('route_id')
        .in('route_id', routeIds);

      const ratingMap = new Map<string, { sum: number; count: number }>();
      (ratings || []).forEach(r => {
        const entry = ratingMap.get(r.route_id) || { sum: 0, count: 0 };
        entry.sum += r.rating;
        entry.count += 1;
        ratingMap.set(r.route_id, entry);
      });

      const photoCountMap = new Map<string, number>();
      (photos || []).forEach(p => {
        photoCountMap.set(p.route_id, (photoCountMap.get(p.route_id) || 0) + 1);
      });

      const feedRoutes: FeedRoute[] = routesData
        .map(route => {
          const distanceFromUser = position
            ? getMinDistanceToRoute(position.lat, position.lng, route.coordinates)
            : 0;
          const creator = profiles?.find(p => p.user_id === route.created_by);
          const ratingInfo = ratingMap.get(route.id);

          return {
            id: route.id,
            name: route.name,
            description: route.description,
            total_distance: route.total_distance,
            total_elevation_gain: route.total_elevation_gain,
            activity_type: (route as any).activity_type || 'course',
            coordinates: route.coordinates,
            created_at: route.created_at,
            created_by: route.created_by,
            distance_from_user: distanceFromUser,
            avg_rating: ratingInfo ? ratingInfo.sum / ratingInfo.count : 0,
            rating_count: ratingInfo?.count || 0,
            photo_count: photoCountMap.get(route.id) || 0,
            creator: creator
              ? { user_id: creator.user_id!, username: creator.username || 'user', display_name: creator.display_name || 'Utilisateur', avatar_url: creator.avatar_url }
              : { user_id: route.created_by, username: 'user', display_name: 'Utilisateur', avatar_url: null },
          };
        })
        .filter(route => {
          if (position && route.distance_from_user > maxProximity) return false;
          if (selectedActivities.length > 0 && !selectedActivities.includes(route.activity_type)) return false;
          if (maxRouteDistance && route.total_distance && route.total_distance > maxRouteDistance) return false;
          if (minRating > 0 && route.avg_rating < minRating) return false;
          return true;
        })
        .sort((a, b) => {
          if (position) return a.distance_from_user - b.distance_from_user;
          return b.avg_rating - a.avg_rating;
        });

      setRoutes(feedRoutes);
    } catch (error) {
      console.error('Error loading routes feed:', error);
      toast.error('Erreur lors du chargement des itinéraires');
    } finally {
      setLoading(false);
    }
  }, [user, position, maxProximity, maxRouteDistance, minRating, selectedActivities]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const toggleActivity = useCallback((activityValue: string) => {
    setSelectedActivities(prev =>
      prev.includes(activityValue)
        ? prev.filter(a => a !== activityValue)
        : [...prev, activityValue]
    );
  }, []);

  const toggleAllActivities = useCallback(() => {
    if (selectedActivities.length === ACTIVITY_TYPES.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(ACTIVITY_TYPES.map(a => a.value));
    }
  }, [selectedActivities.length]);

  return {
    routes,
    loading: loading || locationLoading,
    hasLocation: !!position,
    maxProximity,
    setMaxProximity,
    maxRouteDistance,
    setMaxRouteDistance,
    minRating,
    setMinRating,
    selectedActivities,
    toggleActivity,
    toggleAllActivities,
    refresh: loadRoutes,
  };
};
