import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Users, Edit, Trash2, ChevronRight, ArrowLeft, Plus, MessageCircle, LogOut, Navigation, Share2 } from "lucide-react";
import { Switch } from '@/components/ui/switch';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { setLiveShareOptIn } from '@/lib/liveTrackingStorage';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { addDays, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from "react-router-dom";
import { useProfileNavigation } from '@/hooks/useProfileNavigation';
import { ActivityIcon, getActivityLabel } from '@/lib/activityIcons';
import { IOSListItem, IOSListGroup } from '@/components/ui/ios-list-item';
import { getIosEmptyStateSpacing } from '@/lib/iosEmptyStateLayout';
import ConfirmPresencePage from '@/pages/ConfirmPresence';
import { buildSessionSharePayload } from '@/lib/sessionSharePayload';
import { SessionShareScreen } from '@/components/session-share/SessionShareScreen';
import { ShareSessionToConversationDialog } from '@/components/ShareSessionToConversationDialog';
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const CreateSessionWizard = lazy(() =>
  import('@/components/session-creation/CreateSessionWizard').then((m) => ({ default: m.CreateSessionWizard }))
);
const ProfilePreviewDialog = lazy(() =>
  import('@/components/ProfilePreviewDialog').then((m) => ({ default: m.ProfilePreviewDialog }))
);

interface UserSession {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  session_type: string;
  intensity: string;
  location_name: string;
  scheduled_at: string;
  max_participants: number;
  current_participants: number;
  created_at: string;
  image_url?: string;
  organizer_id?: string;
  live_tracking_max_duration?: number;
  route_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  session_blocks?: unknown;
  interval_count?: number | null;
  interval_distance?: number | null;
  interval_pace?: string | null;
  interval_pace_unit?: string | null;
  pace_general?: string | null;
  pace_unit?: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface OrganizerProfile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function MySessions() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { openCreateSession } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToProfile, selectedUserId, showProfilePreview, closeProfilePreview } = useProfileNavigation();
  const [timeSegment, setTimeSegment] = useState<"upcoming" | "past">("upcoming");
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [showConfirmEmbedded, setShowConfirmEmbedded] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<UserSession[]>([]);
  const [myParticipationBySessionId, setMyParticipationBySessionId] = useState<
    Map<string, { confirmed_by_gps: boolean | null; confirmed_by_creator: boolean | null }>
  >(new Map());
  const [organizerProfiles, setOrganizerProfiles] = useState<Map<string, OrganizerProfile>>(new Map());
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [selectedSessionRole, setSelectedSessionRole] = useState<"organizer" | "participant" | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditSessionDialogOpen, setIsEditSessionDialogOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSessionShare, setShowSessionShare] = useState(false);
  const [showShareConversationDialog, setShowShareConversationDialog] = useState(false);
  const [sessionForShare, setSessionForShare] = useState<Parameters<typeof buildSessionSharePayload>[0] | null>(null);
  const emptyStateSx = useMemo(() => getIosEmptyStateSpacing(), []);


  // Live tracking participant states
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [showTrackingWarning, setShowTrackingWarning] = useState(false);
  const trackingWatchIdRef = useRef<string | null>(null);

  const isViewingJoinedSession = selectedSession && selectedSessionRole === "participant";

  // Auto-stop tracking based on live_tracking_max_duration
  useEffect(() => {
    if (!liveTrackingEnabled || !selectedSession) return;
    const checkAutoStop = () => {
      const scheduledTime = new Date(selectedSession.scheduled_at).getTime();
      const maxDuration = (selectedSession as any).live_tracking_max_duration || 120;
      const autoStopTime = scheduledTime + maxDuration * 60 * 1000;
      if (Date.now() > autoStopTime) {
        stopParticipantTracking();
      }
    };
    checkAutoStop();
    const interval = setInterval(checkAutoStop, 30000);
    return () => clearInterval(interval);
  }, [liveTrackingEnabled, selectedSession]);

  // Cleanup tracking on unmount or when going back to list
  useEffect(() => {
    return () => {
      if (trackingWatchIdRef.current) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: trackingWatchIdRef.current });
        } else {
          clearInterval(Number(trackingWatchIdRef.current));
        }
        trackingWatchIdRef.current = null;
      }
    };
  }, []);

  const startParticipantTracking = useCallback(async () => {
    if (!selectedSession || !user) return;
    try {
      // Request native permission (triggers Android/iOS popup)
      await Geolocation.requestPermissions();

      // If organizer (created session), activate live_tracking_active on the session for RLS
      if (selectedSessionRole === "organizer") {
        await supabase.from('sessions').update({ live_tracking_active: true, live_tracking_started_at: new Date().toISOString() }).eq('id', selectedSession.id);
      }

      setLiveTrackingEnabled(true);
      setLiveShareOptIn(selectedSession.id, true);

      if (Capacitor.isNativePlatform()) {
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          async (position) => {
            if (!position) return;
            await supabase.from('live_tracking_points').insert({
              session_id: selectedSession.id,
              user_id: user.id,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          }
        );
        trackingWatchIdRef.current = id;
      } else {
        const sendPosition = async () => {
          try {
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
            await supabase.from('live_tracking_points').insert({
              session_id: selectedSession.id,
              user_id: user.id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          } catch (err) {
            console.error('GPS error:', err);
          }
        };
        sendPosition();
        const intervalId = setInterval(sendPosition, 5000);
        trackingWatchIdRef.current = String(intervalId);
      }
    } catch (error) {
      console.error('Failed to start participant tracking:', error);
      setLiveTrackingEnabled(false);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder à votre position. Vérifiez les permissions de localisation.",
        variant: "destructive",
      });
    }
  }, [selectedSession, user, selectedSessionRole, toast]);

  const stopParticipantTracking = useCallback(async () => {
    setLiveTrackingEnabled(false);
    if (selectedSession) setLiveShareOptIn(selectedSession.id, false);
    if (trackingWatchIdRef.current) {
      if (Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: trackingWatchIdRef.current });
      } else {
        clearInterval(Number(trackingWatchIdRef.current));
      }
      trackingWatchIdRef.current = null;
    }
    // If organizer, deactivate live_tracking_active
    if (selectedSessionRole === "organizer" && selectedSession) {
      await supabase.from('sessions').update({ live_tracking_active: false }).eq('id', selectedSession.id);
    }
  }, [selectedSessionRole, selectedSession]);

  const openSessionShare = useCallback(async () => {
    if (!selectedSession) return;
    try {
      const s = selectedSession as UserSession & Record<string, unknown>;
      const base: Record<string, unknown> = { ...s };
      const routeId = s.route_id;
      if (routeId) {
        const { data: route, error } = await supabase.from('routes').select('coordinates').eq('id', routeId).maybeSingle();
        if (error) console.error(error);
        base.routes = route?.coordinates != null ? { coordinates: route.coordinates } : null;
      } else {
        base.routes = (s as { routes?: { coordinates?: unknown } | null }).routes ?? null;
      }
      const lat = Number(s.location_lat);
      const lng = Number(s.location_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        base.location_lat = 48.8566;
        base.location_lng = 2.3522;
      } else {
        base.location_lat = lat;
        base.location_lng = lng;
      }
      setSessionForShare(base as unknown as Parameters<typeof buildSessionSharePayload>[0]);
      setShowSessionShare(true);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger la séance pour le partage.", variant: "destructive" });
    }
  }, [selectedSession, toast]);

  const handleTrackingToggle = (checked: boolean) => {
    if (checked) {
      setShowTrackingWarning(true);
    } else {
      stopParticipantTracking();
    }
  };

  const loadUserSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('organizer_id', user.id)
        .order('scheduled_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading user sessions:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement de vos séances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJoinedSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get session IDs where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('user_id', user.id);

      if (partError) throw partError;
      if (!participations || participations.length === 0) {
        setJoinedSessions([]);
        setLoading(false);
        return;
      }

      const sessionIds = participations.map(p => p.session_id);

      // Get sessions excluding ones created by the user
      const { data: sessionsData, error: sessError } = await supabase
        .from('sessions')
        .select('*')
        .in('id', sessionIds)
        .neq('organizer_id', user.id)
        .order('scheduled_at', { ascending: false });

      if (sessError) throw sessError;

      setJoinedSessions(sessionsData || []);

      // Load organizer profiles
      const organizerIds = [...new Set((sessionsData || []).map(s => s.organizer_id))];
      if (organizerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', organizerIds);

        const profilesMap = new Map<string, OrganizerProfile>();
        (profiles || []).forEach(p => {
          if (p.user_id) {
            profilesMap.set(p.user_id, p as OrganizerProfile);
          }
        });
        setOrganizerProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error loading joined sessions:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des séances rejointes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionParticipants = async (sessionId: string) => {
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId);

      if (participantsError) throw participantsError;

      const participantsWithProfiles = [];
      for (const participant of participantsData || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', participant.user_id)
          .single();
        
        participantsWithProfiles.push({
          ...participant,
          profiles: profile || { username: 'Utilisateur', display_name: 'Utilisateur', avatar_url: null }
        });
      }

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des participants",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('tab') === 'routes') {
      navigate('/itinerary/my-routes', { replace: true });
    }
  }, [location.search, navigate]);


  // Load sessions and subscribe to real-time updates
  useEffect(() => {
    if (!user) return;
    
    loadUserSessions();
    loadJoinedSessions();

    // Real-time subscription for immediate updates on Android & Web
    const channelName = `my-sessions-${user.id}-${Date.now()}`;
    console.log('📡 MySessions: Subscribing to realtime channel:', channelName);
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `organizer_id=eq.${user.id}`
      }, (payload) => {
        console.log('🆕 MySessions: Session change detected', payload.eventType);
        loadUserSessions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('🆕 MySessions: Participation change detected', payload.eventType);
        loadJoinedSessions();
      })
      .subscribe((status) => {
        console.log('📡 MySessions: Subscription status:', status);
      });

    return () => {
      console.log('📡 MySessions: Unsubscribing from channel');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Reload sessions when page becomes visible (Android WebView fix)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('👁️ MySessions: Page visible, reloading sessions');
        loadUserSessions();
        loadJoinedSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const handleSessionClick = async (session: UserSession, role: "organizer" | "participant") => {
    setSelectedSession(session);
    setSelectedSessionRole(role);
    await loadSessionParticipants(session.id);
  };

  const handleHeaderCreateSession = () => {
    navigate("/");
    window.setTimeout(() => openCreateSession(), 100);
  };

  const formatWeekdayLabel = (d: Date) =>
    format(d, "EEE", { locale: fr })
      .replace(/\.$/, "")
      .toUpperCase()
      .slice(0, 3);

  const sessionBadge = (
    session: UserSession,
    role: "organizer" | "participant"
  ): { label: string; className: string } => {
    if (role === "organizer") {
      return {
        label: "Confirmée",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      };
    }
    const p = myParticipationBySessionId.get(session.id);
    const ok = p?.confirmed_by_gps === true || p?.confirmed_by_creator === true;
    if (ok) {
      return {
        label: "Confirmée",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      };
    }
    return {
      label: "En attente",
      className: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    };
  };

  const handleEditClick = () => {
    setIsEditSessionDialogOpen(true);
  };

  const handleSessionUpdated = async () => {
    await loadUserSessions();
    if (selectedSession) {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', selectedSession.id)
        .single();
      if (data) {
        setSelectedSession(data);
      }
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    try {
      const { error: participantsError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', selectedSession.id);

      if (participantsError) throw participantsError;

      const { error: requestsError } = await supabase
        .from('session_requests')
        .delete()
        .eq('session_id', selectedSession.id);

      if (requestsError) throw requestsError;

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', selectedSession.id)
        .eq('organizer_id', user?.id);

      if (error) throw error;

      setSessions(sessions.filter(s => s.id !== selectedSession.id));
      toast({
        title: "Succès",
        description: "Séance supprimée avec succès",
      });
      // Navigate back AFTER toast
      setTimeout(() => {
        setSelectedSession(null);
        setSelectedSessionRole(null);
      }, 100);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la séance",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!selectedSession || !user) return;

    try {
      const { error } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', selectedSession.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setJoinedSessions(prev => prev.filter(s => s.id !== selectedSession.id));
      toast({
        title: "Succès",
        description: "Vous avez quitté la séance",
      });
      setTimeout(() => {
        setSelectedSession(null);
        setSelectedSessionRole(null);
      }, 100);
    } catch (error) {
      console.error('Error leaving session:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la désinscription",
        variant: "destructive",
      });
    } finally {
      setShowLeaveConfirm(false);
    }
  };

  const mergedSessionEntries = useMemo(() => {
    const map = new Map<string, { session: UserSession; role: "organizer" | "participant" }>();
    for (const s of sessions) {
      map.set(s.id, { session: s, role: "organizer" });
    }
    for (const s of joinedSessions) {
      if (!map.has(s.id)) {
        map.set(s.id, { session: s, role: "participant" });
      }
    }
    return Array.from(map.values());
  }, [sessions, joinedSessions]);

  const mergedIdsFingerprint = useMemo(
    () =>
      mergedSessionEntries
        .map((e) => e.session.id)
        .sort()
        .join("|"),
    [mergedSessionEntries]
  );

  useEffect(() => {
    if (!user || mergedSessionEntries.length === 0) {
      setMyParticipationBySessionId(new Map());
      return;
    }
    const ids = mergedSessionEntries.map((e) => e.session.id);
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("session_participants")
        .select("session_id, confirmed_by_gps, confirmed_by_creator")
        .eq("user_id", user.id)
        .in("session_id", ids);
      if (cancelled) return;
      if (error) return;
      const next = new Map<string, { confirmed_by_gps: boolean | null; confirmed_by_creator: boolean | null }>();
      for (const row of data || []) {
        next.set(row.session_id, {
          confirmed_by_gps: row.confirmed_by_gps,
          confirmed_by_creator: row.confirmed_by_creator,
        });
      }
      setMyParticipationBySessionId(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, mergedIdsFingerprint, mergedSessionEntries.length]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDay, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDay]);

  const dayKeysWithSessions = useMemo(() => {
    const set = new Set<string>();
    for (const { session } of mergedSessionEntries) {
      set.add(format(startOfDay(new Date(session.scheduled_at)), "yyyy-MM-dd"));
    }
    return set;
  }, [mergedSessionEntries]);

  const displaySessionEntries = useMemo(() => {
    const nowIso = new Date().toISOString();
    let rows = mergedSessionEntries.filter(({ session }) => {
      if (timeSegment === "upcoming") return session.scheduled_at >= nowIso;
      return session.scheduled_at < nowIso;
    });
    rows = rows.filter(({ session }) => isSameDay(new Date(session.scheduled_at), selectedDay));
    rows.sort((a, b) => {
      const ta = new Date(a.session.scheduled_at).getTime();
      const tb = new Date(b.session.scheduled_at).getTime();
      return timeSegment === "upcoming" ? ta - tb : tb - ta;
    });
    return rows;
  }, [mergedSessionEntries, timeSegment, selectedDay]);
  if (selectedSession) {
    const isUpcoming = new Date(selectedSession.scheduled_at) >= new Date();
    const organizerProfile = isViewingJoinedSession && selectedSession.organizer_id 
      ? organizerProfiles.get(selectedSession.organizer_id) 
      : null;
    
    return (
      <>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary">
          {/* iOS Header */}
          <div className="z-50 shrink-0 bg-card pt-[var(--safe-area-top)]">
            <div className="flex items-center justify-between px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  stopParticipantTracking();
                  setSelectedSession(null);
                  setSelectedSessionRole(null);
                }}
                className="gap-1 text-primary p-0 h-auto font-normal"
              >
                <ArrowLeft className="h-5 w-5" />
                Retour
              </Button>
              {!isViewingJoinedSession && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void openSessionShare()}
                    className="h-9 w-9"
                  >
                    <Share2 className="h-5 w-5 text-primary" />
                  </Button>
                  {isUpcoming && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEditClick}
                      className="h-9 w-9"
                    >
                      <Edit className="h-5 w-5 text-primary" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-9 w-9"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              )}
              {isViewingJoinedSession && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void openSessionShare()}
                    className="h-9 w-9"
                  >
                    <Share2 className="h-5 w-5 text-primary" />
                  </Button>
                </div>
              )}
            </div>
            <div className="h-px bg-border" />
          </div>

          <div className="ios-scroll-region">
          <div className="space-y-6 p-4 pb-ios-4">
            {/* Session Header Card */}
            <IOSListGroup>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <ActivityIcon activityType={selectedSession.activity_type} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isViewingJoinedSession ? (
                        <Badge className="text-xs bg-blue-500 text-white">Rejoint</Badge>
                      ) : (
                        <Badge variant={isUpcoming ? "default" : "secondary"} className="text-xs">
                          {isUpcoming ? "À venir" : "Terminée"}
                        </Badge>
                      )}
                    </div>
                    <h1 className="text-[20px] font-semibold leading-tight">
                      {selectedSession.title}
                    </h1>
                    <p className="text-[15px] text-muted-foreground mt-1">
                      {getActivityLabel(selectedSession.activity_type)}
                    </p>
                  </div>
                </div>
              </div>
            </IOSListGroup>

            {/* Organizer section for joined sessions */}
            {isViewingJoinedSession && organizerProfile && (
              <IOSListGroup header="ORGANISATEUR">
                <div className="flex items-center gap-3 px-4 py-3 bg-card">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={organizerProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {organizerProfile.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-medium">{organizerProfile.display_name || organizerProfile.username}</p>
                    <p className="text-[13px] text-muted-foreground">@{organizerProfile.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/messages?startConversation=${selectedSession.organizer_id}`)}
                    className="gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                </div>
              </IOSListGroup>
            )}

            {/* Live Tracking section for joined/created sessions (not yet ended) */}
            {(() => {
              const liveOk = (selectedSession as any).live_tracking_enabled === true;
              const maxDur = (selectedSession as any).live_tracking_max_duration || 120;
              const sessionEndTime = new Date(selectedSession.scheduled_at).getTime() + maxDur * 60 * 1000;
              const isNotEnded = Date.now() < sessionEndTime;
              const showTracking =
                liveOk && (isViewingJoinedSession || selectedSessionRole === "organizer") && isNotEnded;
              return showTracking;
            })() && (
              <IOSListGroup header="POSITION EN DIRECT">
                <div className="p-4 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Navigation className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium">Partager ma position</p>
                        <p className="text-[12px] text-muted-foreground">Visible par les autres participants</p>
                      </div>
                    </div>
                    <Switch
                      checked={liveTrackingEnabled}
                      onCheckedChange={handleTrackingToggle}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-[8px]"
                    onClick={() => navigate(`/session-tracking/${selectedSession.id}`)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Voir sur la carte
                  </Button>
                </div>
              </IOSListGroup>
            )}

            {/* Info Cards */}
            <IOSListGroup header="INFORMATIONS">
              <IOSListItem
                icon={Calendar}
                iconBgColor="bg-red-500"
                title="Date"
                value={format(new Date(selectedSession.scheduled_at), 'dd MMM yyyy', { locale: fr })}
                showChevron={false}
                showSeparator={true}
              />
              <IOSListItem
                icon={Clock}
                iconBgColor="bg-orange-500"
                title="Heure"
                value={format(new Date(selectedSession.scheduled_at), 'HH:mm', { locale: fr })}
                showChevron={false}
                showSeparator={true}
              />
              <IOSListItem
                icon={MapPin}
                iconBgColor="bg-green-500"
                title="Lieu"
                subtitle={selectedSession.location_name}
                showChevron={false}
                showSeparator={false}
              />
            </IOSListGroup>

            {/* Description */}
            {selectedSession.description && (
              <IOSListGroup header="DESCRIPTION">
                <div className="p-4 bg-card">
                  <p className="text-[15px] text-foreground leading-relaxed">
                    {selectedSession.description}
                  </p>
                </div>
              </IOSListGroup>
            )}

            {/* Participants */}
            <IOSListGroup header={`PARTICIPANTS (${participants.length})`}>
              {participants.length === 0 ? (
                <div className="p-4 bg-card text-center">
                  <p className="text-[15px] text-muted-foreground">Aucun participant inscrit</p>
                </div>
              ) : (
                participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 px-4 py-3 bg-card cursor-pointer active:bg-secondary transition-colors relative"
                    onClick={() => navigateToProfile(participant.user_id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.profiles.avatar_url || undefined} />
                      <AvatarFallback className="text-sm font-semibold">
                        {participant.profiles.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-medium">{participant.profiles.username}</p>
                      <p className="text-[13px] text-muted-foreground">
                        Inscrit {format(new Date(participant.joined_at), 'dd/MM', { locale: fr })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                    {index < participants.length - 1 && (
                      <div className="absolute bottom-0 left-[68px] right-0 h-px bg-border" />
                    )}
                  </div>
                ))
              )}
            </IOSListGroup>

            {/* Leave session button for joined sessions */}
            {isViewingJoinedSession && (
              <div className="px-0">
                <Button
                  variant="destructive"
                  className="w-full rounded-[10px]"
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Quitter la séance
                </Button>
              </div>
            )}
          </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <CreateSessionWizard
            isOpen={isEditSessionDialogOpen}
            onClose={() => setIsEditSessionDialogOpen(false)}
            onSessionCreated={handleSessionUpdated}
            map={null}
            editSession={selectedSession}
            isEditMode={true}
          />
        </Suspense>

        <Suspense fallback={null}>
          <ProfilePreviewDialog
            userId={selectedUserId}
            onClose={closeProfilePreview}
          />
        </Suspense>

        {/* Leave Session Confirmation Dialog */}
        <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
          <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
            <AlertDialogHeader className="p-6 pb-4">
              <AlertDialogTitle className="text-center text-[17px] font-semibold">
                Quitter la séance
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
                Êtes-vous sûr de vouloir quitter cette séance ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="border-t border-border">
              <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-[17px] font-normal hover:bg-secondary/50">
                Annuler
              </AlertDialogCancel>
            </div>
            <div className="border-t border-border">
              <AlertDialogAction
                onClick={handleLeaveSession}
                className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
              >
                Quitter
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Tracking Warning Dialog */}
        <AlertDialog open={showTrackingWarning} onOpenChange={setShowTrackingWarning}>
          <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
            <AlertDialogHeader className="p-6 pb-4">
              <AlertDialogTitle className="text-center text-[17px] font-semibold">
                Partager votre position
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
                Votre position est partagée en temps réel avec les participants qui consultent la carte, uniquement pendant le créneau horaire de la séance (jusqu’à la fin prévue). Vous pouvez arrêter le partage à tout moment ici. Les autres participants qui activent le suivi apparaîtront aussi sur la carte avec leur photo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="border-t border-border">
              <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-[17px] font-normal hover:bg-secondary/50">
                Annuler
              </AlertDialogCancel>
            </div>
            <div className="border-t border-border">
              <AlertDialogAction
                onClick={() => startParticipantTracking()}
                className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-primary text-[17px] font-semibold"
              >
                Activer
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <SessionShareScreen
          open={showSessionShare}
          onClose={() => {
            setShowSessionShare(false);
            setSessionForShare(null);
          }}
          session={sessionForShare}
          onOpenConversationShare={() => {
            setShowSessionShare(false);
            setShowShareConversationDialog(true);
          }}
        />

        {selectedSession && (
          <ShareSessionToConversationDialog
            isOpen={showShareConversationDialog}
            onClose={() => setShowShareConversationDialog(false)}
            session={{
              id: selectedSession.id,
              title: selectedSession.title,
              description: selectedSession.description,
              activity_type: selectedSession.activity_type,
              scheduled_at: selectedSession.scheduled_at,
              location_name: selectedSession.location_name,
              organizer_id: selectedSession.organizer_id ?? '',
              profiles: selectedSession.organizer_id
                ? (() => {
                    const p = organizerProfiles.get(selectedSession.organizer_id!);
                    return p
                      ? {
                          username: p.username,
                          display_name: p.display_name,
                          avatar_url: p.avatar_url ?? undefined,
                        }
                      : undefined;
                  })()
                : undefined,
            }}
            onSessionShared={() => setShowShareConversationDialog(false)}
          />
        )}
      </>
    );
  }

  // Main list view
  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary" data-tutorial="tutorial-my-sessions">
        <div className="z-50 shrink-0 border-b border-border bg-card pt-[var(--safe-area-top)]">
          <div className="flex items-center justify-between gap-3 px-ios-4 py-ios-3">
            <h1 className="min-w-0 flex-1 text-[28px] font-bold leading-tight tracking-tight text-foreground">
              {t("navigation.mySessions")}
            </h1>
            <button
              type="button"
              onClick={handleHeaderCreateSession}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.96]"
              aria-label={t("navigation.createSession")}
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
            </button>
          </div>

          <div className="px-ios-4 pb-ios-3" data-no-tab-swipe="true">
            <div className="flex justify-between gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {weekDays.map((d) => {
                const selected = isSameDay(d, selectedDay);
                const dayKey = format(startOfDay(d), "yyyy-MM-dd");
                const dot = dayKeysWithSessions.has(dayKey);
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDay(startOfDay(d))}
                    className={cn(
                      "flex min-w-[2.75rem] flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold touch-manipulation transition-colors",
                      selected ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    <span className="leading-none">{formatWeekdayLabel(d)}</span>
                    <span className="tabular-nums leading-none">{format(d, "d")}</span>
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full",
                        !dot ? "bg-transparent" : selected ? "bg-primary-foreground" : "bg-primary"
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-ios-4 pb-ios-3">
            <div className="flex rounded-ios-lg bg-muted/80 p-1 dark:bg-muted/30">
              <button
                type="button"
                onClick={() => setTimeSegment("upcoming")}
                className={cn(
                  "min-h-[40px] flex-1 rounded-ios-md text-[13px] font-semibold transition-colors",
                  timeSegment === "upcoming" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                À venir
              </button>
              <button
                type="button"
                onClick={() => setTimeSegment("past")}
                className={cn(
                  "min-h-[40px] flex-1 rounded-ios-md text-[13px] font-semibold transition-colors",
                  timeSegment === "past" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Passées
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmEmbedded((v) => !v)}
              className="mt-2 w-full py-2 text-center text-[13px] font-medium text-primary touch-manipulation"
            >
              {showConfirmEmbedded ? "Retour à la liste des séances" : "Confirmer des présences"}
            </button>
          </div>
        </div>

        <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto px-ios-4 pb-ios-6 pt-ios-3">
          {showConfirmEmbedded ? (
            <div className="min-h-0 pb-ios-6">
              <ConfirmPresencePage embedded />
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="ios-card rounded-2xl border border-border/60 bg-card p-4 animate-pulse shadow-[var(--shadow-card,0_2px_12px_rgba(0,0,0,0.06))]">
                  <div className="flex gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-secondary" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 max-w-[70%] rounded bg-secondary" />
                      <div className="h-3 max-w-[40%] rounded bg-secondary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displaySessionEntries.length === 0 ? (
            <div className={emptyStateSx.shell}>
              <div className={emptyStateSx.iconCircle}>
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className={emptyStateSx.textBlock}>
                <h3 className="text-ios-title3 font-semibold text-foreground">Aucune séance ce jour-là</h3>
                <p className="text-ios-subheadline max-w-xs leading-relaxed text-muted-foreground">
                  {timeSegment === "upcoming"
                    ? "Choisis une autre date ou crée une séance depuis le bouton +."
                    : "Aucune séance passée à afficher pour cette date."}
                </p>
              </div>
              {timeSegment === "upcoming" && (
                <Button type="button" onClick={handleHeaderCreateSession} className="w-full max-w-xs">
                  <Plus className="mr-ios-2 h-5 w-5" />
                  Créer une séance
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-ios-3">
              {displaySessionEntries.map(({ session, role }) => {
                const badge = sessionBadge(session, role);
                const orgProfile =
                  role === "participant" && session.organizer_id
                    ? organizerProfiles.get(session.organizer_id)
                    : null;
                const dateLine = (() => {
                  const raw = format(new Date(session.scheduled_at), "EEE d MMM yyyy 'à' HH:mm", { locale: fr });
                  return raw.charAt(0).toUpperCase() + raw.slice(1);
                })();
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => void handleSessionClick(session, role)}
                    className="ios-card w-full rounded-2xl border border-border/60 bg-card p-ios-3 text-left shadow-[var(--shadow-card,0_2px_12px_rgba(0,0,0,0.06))] transition-transform active:scale-[0.99] touch-manipulation dark:border-white/10"
                  >
                    <div className="flex items-stretch gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <ActivityIcon activityType={session.activity_type} size="md" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <h3 className="min-w-0 flex-1 text-left text-[16px] font-semibold leading-tight text-foreground">
                            {session.title}
                          </h3>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {orgProfile && (
                          <p className="mt-1 truncate text-[12px] text-muted-foreground">
                            Avec {orgProfile.display_name || orgProfile.username}
                          </p>
                        )}
                        <p className="mt-1.5 text-[13px] text-muted-foreground">{dateLine}</p>
                        <p className="mt-1 flex items-start gap-1 text-[13px] text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                          <span className="min-w-0 leading-snug">{session.location_name || "Lieu à préciser"}</span>
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground/45" aria-hidden />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <ProfilePreviewDialog userId={selectedUserId} onClose={closeProfilePreview} />
      </Suspense>

      {/* Delete Session Confirmation Dialog - iOS Style */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-ios-lg max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-ios-6 pb-ios-4">
            <AlertDialogTitle className="text-center text-ios-headline font-semibold">
              Supprimer la séance
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-ios-footnote text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-ios-headline font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-ios-headline font-semibold"
            >
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <SessionShareScreen
        open={showSessionShare}
        onClose={() => {
          setShowSessionShare(false);
          setSessionForShare(null);
        }}
        session={sessionForShare}
        onOpenConversationShare={() => {
          setShowSessionShare(false);
          setShowShareConversationDialog(true);
        }}
      />

      {selectedSession && (
        <ShareSessionToConversationDialog
          isOpen={showShareConversationDialog}
          onClose={() => setShowShareConversationDialog(false)}
          session={{
            id: selectedSession.id,
            title: selectedSession.title,
            description: selectedSession.description,
            activity_type: selectedSession.activity_type,
            scheduled_at: selectedSession.scheduled_at,
            location_name: selectedSession.location_name,
            organizer_id: selectedSession.organizer_id ?? '',
            profiles: selectedSession.organizer_id
              ? (() => {
                  const p = organizerProfiles.get(selectedSession.organizer_id!);
                  return p
                    ? {
                        username: p.username,
                        display_name: p.display_name,
                        avatar_url: p.avatar_url ?? undefined,
                      }
                    : undefined;
                })()
              : undefined,
          }}
          onSessionShared={() => setShowShareConversationDialog(false)}
        />
      )}

    </>
  );
}
