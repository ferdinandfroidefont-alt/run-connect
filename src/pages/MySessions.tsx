import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Users, Edit, Trash2, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Plus, CalendarDays, List, MessageCircle, LogOut, Navigation, UserCheck } from "lucide-react";
import { Switch } from '@/components/ui/switch';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { setLiveShareOptIn } from '@/lib/liveTrackingStorage';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from "react-router-dom";
import { useProfileNavigation } from '@/hooks/useProfileNavigation';
import { ActivityIcon, getActivityLabel } from '@/lib/activityIcons';
import { IOSListItem, IOSListGroup } from '@/components/ui/ios-list-item';
import { getIosEmptyStateSpacing } from '@/lib/iosEmptyStateLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionCalendarView } from '@/components/SessionCalendarView';
import { CompletedActivityCard } from '@/components/sessions/CompletedActivityCard';
import { useCompletedActivities } from '@/hooks/useCompletedActivities';

const CreateSessionWizard = lazy(() =>
  import('@/components/session-creation/CreateSessionWizard').then((m) => ({ default: m.CreateSessionWizard }))
);
const ProfilePreviewDialog = lazy(() =>
  import('@/components/ProfilePreviewDialog').then((m) => ({ default: m.ProfilePreviewDialog }))
);
const OrganizerStatsCard = lazy(() =>
  import('@/components/OrganizerStatsCard').then((m) => ({ default: m.OrganizerStatsCard }))
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToProfile, selectedUserId, showProfilePreview, closeProfilePreview } = useProfileNavigation();
  const [mainTab, setMainTab] = useState<'planned' | 'completed'>('planned');
  const [completedSubTab, setCompletedSubTab] = useState<'mine' | 'public'>('mine');
  const { items: completedItems, loading: completedLoading } = useCompletedActivities(
    completedSubTab,
    mainTab === 'completed'
  );
  const [sessionSource, setSessionSource] = useState<'created' | 'joined'>('created');
  const [sessionsDisplayMode, setSessionsDisplayMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<UserSession[]>([]);
  const [organizerProfiles, setOrganizerProfiles] = useState<Map<string, OrganizerProfile>>(new Map());
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditSessionDialogOpen, setIsEditSessionDialogOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [sessionPage, setSessionPage] = useState(0);
  const emptyStateSx = useMemo(() => getIosEmptyStateSpacing(), []);
  const SESSIONS_PER_PAGE = 3;


  // Live tracking participant states
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [showTrackingWarning, setShowTrackingWarning] = useState(false);
  const trackingWatchIdRef = useRef<string | null>(null);

  const isViewingJoinedSession = selectedSession && sessionSource === 'joined';

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
      if (sessionSource === 'created') {
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
  }, [selectedSession, user]);

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
    if (sessionSource === 'created' && selectedSession) {
      await supabase.from('sessions').update({ live_tracking_active: false }).eq('id', selectedSession.id);
    }
  }, [sessionSource, selectedSession]);

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

  const handleSessionClick = async (session: UserSession) => {
    setSelectedSession(session);
    await loadSessionParticipants(session.id);
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
      setTimeout(() => setSelectedSession(null), 100);
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
      setTimeout(() => setSelectedSession(null), 100);
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

  const now = new Date().toISOString();
  const activeSessions = sessionSource === 'created' ? sessions : joinedSessions;
  const filteredSessions = activeSessions.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return session.scheduled_at >= now;
    if (filter === 'completed') return session.scheduled_at < now;
    return true;
  });

  // Session detail view
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
                }}
                className="gap-1 text-primary p-0 h-auto font-normal"
              >
                <ArrowLeft className="h-5 w-5" />
                Retour
              </Button>
              {!isViewingJoinedSession && (
                <div className="flex items-center gap-2">
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
                liveOk && (isViewingJoinedSession || sessionSource === 'created') && isNotEnded;
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
      </>
    );
  }

  // Main list view
  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary" data-tutorial="tutorial-my-sessions">
        {/* iOS Header */}
        <div className="z-50 shrink-0 border-b border-border bg-card pt-[var(--safe-area-top)]">
          <div className="px-ios-4 py-ios-3 relative flex items-center justify-center">
            <h1 className="text-ios-largetitle font-bold tracking-tight text-center">Mes Séances</h1>
          </div>
          
          {/* Planification vs activités réalisées */}
          <div className="px-ios-4 pb-ios-2">
            <div className="flex gap-ios-1">
              <div className="w-1/2">
                <button
                  type="button"
                  onClick={() => setMainTab('planned')}
                  className={`w-full py-ios-2 text-ios-footnote font-semibold rounded-ios-md transition-colors ${
                    mainTab === 'planned'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground active:opacity-90'
                  }`}
                >
                  Programmées
                </button>
              </div>
              <div className="w-1/2">
                <button
                  type="button"
                  onClick={() => setMainTab('completed')}
                  className={`w-full py-ios-2 text-ios-footnote font-semibold rounded-ios-md transition-colors ${
                    mainTab === 'completed'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground active:opacity-90'
                  }`}
                >
                  Terminées
                </button>
              </div>
            </div>

            {mainTab === 'planned' && (
              <div className="mt-ios-2 bg-secondary rounded-b-ios-md rounded-t-ios-sm p-ios-1">
                <div className="flex gap-ios-1">
                  <button
                    type="button"
                    onClick={() => { setSessionSource('created'); setSessionPage(0); }}
                    className={`flex-1 py-ios-1 text-[11px] font-semibold rounded-ios-sm transition-colors ${
                      sessionSource === 'created'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Créées
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSessionSource('joined'); setSessionPage(0); }}
                    className={`flex-1 py-ios-1 text-[11px] font-semibold rounded-ios-sm transition-colors ${
                      sessionSource === 'joined'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Rejointes
                  </button>
                </div>
              </div>
            )}

            {mainTab === 'completed' && (
              <div className="mt-ios-2 bg-secondary rounded-b-ios-md rounded-t-ios-sm p-ios-1">
                <div className="flex gap-ios-1">
                  <button
                    type="button"
                    onClick={() => setCompletedSubTab('mine')}
                    className={`flex-1 py-ios-1 text-[11px] font-semibold rounded-ios-sm transition-colors ${
                      completedSubTab === 'mine'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Mes séances
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletedSubTab('public')}
                    className={`flex-1 py-ios-1 text-[11px] font-semibold rounded-ios-sm transition-colors ${
                      completedSubTab === 'public'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Publiques
                  </button>
                </div>
              </div>
            )}

            {mainTab === 'planned' && (
              <button
                type="button"
                onClick={() => navigate('/confirm-presence')}
                className="mt-ios-2 flex w-full items-center justify-center gap-1.5 rounded-ios-md py-2 text-[12px] font-medium text-primary active:opacity-80"
              >
                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                Confirmer ma présence à une séance
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </button>
            )}
          </div>
          <div className="h-px bg-border" />
        </div>

        <div className="ios-scroll-region pt-ios-2 pb-ios-6">
            {mainTab === 'planned' ? (
            <>
              {/* List/Calendar toggle */}
              <div className="flex px-ios-4 mb-ios-1">
                <div className="flex ios-card rounded-ios-lg p-ios-1 shrink-0">
                  <button
                    onClick={() => setSessionsDisplayMode('list')}
                    className={`p-ios-1 rounded-ios-sm transition-colors ${
                      sessionsDisplayMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSessionsDisplayMode('calendar')}
                    className={`p-ios-1 rounded-ios-sm transition-colors ${
                      sessionsDisplayMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filter Pills — hauteur légèrement réduite, style iOS conservé */}
              <div className="flex gap-ios-2 overflow-x-auto pb-ios-1 px-ios-4 mb-ios-3">
                {[
                  { key: 'all', label: 'Toutes' },
                  { key: 'upcoming', label: 'À venir' },
                  { key: 'completed', label: 'Passées' }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setFilter(f.key as any); setSessionPage(0); }}
                    className={`px-ios-3 py-1.5 min-h-[32px] rounded-full text-[12px] leading-tight font-medium whitespace-nowrap transition-colors ${
                      filter === f.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sessions Display */}
              {sessionsDisplayMode === 'calendar' ? (
                <div className="box-border min-w-0 w-full max-w-full px-4">
                  <SessionCalendarView
                    sessions={filteredSessions}
                    onSessionClick={handleSessionClick}
                  />
                </div>
              ) : loading ? (
                <div className="space-y-px">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card p-ios-3 animate-pulse">
                      <div className="flex gap-ios-2">
                        <div className="h-10 w-10 bg-secondary rounded-ios-md" />
                        <div className="flex-1 space-y-ios-2">
                          <div className="h-4 bg-secondary rounded w-3/4" />
                          <div className="h-3 bg-secondary rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className={emptyStateSx.shell}>
                  <div className={emptyStateSx.iconCircle}>
                    <Calendar className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className={emptyStateSx.textBlock}>
                    <h3 className="text-ios-title3 font-semibold text-foreground">
                      {sessionSource === 'created' ? 'Aucune séance créée' : 'Aucune séance rejointe'}
                    </h3>
                    <p className="text-ios-subheadline text-muted-foreground max-w-xs leading-relaxed">
                      {sessionSource === 'created'
                        ? 'Créez votre première séance sportive et invitez vos amis à vous rejoindre.'
                        : 'Rejoignez des séances depuis la page d\'accueil pour les retrouver ici.'}
                    </p>
                  </div>
                  {sessionSource === 'created' && (
                    <Button
                      onClick={() => navigate('/')}
                      className="w-full max-w-xs"
                    >
                      <Plus className="h-5 w-5 mr-ios-2" />
                      Créer une séance
                    </Button>
                  )}
                </div>
              ) : (
                <div className="ios-list-stack">
                  {/* Flèche haut */}
                  {sessionPage > 0 && (
                    <button
                      onClick={() => setSessionPage(p => p - 1)}
                      className="w-full flex items-center justify-center py-2 text-primary active:opacity-70 transition-opacity"
                    >
                      <ChevronUp className="h-6 w-6" />
                    </button>
                  )}

                  {filteredSessions
                    .slice(sessionPage * SESSIONS_PER_PAGE, (sessionPage + 1) * SESSIONS_PER_PAGE)
                    .map((session) => {
                      const isUpcoming = session.scheduled_at >= now;
                      const orgProfile = sessionSource === 'joined' && session.organizer_id
                        ? organizerProfiles.get(session.organizer_id)
                        : null;
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSessionClick(session)}
                          className="ios-list-row"
                        >
                          <div className="flex items-start gap-ios-2">
                            <ActivityIcon activityType={session.activity_type} size="md" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {sessionSource === 'joined' ? (
                                  <Badge className="text-xs bg-blue-500 text-white">Rejoint</Badge>
                                ) : (
                                  <Badge 
                                    variant={isUpcoming ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {isUpcoming ? "À venir" : "Terminée"}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-ios-headline font-semibold truncate">{session.title}</h3>
                              {/* Organizer info for joined sessions */}
                              {orgProfile && (
                                <div className="flex items-center gap-ios-1 mt-ios-1">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={orgProfile.avatar_url || undefined} />
                                    <AvatarFallback className="text-[8px]">
                                      {orgProfile.username?.[0]?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-ios-footnote text-muted-foreground truncate">
                                    {orgProfile.display_name || orgProfile.username}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-ios-3 mt-0.5 text-[12px] text-muted-foreground leading-tight">
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  {format(new Date(session.scheduled_at), 'dd/MM', { locale: fr })}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {format(new Date(session.scheduled_at), 'HH:mm', { locale: fr })}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Users className="h-3 w-3 shrink-0" />
                                  {session.current_participants || 0}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />
                          </div>
                        </div>
                      );
                    })}

                  {/* Flèche bas */}
                  {(sessionPage + 1) * SESSIONS_PER_PAGE < filteredSessions.length && (
                    <button
                      onClick={() => setSessionPage(p => p + 1)}
                      className="w-full flex items-center justify-center py-2 text-primary active:opacity-70 transition-opacity"
                    >
                      <ChevronDown className="h-6 w-6" />
                    </button>
                  )}

                  {/* Page indicator */}
                  {filteredSessions.length > SESSIONS_PER_PAGE && (
                    <p className="text-center text-[13px] text-muted-foreground">
                      {sessionPage * SESSIONS_PER_PAGE + 1}-{Math.min((sessionPage + 1) * SESSIONS_PER_PAGE, filteredSessions.length)} sur {filteredSessions.length}
                    </p>
                  )}
                </div>
              )}

              {/* Organizer Stats - only for created sessions */}
              {sessionSource === 'created' && (
                <div className="mt-ios-3 pb-ios-6">
                  <Suspense fallback={null}>
                    <div className="px-ios-4"><OrganizerStatsCard /></div>
                  </Suspense>
                </div>
              )}
            </>
            ) : (
            <>
              <p className="px-ios-4 pb-ios-2 text-center text-[12px] leading-relaxed text-muted-foreground">
                Activités réellement effectuées (tracé GPS si tu as activé le partage pendant la séance). Connexions Garmin, Strava et Coros arriveront ici.
              </p>
              {completedLoading ? (
                <div className="space-y-ios-3 px-ios-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="ios-card animate-pulse border border-border/60 p-ios-4">
                      <div className="flex gap-ios-3">
                        <div className="h-12 w-12 rounded-ios-md bg-secondary" />
                        <div className="flex-1 space-y-ios-2">
                          <div className="h-4 w-2/3 rounded bg-secondary" />
                          <div className="h-3 w-1/2 rounded bg-secondary" />
                        </div>
                      </div>
                      <div className="mt-ios-3 h-36 rounded-[10px] bg-secondary" />
                    </div>
                  ))}
                </div>
              ) : completedItems.length === 0 ? (
                <div className={emptyStateSx.shell}>
                  <div className={emptyStateSx.iconCircle}>
                    <Navigation className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className={emptyStateSx.textBlock}>
                    <h3 className="text-ios-title3 font-semibold text-foreground">
                      {completedSubTab === 'mine' ? 'Aucune activité enregistrée' : 'Aucune séance publique à afficher'}
                    </h3>
                    <p className="text-ios-subheadline text-muted-foreground max-w-xs leading-relaxed">
                      {completedSubTab === 'mine'
                        ? 'Quand une séance est passée et que tu as partagé ta position, ton parcours apparaît ici. Tu peux aussi consulter les séances publiques des autres runners.'
                        : 'Les séances terminées visibles par tous (sans club, non réservées aux amis) s’affichent ici.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="ios-list-stack px-ios-4">
                  {completedItems.map((item, index) => (
                    <CompletedActivityCard
                      key={item.session.id}
                      item={item}
                      index={index}
                      variant={completedSubTab === 'public' ? 'public' : 'mine'}
                    />
                  ))}
                </div>
              )}
            </>
            )}
        </div>
      </div>

      <Suspense fallback={null}>
        <ProfilePreviewDialog
          userId={selectedUserId}
          onClose={closeProfilePreview}
        />
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

    </>
  );
}
