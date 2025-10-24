import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Participant {
  id: string;
  user_id: string;
  confirmed_by_gps: boolean;
  confirmed_by_creator: boolean;
  validation_status: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface ValidateParticipantsDialogProps {
  sessionId: string;
  sessionTitle: string;
  open: boolean;
  onClose: () => void;
}

export const ValidateParticipantsDialog = ({
  sessionId,
  sessionTitle,
  open,
  onClose
}: ValidateParticipantsDialogProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadParticipants();
    }
  }, [open, sessionId]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const { data: participantsData, error } = await supabase
        .from('session_participants')
        .select('id, user_id, confirmed_by_gps, confirmed_by_creator, validation_status, joined_at')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      if (!participantsData || participantsData.length === 0) {
        setParticipants([]);
        return;
      }

      const userIds = participantsData.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const participantsWithProfiles = participantsData.map(p => {
        const profile = profilesData?.find(pr => pr.user_id === p.user_id);
        return {
          ...p,
          profiles: {
            username: profile?.username || '',
            display_name: profile?.display_name || '',
            avatar_url: profile?.avatar_url
          }
        };
      });

      setParticipants(participantsWithProfiles);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validateParticipant = async (participantId: string, userId: string) => {
    setValidating(participantId);
    try {
      const { error: updateError } = await supabase
        .from('session_participants')
        .update({ confirmed_by_creator: true })
        .eq('id', participantId);

      if (updateError) throw updateError;

      const { data, error: rpcError } = await supabase
        .rpc('calculate_and_award_points', { participant_id: participantId });

      if (rpcError) throw rpcError;

      toast({ 
        title: "✅ Participant validé", 
        description: `${data} points attribués` 
      });

      await supabase.rpc('check_and_award_badges', { user_id_param: userId });

      loadParticipants();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setValidating(null);
    }
  };

  const validateAll = async () => {
    setLoading(true);
    try {
      const unvalidatedParticipants = participants.filter(p => !p.confirmed_by_creator);
      
      for (const participant of unvalidatedParticipants) {
        await validateParticipant(participant.id, participant.user_id);
      }

      await supabase.functions.invoke('award-organizer-points', {
        body: { sessionId }
      });

      toast({ title: "✅ Tous les participants ont été validés" });
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Valider les participants</DialogTitle>
          <DialogDescription>
            Confirme la présence des participants à "{sessionTitle}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {participants.map(p => (
                  <div 
                    key={p.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.profiles.avatar_url} />
                        <AvatarFallback>
                          {(p.profiles.username || p.profiles.display_name)?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {p.profiles.display_name || p.profiles.username}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {p.confirmed_by_gps && (
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              GPS
                            </Badge>
                          )}
                          {p.confirmed_by_creator && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Validé
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!p.confirmed_by_creator && (
                      <Button
                        size="sm"
                        onClick={() => validateParticipant(p.id, p.user_id)}
                        disabled={validating === p.id}
                      >
                        {validating === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Valider"
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-4">
              <Button 
                onClick={validateAll} 
                disabled={loading || participants.every(p => p.confirmed_by_creator)}
                className="flex-1"
              >
                Valider tout le monde
              </Button>
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
