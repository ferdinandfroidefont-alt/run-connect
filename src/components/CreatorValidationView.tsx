import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useSendNotification } from '@/hooks/useSendNotification';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, MapPin, Loader2, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PointsBreakdown } from '@/components/PointsBreakdown';

interface Participant {
  id: string;
  user_id: string;
  confirmed_by_gps: boolean;
  confirmed_by_creator: boolean;
  profiles: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface CreatorValidationViewProps {
  session: {
    id: string;
    title: string;
  };
  onComplete: () => void;
}

export const CreatorValidationView = ({ session, onComplete }: CreatorValidationViewProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();

  useEffect(() => {
    loadParticipants();
  }, [session.id]);

  useEffect(() => {
    // Calculate points
    const unvalidatedCount = Array.from(selectedParticipants).filter(id => {
      const participant = participants.find(p => p.id === id);
      return participant && !participant.confirmed_by_creator;
    }).length;
    
    const points = 10 + unvalidatedCount; // 10 base + 1 per participant
    setTotalPoints(points);
  }, [selectedParticipants, participants]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const { data: participantsData, error } = await supabase
        .from('session_participants')
        .select('id, user_id, confirmed_by_gps, confirmed_by_creator, joined_at')
        .eq('session_id', session.id)
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
      
      // Auto-select GPS-confirmed participants
      const gpsConfirmed = participantsWithProfiles
        .filter(p => p.confirmed_by_gps && !p.confirmed_by_creator)
        .map(p => p.id);
      setSelectedParticipants(new Set(gpsConfirmed));
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParticipant = (participantId: string) => {
    const newSelected = new Set(selectedParticipants);
    if (newSelected.has(participantId)) {
      newSelected.delete(participantId);
    } else {
      newSelected.add(participantId);
    }
    setSelectedParticipants(newSelected);
  };

  const handleValidateAll = async () => {
    if (selectedParticipants.size === 0) {
      toast({
        title: "Aucun participant sélectionné",
        description: "Cochez au moins un participant pour valider",
        variant: "destructive"
      });
      return;
    }

    setValidating(true);
    try {
      for (const participantId of Array.from(selectedParticipants)) {
        const participant = participants.find(p => p.id === participantId);
        if (!participant || participant.confirmed_by_creator) continue;

        await supabase
          .from('session_participants')
          .update({ confirmed_by_creator: true })
          .eq('id', participantId);

        await supabase.rpc('calculate_and_award_points', { participant_id: participantId });
        await supabase.rpc('check_and_award_badges', { user_id_param: participant.user_id });

        // Créer notification dans la base
        await supabase
          .from('notifications')
          .insert([{
            user_id: participant.user_id,
            title: 'Présence confirmée',
            message: `Votre présence à "${session.title}" a été confirmée par l'organisateur`,
            type: 'presence_confirmed',
            data: {
              session_id: session.id,
              session_title: session.title
            }
          }]);

        // Envoyer notification push
        await sendPushNotification(
          participant.user_id,
          'Présence confirmée',
          `Votre présence à "${session.title}" a été confirmée par l'organisateur`,
          'presence_confirmed',
          {
            session_id: session.id,
            session_title: session.title
          }
        );
      }

      await supabase.functions.invoke('award-organizer-points', {
        body: { sessionId: session.id }
      });

      setShowSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card p-6">
        <h2 className="text-heading-xl mb-2">Validez les participants présents</h2>
        <p className="text-body-md text-muted-foreground">
          Cochez les membres que vous avez vus sur place à "{session.title}"
        </p>
      </div>

      {/* Participants list */}
      <div className="space-y-3">
        {participants.map((participant, index) => (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedParticipants.has(participant.id) || participant.confirmed_by_creator}
                onCheckedChange={() => handleToggleParticipant(participant.id)}
                disabled={participant.confirmed_by_creator}
              />

              <Avatar className="h-12 w-12">
                <AvatarImage src={participant.profiles.avatar_url} />
                <AvatarFallback>
                  {(participant.profiles.username || participant.profiles.display_name)?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="font-medium">
                  {participant.profiles.display_name || participant.profiles.username}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {participant.confirmed_by_gps && (
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      GPS validé
                    </Badge>
                  )}
                  {participant.confirmed_by_creator && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Validé
                    </Badge>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {selectedParticipants.has(participant.id) && !participant.confirmed_by_creator && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Points breakdown */}
      {selectedParticipants.size > 0 && (
        <PointsBreakdown
          organizerPoints={totalPoints}
          participantCount={selectedParticipants.size}
        />
      )}

      {/* Validate button */}
      <Button
        onClick={handleValidateAll}
        disabled={validating || selectedParticipants.size === 0}
        className="w-full h-14 text-lg"
        size="lg"
      >
        {validating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Validation en cours...
          </>
        ) : showSuccess ? (
          <>
            <Trophy className="mr-2 h-5 w-5" />
            Présences confirmées !
          </>
        ) : (
          `Valider ${selectedParticipants.size} participant${selectedParticipants.size > 1 ? 's' : ''}`
        )}
      </Button>

      {/* Success animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 360, 0]
              }}
              transition={{ duration: 0.6 }}
              className="text-8xl"
            >
              ✅
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
