import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
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

interface UserSessionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSessionsDialog = ({ isOpen, onClose }: UserSessionsDialogProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's upcoming sessions
  const loadUserSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('organizer_id', user.id)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true });

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
      // First get participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId);

      if (participantsError) throw participantsError;

      // Then get profiles for each participant
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
    if (isOpen) {
      loadUserSessions();
    }
  }, [isOpen, user]);


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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedSession ? 'Participants de la séance' : 'Mes séances à venir'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh] px-6 pb-6">

        {selectedSession ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
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
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
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
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun participant inscrit pour le moment.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
              </div>
            ) : sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card 
                    key={session.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSessionClick(session)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-full ${getActivityColor(session.activity_type)} flex items-center justify-center text-white text-xl`}>
                          {getActivityIcon(session.activity_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1 truncate">{session.title}</h3>
                          
                          <div className="flex flex-wrap items-center gap-2 mb-2">
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
                          
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(session.scheduled_at), 'PPP à HH:mm', { locale: fr })}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location_name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {session.current_participants} participant{session.current_participants > 1 ? 's' : ''}
                              {session.max_participants && ` / ${session.max_participants}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Aucune séance à venir</h3>
                <p className="text-sm text-muted-foreground">
                  Vous n'avez organisé aucune séance prochainement.
                </p>
              </div>
            )}
          </div>
        )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};