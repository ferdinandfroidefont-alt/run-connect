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
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getActivityIcon(selectedSession.activity_type)}</span>
              {selectedSession.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mes Séances</h1>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-muted-foreground" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as 'all' | 'upcoming' | 'completed')}
            className="bg-background border border-border rounded-md px-3 py-1 text-sm"
          >
            <option value="all">Toutes</option>
            <option value="upcoming">À venir</option>
            <option value="completed">Terminées</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
          </div>
        ) : filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <Card 
              key={session.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSessionClick(session)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-xl">{getActivityIcon(session.activity_type)}</span>
                      {session.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(session)}
                      <Badge variant="outline">Créateur</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {session.activity_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {session.session_type}
                    </Badge>
                    {session.intensity && (
                      <Badge variant="outline" className="text-xs">
                        {session.intensity}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={16} />
                  <span>{format(new Date(session.scheduled_at), 'PPP', { locale: fr })}</span>
                  <Clock size={16} className="ml-2" />
                  <span>{format(new Date(session.scheduled_at), 'HH:mm')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={16} />
                  <span>{session.location_name}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users size={16} />
                  <span>{session.current_participants || 0} participant{(session.current_participants || 0) > 1 ? 's' : ''}</span>
                  {session.max_participants && <span>/ {session.max_participants}</span>}
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {session.description}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-xl font-semibold mb-2">Aucune séance trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' 
                ? "Vous n'avez pas encore organisé de séances. Créez votre première séance !" 
                : filter === 'upcoming'
                ? "Aucune séance à venir. Planifiez votre prochaine activité !"
                : "Aucune séance terminée trouvée."}
            </p>
            <Button>Créer une séance</Button>
          </div>
        )}
      </div>
    </div>
  );
}