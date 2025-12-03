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
      className="sticky top-0 z-20 bg-gradient-to-b from-background via-background/95 to-background/80 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Avatar & Welcome */}
        <div className="flex items-center gap-3">
          <Avatar 
            className="h-10 w-10 ring-2 ring-primary/30 cursor-pointer hover:ring-primary/50 transition-all"
            onClick={() => navigate('/profile')}
          >
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {profile.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">Bienvenue 👋</p>
            <p className="font-semibold text-sm">@{profile.username || 'user'}</p>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Feed
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10"
            onClick={onSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
          <NotificationCenter />
        </div>
      </div>

      {/* Subtle divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </motion.header>
  );
};
