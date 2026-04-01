import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightHaptic } from '@/lib/haptics';

export type FeedMode = 'friends' | 'discover';

interface FeedHeaderProps {
  onLeaderboardClick?: () => void;
  /** Ex. « #12 » — saison, aligné avec le badge du classement. */
  leaderboardRankBadge?: string | null;
  onProfileClick?: () => void;
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export const FeedHeader = ({
  onLeaderboardClick,
  leaderboardRankBadge,
  onProfileClick,
  mode,
  onModeChange,
}: FeedHeaderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string | null }>({
    avatar_url: null,
    username: null,
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
      <div className="relative flex min-h-[52px] min-w-0 items-center px-4 pb-3 pt-2">
        <div className="z-10 flex min-w-0 shrink-0 items-center justify-start">
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
        <h1 className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-full max-w-[12rem] -translate-y-1/2 truncate px-4 text-center text-[34px] font-bold tracking-tight md:max-w-none">
          Feed
        </h1>
        <div className="z-10 ml-auto flex min-w-0 shrink-0 justify-end pr-0.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            onClick={() => {
              void lightHaptic();
              onLeaderboardClick?.();
            }}
            className={cn(
              'flex max-w-[min(200px,calc(100vw-7rem))] min-w-0 items-center gap-1.5 rounded-[16px] border border-border/80',
              'bg-secondary/90 px-3 py-1.5 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65',
              'active:opacity-90'
            )}
          >
            <Trophy className="h-[18px] w-[18px] shrink-0 text-amber-500" strokeWidth={2.25} />
            <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-foreground">
              Mon classement
            </span>
            {leaderboardRankBadge ? (
              <span className="shrink-0 rounded-[8px] bg-primary/14 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                {leaderboardRankBadge}
              </span>
            ) : null}
          </motion.button>
        </div>
      </div>

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
