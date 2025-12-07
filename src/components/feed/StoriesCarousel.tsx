import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';

interface ProfileSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  mutual_friends_count: number;
}

export const StoriesCarousel = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchSuggestions = async () => {
      try {
        const { data, error } = await supabase.rpc('get_friend_suggestions_prioritized', {
          current_user_id: user.id,
          suggestion_limit: 10
        });

        if (error) {
          console.error('Error fetching suggestions:', error);
          return;
        }

        setSuggestions(data || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user]);

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
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="py-3">
        <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
          {suggestions.map((profile, index) => (
            <motion.button
              key={profile.user_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedUserId(profile.user_id)}
              className="flex flex-col items-center gap-1.5 min-w-fit"
            >
              <div className="p-0.5 bg-gradient-to-br from-primary via-primary/80 to-primary/50 rounded-full">
                <Avatar className="h-14 w-14 border-2 border-background">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-sm">
                    {(profile.display_name || profile.username)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] text-foreground/80 max-w-[60px] truncate">
                {profile.display_name?.split(' ')[0] || profile.username}
              </span>
            </motion.button>
          ))}
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
