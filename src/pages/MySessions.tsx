import { RouteDialog } from '@/components/RouteDialog';
import { RouteCard } from '@/components/RouteCard';
import { RouteEditDialog } from '@/components/RouteEditDialog';
import { EditSessionDialog } from '@/components/EditSessionDialog';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MapPin, Users, Filter, Edit, Trash2, Route } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from '@/contexts/AppContext';
import { useProfileNavigation } from '@/hooks/useProfileNavigation';

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

  // Load user's sessions
  const loadUserSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const now = new Date().toISOString();
      
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

  // Load participants for selected session
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

  // Vérifier le paramètre URL pour ouvrir l'onglet routes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('tab') === 'routes') {
      setCurrentView('routes');
    }
  }, [location.search]);

  useEffect(() => {
    loadUserSessions();
    if (currentView === 'routes') {
      loadUserRoutes();
    }
  }, [user, currentView]);

  // Load user's routes
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

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible.')) {
      return;
    }

    try {
      // Supprimer d'abord les participants de la séance
      const { error: participantsError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', selectedSession.id);

      if (participantsError) throw participantsError;

      // Supprimer les demandes de participation
      const { error: requestsError } = await supabase
        .from('session_requests')
        .delete()
        .eq('session_id', selectedSession.id);

      if (requestsError) throw requestsError;

      // Supprimer la séance
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', selectedSession.id)
        .eq('organizer_id', user?.id);

      if (error) throw error;

      // Retourner à la liste et mettre à jour l'état local
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
    }
  };

  const getActivityColor = (activityType: string) => {
    const colors: Record<string, string> = {
      'course': 'bg-red-500',
      'velo': 'bg-blue-500',
      'marche': 'bg-green-500',
      'natation': 'bg-teal-500'
    };
    return colors[activityType] || 'bg-gray-500';
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'course':
        return '🏃‍♂️';
      case 'velo':
        return '🚴‍♂️';
      case 'marche':
        return '🚶‍♂️';
      case 'natation':
        return '🏊‍♂️';
      default:
        return '🏃‍♂️';
    }
  };

  const now = new Date().toISOString();
  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return session.scheduled_at >= now;
    if (filter === 'completed') return session.scheduled_at < now;
    return true;
  });

  const getStatusBadge = (session: UserSession) => {
    const isUpcoming = session.scheduled_at >= now;
    return isUpcoming ? 
      <Badge variant="default">À venir</Badge> : 
      <Badge variant="secondary">Terminée</Badge>;
  };

  if (selectedSession) {
    return (
      <>
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSession(null)}
          >
            ← Retour aux séances
          </Button>
          <div className="flex items-center gap-2">
            {new Date(selectedSession.scheduled_at) >= new Date() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSession}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              {selectedSession.image_url && (
                <img 
                  src={selectedSession.image_url} 
                  alt={selectedSession.title}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{getActivityIcon(selectedSession.activity_type)}</span>
                  {selectedSession.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(selectedSession.scheduled_at), 'PPP à HH:mm', { locale: fr })}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedSession.location_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {participants.length} participant{participants.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedSession.description}
            </p>
            
            <div className="space-y-3">
              <h4 className="font-medium">Participants inscrits :</h4>
              {participants.length > 0 ? (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2 pr-4">
                    {participants.map((participant) => (
                      <div 
                        key={participant.id} 
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigateToProfile(participant.user_id)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage 
                            src={participant.profiles.avatar_url || undefined} 
                            alt={participant.profiles.username || participant.profiles.display_name} 
                          />
                          <AvatarFallback>
                            {(participant.profiles.username || participant.profiles.display_name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                             {participant.profiles.username || participant.profiles.display_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Inscrit le {format(new Date(participant.joined_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun participant inscrit pour le moment.</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <EditSessionDialog
          isOpen={isEditSessionDialogOpen}
          onClose={() => setIsEditSessionDialogOpen(false)}
          onSessionUpdated={handleSessionUpdated}
          session={selectedSession}
        />
        
        <ProfilePreviewDialog
          userId={showProfilePreview ? selectedUserId : null}
          onClose={closeProfilePreview}
        />
      </div>
      </>
    );
  }

  return (
    <>
      {/* Petite barre noire en haut uniquement pour MySessions */}
      <div className="fixed top-0 left-0 right-0 w-full h-6 bg-background z-50"></div>
      <div className="container mx-auto px-4 py-4 pb-20 min-h-screen flex flex-col">
        {/* Fixed Header Only */}
        <div className="fixed top-6 left-0 right-0 flex-shrink-0 bg-background z-50 space-y-4 pb-4 border-b border-border">
          <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center justify-center -mt-2">
            <Button
              onClick={() => {
                console.log('🚀 "Créer un itinéraire" clicked - starting navigation with URL parameter');
                navigate('/?createRoute=true');
              }}
              size="sm"
              className="gap-2"
            >
              <Route className="h-4 w-4" />
              Créer un itinéraire
            </Button>
          </div>
          <div className="flex items-center justify-center mt-3">
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentView('sessions')}
                variant={currentView === 'sessions' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Mes Séances
              </Button>
              <Button
                onClick={() => setCurrentView('routes')}
                variant={currentView === 'routes' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                <Route className="h-4 w-4" />
                Mes Itinéraires
              </Button>
            </div>
          </div>
          </div>
        </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pt-32" style={{height: 'calc(100vh - 12rem)'}}>
        {currentView === 'sessions' ? (
          // Sessions View
          loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">Chargement...</p>
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="space-y-2">
              {filteredSessions.slice(0, 6).map((session) => (
                <Card 
                  key={session.id} 
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => handleSessionClick(session)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 flex-1 min-w-0">
                        {session.image_url && (
                          <img 
                            src={session.image_url} 
                            alt={session.title}
                            className="w-10 h-10 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-sm">{getActivityIcon(session.activity_type)}</span>
                            <h3 className="text-sm font-medium truncate">{session.title}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar size={10} />
                              <span>{format(new Date(session.scheduled_at), 'dd/MM')}</span>
                              <Clock size={10} className="ml-1" />
                              <span>{format(new Date(session.scheduled_at), 'HH:mm')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={10} />
                              <span>{session.current_participants || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getStatusBadge(session)}
                        <Badge variant="outline" className="text-xs px-1 py-0">Créateur</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredSessions.length > 6 && (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">
                    +{filteredSessions.length - 6} autres séances
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">⚽</div>
              <h3 className="text-base font-semibold mb-1">Aucune séance trouvée</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {filter === 'all' 
                  ? "Créez votre première séance !" 
                  : filter === 'upcoming'
                  ? "Planifiez votre prochaine activité !"
                  : "Aucune séance terminée."}
              </p>
              <Button size="sm">Créer une séance</Button>
            </div>
          )
        ) : (
          // Routes View
          routesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">Chargement des itinéraires...</p>
            </div>
          ) : routes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onEdit={editRoute}
                  onDelete={deleteRoute}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Route className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucun itinéraire créé</h3>
              <p className="text-muted-foreground mb-4">
                Utilisez le bouton crayon sur la carte pour créer votre premier itinéraire
              </p>
              <Button onClick={() => navigate('/')} className="gap-2">
                <MapPin className="h-4 w-4" />
                Aller à la carte
              </Button>
            </div>
          )
        )}
      </div>

      {/* Route Edit Dialog */}
      <RouteEditDialog
        isOpen={isRouteEditDialogOpen}
        onClose={() => {
          setIsRouteEditDialogOpen(false);
          setEditingRoute(null);
        }}
        route={editingRoute}
        onRouteUpdated={loadUserRoutes}
      />
    </div>
    </>
  );
}