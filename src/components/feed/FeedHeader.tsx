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
    <header className="shrink-0 bg-card border-b border-border pt-[var(--safe-area-top)]">
      <div className="grid min-h-[52px] min-w-0 grid-cols-3 items-center gap-2 px-4 pb-3 pt-2">
        <div className="flex min-w-0 justify-self-start">
          <button
            type="button"
            onClick={onProfileClick}
            className="active:opacity-70 transition-opacity"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-secondary text-foreground text-sm font-medium">
                {profile.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
        <div className="flex min-w-0 justify-center justify-self-stretch px-1">
          <h1 className="max-w-full truncate text-center text-[34px] font-bold tracking-tight">
            Feed
          </h1>
        </div>
        <div className="flex min-w-0 justify-end justify-self-end">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors active:bg-secondary"
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
