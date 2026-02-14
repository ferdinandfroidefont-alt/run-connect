import { RouteDialog } from '@/components/RouteDialog';
import { RouteCard } from '@/components/RouteCard';
import { RouteEditDialog } from '@/components/RouteEditDialog';
import { CreateSessionWizard } from '@/components/session-creation/CreateSessionWizard';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Users, Edit, Trash2, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Plus, CalendarDays, List } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from '@/contexts/AppContext';
import { useProfileNavigation } from '@/hooks/useProfileNavigation';
import { ActivityIcon, getActivityLabel } from '@/lib/activityIcons';
import { IOSListItem, IOSListGroup } from '@/components/ui/ios-list-item';
import { OrganizerStatsCard } from '@/components/OrganizerStatsCard';
import { SessionCalendarView } from '@/components/SessionCalendarView';
import { StreakBadge } from '@/components/StreakBadge';

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

interface UserRoute {
  id: string;
  name: string;
  description: string | null;
  total_distance: number | null;
  total_elevation_gain: number | null;
  total_elevation_loss: number | null;
  min_elevation: number | null;
  max_elevation: number | null;
  created_at: string;
  coordinates: any;
}

export default function MySessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { openCreateRoute } = useAppContext();
  const { navigateToProfile, selectedUserId, showProfilePreview, closeProfilePreview } = useProfileNavigation();
  const [currentView, setCurrentView] = useState<'sessions' | 'routes'>('sessions');
  const [sessionsDisplayMode, setSessionsDisplayMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [routes, setRoutes] = useState<UserRoute[]>([]);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [isRouteEditDialogOpen, setIsRouteEditDialogOpen] = useState(false);
  const [isEditSessionDialogOpen, setIsEditSessionDialogOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionPage, setSessionPage] = useState(0);
  const SESSIONS_PER_PAGE = 3;

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
      setCurrentView('routes');
    }
  }, [location.search]);

  // Load sessions and subscribe to real-time updates
  useEffect(() => {
    if (!user) return;
    
    loadUserSessions();
    if (currentView === 'routes') {
      loadUserRoutes();
    }

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
      .subscribe((status) => {
        console.log('📡 MySessions: Subscription status:', status);
      });

    return () => {
      console.log('📡 MySessions: Unsubscribing from channel');
      supabase.removeChannel(channel);
    };
  }, [user, currentView]);

  // Reload sessions when page becomes visible (Android WebView fix)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('👁️ MySessions: Page visible, reloading sessions');
        loadUserSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loadUserRoutes = async () => {
    if (!user) return;

    setRoutesLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching user routes:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement de vos itinéraires",
        variant: "destructive",
      });
    } finally {
      setRoutesLoading(false);
    }
  };

  const deleteRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId)
        .eq('created_by', user?.id);

      if (error) throw error;

      setRoutes(prev => prev.filter(route => route.id !== routeId));
      toast({
        title: "Succès",
        description: "Itinéraire supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'itinéraire",
        variant: "destructive",
      });
    }
  };

  const editRoute = (route: any) => {
    setEditingRoute(route);
    setIsRouteEditDialogOpen(true);
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return "N/A";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${Math.round(meters / 1000 * 10) / 10} km`;
  };

  const formatElevation = (meters: number | null) => {
    if (!meters) return "N/A";
    return `${Math.round(meters)} m`;
  };

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

      setSelectedSession(null);
      setSessions(sessions.filter(s => s.id !== selectedSession.id));
      toast({
        title: "Succès",
        description: "Séance supprimée avec succès",
      });
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

  const now = new Date().toISOString();
  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return session.scheduled_at >= now;
    if (filter === 'completed') return session.scheduled_at < now;
    return true;
  });

  // Session detail view
  if (selectedSession) {
    const isUpcoming = new Date(selectedSession.scheduled_at) >= new Date();
    
    return (
      <>
        <div className="min-h-full bg-secondary bg-pattern">
          {/* iOS Header */}
          <div className="sticky top-0 z-50 bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSession(null)}
                className="gap-1 text-primary p-0 h-auto font-normal"
              >
                <ArrowLeft className="h-5 w-5" />
                Retour
              </Button>
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
            </div>
            <div className="h-px bg-border" />
          </div>

          <div className="p-4 space-y-6 pb-24">
            {/* Session Header Card */}
            <IOSListGroup>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <ActivityIcon activityType={selectedSession.activity_type} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={isUpcoming ? "default" : "secondary"} className="text-xs">
                        {isUpcoming ? "À venir" : "Terminée"}
                      </Badge>
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
          </div>
        </div>

        <CreateSessionWizard
          isOpen={isEditSessionDialogOpen}
          onClose={() => setIsEditSessionDialogOpen(false)}
          onSessionCreated={handleSessionUpdated}
          map={null}
          editSession={selectedSession}
          isEditMode={true}
        />

        <ProfilePreviewDialog
          userId={selectedUserId}
          onClose={closeProfilePreview}
        />
      </>
    );
  }

  // Main list view
  return (
    <>
      <div className="min-h-full bg-secondary pb-8 bg-pattern">
        {/* iOS Header */}
        <div className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="px-4 pt-4 pb-4 relative flex items-center justify-center">
            <h1 className="text-[34px] font-bold tracking-tight text-center">Mes Séances</h1>
          </div>
          
          {/* iOS Segmented Control */}
          <div className="px-4 pb-3">
            <div className="flex bg-secondary rounded-[10px] p-1">
              <button
                onClick={() => setCurrentView('sessions')}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-[8px] transition-colors ${
                  currentView === 'sessions'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Séances
              </button>
              <button
                onClick={() => setCurrentView('routes')}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-[8px] transition-colors ${
                  currentView === 'routes'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Itinéraires
              </button>
            </div>
          </div>
          <div className="h-px bg-border" />
        </div>

        {/* Content */}
        <div className="p-4">
          {currentView === 'sessions' ? (
            <>
              {/* Display Mode Toggle */}
              <div className="flex items-center gap-3 mb-4">
                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                  {[
                    { key: 'all', label: 'Toutes' },
                    { key: 'upcoming', label: 'À venir' },
                    { key: 'completed', label: 'Terminées' }
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setFilter(f.key as any); setSessionPage(0); }}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                        filter === f.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {/* Streak Badge */}
                {user && <StreakBadge userId={user.id} variant="compact" />}
                {/* List/Calendar toggle */}
                <div className="flex bg-card rounded-lg p-0.5 ml-2 shrink-0">
                  <button
                    onClick={() => setSessionsDisplayMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${
                      sessionsDisplayMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSessionsDisplayMode('calendar')}
                    className={`p-1.5 rounded-md transition-colors ${
                      sessionsDisplayMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sessions Display */}
              {sessionsDisplayMode === 'calendar' ? (
                <SessionCalendarView
                  sessions={filteredSessions}
                  onSessionClick={handleSessionClick}
                />
              ) : loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-[10px] p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="h-12 w-12 bg-secondary rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-secondary rounded w-3/4" />
                          <div className="h-3 bg-secondary rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="bg-card rounded-[10px] p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-[17px] font-medium text-foreground mb-1">Aucune séance</p>
                  <p className="text-[15px] text-muted-foreground">
                    Créez votre première séance sportive
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSessionClick(session)}
                          className="bg-card rounded-[10px] p-4 cursor-pointer active:bg-secondary transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <ActivityIcon activityType={session.activity_type} size="lg" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant={isUpcoming ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {isUpcoming ? "À venir" : "Terminée"}
                                </Badge>
                              </div>
                              <h3 className="text-[17px] font-semibold truncate">{session.title}</h3>
                              <div className="flex items-center gap-4 mt-1 text-[13px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(session.scheduled_at), 'dd/MM', { locale: fr })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {format(new Date(session.scheduled_at), 'HH:mm', { locale: fr })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {session.current_participants || 0}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground/50 mt-2" />
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

              {/* Organizer Stats - en bas */}
              <div className="mt-6">
                <OrganizerStatsCard />
              </div>
            </>
          ) : (
            <>
              {/* Routes */}
              {routesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-card rounded-[10px] p-4 animate-pulse">
                      <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : routes.length === 0 ? (
                <div className="bg-card rounded-[10px] p-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-[17px] font-medium text-foreground mb-1">Aucun itinéraire</p>
                  <p className="text-[15px] text-muted-foreground mb-4">
                    Créez votre premier itinéraire
                  </p>
                  <Button onClick={openCreateRoute} className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un itinéraire
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      onEdit={() => editRoute(route)}
                      onDelete={() => deleteRoute(route.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <RouteEditDialog
        isOpen={isRouteEditDialogOpen}
        onClose={() => setIsRouteEditDialogOpen(false)}
        route={editingRoute}
        onRouteUpdated={loadUserRoutes}
      />

      <ProfilePreviewDialog
        userId={selectedUserId}
        onClose={closeProfilePreview}
      />

      {/* Delete Confirmation Dialog - iOS Style */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Supprimer la séance
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
            >
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
