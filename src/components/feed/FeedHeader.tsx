import { Settings } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { StreakBadge } from '@/components/StreakBadge';

const NotificationCenter = lazy(() =>
  import('@/components/NotificationCenter').then((m) => ({ default: m.NotificationCenter }))
);

export type FeedMode = 'friends' | 'discover';

interface FeedHeaderProps {
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export const FeedHeader = ({
  onProfileClick,
  onSettingsClick,
  mode,
  onModeChange,
}: FeedHeaderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string | null; display_name: string | null }>({
    avatar_url: null,
    username: null,
    display_name: null,
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username, display_name')
        .eq('user_id', user.id)
        .single();

      if (data) setProfile(data);
    };

    fetchProfile();
  }, [user]);

  return (
    <header className="shrink-0 bg-white dark:bg-background pt-[var(--safe-area-top)]">
      {/* Top row: RunConnect + centered avatar + bell + settings */}
      <div className="relative flex min-h-[3rem] items-center justify-between gap-2 px-4 pb-3 pt-2">
        <button
          type="button"
          onClick={() => window.location.href = '/'}
          className="flex min-w-0 shrink items-center text-lg font-semibold leading-none tracking-tight text-primary active:opacity-70 transition-opacity touch-manipulation"
        >
          RunConnect
        </button>

        {/* Centered profile avatar */}
        {profile && (
          <div className="absolute left-1/2 z-[1] -translate-x-1/2 flex [isolation:isolate]">
            <div
              role="button"
              tabIndex={0}
              onClick={onProfileClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onProfileClick?.();
                }
              }}
              className="relative flex cursor-pointer flex-col items-center outline-none transition-opacity duration-200 active:opacity-85 hover:opacity-95"
            >
              <Avatar className="h-11 w-11 ring-2 ring-primary/15 transition-[box-shadow] duration-200 hover:ring-primary/35">
                <AvatarImage
                  src={profile.avatar_url || undefined}
                  alt={profile.username || profile.display_name || 'Profile'}
                  className="block h-full min-h-0 w-full min-w-0 object-cover object-center"
                />
                <AvatarFallback className="text-xl font-semibold">
                  {(profile.username || profile.display_name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {user && (
                <div className="absolute -bottom-1 -right-1 scale-75">
                  <StreakBadge userId={user.id} variant="compact" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex shrink-0 items-center justify-center">
            <Suspense
              fallback={
                <div
                  className="h-[40px] w-[40px] shrink-0 rounded-[13px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card"
                  aria-hidden
                />
              }
            >
              <NotificationCenter />
            </Suspense>
          </div>
          <button
            type="button"
            className={cn(
              'flex h-[40px] w-[40px] shrink-0 touch-manipulation items-center justify-center rounded-[13px] outline-none',
              'text-foreground transition-[opacity,transform] duration-200 active:scale-[0.97] active:opacity-80',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
            aria-label="Paramètres"
            onClick={onSettingsClick}
          >
            <Settings className="h-[22px] w-[22px]" strokeWidth={1.85} />
          </button>
        </div>
      </div>

      {/* Friends / Discover toggle */}
      <div className="px-4 pb-3">
        <div className="bg-secondary rounded-[9px] p-[2px] flex">
          <button
            onClick={() => onModeChange('friends')}
            className={cn(
              'flex-1 py-2 text-[13px] font-semibold rounded-[7px] transition-all',
              mode === 'friends'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Amis
          </button>
          <button
            onClick={() => onModeChange('discover')}
            className={cn(
              'flex-1 py-2 text-[13px] font-semibold rounded-[7px] transition-all',
              mode === 'discover'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Découvrir
          </button>
        </div>
      </div>
    </header>
  );
};
