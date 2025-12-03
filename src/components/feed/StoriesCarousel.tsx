import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';

interface Story {
  user_id: string;
  username: string;
  avatar_url: string;
  has_recent_session: boolean;
  session_count: number;
}

export const StoriesCarousel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCreateSession } = useAppContext();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; username: string | null }>({
    avatar_url: null,
    username: null
  });

  useEffect(() => {
    if (!user) return;

    const fetchStories = async () => {
      try {
        // Get user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('user_id', user.id)
          .single();

        if (profile) setUserProfile(profile);

        // Get friends
        const { data: friends } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const friendIds = friends?.map(f => f.following_id) || [];
        
        if (friendIds.length === 0) {
          setLoading(false);
          return;
        }

        // Get friends with recent sessions (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: recentSessions } = await supabase
          .from('sessions')
          .select('organizer_id')
          .in('organizer_id', friendIds)
          .gte('created_at', oneWeekAgo.toISOString());

        const sessionCounts = recentSessions?.reduce((acc, session) => {
          acc[session.organizer_id] = (acc[session.organizer_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        // Get profiles of friends with recent activity
        const activeUserIds = Object.keys(sessionCounts);
        
        if (activeUserIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', activeUserIds);

        const storiesData: Story[] = (profiles || []).map(p => ({
          user_id: p.user_id || '',
          username: p.username || 'user',
          avatar_url: p.avatar_url || '',
          has_recent_session: true,
          session_count: sessionCounts[p.user_id || ''] || 0
        })).sort((a, b) => b.session_count - a.session_count);

        setStories(storiesData);
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [user]);

  if (loading) {
    return (
      <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
            <div className="h-16 w-16 rounded-full bg-white/10" />
            <div className="h-2 w-12 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
        {/* Create Story */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (window.location.pathname === '/') {
              openCreateSession();
            } else {
              navigate('/');
              setTimeout(() => openCreateSession(), 100);
            }
          }}
          className="flex flex-col items-center gap-1.5 min-w-fit"
        >
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-dashed border-primary/50">
              <AvatarImage src={userProfile.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10">
                {userProfile.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Créer</span>
        </motion.button>

        {/* Friend Stories */}
        {stories.map((story, index) => (
          <motion.button
            key={story.user_id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/p/${story.username}`)}
            className="flex flex-col items-center gap-1.5 min-w-fit"
          >
            <div className="p-0.5 bg-gradient-to-br from-primary via-primary/80 to-primary/50 rounded-full">
              <Avatar className="h-[60px] w-[60px] border-2 border-background">
                <AvatarImage src={story.avatar_url} />
                <AvatarFallback className="bg-primary/20">
                  {story.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[11px] text-foreground/80 max-w-[60px] truncate">
              {story.username}
            </span>
          </motion.button>
        ))}

        {stories.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <span>Suivez des amis pour voir leurs activités</span>
          </div>
        )}
      </div>
    </div>
  );
};
