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
  /** Bottom sheet accueil : padding / avatar compacts, marque replie la sheet. */
  layoutVariant?: "page" | "sheet";
  /** Si layout sheet : 1 = demi, 2 = quasi plein (safe area haut). */
  sheetSnap?: 1 | 2;
  /** Remplace navigation vers / quand défini (ex. replier la sheet). */
  onBrandClick?: () => void;
}

export const FeedHeader = ({
  onProfileClick,
  onSettingsClick,
  mode,
  onModeChange,
  layoutVariant = "page",
  sheetSnap = 2,
  onBrandClick,
}: FeedHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const isSheet = layoutVariant === "sheet";
  const sheetFullBleed = isSheet && sheetSnap === 2;

  return (
    <header
      className={cn(
        "shrink-0 bg-white dark:bg-black",
        isSheet
          ? cn(sheetFullBleed ? "pt-[var(--safe-area-top)]" : "pt-2")
          : "pt-[var(--safe-area-top)]",
      )}
    >
      {/* Top row: RunConnect + centered avatar + bell + settings */}
      <div
        className={cn(
          "relative flex items-center justify-between gap-2 px-4 pb-3",
          isSheet ? "min-h-[2.75rem] pt-1" : "min-h-[3rem] pt-2",
        )}
      >
        <button
          type="button"
          onClick={() => (onBrandClick ? onBrandClick() : navigate("/"))}
          className="flex min-w-0 shrink items-center text-lg font-semibold leading-none tracking-tight text-primary transition-opacity touch-manipulation active:opacity-70"
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
              <Avatar
                className={cn(
                  "map-header-profile-avatar avatar-fixed ring-2 ring-primary/15 transition-[box-shadow] duration-200 hover:ring-primary/35",
                  isSheet ? "h-11 w-11" : "h-14 w-14",
                )}
              >
                <AvatarImage
                  src={profile.avatar_url || undefined}
                  alt={profile.username || profile.display_name || 'Profile'}
                  className="block h-full min-h-0 w-full min-w-0 object-cover object-center"
                />
                <AvatarFallback className="text-2xl font-semibold">
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
                  className="h-[40px] w-[40px] shrink-0 rounded-[13px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0a0a0a]"
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
              'border border-transparent dark:border-[#1f1f1f] dark:bg-[#0a0a0a]',
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
