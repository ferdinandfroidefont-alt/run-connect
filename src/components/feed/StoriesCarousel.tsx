import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';
import { X } from 'lucide-react';

interface ProfileSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  mutual_friends_count: number;
  source: string;
}

// Labels lisibles pour chaque source de suggestion
const getSourceLabel = (source: string, mutualCount: number): string => {
  switch (source) {
    case 'contacts':
      return '📱 Contact';
    case 'mutual_friends':
      return `👥 ${mutualCount} ami${mutualCount > 1 ? 's' : ''} en commun`;
    case 'common_clubs':
      return '🏃 Même club';
    case 'friends_of_friends':
      return '🔗 Ami d\'ami';
    case 'active_users':
      return '🔥 Actif';
    default:
      return '✨ Suggéré';
  }
};

export const StoriesCarousel = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    // Charger les suggestions supprimées depuis localStorage
    const saved = localStorage.getItem('dismissedSuggestions');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());

  // Charger les amis existants d'abord
  useEffect(() => {
    if (!user) return;

    const loadFriendsAndSuggestions = async () => {
      try {
        // 1. Charger la liste des amis d'abord
        const { data: friendsData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const friendIds = new Set(friendsData?.map(f => f.following_id) || []);
        setFriendsSet(friendIds);
        console.log('🔍 StoriesCarousel - Friends loaded:', friendIds.size);

        // 2. Puis charger les suggestions
        const { data, error } = await supabase.rpc('get_friend_suggestions_prioritized', {
          current_user_id: user.id,
          suggestion_limit: 15
        });

        if (error) {
          console.error('Error fetching suggestions:', error);
          return;
        }

        // 3. Filtrer les amis existants côté client (sécurité supplémentaire)
        const filteredSuggestions = (data || []).filter(
          (s: ProfileSuggestion) => !friendIds.has(s.user_id)
        );

        console.log('🔍 StoriesCarousel - Suggestions après filtrage:', filteredSuggestions.length);
        setSuggestions(filteredSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriendsAndSuggestions();
  }, [user]);

  // Sauvegarder les suggestions supprimées dans localStorage
  const dismissSuggestion = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = new Set([...dismissedIds, userId]);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedSuggestions', JSON.stringify([...newDismissed]));
  };

  // Filtrer les suggestions visibles (non supprimées et non amis)
  const visibleSuggestions = suggestions.filter(
    s => !dismissedIds.has(s.user_id) && !friendsSet.has(s.user_id)
  );

  if (loading) {
    return (
      <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
            <div className="h-14 w-14 rounded-full bg-white/10" />
            <div className="h-2 w-10 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  // Hide if no suggestions
  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="py-3">
        <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {visibleSuggestions.map((profile, index) => (
              <motion.button
                key={profile.user_id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedUserId(profile.user_id)}
                className="flex flex-col items-center gap-1 min-w-fit relative group"
              >
                {/* Bouton X pour supprimer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -top-1 -right-1 z-10"
                >
                  <button
                    onClick={(e) => dismissSuggestion(profile.user_id, e)}
                    className="h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-destructive/20 hover:border-destructive/50 transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </motion.div>

                {/* Avatar avec gradient */}
                <div className="p-0.5 bg-gradient-to-br from-primary via-primary/80 to-primary/50 rounded-full">
                  <Avatar className="h-14 w-14 border-2 border-background">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-sm">
                      {(profile.display_name || profile.username)?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Nom */}
                <span className="text-[11px] text-foreground/80 max-w-[60px] truncate">
                  {profile.display_name?.split(' ')[0] || profile.username}
                </span>

                {/* Source/Motif de suggestion */}
                <span className="text-[9px] text-muted-foreground max-w-[70px] truncate">
                  {getSourceLabel(profile.source, profile.mutual_friends_count)}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {selectedUserId && (
        <ProfilePreviewDialog
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
};
