import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  progress: number;
  target: number;
  reward: number;
  category: 'sessions' | 'referral' | 'social';
  status: 'active' | 'completed';
}

export const useWeeklyChallenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState<string | null>(null);

  const getCurrentWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };

  const fetchChallenges = async () => {
    if (!user) return;

    try {
      // Initialiser les défis de l'utilisateur si nécessaire
      await supabase.rpc('initialize_user_challenges', { p_user_id: user.id });

      const currentWeekStart = getCurrentWeekStart();

      // Récupérer les défis actifs de l'utilisateur pour la semaine courante uniquement
      const { data: userChallenges, error } = await supabase
        .from('user_challenges')
        .select(`
          id,
          progress,
          target,
          status,
          week_start,
          challenges (
            id,
            title,
            description,
            icon,
            reward_points,
            category
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('week_start', currentWeekStart)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedChallenges: Challenge[] = userChallenges?.map((uc: any) => ({
        id: uc.id,
        title: uc.challenges.title,
        description: uc.challenges.description,
        icon: uc.challenges.icon,
        progress: uc.progress,
        target: uc.target,
        reward: uc.challenges.reward_points,
        category: uc.challenges.category,
        status: uc.status
      })) || [];

      setChallenges(formattedChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralLink = async () => {
    if (!user) return;

    try {
      // Vérifier si l'utilisateur a déjà un lien de parrainage
      let { data: existingLink } = await supabase
        .from('referral_links')
        .select('unique_code')
        .eq('user_id', user.id)
        .single();

      if (!existingLink) {
        // Générer un code unique
        const uniqueCode = `${user.id.substring(0, 8)}-${Date.now().toString(36)}`;
        
        const { data: newLink } = await supabase
          .from('referral_links')
          .insert({ user_id: user.id, unique_code: uniqueCode })
          .select('unique_code')
          .single();

        existingLink = newLink;
      }

      if (existingLink) {
        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/auth?ref=${existingLink.unique_code}`);
      }
    } catch (error) {
      console.error('Error fetching referral link:', error);
    }
  };

  const shareReferralLink = async () => {
    if (!user || !referralLink) return;

    try {
      // Récupérer le compteur actuel
      const { data: currentLink } = await supabase
        .from('referral_links')
        .select('share_count')
        .eq('user_id', user.id)
        .single();

      // Incrémenter le compteur de partages
      await supabase
        .from('referral_links')
        .update({ 
          share_count: (currentLink?.share_count || 0) + 1,
          last_shared_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Valider le défi de partage si applicable
      await supabase.rpc('increment_challenge_progress', {
        p_user_id: user.id,
        p_validation_type: 'share_link',
        p_increment: 1
      });

      return referralLink;
    } catch (error) {
      console.error('Error sharing referral link:', error);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchChallenges();
      fetchReferralLink();

      // S'abonner aux changements de défis en temps réel
      const subscription = supabase
        .channel('user_challenges_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_challenges',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchChallenges();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  return {
    challenges,
    loading,
    referralLink,
    shareReferralLink,
    refreshChallenges: fetchChallenges
  };
};
