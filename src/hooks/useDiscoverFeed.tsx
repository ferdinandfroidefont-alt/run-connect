import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { toast } from 'sonner';
import {
  canSessionBeDiscovered,
  getSessionPriorityScore,
  getSessionVisualState,
  sortSessionsByDiscovery,
  type SessionVisibilityVisualState,
} from '@/lib/sessionVisibility';

export interface DiscoverSession {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  session_type: string;
  intensity: string | null;
  location_lat: number;
  location_lng: number;
  location_name: string;
  scheduled_at: string;
  max_participants: number | null;
  current_participants: number;
  organizer_id: string;
  is_private: boolean;
  friends_only: boolean;
  distance_km: number;
  calculated_level?: number;
  visibility_tier?: string | null;
  visibility_radius_km?: number | null;
  boost_expires_at?: string | null;
  discovery_score?: number | null;
  visibility_state?: SessionVisibilityVisualState;
  priority_score?: number;
  organizer: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export const ACTIVITY_TYPES = [
  { value: "course", label: "Course" },
  { value: "trail", label: "Trail" },
  { value: "velo", label: "Vélo" },
  { value: "vtt", label: "VTT" },
  { value: "bmx", label: "BMX" },
  { value: "gravel", label: "Gravel" },
  { value: "marche", label: "Marche" },
  { value: "natation", label: "Natation" },
  { value: "football", label: "Football" },
  { value: "basket", label: "Basketball" },
  { value: "volley", label: "Volleyball" },
  { value: "badminton", label: "Badminton" },
  { value: "pingpong", label: "Ping-pong" },
  { value: "tennis", label: "Tennis" },
  { value: "escalade", label: "Escalade" },
  { value: "petanque", label: "Pétanque" },
  { value: "rugby", label: "Rugby" },
  { value: "handball", label: "Handball" },
  { value: "fitness", label: "Fitness" },
  { value: "yoga", label: "Yoga" },
  { value: "musculation", label: "Musculation" },
  { value: "crossfit", label: "CrossFit" },
  { value: "boxe", label: "Boxe" },
  { value: "arts_martiaux", label: "Arts martiaux" },
  { value: "golf", label: "Golf" },
  { value: "ski", label: "Ski" },
  { value: "snowboard", label: "Snowboard" },
  { value: "randonnee", label: "Randonnée" },
  { value: "kayak", label: "Kayak" },
  { value: "surf", label: "Surf" }
];

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useDiscoverFeed = () => {
  const { user } = useAuth();
  const { position, loading: locationLoading, getCurrentPosition } = useGeolocation();
  const [sessions, setSessions] = useState<DiscoverSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDistance, setMaxDistance] = useState(10);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    ACTIVITY_TYPES.map(a => a.value)
  );
  const hasRequestedLocation = useRef(false);

  // Request location on first use
  useEffect(() => {
    if (!hasRequestedLocation.current && !position && !locationLoading) {
      hasRequestedLocation.current = true;
      getCurrentPosition();
    }
  }, [position, locationLoading, getCurrentPosition]);

  const loadSessions = useCallback(async () => {
    if (!user || !position) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .neq('organizer_id', user.id)
        .eq('is_private', false)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Get organizer profiles
      const organizerIds = [...new Set(sessionsData?.map(s => s.organizer_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', organizerIds);

      // Filter by distance and activity, add distance info
      const filteredSessions = (sessionsData || [])
        .map(session => {
          const distanceInKm = calculateDistance(
            position.lat,
            position.lng,
            session.location_lat,
            session.location_lng
          );
          const organizer = profilesData?.find(p => p.user_id === session.organizer_id);
          
          return {
            ...session,
            distance_km: distanceInKm,
            visibility_state: getSessionVisualState(session),
            priority_score: getSessionPriorityScore(session, distanceInKm),
            organizer: organizer || {
              user_id: session.organizer_id,
              username: 'user',
              display_name: 'Utilisateur',
              avatar_url: null
            }
          } as DiscoverSession;
        })
        .filter(session => {
          if (session.friends_only) return false;
          if (!canSessionBeDiscovered(session, session.distance_km)) return false;
          const effectiveRadiusCap = Number.isFinite(maxDistance) ? maxDistance : 10;
          if (session.distance_km > effectiveRadiusCap) return false;
          if (selectedActivities.length > 0 && !selectedActivities.includes(session.activity_type)) {
            return false;
          }
          return true;
        })
        ;

      setSessions(sortSessionsByDiscovery(filteredSessions));
    } catch (error) {
      console.error('Error loading discover sessions:', error);
      toast.error('Erreur lors du chargement des séances');
    } finally {
      setLoading(false);
    }
  }, [user, position, maxDistance, selectedActivities]);

  // Load when filters change
  useEffect(() => {
    if (position) {
      loadSessions();
    }
  }, [position, maxDistance, selectedActivities, loadSessions]);

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

  const resetFilters = useCallback(() => {
    setSelectedActivities(ACTIVITY_TYPES.map(a => a.value));
    setMaxDistance(10);
  }, []);

  const joinSession = useCallback(async (session: DiscoverSession) => {
    if (!user) return;

    try {
      if (session.friends_only) {
        const { error: requestError } = await supabase
          .from('session_requests')
          .insert([{
            session_id: session.id,
            user_id: user.id,
            requester_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur',
            requester_avatar: user.user_metadata?.avatar_url || null
          }]);

        if (requestError) throw requestError;

        toast.success('Demande envoyée à l\'organisateur');
      } else {
        const { error } = await supabase
          .from('session_participants')
          .insert([{
            session_id: session.id,
            user_id: user.id
          }]);

        if (error) throw error;

        await supabase
          .from('sessions')
          .update({ 
            current_participants: session.current_participants + 1 
          })
          .eq('id', session.id);

        toast.success('Vous avez rejoint la séance !');
        loadSessions();
      }
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast.error(error.message || 'Impossible de rejoindre la séance');
    }
  }, [user, loadSessions]);

  return {
    sessions,
    loading: loading || locationLoading,
    hasLocation: !!position,
    maxDistance,
    setMaxDistance,
    selectedActivities,
    toggleActivity,
    toggleAllActivities,
    resetFilters,
    joinSession,
    refresh: loadSessions
  };
};
