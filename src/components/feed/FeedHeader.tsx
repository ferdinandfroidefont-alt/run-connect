import { Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';

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
    <header className="ios-header-blur shrink-0 pt-[var(--safe-area-top)]">
      <div className="ios-page-shell pb-3 pt-2">
        <IosPageHeaderBar
          className="px-0 py-0"
          titleClassName="text-[34px] font-bold tracking-tight"
          left={
            <button
              type="button"
              onClick={onProfileClick}
              className="active:opacity-70 transition-opacity"
            >
              <Avatar className="h-9 w-9 ring-1 ring-black/5 shadow-sm">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-secondary text-foreground text-sm font-medium">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          }
          title="Feed"
          right={
            <button
              type="button"
              onClick={onSearch}
              className="ios-action-pill h-9 w-9 rounded-full px-0"
            >
              <Search className="h-[20px] w-[20px] text-primary" />
            </button>
          }
        />

        <div className="ios-toolbar-card mt-3">
          <div className="ios-toolbar-segmented flex w-full">
          <button
            onClick={() => onModeChange('friends')}
            data-state={mode === 'friends' ? 'active' : 'inactive'}
            className={cn(
              "ios-toolbar-segmented-button flex-1"
            )}
          >
            Amis
          </button>
          <button
            onClick={() => onModeChange('discover')}
            data-state={mode === 'discover' ? 'active' : 'inactive'}
            className={cn(
              "ios-toolbar-segmented-button flex-1"
            )}
          >
            Découvrir
          </button>
          </div>
        </div>
      </div>
    </header>
  );
};
