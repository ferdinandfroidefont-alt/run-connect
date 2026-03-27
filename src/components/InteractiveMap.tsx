import { RouteDialog } from './RouteDialog';
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { getKeyBody } from '@/lib/googleMapsKey';
import { MapControls } from './MapControls';
import { MapStyleSelector } from './MapStyleSelector';
import { CreateSessionWizard } from './session-creation/CreateSessionWizard';
import { SessionDetailsDialog } from './SessionDetailsDialog';
import { SessionPreviewPopup } from './SessionPreviewPopup';
import { StreakBadge } from './StreakBadge';
import { MapIosColoredFab } from '@/components/map/MapIosColoredFab';

import { useAuth } from '@/hooks/useAuth';
import { useAppContext } from '@/contexts/AppContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { openLocationSettings } from '@/lib/native';
import { supabase } from '@/integrations/supabase/client';
import { generateRunConnectMarkerSVG, svgToDataUrl, imageUrlToBase64 } from '@/lib/map-marker-generator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MapPin, PersonStanding, Sunrise, Sun, Moon, Maximize2, ArrowLeft, Settings, Clock3, Users, CalendarDays, SlidersHorizontal, Activity, Route } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ElevationProfile } from './ElevationProfile';
import { useShareProfile } from '@/hooks/useShareProfile';
import { QRShareDialog } from './QRShareDialog';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const NotificationCenter = lazy(() =>
  import('./NotificationCenter').then((m) => ({ default: m.NotificationCenter }))
);
const SettingsDialog = lazy(() =>
  import('./SettingsDialog').then((m) => ({ default: m.SettingsDialog }))
);
const ProfileDialog = lazy(() =>
  import('./ProfileDialog').then((m) => ({ default: m.ProfileDialog }))
);
const UserSessionsDialog = lazy(() =>
  import('./UserSessionsDialog').then((m) => ({ default: m.UserSessionsDialog }))
);

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google;
  }
}
interface Session {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  session_type: string;
  intensity: string;
  location_lat: number;
  location_lng: number;
  location_name: string;
  scheduled_at: string;
  max_participants: number;
  current_participants: number;
  organizer_id: string;
  club_id?: string | null;
  image_url?: string;
  calculated_level?: number;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  routes?: {
    id: string;
    name: string;
    coordinates: any[];
    total_distance: number;
    total_elevation_gain: number;
  } | null;
}
interface Filter {
  activity_types: string[];
  session_types: string[];
  search_query: string;
  selected_date: Date;
  friends_only: boolean;
  selected_club_ids: string[];
  time_slot: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  level: number | null;
}

// Time slot definitions for filtering sessions by time of day
const TIME_SLOTS = [
  { id: "morning" as const, icon: Sunrise, label: "6h-12h", startHour: 6, endHour: 12 },
  { id: "afternoon" as const, icon: Sun, label: "12h-18h", startHour: 12, endHour: 18 },
  { id: "evening" as const, icon: Moon, label: "18h-23h", startHour: 18, endHour: 23 },
  { id: "night" as const, icon: Moon, label: "23h-6h", startHour: 23, endHour: 6 },
];

/** Couleur d’icône sur fond blanc (état non sélectionné) — sélection = tout en bleu iOS */
/** Icônes créneaux sur fond blanc : teintes proches des pastilles Réglages (moins saturées que avant) */
const TIME_SLOT_ICON_CLASS: Record<'morning' | 'afternoon' | 'evening' | 'night', string> = {
  morning: 'text-[#FF9500]',
  afternoon: 'text-[#C9A018]',
  evening: 'text-[#5856D6]',
  night: 'text-[#3730A3]',
};

const ACTIVITY_OPTIONS = [
  { id: 'all', label: 'Tous sports', values: [] as string[] },
  { id: 'course', label: 'Course', values: ['course'] },
  { id: 'velo', label: 'Vélo', values: ['velo'] },
  { id: 'natation', label: 'Natation', values: ['natation'] },
  { id: 'marche', label: 'Marche', values: ['marche'] },
];

const SESSION_TYPE_OPTIONS = [
  { id: 'all', label: 'Tous types', values: [] as string[] },
  { id: 'footing', label: 'Footing', values: ['footing'] },
  { id: 'sortie_longue', label: 'Longue', values: ['sortie_longue'] },
  { id: 'fractionne', label: 'Fractionné', values: ['fractionne'] },
  { id: 'competition', label: 'Compétition', values: ['competition'] },
];

type ExpandedFilter = 'time' | 'club' | 'day' | 'level' | null;

interface ClubFilterOption {
  id: string;
  name: string;
  memberCount: number;
}

interface InteractiveMapProps {
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  highlightSessionId?: string;
  /** Faux quand la carte est masquée (onglet autre page) mais toujours montée — déclenche un resize au retour. */
  isActive?: boolean;
}

// Factory function to create HTMLMarker class when Google Maps is loaded
const createHTMLMarkerClass = (): any => {
  return class HTMLMarker extends google.maps.OverlayView {
    private position: google.maps.LatLng;
    private content: HTMLDivElement;
    private onClick: () => void;
    constructor(position: google.maps.LatLng, content: HTMLDivElement, onClick: () => void) {
      super();
      this.position = position;
      this.content = content;
      this.onClick = onClick;

      // Add click listener
      this.content.addEventListener('click', this.onClick);
    }
    onAdd() {
      const panes = (this as any).getPanes();
      if (panes) {
        panes.overlayMouseTarget.appendChild(this.content);
      }
    }
    draw() {
      const overlayProjection = (this as any).getProjection();
      if (overlayProjection) {
        const pos = overlayProjection.fromLatLngToDivPixel(this.position);
        if (pos) {
          this.content.style.left = pos.x + 'px';
          this.content.style.top = pos.y + 'px';
        }
      }
    }
    onRemove() {
      if (this.content && this.content.parentElement) {
        this.content.removeEventListener('click', this.onClick);
        this.content.parentElement.removeChild(this.content);
      }
    }
    getPosition() {
      return this.position;
    }
    setVisible(visible: boolean) {
      this.content.style.display = visible ? 'block' : 'none';
    }
  };
};
export const InteractiveMap = ({
  initialLat,
  initialLng,
  initialZoom,
  highlightSessionId,
  isActive = true,
}: InteractiveMapProps = {}) => {
  const {
    user,
    subscriptionInfo
  } = useAuth();
  const {
    setRefreshSessions,
    setOpenCreateSession,
    setOpenCreateRoute,
  } = useAppContext();
  const navigate = useNavigate();

  // Track newly created sessions for pulse animation
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());

  // Cache for generated SVG marker data URLs by user ID
  const markerCache = useRef<Map<string, string>>(new Map());

  // Vérifier que l'utilisateur est connecté
  React.useEffect(() => {
    if (!user) {
      console.log('⚠️ InteractiveMap: No user detected, user should be redirected by Layout');
    }
  }, [user]);
  const {
    getCurrentPosition
  } = useGeolocation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<any[]>([]);
  const sessionPolylines = useRef<google.maps.Polyline[]>([]);
  const userLocationMarker = useRef<google.maps.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState('roadmap');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [previewSession, setPreviewSession] = useState<Session | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [presetLocation, setPresetLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [filters, setFilters] = useState<Filter>({
    activity_types: [],
    session_types: [],
    search_query: '',
    selected_date: new Date(),
    friends_only: false,
    selected_club_ids: [],
    time_slot: null,
    level: null
  });
  const [searchAutocomplete, setSearchAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [userProfile, setUserProfile] = useState<{
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isUserSessionsOpen, setIsUserSessionsOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<ExpandedFilter>(null);
  const [clubFilters, setClubFilters] = useState<ClubFilterOption[]>([]);

  const toggleImmersiveMode = () => {
    setIsImmersiveMode(prev => {
      const next = !prev;
      // Ne plus cacher la barre de navigation en mode immersif
      return next;
    });
  };

  // Share profile hook
  const {
    shareProfile,
    showQRDialog,
    setShowQRDialog,
    qrData
  } = useShareProfile();
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    const loadClubFilters = async () => {
      if (!user?.id) {
        setClubFilters([]);
        return;
      }
      try {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('conversation_id')
          .eq('user_id', user.id);
        const ids = (memberships || []).map((m) => m.conversation_id);
        if (ids.length === 0) {
          setClubFilters([]);
          return;
        }
        const { data: clubs } = await supabase
          .from('conversations')
          .select('id, group_name')
          .in('id', ids)
          .eq('is_group', true)
          .order('group_name');
        const withCounts = await Promise.all(
          (clubs || []).map(async (club) => {
            const { count } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', club.id);
            return { id: club.id, name: club.group_name || 'Club', memberCount: count || 0 };
          })
        );
        setClubFilters(withCounts);
      } catch {
        setClubFilters([]);
      }
    };
    void loadClubFilters();
  }, [user?.id]);

  const cycleActivity = () => {
    const current = ACTIVITY_OPTIONS.findIndex((opt) => JSON.stringify(opt.values) === JSON.stringify(filters.activity_types));
    const next = ACTIVITY_OPTIONS[(current + 1) % ACTIVITY_OPTIONS.length];
    setFilters((prev) => ({ ...prev, activity_types: next.values }));
  };

  const cycleSessionType = () => {
    const current = SESSION_TYPE_OPTIONS.findIndex((opt) => JSON.stringify(opt.values) === JSON.stringify(filters.session_types));
    const next = SESSION_TYPE_OPTIONS[(current + 1) % SESSION_TYPE_OPTIONS.length];
    setFilters((prev) => ({ ...prev, session_types: next.values }));
  };

  const activeActivityLabel = ACTIVITY_OPTIONS.find((opt) => JSON.stringify(opt.values) === JSON.stringify(filters.activity_types))?.label || 'Sport';
  const activeSessionTypeLabel = SESSION_TYPE_OPTIONS.find((opt) => JSON.stringify(opt.values) === JSON.stringify(filters.session_types))?.label || 'Type';

  // Check URL parameters for route creation mode
  const [isRouteCreationMode, setIsRouteCreationMode] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldCreateRoute = urlParams.get('createRoute') === 'true';
    console.log('🔍 Initial route creation mode from URL:', shouldCreateRoute);
    return shouldCreateRoute;
  });
  const routePath = useRef<google.maps.Polyline | null>(null);
  const routeCoordinates = useRef<google.maps.LatLng[]>([]);
  const waypoints = useRef<google.maps.LatLng[]>([]);
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [showElevationProfile, setShowElevationProfile] = useState(true);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  const elevationService = useRef<google.maps.ElevationService | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);

  // Handle URL parameter changes for route creation and save
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldCreateRoute = urlParams.get('createRoute') === 'true';
    const shouldSaveRoute = urlParams.get('saveRoute') === 'true';
    if (shouldCreateRoute && !isRouteCreationMode) {
      console.log('🎯 URL parameter detected - activating route creation mode');
      setIsRouteCreationMode(true);

      // Clear the URL parameter after activation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      console.log('✅ URL parameter cleared');
    }
    if (shouldSaveRoute) {
      console.log('💾 URL parameter detected - opening route save dialog');

      // Récupérer les données du parcours depuis localStorage
      const pendingRouteData = localStorage.getItem('pendingRoute');
      if (pendingRouteData) {
        try {
          const routeData = JSON.parse(pendingRouteData);
          routeCoordinates.current = routeData.coordinates.map((coord: any) => new google.maps.LatLng(coord.lat, coord.lng));
          setRouteElevations(routeData.elevations || []);
          
          // Stocker les waypoints si disponibles
          if (routeData.waypoints) {
            waypoints.current = routeData.waypoints.map((wp: any) => new google.maps.LatLng(wp.lat, wp.lng));
          }

          // Ouvrir le dialog de sauvegarde
          setIsRouteDialogOpen(true);

          // Nettoyer localStorage
          localStorage.removeItem('pendingRoute');
        } catch (error) {
          console.error('Erreur lors de la récupération du parcours:', error);
        }
      }

      // Clear the URL parameter after activation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      console.log('✅ URL parameter cleared');
    }
  }, [isRouteCreationMode]);

  // Load user profile
  useEffect(() => {
    if (user) {
      const loadUserProfile = async () => {
        const {
          data: profile
        } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('user_id', user.id).single();
        setUserProfile(profile);
      };
      loadUserProfile();
    }
  }, [user]);

  // Function to mark a session as new with 5 second pulse animation
  const markSessionAsNew = (sessionId: string) => {
    console.log('🆕 Marquage de la séance comme nouvelle:', sessionId);
    setNewSessionIds(prev => new Set(prev).add(sessionId));

    // Remove from new sessions after 5 seconds
    setTimeout(() => {
      console.log('⏰ Retrait de l\'animation de pulsation pour:', sessionId);
      setNewSessionIds(prev => {
        const updated = new Set(prev);
        updated.delete(sessionId);
        return updated;
      });
    }, 5000);
  };

  // Register refresh function with context
  useEffect(() => {
    setRefreshSessions(() => loadSessions);
    setOpenCreateSession(() => setIsCreateDialogOpen(true));
    setOpenCreateRoute(handleCreateRoute);
  }, [setRefreshSessions, setOpenCreateSession, setOpenCreateRoute]);

  // Load sessions with automatic retry for new session detection
  const loadSessionsWithRetry = async (retryCount = 0, maxRetries = 3) => {
    await loadSessions();

    // Retry with increasing delays if needed (500ms, 1000ms, 1500ms)
    if (retryCount < maxRetries) {
      const delay = (retryCount + 1) * 500;
      console.log(`🔄 Rechargement automatique ${retryCount + 1}/${maxRetries} dans ${delay}ms`);
      setTimeout(() => {
        loadSessionsWithRetry(retryCount + 1, maxRetries);
      }, delay);
    }
  };

  // Load sessions from database
  const loadSessions = async () => {
    try {
      // Get start and end of selected date
      const startOfDay = new Date(filters.selected_date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.selected_date);
      endOfDay.setHours(23, 59, 59, 999);
      let query = supabase.from('sessions').select('*').gte('scheduled_at', startOfDay.toISOString()).lte('scheduled_at', endOfDay.toISOString());

      // Club filter (multi-select): garder les séances de clubs sélectionnés + les siennes
      if (filters.selected_club_ids.length > 0 && user) {
        const clubConditions = filters.selected_club_ids.map((id) => `club_id.eq.${id}`).join(',');
        query = query.or(`${clubConditions},organizer_id.eq.${user.id}`);
      } else if (filters.selected_club_ids.length > 0) {
        query = query.in('club_id', filters.selected_club_ids);
      }

      // If friends_only filter is active, show sessions from friends AND user's own sessions
      if (filters.friends_only && user) {
        // Get user's friends first
        const {
          data: friends
        } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id).eq('status', 'accepted');
        const friendIds = friends?.map(f => f.following_id) || [];

        // ALWAYS include user's own sessions
        const allowedIds = [...friendIds, user.id];
        if (allowedIds.length > 0) {
          query = query.in('organizer_id', allowedIds);
        } else {
          // Even without friends, show at least user's own sessions
          query = query.eq('organizer_id', user.id);
        }
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;

      // Filter sessions based on visibility rules
      let visibleSessions = data || [];
      if (user) {
        // Get user's friends for visibility checks
        const {
          data: userFriends
        } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id).eq('status', 'accepted');
        const friendIds = userFriends?.map(f => f.following_id) || [];

        // Get user's clubs for visibility checks
        const {
          data: userClubs
        } = await supabase.from('group_members').select('conversation_id').eq('user_id', user.id);
        const clubIds = userClubs?.map(c => c.conversation_id) || [];

        // Filter sessions based on visibility rules
        visibleSessions = visibleSessions.filter(session => {
          // User can always see their own sessions
          if (session.organizer_id === user.id) {
            return true;
          }

          // Sessions for specific clubs - only visible to club members
          if (session.club_id) {
            return clubIds.includes(session.club_id);
          }

          // Sessions marked as friends_only - only visible to friends
          if (session.friends_only) {
            return friendIds.includes(session.organizer_id);
          }

          // Public sessions (not friends_only and no club_id) - visible to everyone
          return !session.friends_only && !session.club_id;
        });
      }

      // Batch-load all organizer profiles and routes in parallel
      const organizerIds = [...new Set(visibleSessions.map(s => s.organizer_id))];
      const routeIds = [...new Set(visibleSessions.map(s => s.route_id).filter(Boolean))] as string[];

      const [profilesResult, routesResult] = await Promise.all([
        organizerIds.length > 0
          ? supabase.from('profiles').select('user_id, username, display_name, avatar_url').in('user_id', organizerIds)
          : Promise.resolve({ data: [] }),
        routeIds.length > 0
          ? supabase.from('routes').select('id, name, coordinates, total_distance, total_elevation_gain').in('id', routeIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));
      const routesMap = new Map((routesResult.data || []).map(r => [r.id, r]));

      const sessionsWithProfiles = visibleSessions.map(session => {
        const profile = profilesMap.get(session.organizer_id);
        const route = session.route_id ? routesMap.get(session.route_id) || null : null;
        return {
          ...session,
          profiles: profile || {
            username: 'Utilisateur',
            display_name: 'Utilisateur',
            avatar_url: null
          },
          routes: route
        };
      });

      // Log user's own sessions for visibility verification
      const userSessions = sessionsWithProfiles.filter(s => s.organizer_id === user?.id);
      console.log(`✅ Vos propres sessions visibles: ${userSessions.length}`, userSessions.map(s => ({
        id: s.id,
        title: s.title,
        organizer_id: s.organizer_id,
        has_avatar: !!s.profiles?.avatar_url,
        avatar_url: s.profiles?.avatar_url
      })));
      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Erreur lors du chargement des séances');
    }
  };

  // Create map markers for sessions
  const createMarkers = async () => {
    if (!map.current || !window.google) return;

    // Clear marker cache to force regeneration with updated design
    markerCache.current.clear();
    console.log('🗑️ Marker cache cleared - regenerating all markers');

    // Clear existing markers and polylines
    markers.current.forEach(marker => {
      if (marker instanceof google.maps.Marker) {
        marker.setMap(null);
      } else if (marker.setMap) {
        // Custom HTML marker
        marker.setMap(null);
      }
    });
    sessionPolylines.current.forEach(polyline => polyline.setMap(null));
    markers.current = [];
    sessionPolylines.current = [];

    // Filter sessions based on current filters
    const filteredSessions = sessions.filter(session => {
      const matchesActivity = filters.activity_types.length === 0 || filters.activity_types.includes(session.activity_type);
      const matchesType = filters.session_types.length === 0 || filters.session_types.includes(session.session_type);
      const matchesSearch = !filters.search_query || session.title.toLowerCase().includes(filters.search_query.toLowerCase()) || session.location_name.toLowerCase().includes(filters.search_query.toLowerCase());
      
      // Time slot filter
      let matchesTimeSlot = true;
      if (filters.time_slot) {
        const slot = TIME_SLOTS.find(s => s.id === filters.time_slot);
        if (slot) {
          const sessionHour = new Date(session.scheduled_at).getHours();
          if (slot.id === 'night') {
            matchesTimeSlot = sessionHour >= slot.startHour || sessionHour < slot.endHour;
          } else {
            matchesTimeSlot = sessionHour >= slot.startHour && sessionHour < slot.endHour;
          }
        }
      }

      // Level filter - show sessions at selected level or higher (minimum level)
      const matchesLevel = !filters.level || (
        (session.calculated_level || 3) >= filters.level
      );
      
      return matchesActivity && matchesType && matchesSearch && matchesTimeSlot && matchesLevel;
    });
    console.log(`Creating markers for ${filteredSessions.length} sessions`);
    console.log('Sessions with profiles:', filteredSessions.map(s => ({
      id: s.id,
      title: s.title,
      hasProfile: !!s.profiles,
      avatarUrl: s.profiles?.avatar_url,
      hasRoute: !!s.routes
    })));

    // Create markers for filtered sessions with error handling
    const markerPromises = filteredSessions.map(async (session, index) => {
      try {
        // Ensure session has valid data
        if (!session.location_lat || !session.location_lng || !session.profiles) {
          console.warn(`Session ${session.id} missing required data:`, {
            lat: session.location_lat,
            lng: session.location_lng,
            profiles: session.profiles
          });
          return null;
        }
        const markerIcon = await createCustomMarker(session);
        const isNewSession = newSessionIds.has(session.id);
        
        // Check if session is imminent (starts in less than 2 hours)
        const sessionDate = new Date(session.scheduled_at);
        const now = new Date();
        const diffMs = sessionDate.getTime() - now.getTime();
        const diffMinutes = diffMs / 60000;
        const isImminent = diffMinutes > 0 && diffMinutes <= 120; // 0 to 2 hours
        
        if (isNewSession || isImminent) {
          // Create HTML marker with pulse animation for new or imminent sessions
          const HTMLMarkerClass = createHTMLMarkerClass();
          const markerDiv = document.createElement('div');
          markerDiv.style.position = 'absolute';
          markerDiv.style.transform = 'translate(-50%, -100%)';
          markerDiv.style.cursor = 'pointer';
          const img = document.createElement('img');
          img.src = markerIcon;
          img.style.width = '48px';
          img.style.height = '60px';
          img.className = isNewSession ? 'pulse-marker-animation' : 'imminent-marker-animation';
          markerDiv.appendChild(img);
          const position = new google.maps.LatLng(Number(session.location_lat), Number(session.location_lng));
          const htmlMarker = new HTMLMarkerClass(position, markerDiv, () => {
            setPreviewSession(session);
          });
          htmlMarker.setMap(map.current);
          return htmlMarker;
        } else {
          // Create standard marker for normal sessions
          const marker = new google.maps.Marker({
            position: {
              lat: Number(session.location_lat),
              lng: Number(session.location_lng)
            },
            map: map.current,
            title: session.title,
            icon: {
              url: markerIcon,
              scaledSize: new google.maps.Size(48, 60),
              anchor: new google.maps.Point(24, 60)
            }
          });
          marker.addListener('click', () => {
            setPreviewSession(session);
          });
          return marker;
        }
      } catch (error) {
        console.error(`Error creating marker for session ${session.id}:`, error);

        // Create a basic marker as fallback
        try {
          const fallbackMarker = new google.maps.Marker({
            position: {
              lat: Number(session.location_lat),
              lng: Number(session.location_lng)
            },
            map: map.current,
            title: session.title,
            icon: {
              url: getFallbackIcon(session.activity_type),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40)
            }
          });
          fallbackMarker.addListener('click', () => {
            setPreviewSession(session);
          });
          return fallbackMarker;
        } catch (fallbackError) {
          console.error(`Failed to create fallback marker for session ${session.id}:`, fallbackError);
          return null;
        }
      }
    });

    // Wait for all markers to be created and add successful ones
    const createdMarkers = await Promise.all(markerPromises);
    const validMarkers = createdMarkers.filter(marker => marker !== null);
    markers.current = validMarkers;
    console.log(`Successfully created ${validMarkers.length} markers out of ${filteredSessions.length} sessions`);
  };
  const createCustomMarker = async (session: Session): Promise<string> => {
    console.log('🎨 Creating RunConnect custom marker for session:', session.id, session.title);

    // Validation des données de session
    if (!session || !session.profiles) {
      console.warn('Session or profiles missing:', session);
      return getFallbackIcon(session?.activity_type || 'course');
    }
    const organizerId = session.organizer_id;

    // Check cache first
    if (markerCache.current.has(organizerId)) {
      console.log('✅ Using cached marker for user:', organizerId);
      return markerCache.current.get(organizerId)!;
    }

    // Generate new RunConnect SVG marker with base64 image
    const profileImageUrl = session.profiles.avatar_url || '/placeholder.svg';
    console.log('🖼️ Generating SVG marker with profile image:', profileImageUrl);
    try {
      // Convert image to base64 first
      const base64Image = await imageUrlToBase64(profileImageUrl);
      console.log('📸 Image converted to base64, length:', base64Image.length);
      const svg = generateRunConnectMarkerSVG(base64Image, 48);
      const dataUrl = svgToDataUrl(svg);

      // Cache the generated marker
      markerCache.current.set(organizerId, dataUrl);
      console.log('✨ RunConnect marker generated and cached for user:', organizerId);
      return dataUrl;
    } catch (error) {
      console.error('❌ Error generating RunConnect marker:', error);
      return getFallbackIcon(session.activity_type);
    }
  };
  const getActivityColor = (activityType: string) => {
    const colors: Record<string, string> = {
      'course': '#ef4444',
      'trail': '#f97316',
      // Orange pour le trail
      'velo': '#3b82f6',
      'vtt': '#059669',
      // Vert pour le VTT
      'marche': '#22c55e',
      'natation': '#0d9488'
    };
    return colors[activityType] || colors['course'];
  };
  const getFallbackIcon = (activityType: string) => {
    // Fallback simple SVG data URL
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNlZjQ0NDQiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNlZjQ0NDQiLz48L3N2Zz4=';
  };

  // Handle shared session link parameters
  useEffect(() => {
    if (isMapLoaded && map.current && initialLat && initialLng) {
      // Center map on shared session location
      const sessionLocation = {
        lat: initialLat,
        lng: initialLng
      };
      map.current.setCenter(sessionLocation);
      if (initialZoom) {
        map.current.setZoom(initialZoom);
      }
      console.log('Map centered on shared session:', sessionLocation);
    }
  }, [isMapLoaded, initialLat, initialLng, initialZoom]);

  // Highlight and open shared session when sessions are loaded
  useEffect(() => {
    if (highlightSessionId && sessions.length > 0) {
      const sharedSession = sessions.find(session => session.id === highlightSessionId);
      if (sharedSession) {
        setSelectedSession(sharedSession);
        console.log('Opened shared session:', sharedSession.title);
      }
    }
  }, [highlightSessionId, sessions]);

  // Retour sur l’accueil après une autre page : la carte était invisible (taille 0) — forcer un resize.
  useEffect(() => {
    if (!isMapLoaded || !map.current || !isActive) return;
    const id = requestAnimationFrame(() => {
      if (map.current) {
        google.maps.event.trigger(map.current, "resize");
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isActive, isMapLoaded]);

  // Real-time updates for sessions with improved mobile support
  useEffect(() => {
    if (!user) return;
    loadSessions();
    
    // Create a unique channel name for better mobile WebSocket handling
    const channelName = `sessions-realtime-${user.id}-${Date.now()}`;
    console.log('📡 Subscribing to realtime channel:', channelName);
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sessions'
      }, (payload) => {
        console.log('🆕 Realtime: New session detected', payload);
        // Immediate reload on insert
        loadSessions();
        
        // Mark as new for animation if it's the user's session
        if (payload.new && (payload.new as any).organizer_id === user.id) {
          markSessionAsNew((payload.new as any).id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions'
      }, (payload) => {
        console.log('✏️ Realtime: Session updated', payload);
        loadSessions();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'sessions'
      }, (payload) => {
        console.log('🗑️ Realtime: Session deleted', payload);
        loadSessions();
      })
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.warn('📡 Realtime channel error, reloading sessions manually');
          // Fallback: reload sessions periodically on error
          setTimeout(() => loadSessions(), 1000);
        }
      });
      
    return () => {
      console.log('📡 Unsubscribing from realtime channel');
      supabase.removeChannel(channel);
    };
  }, [user, filters.selected_date, filters.friends_only, filters.selected_club_ids]);

  // Initialize search autocomplete separately
  useEffect(() => {
    if (isMapLoaded && searchInputRef.current && !searchAutocomplete) {
      console.log('Initializing search autocomplete...');
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode'],
        componentRestrictions: {
          country: 'fr'
        }
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Place selected:', place);
        if (place.geometry && place.geometry.location && map.current) {
          // Center map on selected location
          map.current.setCenter(place.geometry.location);
          map.current.setZoom(15);

          // Update search query
          setFilters(prev => ({
            ...prev,
            search_query: place.formatted_address || place.name || ''
          }));
        }
      });
      setSearchAutocomplete(autocomplete);
      console.log('Search autocomplete initialized');
    }
  }, [isMapLoaded, searchAutocomplete]);

  // Update markers when sessions or filters change
  useEffect(() => {
    if (isMapLoaded && map.current) {
      createMarkers();
    }
  }, [sessions, filters, isMapLoaded]);
  useEffect(() => {
    if (!mapContainer.current || isMapLoaded) return;
    const initializeMap = async () => {
      try {
        // Récupérer la clé API Google Maps depuis Supabase
        const {
          data: apiKeyData,
          error: apiKeyError
        } = await supabase.functions.invoke('google-maps-proxy', {
          body: getKeyBody()
        });

        if (apiKeyError) {
          throw new Error(`google-maps-proxy get-key failed: ${apiKeyError.message}`);
        }

        const googleMapsApiKey = apiKeyData?.apiKey;
        if (!googleMapsApiKey) {
          throw new Error('Google Maps API key indisponible');
        }

        const loader = new Loader({
          apiKey: googleMapsApiKey,
          version: 'weekly',
          libraries: ['geometry', 'places']
        });
        await loader.load();
        if (!mapContainer.current) return;

        // Initialize map
        map.current = new google.maps.Map(mapContainer.current, {
          zoom: 12,
          center: {
            lat: 48.8566,
            lng: 2.3522
          },
          // Paris coordinates
          mapTypeId: currentStyle as google.maps.MapTypeId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          gestureHandling: 'greedy',
          styles: currentStyle === 'custom' ? [{
            featureType: 'all',
            elementType: 'geometry.fill',
            stylers: [{
              color: '#f5f5f5'
            }]
          }, {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{
              color: '#c9c9c9'
            }]
          }] : undefined
        });
        setIsMapLoaded(true);

        // Initialize elevation and directions services
        elevationService.current = new google.maps.ElevationService();
        directionsService.current = new google.maps.DirectionsService();
        directionsRenderer.current = new google.maps.DirectionsRenderer({
          draggable: false,
          map: null,
          // Don't attach to map by default
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeOpacity: 1.0,
            strokeWeight: 4
          }
        });

        // Add event listeners for map interactions
        let touchTimer: NodeJS.Timeout | null = null;

        // Long press handler for creating sessions (mobile-friendly) - controlled by user settings
        map.current.addListener('mousedown', (event: google.maps.MapMouseEvent) => {
          // Don't create session if in route creation mode
          if (isRouteCreationMode) return;

          // Check user preference for long press to create session
          const enableLongPressCreate = localStorage.getItem('enableLongPressCreate') === 'true';
          if (!enableLongPressCreate) return;
          touchTimer = setTimeout(() => {
            handleCreateSessionAtLocation(event.latLng);
            touchTimer = null;
          }, 600); // 600ms for long press (reduced for better UX)
        });
        map.current.addListener('mouseup', () => {
          // Don't handle mouseup if in route creation mode
          if (isRouteCreationMode) return;
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
        });
        map.current.addListener('mousemove', () => {
          // Don't handle mousemove if in route creation mode
          if (isRouteCreationMode) return;
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
        });

        // Try to get user's location using Capacitor with detailed logging
        console.log("🗺️ Début tentative géolocalisation");
        getCurrentPosition().then(position => {
          console.log("🗺️ Position reçue dans InteractiveMap:", position);
          if (position) {
            setUserLocation(position);
            map.current?.setCenter(position);
            map.current?.setZoom(14);
            console.log("✅ Carte centrée sur position utilisateur:", position);
          } else {
            console.log("❌ Position null reçue");
            throw new Error("No position returned");
          }
        }).catch(error => {
          console.error("❌ Erreur géolocalisation dans InteractiveMap:", error);

          // Message d'erreur plus informatif
          let errorMessage = "Localisation non disponible";
          let shouldShowSettings = false;
          if (error.message?.includes('Permission') || error.message?.includes('denied')) {
            errorMessage = "Autorisations de localisation requises - Cliquez pour ouvrir les paramètres";
            shouldShowSettings = true;
          } else if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
            errorMessage = "Délai de localisation dépassé - Réessayez";
          } else if (error.message?.includes('unavailable')) {
            errorMessage = "Service de localisation indisponible - Vérifiez vos paramètres";
            shouldShowSettings = true;
          }
          if (shouldShowSettings) {
            toast.error(errorMessage, {
              action: {
                label: "Paramètres",
                onClick: openLocationSettings
              }
            });
          }

          // Don't set default location for marker display
          console.log("🗺️ Pas de position disponible, pas de marqueur");
        });
      } catch (error) {
        console.error('Erreur lors du chargement de Google Maps:', error);
        toast.error("Erreur lors du chargement de la carte");
      }
    };
    initializeMap();
  }, [currentStyle]);

  // Create user location marker with pulsating animation
  useEffect(() => {
    if (!map.current || !userLocation || !isMapLoaded) return;

    // Remove old marker if it exists
    if (userLocationMarker.current) {
      userLocationMarker.current.setMap(null);
    }

    // Create pulsating blue marker for user location
    const createPulsatingMarker = () => {
      const size = 60;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Create gradient for pulse effect
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 5, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)'); // primary blue with opacity
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

      // Draw pulsating circle
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      ctx.fill();

      // Draw solid center dot
      ctx.fillStyle = '#3b82f6'; // primary blue
      ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
      ctx.fill();

      // White border around center
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
      ctx.stroke();
      return canvas.toDataURL('image/png');
    };
    const markerIcon = createPulsatingMarker();
    userLocationMarker.current = new google.maps.Marker({
      position: userLocation,
      map: map.current,
      icon: {
        url: markerIcon,
        scaledSize: new google.maps.Size(60, 60),
        anchor: new google.maps.Point(30, 30)
      },
      zIndex: 1000,
      // Above other markers
      title: 'Votre position'
    });
    console.log('✅ User location marker created with pulse animation');

    // Animate the pulse effect
    let scale = 1;
    let growing = true;
    const animate = () => {
      if (!userLocationMarker.current) return;
      if (growing) {
        scale += 0.02;
        if (scale >= 1.3) growing = false;
      } else {
        scale -= 0.02;
        if (scale <= 1) growing = true;
      }
      const animatedIcon = userLocationMarker.current.getIcon() as google.maps.Icon;
      if (animatedIcon && animatedIcon.scaledSize) {
        userLocationMarker.current.setIcon({
          ...animatedIcon,
          scaledSize: new google.maps.Size(60 * scale, 60 * scale),
          anchor: new google.maps.Point(30 * scale, 30 * scale)
        });
      }
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationId);
      if (userLocationMarker.current) {
        userLocationMarker.current.setMap(null);
      }
    };
  }, [userLocation, isMapLoaded]);
  const handleStyleChange = (style: string) => {
    setCurrentStyle(style);
    if (map.current) {
      if (style === 'custom') {
        map.current.setOptions({
          styles: [{
            featureType: 'all',
            elementType: 'geometry.fill',
            stylers: [{
              color: '#f5f5f5'
            }]
          }, {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{
              color: '#c9c9c9'
            }]
          }]
        });
      } else {
        map.current.setMapTypeId(style as google.maps.MapTypeId);
        map.current.setOptions({
          styles: undefined
        });
      }
    }
  };
  const handleCreateRoute = () => {
    console.log('🗺️ InteractiveMap handleCreateRoute called - navigating to route creation');
    navigate('/route-create');
  };
  const createDirectionsRoute = () => {
    if (!directionsService.current || !directionsRenderer.current || waypoints.current.length < 2) return;
    const origin = waypoints.current[0];
    const destination = waypoints.current[waypoints.current.length - 1];
    const waypointsForDirections = waypoints.current.slice(1, -1).map(point => ({
      location: point,
      stopover: true
    }));
    const request: google.maps.DirectionsRequest = {
      origin: origin,
      destination: destination,
      waypoints: waypointsForDirections,
      travelMode: google.maps.TravelMode.WALKING,
      // or BICYCLING for cycling routes
      optimizeWaypoints: false
    };
    directionsService.current.route(request, (result, status) => {
      if (status === 'OK' && result) {
        // Set the directions renderer to display the route
        directionsRenderer.current!.setMap(map.current);
        directionsRenderer.current!.setDirections(result);

        // Extract coordinates from the route for elevation calculation
        const route = result.routes[0];
        routeCoordinates.current = [];
        route.legs.forEach(leg => {
          leg.steps.forEach(step => {
            step.path.forEach(point => {
              routeCoordinates.current.push(point);
            });
          });
        });

        // Update elevation profile with the new route
        updateElevationProfile();
      } else {
        toast.error('Impossible de créer un itinéraire suivant les routes');
        console.error('Directions request failed due to:', status);
      }
    });
  };
  const updateElevationProfile = async () => {
    if (!elevationService.current || routeCoordinates.current.length === 0) return;
    try {
      // Pour les longs itinéraires, on augmente significativement le nombre d'échantillons
      // Plus de points = calcul plus précis du dénivelé
      const routeLength = routeCoordinates.current.length;
      let samples = Math.max(100, Math.min(routeLength * 2, 512)); // Minimum 100 points, maximum 512 (limite API)

      // Pour les très longs itinéraires, on prend le maximum de points possible
      if (routeLength > 100) {
        samples = 512; // Maximum autorisé par l'API Google Maps
      }
      const elevationRequest = {
        path: routeCoordinates.current,
        samples: samples
      };
      elevationService.current.getElevationAlongPath(elevationRequest, (results, status) => {
        if (status === 'OK' && results) {
          const elevations = results.map(result => result.elevation);
          setRouteElevations(elevations);
        }
      });
    } catch (error) {
      console.error('Erreur lors du calcul du dénivelé:', error);
    }
  };
  const calculateRouteStats = () => {
    if (routeElevations.length === 0) return null;
    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    const minElevation = Math.min(...routeElevations);
    const maxElevation = Math.max(...routeElevations);

    // Calculate total distance
    for (let i = 1; i < routeCoordinates.current.length; i++) {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(routeCoordinates.current[i - 1], routeCoordinates.current[i]);
      totalDistance += distance;
    }

    // Calculate elevation gain/loss avec un seuil minimum pour éviter le bruit
    // On ignore les variations très petites qui peuvent être dues à l'imprécision des données
    const elevationThreshold = 1; // Minimum 1m de différence pour compter comme un dénivelé

    for (let i = 1; i < routeElevations.length; i++) {
      const diff = routeElevations[i] - routeElevations[i - 1];
      // Suppression du seuil pour capturer tous les dénivelés, même petits
      if (diff > 0) {
        elevationGain += diff;
      } else if (diff < 0) {
        elevationLoss += Math.abs(diff);
      }
    }
    return {
      totalDistance: Math.round(totalDistance / 1000),
      // Convert meters to kilometers
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
      minElevation: Math.round(minElevation),
      maxElevation: Math.round(maxElevation)
    };
  };
  const saveRoute = async (routeName: string, routeDescription: string) => {
    if (!user || routeCoordinates.current.length < 2) return false;
    const routeStats = calculateRouteStats();
    if (!routeStats) return false;
    try {
      const coordinates = routeCoordinates.current.map((coord, index) => ({
        lat: coord.lat(),
        lng: coord.lng(),
        elevation: routeElevations[index] || 0
      }));
      
      // Sauvegarder les waypoints s'ils existent
      const waypointsData = waypoints.current.length > 0 
        ? waypoints.current.map(wp => ({
            lat: wp.lat(),
            lng: wp.lng(),
            mode: 'manual' as const
          }))
        : [];
      
      const {
        error
      } = await supabase.from('routes').insert({
        name: routeName,
        description: routeDescription,
        coordinates: coordinates,
        waypoints: waypointsData,
        total_distance: routeStats.totalDistance,
        total_elevation_gain: routeStats.elevationGain,
        total_elevation_loss: routeStats.elevationLoss,
        min_elevation: routeStats.minElevation,
        max_elevation: routeStats.maxElevation,
        created_by: user.id
      });
      if (error) throw error;
      toast('Itinéraire enregistré avec succès!');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast('Erreur lors de l\'enregistrement de l\'itinéraire');
      return false;
    }
  };
  const finishRouteCreation = () => {
    if (waypoints.current.length < 2) {
      toast('Vous devez tracer au moins 2 points pour créer un itinéraire');
      return;
    }
    setIsRouteDialogOpen(true);
  };
  const handleSaveRoute = async (routeName: string, routeDescription: string, createSession?: boolean) => {
    setRouteSaving(true);
    const success = await saveRoute(routeName, routeDescription);
    setRouteSaving(false);
    if (success) {
      setIsRouteDialogOpen(false);
      setIsRouteCreationMode(false);

      // Remove click listener
      if (map.current) {
        const listener = map.current.get('routeClickListener');
        if (listener) {
          google.maps.event.removeListener(listener);
        }
      }

      // Show markers again
      loadSessions();
      if (createSession) {
        // Sauvegarder les coordonnées du début AVANT de les effacer
        const startLat = waypoints.current.length > 0 ? waypoints.current[0].lat() : 48.8566;
        const startLng = waypoints.current.length > 0 ? waypoints.current[0].lng() : 2.3522;

        // Clear route data first
        if (directionsRenderer.current) {
          directionsRenderer.current.setMap(null);
        }
        routeCoordinates.current = [];
        waypoints.current = [];
        setRouteElevations([]);

        // Now open create session dialog with saved coordinates
        setPresetLocation({
          lat: startLat,
          lng: startLng
        });
        setIsCreateDialogOpen(true);
      } else {
        // Clear route data
        if (directionsRenderer.current) {
          directionsRenderer.current.setMap(null);
        }
        routeCoordinates.current = [];
        waypoints.current = [];
        setRouteElevations([]);

        // Rediriger vers la page "Mes itinéraires"
        navigate('/my-sessions?tab=routes');
      }
    }
  };
  const cancelRouteCreation = () => {
    setIsRouteCreationMode(false);

    // Remove click listener
    if (map.current) {
      const listener = map.current.get('routeClickListener');
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    }

    // Clear route
    if (routePath.current) {
      routePath.current.setMap(null);
    }
    if (directionsRenderer.current) {
      directionsRenderer.current.setMap(null);
    }
    routeCoordinates.current = [];
    waypoints.current = [];
    setRouteElevations([]);

    // Show markers again
    markers.current.forEach(marker => marker.setVisible(true));
  };
  const updateRoutePath = () => {
    if (!map.current || routeCoordinates.current.length === 0) return;

    // Remove existing path
    if (routePath.current) {
      routePath.current.setMap(null);
    }

    // Create new path
    routePath.current = new google.maps.Polyline({
      path: routeCoordinates.current,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 1.0,
      strokeWeight: 4
    });
    routePath.current.setMap(map.current);
  };
  const handleResetView = () => {
    if (map.current) {
      map.current.panTo({
        lat: 48.8566,
        lng: 2.3522
      });
      map.current.setZoom(12);
    }
  };
  const handleLocateMe = async () => {
    if (!map.current) return;
    console.log("🗺️ handleLocateMe");
    try {
      const position = await getCurrentPosition();
      if (position) {
        map.current.setCenter(position);
        map.current.setZoom(16);
      } else {
        toast.error("Impossible de vous localiser");
      }
    } catch (error) {
      console.log("Geolocation error:", error);
      toast.error("Impossible de vous localiser");
    }
  };
  const handleCreateSessionAtLocation = (latLng: google.maps.LatLng | null) => {
    // Don't create session if in route creation mode
    if (isRouteCreationMode) {
      console.log('🚫 Session creation blocked - route creation mode active');
      return;
    }
    if (!latLng || !user) {
      toast.error("Connectez-vous pour créer une séance");
      return;
    }
    setPresetLocation({
      lat: latLng.lat(),
      lng: latLng.lng()
    });
    setIsCreateDialogOpen(true);
  };
  return <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 bg-secondary" data-tutorial="map-container" />
      
      {/* Immersive Mode: Minimal top bar with back button */}
      {isImmersiveMode && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-card pt-[var(--safe-area-top)]">
          <div className="flex items-center px-4 py-2 border-b border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleImmersiveMode}
              className="px-0 font-normal"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </Button>
          </div>
        </div>
      )}

      {/* Header + recherche fusionnés (carrousel filtres en dessous, hors du bloc) — masqué en mode immersif */}
      {!isImmersiveMode && (
        <div className="absolute left-0 right-0 top-0 z-10 pt-[var(--safe-area-top)]">
          {/* Un seul panneau : barre d’outils + champ recherche — pas de « double bloc » empilé */}
          <div
            className={cn(
              "border-b border-border/25 dark:border-white/[0.055]",
              "bg-background/90 supports-[backdrop-filter]:bg-background/76",
              "backdrop-blur-[14px] backdrop-saturate-150"
            )}
          >
            <div className="relative flex min-h-[52px] items-center justify-between gap-2 px-4 pb-3 pt-5 sm:min-h-[56px] sm:pb-3.5 sm:pt-6 ios-map-header">
              <h1 className="flex min-w-0 shrink items-center text-lg font-semibold leading-none tracking-tight text-primary">
                Runconnect
              </h1>

              {userProfile && (
                <div className="absolute left-1/2 z-[1] -translate-x-1/2" data-tutorial="profile-avatar">
                  <div
                    onClick={() => setShowProfileDialog(true)}
                    className="relative flex cursor-pointer flex-col items-center transition-all duration-200 hover-scale hover-glow"
                  >
                    <Avatar className="h-[52px] w-[52px] ring-2 ring-primary/15 transition-all duration-200 hover:ring-primary/35 sm:h-14 sm:w-14">
                      <AvatarImage
                        src={userProfile.avatar_url || undefined}
                        alt={userProfile.username || userProfile.display_name}
                      />
                      <AvatarFallback className="text-lg">
                        {(userProfile.username || userProfile.display_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user && (
                      <div className="absolute -bottom-1 -right-1 scale-75">
                        <StreakBadge userId={user.id} variant="compact" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div data-tutorial="notifications" className="flex shrink-0 items-center justify-center">
                  <Suspense
                    fallback={
                      <div
                        className="h-[40px] w-[40px] shrink-0 rounded-[13px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card"
                        aria-hidden
                      />
                    }
                  >
                    <NotificationCenter onSessionUpdated={loadSessions} />
                  </Suspense>
                </div>
                <button
                  type="button"
                  className={cn(
                    "flex h-[40px] w-[40px] shrink-0 touch-manipulation items-center justify-center rounded-[13px] outline-none",
                    "text-foreground transition-[opacity,transform] active:scale-[0.97] active:opacity-80",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                  aria-label="Paramètres"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings className="h-[22px] w-[22px]" strokeWidth={1.85} />
                </button>
              </div>
            </div>

            {/* Recherche : fond quasi identique au header — icône + texte seuls ressortent, léger relief au focus */}
            <div className="px-4 pb-4 pt-2.5 sm:pt-3">
              <div
                className={cn(
                  "flex min-h-[44px] items-center gap-3 px-1 py-1.5 sm:min-h-[46px]",
                  "rounded-xl bg-transparent",
                  "transition-[background-color] duration-200 ease-out",
                  "focus-within:bg-foreground/[0.045] dark:focus-within:bg-white/[0.06]"
                )}
              >
                <Search
                  className="h-[17px] w-[17px] shrink-0 text-muted-foreground sm:h-[18px] sm:w-[18px]"
                  strokeWidth={2.05}
                  aria-hidden
                />
                <Input
                  ref={searchInputRef}
                  placeholder="Rechercher un lieu ou une séance…"
                  value={filters.search_query}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search_query: e.target.value,
                    }))
                  }
                  className={cn(
                    "h-10 min-w-0 flex-1 border-0 bg-transparent py-0 text-[15px] leading-snug tracking-tight text-foreground",
                    "shadow-none placeholder:text-muted-foreground/82",
                    "focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0",
                    "focus-visible:ring-0 focus-visible:ring-offset-0"
                  )}
                  aria-label="Rechercher un lieu ou une séance"
                />
              </div>
            </div>
          </div>

          {/* Carrousel de filtres : séparé visuellement, sur le fond carte */}
          <div className="px-4 pb-4 pt-3">
            <div className="space-y-2">
            <div className="ios-inset-group rounded-[18px] bg-card/95 p-2 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.35)]">
              <div className="overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch]">
                <div className="flex min-w-max snap-x snap-mandatory items-center gap-2">
                <button
                  type="button"
                  onClick={cycleActivity}
                  className={cn(
                    "ios-chip snap-start",
                    filters.activity_types.length > 0 && "ios-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Sport: {activeActivityLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'time' ? null : 'time'))}
                  className={cn("ios-chip snap-start", filters.time_slot && "ios-chip-active")}
                >
                  <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Horaire</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, friends_only: !prev.friends_only }))}
                  className={cn("ios-chip snap-start", filters.friends_only && "ios-chip-active")}
                >
                  <span className="flex items-center gap-1.5"><PersonStanding className="h-3.5 w-3.5" /> Amis uniquement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'club' ? null : 'club'))}
                  className={cn("ios-chip snap-start", filters.selected_club_ids.length > 0 && "ios-chip-active")}
                >
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Club{filters.selected_club_ids.length > 0 ? ` (${filters.selected_club_ids.length})` : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={cycleSessionType}
                  className={cn(
                    "ios-chip snap-start",
                    filters.session_types.length > 0 && "ios-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Route className="h-3.5 w-3.5" /> Type: {activeSessionTypeLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'day' ? null : 'day'))}
                  className={cn("ios-chip snap-start", expandedFilter === 'day' && "ios-chip-active")}
                >
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Jour</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'level' ? null : 'level'))}
                  className={cn("ios-chip snap-start", filters.level && "ios-chip-active")}
                >
                  <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Niveau séance</span>
                </button>
                </div>
              </div>
            </div>

            <AnimatePresence initial={false} mode="wait">
              {expandedFilter && (
                <motion.div
                  key={expandedFilter}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  className="ios-card rounded-[16px] border border-black/10 bg-card/98 p-3"
                >
                  {expandedFilter === 'time' && (
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const active = filters.time_slot === slot.id;
                        const Icon = slot.icon;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setFilters((prev) => ({ ...prev, time_slot: prev.time_slot === slot.id ? null : slot.id }))}
                            className={cn(
                              "h-12 rounded-xl border text-xs font-medium transition-colors",
                              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
                            )}
                          >
                            <span className="flex items-center justify-center gap-1"><Icon className={cn("h-3.5 w-3.5", !active && TIME_SLOT_ICON_CLASS[slot.id])} />{slot.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {expandedFilter === 'club' && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, selected_club_ids: [] }))}
                        className={cn(
                          "h-9 w-full rounded-xl border text-left px-3 text-xs",
                          filters.selected_club_ids.length === 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                        )}
                      >
                        Tous les clubs
                      </button>
                      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                        {clubFilters.map((club) => {
                          const active = filters.selected_club_ids.includes(club.id);
                          return (
                            <button
                              key={club.id}
                              type="button"
                              onClick={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  selected_club_ids: active
                                    ? prev.selected_club_ids.filter((id) => id !== club.id)
                                    : [...prev.selected_club_ids, club.id],
                                }))
                              }
                              className={cn(
                                "h-10 w-full rounded-xl border px-3 text-left text-xs",
                                active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                              )}
                            >
                              <span className="flex items-center justify-between">
                                <span className="truncate">{club.name}</span>
                                <span className="text-[10px] text-muted-foreground">{club.memberCount}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {expandedFilter === 'day' && (
                    <CalendarComponent
                      mode="single"
                      selected={filters.selected_date}
                      onSelect={(date) => date && setFilters((prev) => ({ ...prev, selected_date: date }))}
                      initialFocus
                      className="pointer-events-auto p-0"
                    />
                  )}

                  {expandedFilter === 'level' && (
                    <div className="grid grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setFilters((prev) => ({ ...prev, level: prev.level === lvl ? null : lvl }))}
                          className={cn(
                            "h-10 rounded-xl border text-sm font-semibold",
                            filters.level === lvl ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                          )}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      )}

      {/* Route Creation Mode Banner */}
      {isRouteCreationMode && <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-blue-600 text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-sm font-medium">
              Mode création d'itinéraire - Cliquez sur la carte pour créer un parcours qui suit les routes
            </span>
            <div className="flex gap-2">
              <Button size="sm" className="bg-white text-blue-600 hover:bg-gray-100 font-medium" onClick={finishRouteCreation} disabled={waypoints.current.length < 2}>
                Terminer
              </Button>
              <Button size="sm" variant="outline" onClick={cancelRouteCreation}>
                Annuler
              </Button>
            </div>
          </div>
        </div>}

      {/* Elevation Profile - Show during route creation */}
      {isRouteCreationMode && showElevationProfile && <div className="absolute bottom-6 right-6 z-20">
          <ElevationProfile elevations={routeElevations} routeStats={calculateRouteStats()} />
        </div>}

      {/* Toggle Elevation Profile Button */}
      {isRouteCreationMode && <div className="absolute bottom-4 left-20 z-20">
          <Button variant="outline" size="sm" onClick={() => setShowElevationProfile(!showElevationProfile)} className="bg-white/90 backdrop-blur-sm shadow-lg border-2 hover:bg-white" title={showElevationProfile ? "Masquer le profil d'élévation" : "Afficher le profil d'élévation"}>
            {showElevationProfile ? "📈 Masquer profil" : "📈 Profil"}
          </Button>
        </div>}

      {/* All Map Controls - iOS Style */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 ios-map-bottom-buttons">
        <MapIosColoredFab
          tone="gray"
          title="Carte plein écran"
          onClick={toggleImmersiveMode}
          className="bg-white text-black shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] [&_span]:text-black [&_span_svg]:stroke-black [&_span_svg]:text-black"
        >
          <Maximize2 className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </MapIosColoredFab>

        <MapIosColoredFab
          tone="gray"
          title="Me localiser"
          onClick={handleLocateMe}
          className="bg-white text-black shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] [&_span]:text-black [&_span_svg]:stroke-black [&_span_svg]:text-black"
        >
          <MapPin className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </MapIosColoredFab>

        <MapStyleSelector currentStyle={currentStyle} onStyleChange={handleStyleChange} />

        <MapControls onResetView={handleResetView} />
      </div>
      

      {/* Create Session Wizard */}
      <CreateSessionWizard isOpen={isCreateDialogOpen} onClose={() => {
      setIsCreateDialogOpen(false);
      setPresetLocation(null);
    }} onSessionCreated={async (sessionId) => {
      console.log('🎯 Session created callback triggered, sessionId:', sessionId);
      
      if (sessionId) {
        markSessionAsNew(sessionId);
      }
      
      // Immediate load for faster display
      await loadSessions();
      
      // Mobile-specific: Force multiple reloads with increasing delays
      // This ensures the session appears even if WebSocket is slow
      const reloadDelays = [500, 1500, 3000, 5000];
      reloadDelays.forEach((delay) => {
        setTimeout(async () => {
          console.log(`🔄 Mobile retry: Reloading sessions after ${delay}ms`);
          await loadSessions();
        }, delay);
      });
    }} map={map.current} presetLocation={presetLocation} onCreateRoute={handleCreateRoute} />

      {/* Session Preview Popup */}
      <SessionPreviewPopup
        session={previewSession}
        onClose={() => setPreviewSession(null)}
        onViewDetails={() => {
          if (previewSession) {
            setSelectedSession(previewSession);
            setPreviewSession(null);
          }
        }}
        isImminent={previewSession ? (() => {
          const sessionDate = new Date(previewSession.scheduled_at);
          const now = new Date();
          const diffMs = sessionDate.getTime() - now.getTime();
          const diffMinutes = diffMs / 60000;
          return diffMinutes > 0 && diffMinutes <= 120;
        })() : false}
      />

      {/* Session Details Dialog */}
      <SessionDetailsDialog session={selectedSession} onClose={() => setSelectedSession(null)} onSessionUpdated={loadSessions} />
      
      <Suspense fallback={null}>
      <Suspense fallback={null}>
        <ProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} />
      </Suspense>
      </Suspense>

      <Suspense fallback={null}>
      <Suspense fallback={null}>
        <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
      </Suspense>
      </Suspense>

      {/* User Sessions Dialog */}
      <Suspense fallback={null}>
      <Suspense fallback={null}>
        <UserSessionsDialog isOpen={isUserSessionsOpen} onClose={() => setIsUserSessionsOpen(false)} />
      </Suspense>
      </Suspense>


      {/* QR Share Dialog */}
      {qrData && <QRShareDialog open={showQRDialog} onOpenChange={setShowQRDialog} profileUrl={qrData.profileUrl} username={qrData.username} displayName={qrData.displayName} avatarUrl={qrData.avatarUrl} referralCode={qrData.referralCode} />}

      {/* Route Dialog */}
      <RouteDialog isOpen={isRouteDialogOpen} onClose={() => setIsRouteDialogOpen(false)} onSave={handleSaveRoute} title="Créer un itinéraire" loading={routeSaving} showCreateSessionOption={true} />
    </div>;
};