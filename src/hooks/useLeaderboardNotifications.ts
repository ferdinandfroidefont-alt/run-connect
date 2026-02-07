import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSendNotification } from '@/hooks/useSendNotification';

/**
 * Hook qui vérifie périodiquement si l'utilisateur a été dépassé au classement
 * et envoie une notification push si c'est le cas.
 */
export const useLeaderboardNotifications = () => {
  const { user } = useAuth();
  const { sendPushNotification } = useSendNotification();
  const lastKnownRank = useRef<number | null>(null);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkRankChange = async () => {
      try {
        // Get current leaderboard
        const { data: leaderboardData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10000,
          offset_count: 0,
          order_by_column: 'seasonal_points'
        });

        if (!leaderboardData) return;

        const currentRankIndex = leaderboardData.findIndex((u: any) => u.user_id === user.id);
        const currentRank = currentRankIndex >= 0 ? currentRankIndex + 1 : null;

        if (currentRank === null) return;

        // Si on a un rang précédent et qu'on a été dépassé
        if (lastKnownRank.current !== null && currentRank > lastKnownRank.current) {
          const rankDiff = currentRank - lastKnownRank.current;
          
          // Trouver qui nous a dépassé (la personne juste au-dessus)
          const overtaker = leaderboardData[currentRankIndex - 1];
          const overtakerName = overtaker?.display_name || overtaker?.username || 'Quelqu\'un';

          console.log(`📊 [RANK] Dépassé ! Ancien rang: ${lastKnownRank.current}, Nouveau: ${currentRank}, Par: ${overtakerName}`);

          // Créer la notification en base
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: '📊 Classement mis à jour',
            message: rankDiff === 1 
              ? `${overtakerName} vient de te dépasser ! Tu es maintenant #${currentRank}`
              : `Tu as perdu ${rankDiff} place${rankDiff > 1 ? 's' : ''} ! Tu es maintenant #${currentRank}`,
            type: 'rank_change',
            data: { 
              old_rank: lastKnownRank.current, 
              new_rank: currentRank,
              overtaker_name: overtakerName,
              overtaker_id: overtaker?.user_id
            }
          });

          // Envoyer push notification
          sendPushNotification(
            user.id,
            '📊 Tu as été dépassé !',
            `${overtakerName} vient de te dépasser au classement. Tu es maintenant #${currentRank}. Reprends ta place !`,
            'rank_change',
            { old_rank: lastKnownRank.current, new_rank: currentRank }
          );
        }
        // Si on a monté dans le classement
        else if (lastKnownRank.current !== null && currentRank < lastKnownRank.current) {
          const rankGain = lastKnownRank.current - currentRank;
          
          console.log(`🎉 [RANK] Progression ! Ancien rang: ${lastKnownRank.current}, Nouveau: ${currentRank}`);

          // Notification positive uniquement si progression significative
          if (rankGain >= 3) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: '🎉 Progression au classement !',
              message: `Bravo ! Tu as gagné ${rankGain} places et tu es maintenant #${currentRank} !`,
              type: 'rank_change',
              data: { old_rank: lastKnownRank.current, new_rank: currentRank }
            });
          }
        }

        lastKnownRank.current = currentRank;
      } catch (error) {
        console.error('Error checking rank change:', error);
      }
    };

    // Initial check
    checkRankChange();

    // Check every 5 minutes
    checkInterval.current = setInterval(checkRankChange, 5 * 60 * 1000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [user?.id]);
};
