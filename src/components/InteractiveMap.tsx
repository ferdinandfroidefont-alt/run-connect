import { RouteDialog } from './RouteDialog';
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
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
import { Search, MapPin, PersonStanding, Sunrise, Sun, Moon, Maximize2, ArrowLeft, Settings, Clock3, Users, CalendarDays, SlidersHorizontal, Activity, Route, PenTool, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ElevationProfile } from './ElevationProfile';
import { useShareProfile } from '@/hooks/useShareProfile';
import { QRShareDialog } from './QRShareDialog';
import { cn } from '@/lib/utils';
import {
  takePrefetchedHomeMapPositionIfReady,
  waitForPrefetchedHomeMapPosition,
} from '@/lib/homeMapPrefetch';
import { AnimatePresence, motion } from 'framer-motion';
import { getMapboxAccessToken, MAPBOX_NAVIGATION_DAY_STYLE, MAPBOX_STYLE_BY_UI_ID } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';
import { pathLengthMeters } from '@/lib/geoUtils';
import { fetchMapboxDirectionsPath } from '@/lib/mapboxDirections';
import { geocodeForwardDetail } from '@/lib/mapboxGeocode';
import { fetchElevationsForCoords, samplePathCoords } from '@/lib/openElevation';
import { createUserLocationMapboxMarker } from '@/lib/mapUserLocationIcon';

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

const ROUTE_LINE_SOURCE = 'interactive-route-line';
const ROUTE_LINE_LAYER = 'interactive-route-line-layer';

/** Zoom large au premier rendu (aperçu « social » : plus de séances visibles). */
const HOME_MAP_BOOT_ZOOM = 11;
/** Zoom après centrage sur l’utilisateur (plus dézoomé qu’avant ~14, tout en restant lisible). */
const HOME_MAP_USER_ZOOM = 12;
const PARIS_FALLBACK: { lng: number; lat: number } = { lng: 2.3522, lat: 48.8566 };

/** Recentrage utilisateur : zone utile = carte hors header/recherche/filtres et hors tab bar. */
function computeHomeMapViewportPadding(opts: {
  immersive: boolean;
  topStackEl: HTMLElement | null;
}): mapboxgl.PaddingOptions {
  if (opts.immersive) {
    return { top: 80, bottom: 120, left: 14, right: 14 };
  }
  let top = 168;
  if (opts.topStackEl) {
    const b = opts.topStackEl.getBoundingClientRect();
    top = Math.min(Math.floor(window.innerHeight * 0.5), Math.ceil(b.bottom) + 12);
  }
  let bottom = 96;
  if (typeof document !== 'undefined') {
    const navEl = document.querySelector<HTMLElement>('nav[aria-label="Navigation principale"]');
    if (navEl) {
      bottom = Math.ceil(window.innerHeight - navEl.getBoundingClientRect().top) + 12;
    }
  }
  return {
    top: Math.max(56, top),
    bottom: Math.max(72, bottom),
    left: 12,
    right: 12,
  };
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

function coordsToLineString(points: MapCoord[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((p) => [p.lng, p.lat]),
    },
  };
}

const EMPTY_ROUTE_FEATURE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
};

function ensureInteractiveRouteLayer(map: mapboxgl.Map) {
  if (map.getSource(ROUTE_LINE_SOURCE)) return;
  map.addSource(ROUTE_LINE_SOURCE, {
    type: 'geojson',
    data: EMPTY_ROUTE_FEATURE,
  });
  map.addLayer({
    id: ROUTE_LINE_LAYER,
    type: 'line',
    source: ROUTE_LINE_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#2563eb',
      'line-width': 5,
      'line-opacity': 0.94,
    },
  });
}

function setInteractiveRouteLine(map: mapboxgl.Map | null, points: MapCoord[]) {
  if (!map) return;
  const apply = () => {
    if (!map.isStyleLoaded()) return;
    ensureInteractiveRouteLayer(map);
    const src = map.getSource(ROUTE_LINE_SOURCE) as mapboxgl.GeoJSONSource;
    if (points.length >= 2) {
      src.setData(coordsToLineString(points));
    } else {
      src.setData(EMPTY_ROUTE_FEATURE);
    }
  };
  if (map.isStyleLoaded()) apply();
  else map.once('style.load', apply);
}

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
  const { t } = useLanguage();

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
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const sessionPolylines = useRef<unknown[]>([]);
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
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
  const [mapboxMap, setMapboxMap] = useState<mapboxgl.Map | null>(null);
  const [userProfile, setUserProfile] = useState<{
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  /** Bloc header + recherche + carrousel filtres (mesure padding carte). */
  const homeMapTopStackRef = useRef<HTMLDivElement>(null);
  const homeMapFiltersRef = useRef<HTMLDivElement>(null);
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
    const t = window.setTimeout(() => void loadClubFilters(), 200);
    return () => clearTimeout(t);
  }, [user?.id]);

  /** Un seul panneau dérivé ouvert + fermeture au clic extérieur (hors carrousel / panneau filtres). */
  useEffect(() => {
    if (!expandedFilter) return;
    const close = (e: Event) => {
      const el = homeMapFiltersRef.current;
      const t = e.target;
      if (el && t instanceof Node && !el.contains(t)) {
        setExpandedFilter(null);
      }
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [expandedFilter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedFilter(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
  const routeCoordinates = useRef<MapCoord[]>([]);
  const waypoints = useRef<MapCoord[]>([]);
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [showElevationProfile, setShowElevationProfile] = useState(true);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  /** Stats D+ / D- issues de RouteCreation (localStorage) quand le profil alti n’est pas rejoué sur la carte */
  const pendingRouteStatsRef = useRef<{ elevationGain: number; elevationLoss: number } | null>(null);
  /** Waypoints avec mode (manuel / guidé) — les LatLng sur la carte ne portent pas le mode */
  const pendingWaypointsForSaveRef = useRef<Array<{ lat: number; lng: number; mode: 'manual' | 'guided' }> | null>(null);

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
          routeCoordinates.current = routeData.coordinates.map((coord: { lat: number; lng: number }) => ({
            lat: coord.lat,
            lng: coord.lng,
          }));
          setRouteElevations(routeData.elevations || []);

          if (
            typeof routeData.elevationGain === 'number' &&
            typeof routeData.elevationLoss === 'number'
          ) {
            pendingRouteStatsRef.current = {
              elevationGain: routeData.elevationGain,
              elevationLoss: routeData.elevationLoss,
            };
          } else {
            pendingRouteStatsRef.current = null;
          }

          // Stocker les waypoints si disponibles (évite un reste de ref entre deux imports)
          if (Array.isArray(routeData.waypoints) && routeData.waypoints.length > 0) {
            waypoints.current = routeData.waypoints.map((wp: { lat: number; lng: number }) => ({
              lat: wp.lat,
              lng: wp.lng,
            }));
            pendingWaypointsForSaveRef.current = routeData.waypoints.map((wp: any) => ({
              lat: wp.lat,
              lng: wp.lng,
              mode: wp.mode === 'guided' ? 'guided' : 'manual',
            }));
          } else {
            waypoints.current = [];
            pendingWaypointsForSaveRef.current = null;
          }

          // Ouvrir le dialog de sauvegarde
          setIsRouteDialogOpen(true);

          // Nettoyer localStorage
          localStorage.removeItem('pendingRoute');
        } catch (error) {
          console.error('Erreur lors de la récupération du parcours:', error);
          pendingRouteStatsRef.current = null;
          pendingWaypointsForSaveRef.current = null;
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
    if (!map.current) return;

    // Clear existing markers (Mapbox)
    markers.current.forEach((marker) => marker.remove());
    sessionPolylines.current = [];
    markers.current = [];

    // Filter sessions based on current filters
    const searchQ = filters.search_query.trim().toLowerCase();
    const filteredSessions = sessions.filter(session => {
      const matchesActivity = filters.activity_types.length === 0 || filters.activity_types.includes(session.activity_type);
      const matchesType = filters.session_types.length === 0 || filters.session_types.includes(session.session_type);
      const matchesSearch =
        !searchQ ||
        (session.title?.toLowerCase().includes(searchQ) ?? false) ||
        (session.location_name?.toLowerCase().includes(searchQ) ?? false) ||
        (session.profiles?.username?.toLowerCase().includes(searchQ) ?? false) ||
        (session.profiles?.display_name?.toLowerCase().includes(searchQ) ?? false);
      
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
        
        const lng = Number(session.location_lng);
        const lat = Number(session.location_lat);
        const wrap = document.createElement('div');
        wrap.style.cursor = 'pointer';
        const img = document.createElement('img');
        img.src = markerIcon;
        img.alt = '';
        img.style.width = '48px';
        img.style.height = '60px';
        img.style.display = 'block';
        img.draggable = false;
        if (isNewSession) img.className = 'pulse-marker-animation';
        else if (isImminent) img.className = 'imminent-marker-animation';
        wrap.appendChild(img);
        wrap.addEventListener('click', (ev) => {
          ev.stopPropagation();
          setPreviewSession(session);
        });
        const marker = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map.current!);
        return marker;
      } catch (error) {
        console.error(`Error creating marker for session ${session.id}:`, error);

        try {
          const wrap = document.createElement('div');
          wrap.style.cursor = 'pointer';
          const img = document.createElement('img');
          img.src = getFallbackIcon(session.activity_type);
          img.alt = '';
          img.style.width = '40px';
          img.style.height = '40px';
          wrap.appendChild(img);
          wrap.addEventListener('click', (ev) => {
            ev.stopPropagation();
            setPreviewSession(session);
          });
          const fallbackMarker = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
            .setLngLat([Number(session.location_lng), Number(session.location_lat)])
            .addTo(map.current!);
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
      map.current.easeTo({
        center: [initialLng, initialLat],
        zoom: initialZoom ?? map.current.getZoom(),
        duration: 1200,
        essential: true,
      });
      console.log('Map centered on shared session:', { lat: initialLat, lng: initialLng });
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
      map.current?.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [isActive, isMapLoaded]);

  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const id = requestAnimationFrame(() => {
      map.current?.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [expandedFilter, isMapLoaded]);

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

  const markersDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update markers when sessions or filters change (léger debounce → moins de regénérations coûteuses lors des rafraîchissements rapides).
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    if (markersDebounceRef.current) clearTimeout(markersDebounceRef.current);
    markersDebounceRef.current = setTimeout(() => {
      markersDebounceRef.current = null;
      void createMarkers();
    }, 40);
    return () => {
      if (markersDebounceRef.current) clearTimeout(markersDebounceRef.current);
    };
  }, [sessions, filters, isMapLoaded, newSessionIds]);

  useEffect(() => {
    if (!isMapLoaded || !map.current || !isRouteDialogOpen) return;
    if (routeCoordinates.current.length >= 2) {
      setInteractiveRouteLine(map.current, routeCoordinates.current);
    }
  }, [isMapLoaded, isRouteDialogOpen]);

  useEffect(() => {
    if (!mapContainer.current || isMapLoaded) return;

    const token = getMapboxAccessToken();
    if (!token) {
      toast.error('Clé Mapbox manquante — ajoutez VITE_MAPBOX_ACCESS_TOKEN dans .env');
      return;
    }

    mapboxgl.accessToken = token;
    let cancelled = false;

    const boot = () => {
      try {
        if (!mapContainer.current || cancelled) return;

        const prefImmediate = takePrefetchedHomeMapPositionIfReady();
        const mapCenterLngLat: [number, number] = prefImmediate
          ? [prefImmediate.lng, prefImmediate.lat]
          : [PARIS_FALLBACK.lng, PARIS_FALLBACK.lat];
        const styleUrl = MAPBOX_STYLE_BY_UI_ID[currentStyle] ?? MAPBOX_NAVIGATION_DAY_STYLE;

        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: styleUrl,
          center: mapCenterLngLat,
          zoom: HOME_MAP_BOOT_ZOOM,
          pitch: 0,
          antialias: true,
          renderWorldCopies: false,
        });

        mapInstance.on('style.load', () => {
          if (routeCoordinates.current.length >= 2) {
            setInteractiveRouteLine(mapInstance, routeCoordinates.current);
          }
        });

        map.current = mapInstance;

        const PREFETCH_MAX_AGE_MS = 45_000;

        const easeToUserWithChrome = (lng: number, lat: number, zoom: number, duration: number) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const pad = computeHomeMapViewportPadding({
                immersive: false,
                topStackEl: homeMapTopStackRef.current,
              });
              mapInstance.easeTo({
                center: [lng, lat],
                zoom,
                padding: pad,
                duration,
                essential: true,
              });
            });
          });
        };

        const runGeoRefinement = () => {
          if (cancelled || !map.current) return;

          const applyFreshPref = (p: { lat: number; lng: number; ts: number }) => {
            const age = Date.now() - p.ts;
            if (age >= PREFETCH_MAX_AGE_MS) return false;
            setUserLocation({ lat: p.lat, lng: p.lng });
            easeToUserWithChrome(p.lng, p.lat, HOME_MAP_USER_ZOOM, 520);
            return true;
          };

          if (prefImmediate != null && applyFreshPref(prefImmediate)) {
            return;
          }

          void waitForPrefetchedHomeMapPosition(1600).then((latePref) => {
            if (cancelled || !map.current) return;
            if (latePref != null && applyFreshPref(latePref)) {
              return;
            }
            console.log('🗺️ Début tentative géolocalisation');
            getCurrentPosition()
              .then((position) => {
                if (cancelled || !map.current) return;
                console.log('🗺️ Position reçue dans InteractiveMap:', position);
                if (position) {
                  setUserLocation(position);
                  easeToUserWithChrome(position.lng, position.lat, HOME_MAP_USER_ZOOM, 700);
                  console.log('✅ Carte centrée sur position utilisateur:', position);
                } else {
                  throw new Error('No position returned');
                }
              })
              .catch((error: Error) => {
                if (cancelled) return;
                console.error('❌ Erreur géolocalisation dans InteractiveMap:', error);

                let errorMessage = 'Localisation non disponible';
                let shouldShowSettings = false;
                if (error.message?.includes('Permission') || error.message?.includes('denied')) {
                  errorMessage =
                    'Autorisations de localisation requises - Cliquez pour ouvrir les paramètres';
                  shouldShowSettings = true;
                } else if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
                  errorMessage = 'Délai de localisation dépassé - Réessayez';
                } else if (error.message?.includes('unavailable')) {
                  errorMessage = 'Service de localisation indisponible - Vérifiez vos paramètres';
                  shouldShowSettings = true;
                }
                if (shouldShowSettings) {
                  toast.error(errorMessage, {
                    action: {
                      label: 'Paramètres',
                      onClick: openLocationSettings,
                    },
                  });
                }

                console.log('🗺️ Pas de position disponible, pas de marqueur');
              });
          });
        };

        mapInstance.once('load', () => {
          if (cancelled) return;
          setIsMapLoaded(true);
          setMapboxMap(mapInstance);
          requestAnimationFrame(() => requestAnimationFrame(runGeoRefinement));
        });
      } catch (error) {
        console.error('Erreur lors du chargement de Mapbox:', error);
        toast.error('Erreur lors du chargement de la carte');
      }
    };

    boot();

    return () => {
      cancelled = true;
      if (userLocationMarker.current) {
        userLocationMarker.current.remove();
        userLocationMarker.current = null;
      }
      map.current?.remove();
      map.current = null;
      setMapboxMap(null);
      setIsMapLoaded(false);
    };
  }, []);

  /** Marqueur position utilisateur : stable, couleur primaire, mise à jour par setLngLat (évite clignotements). */
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    if (!userLocation) {
      userLocationMarker.current?.remove();
      userLocationMarker.current = null;
      return;
    }

    if (userLocationMarker.current) {
      userLocationMarker.current.setLngLat([userLocation.lng, userLocation.lat]);
      return;
    }

    const marker = createUserLocationMapboxMarker(userLocation.lng, userLocation.lat).addTo(map.current);
    userLocationMarker.current = marker;
  }, [userLocation, isMapLoaded]);
  const handleStyleChange = (style: string) => {
    setCurrentStyle(style);
    const nextStyle = MAPBOX_STYLE_BY_UI_ID[style] ?? MAPBOX_NAVIGATION_DAY_STYLE;
    const m = map.current;
    if (!m) return;
    m.setStyle(nextStyle);
    m.once('style.load', () => {
      if (routeCoordinates.current.length >= 2) {
        setInteractiveRouteLine(m, routeCoordinates.current);
      }
      const pad = computeHomeMapViewportPadding({
        immersive: isImmersiveMode,
        topStackEl: homeMapTopStackRef.current,
      });
      if (style === 'standard3d') {
        m.easeTo({
          pitch: 52,
          padding: pad,
          duration: 700,
          essential: true,
        });
      } else {
        m.easeTo({
          pitch: 0,
          padding: pad,
          duration: 500,
          essential: true,
        });
      }
    });
  };
  const tryGeocodeSearchFromInput = async () => {
    const q = filters.search_query.trim();
    const m = map.current ?? mapboxMap;
    if (!q || !m) {
      if (!m && q) toast.info('Carte non prête — réessayez dans un instant.');
      return;
    }
    // Pas de pays imposé : lieux en France et ailleurs + meilleure tolérance des intitulés
    const hit = await geocodeForwardDetail(q);
    if (!hit) {
      toast.info('Lieu introuvable — essayez une autre formulation ou filtrez les séances par mot-clé.');
      return;
    }
    const padding = computeHomeMapViewportPadding({
      immersive: isImmersiveMode,
      topStackEl: homeMapTopStackRef.current,
    });
    m.easeTo({
      center: [hit.lng, hit.lat],
      zoom: 15,
      padding,
      duration: 1200,
      essential: true,
    });
    setFilters((prev) => ({ ...prev, search_query: hit.placeName }));
  };

  const handleCreateRoute = () => {
    console.log('🗺️ InteractiveMap handleCreateRoute called - navigating to route creation');
    navigate('/route-create');
  };
  const createDirectionsRoute = async () => {
    if (waypoints.current.length < 2) return;
    const path = await fetchMapboxDirectionsPath(waypoints.current, 'walking');
    if (!path?.length) {
      toast.error('Impossible de créer un itinéraire suivant les routes');
      return;
    }
    routeCoordinates.current = path;
    setInteractiveRouteLine(map.current, path);
    await updateElevationProfile();
  };
  const updateElevationProfile = async () => {
    if (routeCoordinates.current.length === 0) return;
    try {
      const routeLength = routeCoordinates.current.length;
      const samples = Math.min(512, Math.max(48, Math.min(routeLength * 2, 512)));
      const sampled = samplePathCoords(routeCoordinates.current, samples);
      const elevations = await fetchElevationsForCoords(sampled);
      setRouteElevations(elevations);
    } catch (error) {
      console.error('Erreur lors du calcul du dénivelé:', error);
    }
  };
  /** Statistiques trajet pour insert `routes` — total_distance en mètres (schéma Supabase). */
  const calculateRouteStats = () => {
    if (routeCoordinates.current.length < 2) return null;

    const totalDistanceM = pathLengthMeters(routeCoordinates.current);

    if (routeElevations.length > 0) {
      let elevationGain = 0;
      let elevationLoss = 0;
      const minElevation = Math.min(...routeElevations);
      const maxElevation = Math.max(...routeElevations);

      for (let i = 1; i < routeElevations.length; i++) {
        const diff = routeElevations[i] - routeElevations[i - 1];
        if (diff > 0) {
          elevationGain += diff;
        } else if (diff < 0) {
          elevationLoss += Math.abs(diff);
        }
      }
      return {
        totalDistance: Math.round(totalDistanceM),
        elevationGain: Math.round(elevationGain),
        elevationLoss: Math.round(elevationLoss),
        minElevation: Math.round(minElevation),
        maxElevation: Math.round(maxElevation),
      };
    }

    const meta = pendingRouteStatsRef.current;
    return {
      totalDistance: Math.round(totalDistanceM),
      elevationGain: meta?.elevationGain ?? 0,
      elevationLoss: meta?.elevationLoss ?? 0,
      minElevation: 0,
      maxElevation: 0,
    };
  };

  const saveRoute = async (routeName: string, routeDescription: string) => {
    if (!user) {
      toast.error('Connectez-vous pour enregistrer un itinéraire');
      return false;
    }
    if (routeCoordinates.current.length < 2) {
      toast.error('Parcours invalide : pas assez de points');
      return false;
    }
    const routeStats = calculateRouteStats();
    if (!routeStats) {
      toast.error('Impossible de calculer les statistiques du parcours');
      return false;
    }
    try {
      const nCoord = routeCoordinates.current.length;
      const elev = routeElevations;
      const coordinates = routeCoordinates.current.map((coord, index) => {
        let el = 0;
        if (elev.length > 0) {
          if (elev.length === nCoord) {
            el = elev[index] ?? 0;
          } else {
            const t = nCoord <= 1 ? 0 : index / (nCoord - 1);
            const ePos = t * (elev.length - 1);
            const a = Math.floor(ePos);
            const b = Math.min(elev.length - 1, a + 1);
            const f = ePos - a;
            el = (elev[a] ?? 0) * (1 - f) + (elev[b] ?? 0) * f;
          }
        }
        return {
          lat: coord.lat,
          lng: coord.lng,
          elevation: Math.round(el),
        };
      });
      
      const pendingWp = pendingWaypointsForSaveRef.current;
      const waypointsData =
        pendingWp && pendingWp.length > 0
          ? pendingWp
          : waypoints.current.length > 0
            ? waypoints.current.map((wp) => ({
                lat: wp.lat,
                lng: wp.lng,
                mode: 'manual' as const,
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
      pendingRouteStatsRef.current = null;
      pendingWaypointsForSaveRef.current = null;
      toast.success('Itinéraire enregistré avec succès !');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error("Erreur lors de l'enregistrement de l'itinéraire");
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
      pendingRouteStatsRef.current = null;
      pendingWaypointsForSaveRef.current = null;
      setIsRouteDialogOpen(false);
      setIsRouteCreationMode(false);

      loadSessions();
      if (createSession) {
        const startLat = waypoints.current.length > 0 ? waypoints.current[0]!.lat : 48.8566;
        const startLng = waypoints.current.length > 0 ? waypoints.current[0]!.lng : 2.3522;

        setInteractiveRouteLine(map.current, []);
        routeCoordinates.current = [];
        waypoints.current = [];
        setRouteElevations([]);

        setPresetLocation({
          lat: startLat,
          lng: startLng
        });
        setIsCreateDialogOpen(true);
      } else {
        setInteractiveRouteLine(map.current, []);
        routeCoordinates.current = [];
        waypoints.current = [];
        setRouteElevations([]);

        navigate('/itinerary/my-routes');
      }
    }
  };
  const cancelRouteCreation = () => {
    setIsRouteCreationMode(false);

    setInteractiveRouteLine(map.current, []);
    routeCoordinates.current = [];
    waypoints.current = [];
    setRouteElevations([]);

    markers.current.forEach((m) => {
      const el = m.getElement();
      if (el) el.style.display = '';
    });
  };
  const updateRoutePath = () => {
    if (!map.current) return;
    setInteractiveRouteLine(map.current, routeCoordinates.current);
  };
  const handleResetView = () => {
    if (map.current) {
      map.current.easeTo({
        center: [PARIS_FALLBACK.lng, PARIS_FALLBACK.lat],
        zoom: HOME_MAP_BOOT_ZOOM,
        duration: 800,
        essential: true,
      });
    }
  };
  const handleLocateMe = async () => {
    if (!map.current) return;
    console.log("🗺️ handleLocateMe");
    try {
      const position = await getCurrentPosition();
      if (position) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const m = map.current;
            if (!m) return;
            const padding = computeHomeMapViewportPadding({
              immersive: isImmersiveMode,
              topStackEl: homeMapTopStackRef.current,
            });
            m.easeTo({
              center: [position.lng, position.lat],
              zoom: 16,
              padding,
              duration: 900,
              essential: true,
            });
          });
        });
      } else {
        toast.error("Impossible de vous localiser");
      }
    } catch (error) {
      console.log("Geolocation error:", error);
      toast.error("Impossible de vous localiser");
    }
  };
  const handleCreateSessionAtLocation = (latLng: mapboxgl.LngLat | null) => {
    if (isRouteCreationMode) {
      console.log('🚫 Session creation blocked - route creation mode active');
      return;
    }
    if (!latLng || !user) {
      toast.error("Connectez-vous pour créer une séance");
      return;
    }
    setPresetLocation({
      lat: latLng.lat,
      lng: latLng.lng
    });
    setIsCreateDialogOpen(true);
  };

  useEffect(() => {
    const m = map.current;
    if (!m || !isMapLoaded) return;
    let touchTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    const armLongPress = (lngLat: mapboxgl.LngLat | null | undefined) => {
      if (!lngLat || isRouteCreationMode) return;
      if (localStorage.getItem('enableLongPressCreate') !== 'true') return;
      clearTimer();
      touchTimer = setTimeout(() => {
        handleCreateSessionAtLocation(lngLat);
        touchTimer = null;
      }, 600);
    };

    const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
      if (e.originalEvent instanceof MouseEvent && e.originalEvent.button !== 0) return;
      armLongPress(e.lngLat ?? null);
    };
    const onTouchStart = (e: mapboxgl.MapTouchEvent) => {
      armLongPress(e.lngLat ?? null);
    };
    const cancelPress = () => clearTimer();

    m.on('mousedown', onMouseDown);
    m.on('touchstart', onTouchStart);
    m.on('mouseup', cancelPress);
    m.on('touchend', cancelPress);
    m.on('mousemove', cancelPress);
    m.on('touchmove', cancelPress);
    m.on('dragstart', cancelPress);

    return () => {
      clearTimer();
      m.off('mousedown', onMouseDown);
      m.off('touchstart', onTouchStart);
      m.off('mouseup', cancelPress);
      m.off('touchend', cancelPress);
      m.off('mousemove', cancelPress);
      m.off('touchmove', cancelPress);
      m.off('dragstart', cancelPress);
    };
  }, [isMapLoaded, isRouteCreationMode, user]);
  return (
    <div className="interactive-map-root relative isolate flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
      <div className="interactive-map-canvas-wrap relative min-h-0 w-full flex-1">
        <div
          ref={mapContainer}
          className="relative min-h-0 h-full w-full bg-secondary"
          data-tutorial="map-container"
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] bg-muted/20 transition-opacity duration-200 motion-reduce:transition-none',
            isMapLoaded ? 'opacity-0' : 'opacity-100'
          )}
          aria-hidden
        />
      </div>
      
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

      {/* Bandeau supérieur opaque + barre de recherche flottante (hors header) — masqué en mode immersif */}
      {!isImmersiveMode && (
        <div
          ref={homeMapTopStackRef}
          className="pointer-events-none absolute left-0 right-0 top-0 z-[50]"
        >
          {/*
            Une seule couche d’inset : le header intègre la safe-area.
            z-[50] + .interactive-map-root isolate : la pile UI reste au-dessus du canvas Mapbox (sinon clics / saisie peuvent être « mangés »).
          */}
          <header className="pointer-events-auto border-b border-black/[0.05] bg-white dark:border-white/[0.08] dark:bg-background">
            <div className="relative flex min-h-[2.75rem] items-center justify-between gap-2 px-4 pb-2 pt-[calc(var(--safe-area-top)+0.5rem)] sm:min-h-[3rem] sm:pb-2 sm:pt-[calc(var(--safe-area-top)+0.625rem)] ios-map-header">
              <h1 className="flex min-w-0 shrink items-center text-lg font-semibold leading-none tracking-tight text-primary">
                RunConnect
              </h1>

              {userProfile && (
                <div
                  className="map-header-profile-anchor absolute left-1/2 z-[1] flex [isolation:isolate]"
                  data-tutorial="profile-avatar"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowProfileDialog(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setShowProfileDialog(true);
                      }
                    }}
                    className="relative flex cursor-pointer flex-col items-center outline-none transition-opacity duration-200 active:opacity-85 hover:opacity-95"
                  >
                    {/*
                      avatar-fixed : évite la règle iOS « compact » sur h fixes.
                      Tailles via .map-header-profile-avatar — aligné sur le FAB « + » (3.75rem / 4rem sm).
                    */}
                    <Avatar className="map-header-profile-avatar avatar-fixed ring-2 ring-primary/15 transition-[box-shadow] duration-200 hover:ring-primary/35">
                      <AvatarImage
                        src={userProfile.avatar_url || undefined}
                        alt={userProfile.username || userProfile.display_name}
                        className="block h-full min-h-0 w-full min-w-0 object-cover object-center"
                      />
                      <AvatarFallback className="map-header-profile-fallback text-xl font-semibold">
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
                    "text-foreground transition-[opacity,transform] duration-200 active:scale-[0.97] active:opacity-80",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                  aria-label="Paramètres"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings className="h-[22px] w-[22px]" strokeWidth={1.85} />
                </button>
              </div>
            </div>

            {/* Barre recherche intégrée au header (style champ iOS discret) */}
            <div className="pointer-events-auto px-4 pb-3">
              <form
                className={cn(
                  "home-map-search-glass flex min-h-[36px] items-center gap-2 rounded-[10px] px-2.5 sm:min-h-[38px]",
                  "transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none"
                )}
                onSubmit={(e) => {
                  e.preventDefault();
                  void tryGeocodeSearchFromInput();
                }}
              >
                <Search
                  className="pointer-events-none h-[15px] w-[15px] shrink-0 text-muted-foreground/55"
                  strokeWidth={2.15}
                  aria-hidden
                />
                <Input
                  ref={searchInputRef}
                  placeholder="Rechercher un lieu ou une séance…"
                  value={filters.search_query}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      search_query: v,
                    }));
                  }}
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className={cn(
                    "h-8 min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0 text-[15px] leading-snug tracking-tight text-foreground/90",
                    "shadow-none placeholder:text-muted-foreground/45",
                    "focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "disabled:opacity-100"
                  )}
                  aria-label="Rechercher un lieu ou une séance"
                />
              </form>
            </div>
          </header>

          {/* Filtres sous le header — même gouttière px-4 */}
          <div className="pointer-events-none relative z-[50] box-border w-full px-4 pb-1.5">
            <div className="pointer-events-auto relative min-w-0 w-full max-w-full">
              {/* Filtres : carrousel toujours visible sous la recherche */}
              <div ref={homeMapFiltersRef} className="relative space-y-2 pt-2">
              <div className="overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch] px-0.5">
                <div className="flex min-w-max snap-x snap-mandatory items-center gap-2">
                <button
                  type="button"
                  onClick={cycleActivity}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    filters.activity_types.length > 0 && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Sport: {activeActivityLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'time' ? null : 'time'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'time' || filters.time_slot) && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex min-w-0 max-w-[9rem] items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {filters.time_slot
                        ? (TIME_SLOTS.find((s) => s.id === filters.time_slot)?.label ?? "Horaire")
                        : "Horaire"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, friends_only: !prev.friends_only }))}
                  className={cn("home-map-filter-chip snap-start", filters.friends_only && "home-map-filter-chip-active")}
                >
                  <span className="flex items-center gap-1.5"><PersonStanding className="h-3.5 w-3.5" /> Amis uniquement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'club' ? null : 'club'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'club' || filters.selected_club_ids.length > 0) && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Club{filters.selected_club_ids.length > 0 ? ` (${filters.selected_club_ids.length})` : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={cycleSessionType}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    filters.session_types.length > 0 && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Route className="h-3.5 w-3.5" /> Type: {activeSessionTypeLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'day' ? null : 'day'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'day' ||
                      !isSameDay(startOfDay(filters.selected_date), startOfDay(new Date()))) &&
                      "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex min-w-0 max-w-[10rem] items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate capitalize">
                      {format(filters.selected_date, "EEE d MMM", { locale: fr })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'level' ? null : 'level'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'level' || filters.level != null) && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex min-w-0 max-w-[8.5rem] items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {filters.level != null ? `Niv. ${filters.level}` : "Niveau séance"}
                    </span>
                  </span>
                </button>
                </div>
              </div>

            <AnimatePresence initial={false} mode="wait">
              {expandedFilter && (
                <motion.div
                  key={expandedFilter}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  className="home-map-filter-sheet relative z-20 p-3"
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
                            onClick={() => {
                              setFilters((prev) => ({
                                ...prev,
                                time_slot: prev.time_slot === slot.id ? null : slot.id,
                              }));
                              setExpandedFilter(null);
                            }}
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
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, selected_club_ids: [] }));
                          setExpandedFilter(null);
                        }}
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
                      onSelect={(date) => {
                        if (!date) return;
                        setFilters((prev) => ({ ...prev, selected_date: date }));
                        setExpandedFilter(null);
                      }}
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
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              level: prev.level === lvl ? null : lvl,
                            }));
                            setExpandedFilter(null);
                          }}
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

      {/* Contrôles carte — pile gauche : Plein écran, Localisation, Tracé, Classement, Style, Réinitialiser */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 ios-map-bottom-buttons">
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

        {isActive && (
          <>
            <MapIosColoredFab
              tone="gray"
              title={t("navigation.itinerary")}
              onClick={() => navigate("/itinerary")}
              className="bg-white text-black shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] [&_span]:text-black [&_span_svg]:stroke-black [&_span_svg]:text-black"
            >
              <PenTool className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </MapIosColoredFab>

            <MapIosColoredFab
              tone="gray"
              title={t("navigation.leaderboard")}
              onClick={() => navigate("/leaderboard")}
              className="bg-white text-black shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] [&_span]:text-black [&_span_svg]:stroke-black [&_span_svg]:text-black"
            >
              <Crown className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </MapIosColoredFab>
          </>
        )}

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
    }} map={mapboxMap} presetLocation={presetLocation} onCreateRoute={handleCreateRoute} />

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
    </div>
  );
};