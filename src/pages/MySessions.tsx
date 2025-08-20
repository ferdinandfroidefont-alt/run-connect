import { RouteDialog } from '@/components/RouteDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, Filter, Edit, Edit2, Save, X, Route, TrendingUp, Mountain, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from "react-router-dom";

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
  const [currentView, setCurrentView] = useState<'sessions' | 'routes'>('sessions');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [routes, setRoutes] = useState<UserRoute[]>([]);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserSession>>({});
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [routeEditLoading, setRouteEditLoading] = useState(false);
  const [isRouteEditDialogOpen, setIsRouteEditDialogOpen] = useState(false);

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
        .order('scheduled_at', { ascending: true });

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

  const handleSaveRouteEdit = async (routeName: string, routeDescription: string) => {
    if (!editingRoute) return;
    
    setRouteEditLoading(true);
    try {
      const { error } = await supabase
        .from('routes')
        .update({
          name: routeName,
          description: routeDescription
        })
        .eq('id', editingRoute.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Itinéraire modifié avec succès",
      });
      setIsRouteEditDialogOpen(false);
      setEditingRoute(null);
      loadUserRoutes();
    } catch (error) {
      console.error('Error updating route:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'itinéraire",
        variant: "destructive",
      });
    } finally {
      setRouteEditLoading(false);
    }
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
    setEditForm(session);
    setIsEditing(false);
    await loadSessionParticipants(session.id);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (selectedSession) {
      setEditForm(selectedSession);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSession || !editForm) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          title: editForm.title,
          description: editForm.description,
          activity_type: editForm.activity_type,
          session_type: editForm.session_type,
          intensity: editForm.intensity,
          location_name: editForm.location_name,
          max_participants: editForm.max_participants
        })
        .eq('id', selectedSession.id);

      if (error) throw error;

      // Update local state
      const updatedSession = { ...selectedSession, ...editForm };
      setSelectedSession(updatedSession);
      setSessions(sessions.map(s => s.id === selectedSession.id ? updatedSession : s));
      setIsEditing(false);
      toast({
        title: "Succès",
        description: "Séance modifiée avec succès",
      });
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de la séance",
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
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSession(null)}
          >
            ← Retour aux séances
          </Button>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditClick}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Sauvegarder
              </Button>
            </div>
          )}
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
                {!isEditing ? (
                  <>
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
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Titre</label>
                      <Input
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Type d'activité</label>
                        <Select
                          value={editForm.activity_type || ''}
                          onValueChange={(value) => setEditForm({ ...editForm, activity_type: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="course">Course 🏃‍♂️</SelectItem>
                            <SelectItem value="velo">Vélo 🚴‍♂️</SelectItem>
                            <SelectItem value="marche">Marche 🚶‍♂️</SelectItem>
                            <SelectItem value="natation">Natation 🏊‍♂️</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Intensité</label>
                        <Select
                          value={editForm.intensity || ''}
                          onValueChange={(value) => setEditForm({ ...editForm, intensity: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facile">Facile</SelectItem>
                            <SelectItem value="modere">Modéré</SelectItem>
                            <SelectItem value="intense">Intense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Lieu</label>
                      <Input
                        value={editForm.location_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nombre maximum de participants</label>
                      <Input
                        type="number"
                        value={editForm.max_participants || ''}
                        onChange={(e) => setEditForm({ ...editForm, max_participants: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <p className="text-sm text-muted-foreground mb-4">
                {selectedSession.description}
              </p>
            ) : (
              <div className="mb-4">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}
            
            <div className="space-y-3">
              <h4 className="font-medium">Participants inscrits :</h4>
              {participants.length > 0 ? (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2 pr-4">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage 
                            src={participant.profiles.avatar_url || undefined} 
                            alt={participant.profiles.display_name || participant.profiles.username} 
                          />
                          <AvatarFallback>
                            {(participant.profiles.display_name || participant.profiles.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {participant.profiles.display_name || participant.profiles.username}
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
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 pb-20 h-screen flex flex-col">
      {/* Header with Tab Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            onClick={() => setCurrentView('sessions')}
            variant={currentView === 'sessions' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Mes Séances
          </Button>
          <Button
            onClick={() => setCurrentView('routes')}
            variant={currentView === 'routes' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
          >
            <Route className="h-4 w-4" />
            Mes Itinéraires
          </Button>
        </div>
        
        {currentView === 'sessions' ? (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as 'all' | 'upcoming' | 'completed')}
              className="bg-background border border-border rounded-md px-2 py-1 text-xs"
            >
              <option value="all">Toutes</option>
              <option value="upcoming">À venir</option>
              <option value="completed">Terminées</option>
            </select>
          </div>
        ) : (
          <Button
            onClick={() => navigate('/')}
            size="sm"
            className="gap-2"
          >
            <Route className="h-4 w-4" />
            Créer un itinéraire
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1">
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
            <div className="grid gap-3 md:grid-cols-2">
              {routes.map((route) => (
                <Card key={route.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{route.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(route.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => editRoute(route)}
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10 -mt-2 -mr-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteRoute(route.id)}
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {route.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {route.description}
                      </p>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Distance</p>
                          <p className="text-sm font-semibold">{formatDistance(route.total_distance)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Dénivelé +</p>
                          <p className="text-sm font-semibold">{formatElevation(route.total_elevation_gain)}</p>
                        </div>
                      </div>

                      {route.min_elevation && route.max_elevation && (
                        <>
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <Mountain className="h-4 w-4 text-orange-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Alt. min</p>
                              <p className="text-sm font-semibold">{formatElevation(route.min_elevation)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <Mountain className="h-4 w-4 text-red-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Alt. max</p>
                              <p className="text-sm font-semibold">{formatElevation(route.max_elevation)}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Route className="h-3 w-3" />
                        {Array.isArray(route.coordinates) ? route.coordinates.length : 0} points
                      </div>
                      {route.total_elevation_loss && (
                        <Badge variant="secondary" className="text-xs">
                          ↘️ {formatElevation(route.total_elevation_loss)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
      <RouteDialog
        isOpen={isRouteEditDialogOpen}
        onClose={() => {
          setIsRouteEditDialogOpen(false);
          setEditingRoute(null);
        }}
        onSave={handleSaveRouteEdit}
        title="Modifier l'itinéraire"
        initialName={editingRoute?.name || ''}
        initialDescription={editingRoute?.description || ''}
        loading={routeEditLoading}
      />
    </div>
  );
}