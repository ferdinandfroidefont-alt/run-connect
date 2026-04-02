import { RouteDialog } from './RouteDialog';
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { RUNCONNECT_OPEN_HOME_SETTINGS_EVENT } from '@/lib/homeMapEvents';
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
import { Search, MapPin, PersonStanding, Sunrise, Sun, Moon, Expand, Minimize2, ArrowLeft, Clock3, Users, CalendarDays, SlidersHorizontal, Activity, Route, Newspaper, Settings, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useShareProfile } from '@/hooks/useShareProfile';
import { QRShareDialog } from './QRShareDialog';
import { cn } from '@/lib/utils';
import {
  takePrefetchedHomeMapPositionIfReady,
  waitForPrefetchedHomeMapPosition,
} from '@/lib/homeMapPrefetch';
import {
  HomeMapFilterGroupedList,
  HomeMapFilterRow,
  HomeMapFilterSheet,
  HOME_MAP_FILTER_PORTAL_SELECTOR,
} from '@/components/map/HomeMapFilterSheet';
import { getMapboxAccessToken, MAPBOX_NAVIGATION_DAY_STYLE, MAPBOX_STYLE_BY_UI_ID } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';
import { pathLengthMeters, resamplePathEvenlyMapCoords } from '@/lib/geoUtils';
import { fetchMapboxDirectionsPath } from '@/lib/mapboxDirections';
import { geocodeForwardDetail, geocodeSearchMapbox, type GeocodeSearchRow } from '@/lib/mapboxGeocode';
import { fetchElevationsForCoords } from '@/lib/openElevation';
import { createUserLocationMapboxMarker } from '@/lib/mapUserLocationIcon';
import { getStoredMapStyleId, persistMapStyleId } from '@/lib/mapboxMapStylePreference';
import { insertRouteRecord } from '@/lib/insertRouteRecord';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';

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

const ACTIVITY_OPTIONS: { id: string; label: string; values: string[] }[] = [
  { id: 'all', label: 'Tous sports', values: [] },
  ...ACTIVITY_TYPES.map((a) => ({
    id: a.value,
    label: a.label,
    values: [a.value],
  })),
];

const SESSION_TYPE_OPTIONS = [
  { id: 'all', label: 'Tous types', values: [] as string[] },
  { id: 'footing', label: 'Footing', values: ['footing'] },
  { id: 'sortie_longue', label: 'Longue', values: ['sortie_longue'] },
  { id: 'fractionne', label: 'Fractionné', values: ['fractionne'] },
  { id: 'competition', label: 'Compétition', values: ['competition'] },
];

type ExpandedFilter =
  | 'activity'
  | 'sessionType'
  | 'time'
  | 'friends'
  | 'club'
  | 'day'
  | 'level'
  | null;

const FILTER_SHEET_META: Record<
  NonNullable<ExpandedFilter>,
  { title: string; description?: string }
> = {
  activity: { title: 'Sport', description: 'Affinez par discipline' },
  sessionType: { title: 'Type de séance', description: 'Footing, fractionné, etc.' },
  time: { title: 'Créneau', description: 'Plage horaire sur la journée' },
  friends: { title: 'Visibilité', description: 'Carte complète ou focus sur tes amis' },
  club: { title: 'Club', description: 'Filtrer par une ou plusieurs équipes' },
  day: { title: 'Date', description: 'Jour des séances sur la carte' },
  level: { title: 'Niveau', description: 'Difficulté minimale (1 à 6)' },
};

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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [currentStyle, setCurrentStyle] = useState(() => getStoredMapStyleId());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [previewSession, setPreviewSession] = useState<Session | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sessionPresetRouteId, setSessionPresetRouteId] = useState<string | null>(null);
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
  /** Incrémenté à chaque `createMarkers` pour ignorer les invocations async obsolètes (courses au clavier). */
  const markersRunIdRef = useRef(0);
  const [placeSuggestions, setPlaceSuggestions] = useState<GeocodeSearchRow[]>([]);
  const [placeSuggestLoading, setPlaceSuggestLoading] = useState(false);
  /** Bloc header + recherche + carrousel filtres (mesure padding carte). */
  const homeMapTopStackRef = useRef<HTMLDivElement>(null);
  const homeMapFiltersRef = useRef<HTMLDivElement>(null);
  const [isUserSessionsOpen, setIsUserSessionsOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  useEffect(() => {
    const openSettings = () => setShowSettingsDialog(true);
    window.addEventListener(RUNCONNECT_OPEN_HOME_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(RUNCONNECT_OPEN_HOME_SETTINGS_EVENT, openSettings);
  }, []);
  const [showMapStyleSelector, setShowMapStyleSelector] = useState(false);
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

  /** Fermeture au clic extérieur (hors chips filtres et hors feuille portail). */
  useEffect(() => {
    if (!expandedFilter) return;
    const close = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      const portal = document.querySelector(HOME_MAP_FILTER_PORTAL_SELECTOR);
      if (portal?.contains(t)) return;
      const el = homeMapFiltersRef.current;
      if (el?.contains(t)) return;
      setExpandedFilter(null);
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

  const activeActivityLabel = ACTIVITY_OPTIONS.find((opt) => JSON.stringify(opt.values) === JSON.stringify(filters.activity_types))?.label || 'Sport';
  const activeSessionTypeLabel = SESSION_TYPE_OPTIONS.find((opt) => JSON.stringify(opt.values) === JSON.stringify(filters.session_types))?.label || 'Type';

  const routeCoordinates = useRef<MapCoord[]>([]);
  const waypoints = useRef<MapCoord[]>([]);
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  /** Stats D+ / D- issues de RouteCreation (localStorage) quand le profil alti n’est pas rejoué sur la carte */
  const pendingRouteStatsRef = useRef<{ elevationGain: number; elevationLoss: number } | null>(null);
  /** Waypoints avec mode (manuel / guidé) — les LatLng sur la carte ne portent pas le mode */
  const pendingWaypointsForSaveRef = useRef<Array<{ lat: number; lng: number; mode: 'manual' | 'guided' }> | null>(null);

  // Legacy : ouverture du dialogue de sauvegarde depuis localStorage (?saveRoute=true) — la création se fait sur /route-create
  useEffect(() => {
    if (searchParams.get('saveRoute') !== 'true') return;

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

        if (Array.isArray(routeData.waypoints) && routeData.waypoints.length > 0) {
          waypoints.current = routeData.waypoints.map((wp: { lat: number; lng: number }) => ({
            lat: wp.lat,
            lng: wp.lng,
          }));
          pendingWaypointsForSaveRef.current = routeData.waypoints.map((wp: { lat: number; lng: number; mode?: string }) => ({
            lat: wp.lat,
            lng: wp.lng,
            mode: wp.mode === 'guided' ? 'guided' : 'manual',
          }));
        } else {
          waypoints.current = [];
          pendingWaypointsForSaveRef.current = null;
        }

        setIsRouteDialogOpen(true);
        localStorage.removeItem('pendingRoute');
      } catch (error) {
        console.error('Erreur lors de la récupération du parcours:', error);
        pendingRouteStatsRef.current = null;
        pendingWaypointsForSaveRef.current = null;
      }
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('saveRoute');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  /** Création de séance avec itinéraire pré-sélectionné (?presetRoute=uuid) — même écran que le +. */
  useEffect(() => {
    if (!isActive) return;
    const pr = searchParams.get('presetRoute');
    if (!pr) return;
    setSessionPresetRouteId(pr);
    setIsCreateDialogOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('presetRoute');
        return next;
      },
      { replace: true },
    );
  }, [isActive, searchParams, setSearchParams]);

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
    const runId = ++markersRunIdRef.current;

    // Clear existing markers (Mapbox)
    markers.current.forEach((marker) => marker.remove());
    sessionPolylines.current = [];
    markers.current = [];

    const q = (filters.search_query ?? '').trim().toLowerCase();

    // Filter sessions based on current filters
    const filteredSessions = sessions.filter(session => {
      const matchesActivity = filters.activity_types.length === 0 || filters.activity_types.includes(session.activity_type);
      const matchesType = filters.session_types.length === 0 || filters.session_types.includes(session.session_type);
      const matchesSearch =
        !q ||
        (session.title ?? '').toLowerCase().includes(q) ||
        (session.location_name ?? '').toLowerCase().includes(q) ||
        (session.description ?? '').toLowerCase().includes(q);
      
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
        if (runId !== markersRunIdRef.current) return null;
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
        if (runId !== markersRunIdRef.current) return null;
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
        if (runId !== markersRunIdRef.current) return null;

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
    if (runId !== markersRunIdRef.current) return;
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

  /** Suggestions de lieux Mapbox pendant la saisie (monde entier, sans restriction pays). */
  useEffect(() => {
    const raw = filters.search_query.trim();
    if (raw.length < 2) {
      setPlaceSuggestions([]);
      setPlaceSuggestLoading(false);
      return;
    }
    let cancelled = false;
    setPlaceSuggestLoading(true);
    const t = window.setTimeout(() => {
      void geocodeSearchMapbox(raw, 5, null)
        .then((rows) => {
          if (cancelled) return;
          setPlaceSuggestions(rows);
        })
        .catch(() => {
          if (cancelled) return;
          setPlaceSuggestions([]);
        })
        .finally(() => {
          if (cancelled) return;
          setPlaceSuggestLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [filters.search_query]);

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
    persistMapStyleId(style);
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
    setPlaceSuggestions([]);
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

  const applyPlaceSuggestion = (row: GeocodeSearchRow) => {
    const m = map.current ?? mapboxMap;
    if (!m) {
      toast.info('Carte non prête — réessayez dans un instant.');
      return;
    }
    setPlaceSuggestions([]);
    setPlaceSuggestLoading(false);
    const { lat, lng } = row.geometry.location;
    const label = row.formatted_address || `${lat},${lng}`;
    setFilters((prev) => ({ ...prev, search_query: label }));
    const padding = computeHomeMapViewportPadding({
      immersive: isImmersiveMode,
      topStackEl: homeMapTopStackRef.current,
    });
    m.easeTo({
      center: [lng, lat],
      zoom: 14,
      padding,
      duration: 1000,
      essential: true,
    });
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
      const lenM = pathLengthMeters(routeCoordinates.current);
      const samples = Math.min(4000, Math.max(64, Math.ceil(lenM / 12)));
      const sampled = resamplePathEvenlyMapCoords(routeCoordinates.current, samples);
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

  const saveRoute = async (routeName: string, routeDescription: string, isPublic?: boolean) => {
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

    const result = await insertRouteRecord({
      userId: user.id,
      name: routeName,
      description: routeDescription,
      pathCoords: routeCoordinates.current,
      elevations: routeElevations,
      waypoints: waypointsData,
      isPublic: isPublic ?? false,
      statsOverride: routeStats,
    });

    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    pendingRouteStatsRef.current = null;
    pendingWaypointsForSaveRef.current = null;
    toast.success('Itinéraire enregistré avec succès !');
    return true;
  };
  const handleSaveRoute = async (
    routeName: string,
    routeDescription: string,
    createSession?: boolean,
    isPublic?: boolean,
  ) => {
    setRouteSaving(true);
    const success = await saveRoute(routeName, routeDescription, isPublic);
    setRouteSaving(false);
    if (success) {
      pendingRouteStatsRef.current = null;
      pendingWaypointsForSaveRef.current = null;
      setIsRouteDialogOpen(false);

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
  const updateRoutePath = () => {
    if (!map.current) return;
    setInteractiveRouteLine(map.current, routeCoordinates.current);
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
      if (!lngLat) return;
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
  }, [isMapLoaded, user]);
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
      <div className="relative min-h-0 w-full flex-1">
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
          className="pointer-events-none absolute left-0 right-0 top-0 z-[30]"
        >
          {/*
            Une seule couche d’inset : le header intègre la safe-area.
            (StatusBar overlay: false → bande h-[safe-area] + pt header doublait la zone système.)
          */}
          <header
            className={cn(
              "pointer-events-auto relative shrink-0 bg-white dark:bg-black",
              "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:z-0 after:h-[22px] after:bg-white dark:after:bg-black",
            )}
          >
            {/* Même rangée que Feed : RunConnect | avatar centré | cloche + paramètres */}
            <div className="relative z-[1] pt-[var(--safe-area-top)]">
              <div className="relative flex min-h-[3rem] items-center justify-between gap-2 px-4 pb-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/feed")}
                  className="flex min-w-0 shrink items-center text-lg font-semibold leading-none tracking-tight text-primary active:opacity-70 transition-opacity touch-manipulation"
                  data-tutorial="runconnect-toggle"
                >
                  RunConnect
                </button>

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
                      <Avatar className="map-header-profile-avatar h-14 w-14 avatar-fixed ring-2 ring-primary/15 transition-[box-shadow] duration-200 hover:ring-primary/35">
                        <AvatarImage
                          src={userProfile.avatar_url || undefined}
                          alt={userProfile.username || userProfile.display_name}
                          className="block h-full min-h-0 w-full min-w-0 object-cover object-center"
                        />
                        <AvatarFallback className="map-header-profile-fallback text-2xl font-semibold">
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

                <div className="flex shrink-0 items-center gap-2">
                  <div data-tutorial="notifications" className="flex shrink-0 items-center justify-center">
                    <Suspense
                      fallback={
                        <div
                          className="h-[40px] w-[40px] shrink-0 rounded-[13px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0a0a0a]"
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
                      "border border-transparent dark:border-[#1f1f1f] dark:bg-[#0a0a0a]",
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
            </div>
          </header>

          {/* Recherche + filtres : même gouttière que la pile FAB (left-4 / px-4), pleine largeur entre marges — pas de max-w qui décale le centre */}
          <div className="pointer-events-none relative z-[35] box-border w-full -mt-[6px] px-4 pb-1.5 sm:-mt-2">
            <div className="pointer-events-auto relative z-[36] min-w-0 w-full max-w-full">
              {/*
                Ancêtre positionné limité à la barre de recherche + liste : sinon top-[100%] du dropdown
                se calcule sur toute la colonne (recherche + filtres) et le panneau se mélange aux filtres.
              */}
              <div className="relative z-[45] min-w-0 isolate">
                <form
                  className={cn(
                    "relative z-0 home-map-search-glass flex items-center gap-2 rounded-2xl px-2.5",
                    "transition-[box-shadow,border-color,background-color] duration-200 ease-out motion-reduce:transition-none"
                  )}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void tryGeocodeSearchFromInput();
                  }}
                >
                  <Search
                    className="h-4 w-4 shrink-0 text-muted-foreground/55"
                    strokeWidth={2}
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
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={cn(
                      "h-9 min-w-0 flex-1 border-0 bg-transparent py-0 text-[15px] leading-snug tracking-tight text-foreground/88",
                      "shadow-none placeholder:text-muted-foreground/48",
                      "focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0",
                      "focus-visible:ring-0 focus-visible:ring-offset-0"
                    )}
                    aria-label="Rechercher un lieu ou une séance"
                    aria-autocomplete="list"
                    aria-controls="home-map-search-suggestions"
                    aria-expanded={placeSuggestions.length > 0 || placeSuggestLoading}
                  />
                </form>

                {(placeSuggestLoading || placeSuggestions.length > 0) && (
                  <div
                    id="home-map-search-suggestions"
                    role="listbox"
                    aria-label="Suggestions de lieux"
                    className={cn(
                      "absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(42vh,19rem)] overflow-y-auto overflow-x-hidden rounded-[1.15rem]",
                      "border border-black/[0.06] bg-[rgba(252,252,253,0.98)] shadow-[0_20px_48px_-16px_rgba(0,0,0,0.2)] backdrop-blur-xl ring-1 ring-black/[0.04] dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:ring-[#1f1f1f] dark:backdrop-blur-none",
                      "[-webkit-overflow-scrolling:touch]"
                    )}
                  >
                    {placeSuggestLoading && placeSuggestions.length === 0 ? (
                      <div className="px-3 py-3 text-[13px] text-muted-foreground/75">Recherche…</div>
                    ) : (
                      placeSuggestions.map((row, i) => (
                        <button
                          key={`${row.formatted_address}-${i}`}
                          type="button"
                          role="option"
                          className={cn(
                            "flex w-full min-w-0 items-start gap-3 border-0 px-4 py-3.5 text-left text-[15px] leading-snug outline-none",
                            "text-foreground/90 transition-colors active:bg-black/[0.045] dark:active:bg-[#111111]"
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyPlaceSuggestion(row)}
                        >
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                          <span className="min-w-0 truncate">{row.formatted_address}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Filtres : sous le bloc recherche — z-index plus bas que le panneau suggestions */}
              <div ref={homeMapFiltersRef} className="relative z-[25] space-y-2 pt-3">
              <div className="overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch] px-0.5">
                <div className="flex min-w-max snap-x snap-mandatory items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'activity' ? null : 'activity'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'activity' || filters.activity_types.length > 0) && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 shrink-0" /> Sport: {activeActivityLabel}</span>
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
                  onClick={() => setExpandedFilter((prev) => (prev === 'friends' ? null : 'friends'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'friends' || filters.friends_only) && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <PersonStanding className="h-3.5 w-3.5 shrink-0" /> Amis uniquement
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'club' ? null : 'club'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'club' || filters.selected_club_ids.length > 0) && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" /> Club{filters.selected_club_ids.length > 0 ? ` (${filters.selected_club_ids.length})` : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFilter((prev) => (prev === 'sessionType' ? null : 'sessionType'))}
                  className={cn(
                    "home-map-filter-chip snap-start",
                    (expandedFilter === 'sessionType' || filters.session_types.length > 0) && "home-map-filter-chip-active"
                  )}
                >
                  <span className="flex items-center gap-1.5"><Route className="h-3.5 w-3.5 shrink-0" /> Type: {activeSessionTypeLabel}</span>
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

            <HomeMapFilterSheet
              open={!!expandedFilter}
              onClose={() => setExpandedFilter(null)}
              title={expandedFilter ? FILTER_SHEET_META[expandedFilter].title : ''}
              description={expandedFilter ? FILTER_SHEET_META[expandedFilter].description : undefined}
              titleId={expandedFilter ? `home-map-filter-title-${expandedFilter}` : 'home-map-filter-title'}
              variant={expandedFilter === 'club' ? 'tall' : 'default'}
              footer={
                expandedFilter === 'club' ? (
                  <button
                    type="button"
                    className="flex h-12 w-full items-center justify-center rounded-[14px] bg-primary text-[17px] font-semibold text-primary-foreground shadow-sm active:opacity-90"
                    onClick={() => setExpandedFilter(null)}
                  >
                    Terminé
                  </button>
                ) : undefined
              }
            >
              {expandedFilter === 'activity' && (
                <HomeMapFilterGroupedList>
                  {ACTIVITY_OPTIONS.map((opt) => {
                    const active =
                      JSON.stringify(filters.activity_types) === JSON.stringify(opt.values);
                    return (
                      <HomeMapFilterRow
                        key={opt.id}
                        label={opt.label}
                        selected={active}
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, activity_types: opt.values }));
                          setExpandedFilter(null);
                        }}
                      />
                    );
                  })}
                </HomeMapFilterGroupedList>
              )}

              {expandedFilter === 'sessionType' && (
                <HomeMapFilterGroupedList>
                  {SESSION_TYPE_OPTIONS.map((opt) => {
                    const active =
                      JSON.stringify(filters.session_types) === JSON.stringify(opt.values);
                    return (
                      <HomeMapFilterRow
                        key={opt.id}
                        label={opt.label}
                        selected={active}
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, session_types: opt.values }));
                          setExpandedFilter(null);
                        }}
                      />
                    );
                  })}
                </HomeMapFilterGroupedList>
              )}

              {expandedFilter === 'friends' && (
                <HomeMapFilterGroupedList>
                  <HomeMapFilterRow
                    label="Toutes les séances"
                    hint="Affichage selon les règles de visibilité"
                    selected={!filters.friends_only}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, friends_only: false }));
                      setExpandedFilter(null);
                    }}
                  />
                  <HomeMapFilterRow
                    label="Amis uniquement"
                    hint="Séances de tes amis et les tiennes"
                    selected={filters.friends_only}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, friends_only: true }));
                      setExpandedFilter(null);
                    }}
                  />
                </HomeMapFilterGroupedList>
              )}

              {expandedFilter === 'time' && (
                <HomeMapFilterGroupedList>
                  {TIME_SLOTS.map((slot) => {
                    const active = filters.time_slot === slot.id;
                    const Icon = slot.icon;
                    return (
                      <HomeMapFilterRow
                        key={slot.id}
                        label={slot.label}
                        hint={
                          slot.id === 'morning'
                            ? '6h – 12h'
                            : slot.id === 'afternoon'
                              ? '12h – 18h'
                              : slot.id === 'evening'
                                ? '18h – 23h'
                                : '23h – 6h'
                        }
                        selected={active}
                        leading={
                          <Icon
                            className={cn(
                              'h-6 w-6',
                              active ? 'text-primary' : TIME_SLOT_ICON_CLASS[slot.id]
                            )}
                            strokeWidth={2}
                          />
                        }
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            time_slot: prev.time_slot === slot.id ? null : slot.id,
                          }));
                          setExpandedFilter(null);
                        }}
                      />
                    );
                  })}
                </HomeMapFilterGroupedList>
              )}

              {expandedFilter === 'club' && (
                <HomeMapFilterGroupedList>
                  <HomeMapFilterRow
                    label="Tous les clubs"
                    hint="Aucun filtre par équipe"
                    selected={filters.selected_club_ids.length === 0}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, selected_club_ids: [] }));
                      setExpandedFilter(null);
                    }}
                  />
                  {clubFilters.map((club) => {
                    const active = filters.selected_club_ids.includes(club.id);
                    return (
                      <HomeMapFilterRow
                        key={club.id}
                        label={club.name}
                        selected={active}
                        trailing={club.memberCount}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            selected_club_ids: active
                              ? prev.selected_club_ids.filter((id) => id !== club.id)
                              : [...prev.selected_club_ids, club.id],
                          }))
                        }
                      />
                    );
                  })}
                </HomeMapFilterGroupedList>
              )}

              {expandedFilter === 'day' && (
                <div className="mt-1 overflow-hidden rounded-[12px] border border-border/60 bg-card p-2 shadow-sm dark:border-white/[0.1]">
                  <CalendarComponent
                    mode="single"
                    selected={filters.selected_date}
                    onSelect={(date) => {
                      if (!date) return;
                      setFilters((prev) => ({ ...prev, selected_date: date }));
                      setExpandedFilter(null);
                    }}
                    initialFocus
                    className="pointer-events-auto w-full p-0"
                  />
                </div>
              )}

              {expandedFilter === 'level' && (
                <HomeMapFilterGroupedList>
                  <HomeMapFilterRow
                    label="Tous niveaux"
                    hint="Pas de filtre de difficulté"
                    selected={filters.level == null}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, level: null }));
                      setExpandedFilter(null);
                    }}
                  />
                  {[1, 2, 3, 4, 5, 6].map((lvl) => (
                    <HomeMapFilterRow
                      key={lvl}
                      label={`Niveau ${lvl}`}
                      selected={filters.level === lvl}
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          level: prev.level === lvl ? null : lvl,
                        }));
                        setExpandedFilter(null);
                      }}
                    />
                  ))}
                </HomeMapFilterGroupedList>
              )}
            </HomeMapFilterSheet>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contrôles carte — bloc vertical droit au-dessus du FAB "+" (offset serré : ~12px entre bas colonne et haut du +) */}
      <div
        className={cn(
          "pointer-events-none fixed z-[104] flex flex-col items-end",
          "bottom-[calc(var(--layout-bottom-inset)+var(--safe-area-bottom)+4.75rem)]",
          "right-[max(1rem,env(safe-area-inset-right,0px))]"
        )}
      >
        <div
          className={cn(
            "pointer-events-auto flex flex-col items-center overflow-hidden rounded-[20px] border",
            "border-black/[0.08] bg-white shadow-[0_8px_32px_-12px_rgba(0,0,0,0.22),0_2px_8px_-4px_rgba(0,0,0,0.08)]",
            "dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65)]"
          )}
        >
          <button
            type="button"
            title="Créer un itinéraire"
            aria-label="Créer un itinéraire"
            onClick={() => navigate("/route-create")}
            className="flex h-11 w-11 items-center justify-center text-foreground/85 transition-all duration-150 active:scale-[0.92] active:bg-muted/50 dark:active:bg-white/[0.06]"
          >
            <PenLine className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <div className="mx-2 h-px w-7 bg-border/90 dark:bg-[#1f1f1f]" />
          <div className="flex h-11 w-11 items-center justify-center [&_.map-ios-colored-fab]:h-11 [&_.map-ios-colored-fab]:w-11 [&_.map-ios-colored-fab]:rounded-none [&_.map-ios-colored-fab]:bg-transparent [&_.map-ios-colored-fab]:shadow-none [&_.map-ios-colored-fab]:ring-0 [&_.map-ios-colored-fab]:ring-offset-0 [&_span]:!text-foreground/80 [&_span_svg]:!stroke-current [&_span_svg]:!text-foreground/80">
            <MapStyleSelector currentStyle={currentStyle} onStyleChange={handleStyleChange} />
          </div>
          <div className="mx-2 h-px w-7 bg-border/90 dark:bg-[#1f1f1f]" />
          <button
            type="button"
            title="Me localiser"
            onClick={handleLocateMe}
            className="flex h-11 w-11 items-center justify-center text-foreground/85 transition-all duration-150 active:scale-[0.92] active:bg-muted/50 dark:active:bg-white/[0.06]"
          >
            <MapPin className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <div className="mx-2 h-px w-7 bg-border/90 dark:bg-[#1f1f1f]" />
          <button
            type="button"
            title={isImmersiveMode ? "Quitter le plein écran" : "Carte plein écran"}
            aria-label={isImmersiveMode ? "Quitter le plein écran" : "Afficher la carte en plein écran"}
            onClick={toggleImmersiveMode}
            className="flex h-11 w-11 items-center justify-center text-foreground/85 transition-all duration-150 active:scale-[0.92] active:bg-muted/50 dark:active:bg-white/[0.06]"
          >
            {isImmersiveMode ? (
              <Minimize2 className="h-[18px] w-[18px]" strokeWidth={2} />
            ) : (
              <Expand className="h-[18px] w-[18px]" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
      

      {/* Create Session Wizard */}
      <CreateSessionWizard
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setPresetLocation(null);
          setSessionPresetRouteId(null);
        }}
        presetRouteId={sessionPresetRouteId}
        onSessionCreated={async (sessionId) => {
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
        }}
        map={mapboxMap}
        presetLocation={presetLocation}
        onCreateRoute={handleCreateRoute}
      />

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
      <RouteDialog
        isOpen={isRouteDialogOpen}
        onClose={() => setIsRouteDialogOpen(false)}
        onSave={handleSaveRoute}
        title="Créer un itinéraire"
        loading={routeSaving}
        showCreateSessionOption={true}
        showPublicToggle={true}
      />
    </div>
  );
};