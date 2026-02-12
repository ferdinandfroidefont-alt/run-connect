import { Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export type FeedMode = 'friends' | 'discover';

interface FeedHeaderProps {
  onSearch?: () => void;
  onProfileClick?: () => void;
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export const FeedHeader = ({ onSearch, onProfileClick, mode, onModeChange }: FeedHeaderProps) => {
  const { user } = useAuth();
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
    <header className="sticky top-0 z-20 bg-card border-b border-border">
      <div className="px-4 pt-4 pt-safe pb-3 relative flex items-center justify-center min-h-[60px]">
        {/* Avatar - Left */}
        <button 
          onClick={onProfileClick}
          className="active:opacity-70 transition-opacity absolute left-4"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-secondary text-foreground text-sm font-medium">
              {profile.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Title - Center */}
        <h1 className="text-[34px] font-bold tracking-tight text-center">
          Feed
        </h1>

        {/* Actions - Right */}
        <div className="absolute right-4 flex items-center gap-1">
          <button
            onClick={onSearch}
            className="h-9 w-9 flex items-center justify-center rounded-full active:bg-secondary transition-colors"
          >
            <Search className="h-[22px] w-[22px] text-primary" />
          </button>
        </div>
      </div>

      {/* Segmented Control - iOS Style */}
      <div className="px-4 pb-3">
        <div className="bg-secondary rounded-[9px] p-[2px] flex">
          <button
            onClick={() => onModeChange('friends')}
            className={cn(
              "flex-1 py-2 text-[13px] font-semibold rounded-[7px] transition-all",
              mode === 'friends'
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Amis
          </button>
          <button
            onClick={() => onModeChange('discover')}
            className={cn(
              "flex-1 py-2 text-[13px] font-semibold rounded-[7px] transition-all",
              mode === 'discover'
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Découvrir
          </button>
        </div>
      </div>
    </header>
  );
};
