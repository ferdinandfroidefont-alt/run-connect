import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, MessageCircle, Newspaper, Plus, PenTool, CheckCircle, Crown, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SIDE_COL = '25%';
const iosEase = [0.32, 0.72, 0, 1] as const;

type NavItem = {
  path: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  label: string;
  tutorialId?: string;
  badge?: 'messages';
  isActive: (pathname: string) => boolean;
  showUnreadBadge?: boolean;
};

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { openCreateSession, hideBottomNav } = useAppContext();
  const [activeSet, setActiveSet] = useState<0 | 1>(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

  const pathname = location.pathname;

  const navSets = useMemo<[NavItem[], NavItem[]]>(
    () => [
      [
        {
          path: '/',
          icon: Home,
          label: t('navigation.home'),
          isActive: (p) => p === '/',
        },
        {
          path: '/my-sessions',
          icon: Calendar,
          label: t('navigation.mySessions'),
          tutorialId: 'nav-sessions',
          isActive: (p) => p === '/my-sessions' || p.startsWith('/my-sessions/'),
        },
        {
          path: '/messages',
          icon: MessageCircle,
          label: t('navigation.messages'),
          tutorialId: 'nav-messages',
          isActive: (p) => p === '/messages' || p.startsWith('/messages/'),
          showUnreadBadge: true,
        },
        {
          path: '/feed',
          icon: Newspaper,
          label: t('navigation.feed'),
          tutorialId: 'nav-feed',
          isActive: (p) => p === '/feed' || p.startsWith('/feed/'),
        },
      ],
      [
        {
          path: '/route-create',
          icon: PenTool,
          label: t('navigation.itinerary'),
          isActive: (p) => p === '/route-create' || p === '/route-creation' || p.startsWith('/route-creation/'),
        },
        {
          path: '/coaching',
          icon: GraduationCap,
          label: t('navigation.coaching'),
          isActive: (p) => p === '/coaching' || p.startsWith('/coaching/'),
        },
        {
          path: '/confirm-presence',
          icon: CheckCircle,
          label: t('navigation.confirmPresence'),
          isActive: (p) => p === '/confirm-presence' || p.startsWith('/confirm-presence/'),
        },
        {
          path: '/leaderboard',
          icon: Crown,
          label: t('navigation.leaderboard'),
          isActive: (p) => p === '/leaderboard' || p.startsWith('/leaderboard/'),
        },
      ],
    ],
    [t]
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

      const convIds = (conversations || []).map((c) => c.id);
      if (convIds.length === 0) {
        setTotalUnreadCount(0);
        return;
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      setTotalUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const scheduleFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void fetchUnreadCount();
      }, 450);
    };

    void fetchUnreadCount();
    window.addEventListener('messages-read', scheduleFetch);

    const channel = supabase
      .channel(`unread-messages-count-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, scheduleFetch)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener('messages-read', scheduleFetch);
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  const goToSet = (targetSet: 0 | 1, direction: 1 | -1) => {
    if (activeSet === targetSet) return;
    setSlideDirection(direction);
    setActiveSet(targetSet);
  };

  const renderNavButton = (item: NavItem, positionClass = '') => {
    const { path, icon: Icon, label, tutorialId, showUnreadBadge } = item;
    const isActive = item.isActive(pathname);
    const showBadge = !!showUnreadBadge && totalUnreadCount > 0;

    return (
      <button
        key={path}
        type="button"
        onClick={() => navigate(path)}
        style={{ width: SIDE_COL }}
        className={`mx-0.5 flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0 rounded-xl active:scale-[0.96] transition-transform duration-200 ease-out touch-manipulation ${positionClass}`}
        data-tutorial={tutorialId}
      >
        <div className="relative">
          <Icon
            className={`h-[26px] w-[26px] transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            strokeWidth={isActive ? 2.4 : 1.65}
          />
          {showBadge && (
            <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1 shadow-sm border border-background">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </div>
        <span
          className={`text-[11px] leading-none tracking-tight max-w-[4.5rem] truncate ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'}`}
        >
          {label}
        </span>
      </button>
    );
  };

  if (hideBottomNav) return null;

  const hint = t('navigation.switchNavSet');
  const currentSetItems = navSets[activeSet];

  return (
    <nav
      className="relative z-[100] w-full shrink-0 bg-background pointer-events-auto"
      role="navigation"
      aria-label="Navigation principale"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="ios-nav-shell relative h-[var(--nav-height)] w-full overflow-hidden pt-0.5">
        <div className="relative z-0 h-full w-full">
          <AnimatePresence initial={false} custom={slideDirection} mode="wait">
            <motion.div
              key={activeSet}
              custom={slideDirection}
              initial={(dir) => ({ x: dir > 0 ? 36 : -36, opacity: 0 })}
              animate={{ x: 0, opacity: 1 }}
              exit={(dir) => ({ x: dir > 0 ? -36 : 36, opacity: 0 })}
              transition={{ duration: 0.24, ease: iosEase }}
              className="absolute inset-0 flex items-center"
            >
              {renderNavButton(currentSetItems[0], 'translate-x-2')}
              {renderNavButton(currentSetItems[1], 'translate-x-1')}
              <div className="pointer-events-none mx-0.5 min-w-0 shrink-0" style={{ width: SIDE_COL }} aria-hidden />
              {renderNavButton(currentSetItems[2], '-translate-x-1')}
              {renderNavButton(currentSetItems[3], '-translate-x-2')}
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-0 z-[24] h-full w-[20%] max-w-[5.5rem] -translate-x-1/2 bg-background"
          aria-hidden
        />

        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 z-[26] flex w-7 items-center justify-start bg-gradient-to-r from-background from-35% to-transparent pl-0.5 touch-manipulation"
          aria-label={`${hint} — ${t('navigation.home')}`}
          onClick={() => goToSet(0, -1)}
        >
          <ChevronLeft className={`h-5 w-5 drop-shadow-sm ${activeSet === 0 ? 'text-muted-foreground/40' : 'text-muted-foreground'}`} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 z-[26] flex w-7 items-center justify-end bg-gradient-to-l from-background from-35% to-transparent pr-0.5 touch-manipulation"
          aria-label={`${hint} — ${t('navigation.itinerary')}`}
          onClick={() => goToSet(1, 1)}
        >
          <ChevronRight className={`h-5 w-5 drop-shadow-sm ${activeSet === 1 ? 'text-muted-foreground/40' : 'text-muted-foreground'}`} strokeWidth={2} aria-hidden />
        </button>

        <div className="pointer-events-none absolute inset-0 z-[28] flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              pathname === '/' ? openCreateSession() : (navigate('/'), setTimeout(openCreateSession, 100));
            }}
            className="pointer-events-auto h-[54px] w-[54px] rounded-[1.15rem] bg-primary flex items-center justify-center text-primary-foreground active:scale-[0.94] transition-all duration-200 ease-out shadow-lg shadow-primary/28 ring-[3px] ring-background dark:ring-background touch-manipulation"
            data-tutorial="create-session"
            aria-label={t('navigation.createSession')}
          >
            <Plus className="h-7 w-7" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </nav>
  );
};
