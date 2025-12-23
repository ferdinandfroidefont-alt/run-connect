import { Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/NotificationCenter';

interface FeedHeaderProps {
  onSearch?: () => void;
}

export const FeedHeader = ({ onSearch }: FeedHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string | null }>({ 
    avatar_url: null, 
    username: null 
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('user_id', user.id)
        .single();
      
      if (data) setProfile(data);
    };

    fetchProfile();
  }, [user]);

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 glass-primary"
    >
      {/* Animated gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-orange-500 animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
      
      <div className="flex items-center justify-between px-4 py-3">
        {/* Avatar & Welcome */}
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Avatar 
              className="h-10 w-10 ring-2 ring-primary/50 cursor-pointer hover:ring-primary transition-all shadow-lg shadow-primary/30"
              onClick={() => navigate('/profile')}
            >
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                {profile.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div>
            <p className="text-xs text-muted-foreground">Bienvenue 👋</p>
            <p className="font-semibold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">@{profile.username || 'user'}</p>
          </div>
        </div>

        {/* Title with gradient */}
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }}>
          Feed
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30 shadow-lg shadow-blue-500/20"
              onClick={onSearch}
            >
              <Search className="h-4 w-4 text-blue-400" />
            </Button>
          </motion.div>
          <NotificationCenter />
        </div>
      </div>

      {/* Subtle gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </motion.header>
  );
};
