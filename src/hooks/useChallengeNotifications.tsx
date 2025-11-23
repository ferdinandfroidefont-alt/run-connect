import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ChallengeUpdate {
  id: string;
  progress: number;
  target: number;
  status: string;
}

export const useChallengeNotifications = () => {
  const { user } = useAuth();
  const [completedChallenge, setCompletedChallenge] = useState<string | null>(null);
  const [almostDoneChallenge, setAlmostDoneChallenge] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    console.log('🔔 [CHALLENGE_NOTIF] Écoute temps réel activée pour user:', user.id);

    const channel = supabase
      .channel('user_challenges_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_challenges',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📬 [CHALLENGE_NOTIF] Mise à jour reçue:', payload);
          
          const { progress, target, status, id } = payload.new as ChallengeUpdate;

          // Défi complété
          if (status === 'completed' && progress >= target) {
            console.log('🎉 Défi complété détecté:', id);
            setCompletedChallenge(id);
            
            // Reset après 3 secondes
            setTimeout(() => setCompletedChallenge(null), 3000);
          }

          // Défi presque terminé
          if (status === 'active' && progress === target - 1) {
            console.log('🔥 Défi presque terminé détecté:', id);
            setAlmostDoneChallenge(id);
            
            // Reset après 3 secondes
            setTimeout(() => setAlmostDoneChallenge(null), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔇 [CHALLENGE_NOTIF] Désabonnement');
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { completedChallenge, almostDoneChallenge };
};
