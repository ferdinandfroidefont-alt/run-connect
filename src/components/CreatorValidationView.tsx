import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  organizer_id: string;
  activity_type: string;
}

interface Participant {
  id: string;
  user_id: string;
  confirmed_by_creator: boolean | null;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface CreatorValidationViewProps {
  session: Session;
  onComplete: () => void;
}

export const CreatorValidationView = ({ session, onComplete }: CreatorValidationViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, [session.id]);

  const fetchParticipants = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from('session_participants')
        .select('id, user_id, confirmed_by_creator')
        .eq('session_id', session.id)
        .neq('user_id', user?.id);

      if (error) throw error;

      if (participantsData && participantsData.length > 0) {
        const userIds = participantsData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', userIds);

        const enriched = participantsData.map(p => ({
          ...p,
          username: profiles?.find(pr => pr.user_id === p.user_id)?.username || '',
          display_name: profiles?.find(pr => pr.user_id === p.user_id)?.display_name || null,
          avatar_url: profiles?.find(pr => pr.user_id === p.user_id)?.avatar_url || null,
        }));

        setParticipants(enriched);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (participantId: string, confirmed: boolean) => {
    setValidating(participantId);
    try {
      const { error } = await supabase
        .from('session_participants')
        .update({ confirmed_by_creator: confirmed })
        .eq('id', participantId);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p => p.id === participantId ? { ...p, confirmed_by_creator: confirmed } : p)
      );

      toast({
        title: confirmed ? "Présence confirmée" : "Absence marquée",
        description: confirmed ? "Le participant a été validé" : "Le participant a été marqué absent",
      });
    } catch (error) {
      console.error('Error validating participant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la présence",
        variant: "destructive",
      });
    } finally {
      setValidating(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-[10px] p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Info */}
      <div className="bg-card border border-border rounded-[10px] p-4">
        <h2 className="text-[17px] font-semibold text-foreground mb-2">{session.title}</h2>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(session.scheduled_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{session.location_name}</span>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="bg-card border border-border rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-[15px] font-medium text-foreground">
            Participants ({participants.length})
          </h3>
        </div>
        
        {participants.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[15px] text-muted-foreground">Aucun participant inscrit</p>
          </div>
        ) : (
          <div>
            {participants.map((participant, index) => (
              <div key={participant.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.avatar_url || ''} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {(participant.display_name || participant.username)?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-foreground truncate">
                      {participant.display_name || participant.username}
                    </p>
                    <p className="text-[13px] text-muted-foreground">@{participant.username}</p>
                  </div>
                  
                  {participant.confirmed_by_creator === true ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Présent</Badge>
                  ) : participant.confirmed_by_creator === false ? (
                    <Badge className="bg-red-100 text-red-700 border-0">Absent</Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleValidate(participant.id, true)}
                        disabled={validating === participant.id}
                        className="h-8 gap-1"
                      >
                        {validating === participant.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleValidate(participant.id, false)}
                        disabled={validating === participant.id}
                        className="h-8 gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
                {index < participants.length - 1 && <div className="h-px bg-border ml-[68px]" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={onComplete} className="w-full h-11 rounded-[10px]">
        Terminer
      </Button>
    </div>
  );
};
