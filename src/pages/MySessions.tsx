import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MapPin, Users, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

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

export default function MySessions() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

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
      toast.error('Erreur lors du chargement de vos séances');
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
      toast.error('Erreur lors du chargement des participants');
    }
  };

  useEffect(() => {
    loadUserSessions();
  }, [user]);

  const handleSessionClick = async (session: UserSession) => {
    setSelectedSession(session);
    await loadSessionParticipants(session.id);
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
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSession(null)}
          >
            ← Retour aux séances
          </Button>
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Mes Séances</h1>
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
      </div>

      <div className="flex-1">
        {loading ? (
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
        )}
      </div>
    </div>
  );
}