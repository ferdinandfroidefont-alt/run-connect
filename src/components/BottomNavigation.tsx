import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, MessageCircle, Newspaper, Plus, PenTool, CheckCircle, Crown, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
/** Rythme horizontal homogène : même valeur que le gap entre les 7 colonnes (bords inclus). */
const TAB_BAR_RHYTHM = 'gap-2 px-2 sm:gap-2.5 sm:px-2.5';

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
          path: '/itinerary',
          icon: PenTool,
          label: t('navigation.itinerary'),
          isActive: (p) =>
            p === '/itinerary' ||
            p.startsWith('/itinerary/') ||
            p === '/route-create' ||
            p === '/route-creation' ||
            p.startsWith('/route-creation/'),
        },
        {
          path: '/coaching',
          icon: GraduationCap,
          label: t('navigation.coaching'),
          isActive: (p) => p === '/coaching' || p.startsWith('/coaching/'),
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

  const goToSet = (targetSet: 0 | 1) => {
    if (activeSet === targetSet) return;
    setActiveSet(targetSet);
  };

  const renderNavButton = (item: NavItem) => {
    const { path, icon: Icon, label, tutorialId, showUnreadBadge } = item;
    const isActive = item.isActive(pathname);
    const showBadge = !!showUnreadBadge && totalUnreadCount > 0;

    return (
      <button
        type="button"
        onClick={() => navigate(path)}
        className="flex min-h-[48px] w-full max-w-[5.75rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl active:scale-[0.96] transition-transform duration-200 ease-out touch-manipulation"
        data-tutorial={tutorialId}
      >
        <div className="relative shrink-0">
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
          className={`w-full truncate text-center text-[11px] leading-none tracking-tight ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'}`}
        >
          {label}
        </span>
      </button>
    );
  };

  const renderTabCell = (item: NavItem) => (
    <div
      key={item.path}
      className="flex min-h-0 min-w-0 flex-1 basis-0 items-center justify-center"
    >
      {renderNavButton(item)}
    </div>
  );

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
      <div className="ios-nav-shell relative h-[var(--nav-height)] w-full overflow-x-clip overflow-y-visible pt-0.5">
        {/*
          Une seule rangée : 7 zones de même largeur (flex-1 basis-0) = flèche | tab | tab | + | tab | tab | flèche
          Même gap et padding horizontal → espacement visuellement uniforme jusqu’aux bords.
        */}
        <div className={cn('flex h-full w-full items-center', TAB_BAR_RHYTHM)}>
          <div className="flex min-h-0 min-w-0 flex-1 basis-0 items-center justify-center">
            <button
              type="button"
              className="flex h-[48px] w-full max-w-[3rem] items-center justify-center rounded-xl touch-manipulation active:scale-[0.94] transition-transform duration-200 ease-out"
              aria-label={`${hint} — ${t('navigation.home')}`}
              onClick={() => goToSet(0)}
            >
              <ChevronLeft
                className={`h-5 w-5 ${activeSet === 0 ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>

          {renderTabCell(currentSetItems[0])}
          {renderTabCell(currentSetItems[1])}

          <div className="flex min-h-0 min-w-0 flex-1 basis-0 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                pathname === '/' ? openCreateSession() : (navigate('/'), setTimeout(openCreateSession, 100));
              }}
              className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[1.15rem] bg-primary text-primary-foreground shadow-lg shadow-primary/28 ring-[3px] ring-background transition-all duration-200 ease-out active:scale-[0.94] touch-manipulation dark:ring-background"
              data-tutorial="create-session"
              aria-label={t('navigation.createSession')}
            >
              <Plus className="h-7 w-7" strokeWidth={2.25} />
            </button>
          </div>

          {renderTabCell(currentSetItems[2])}
          {currentSetItems[3] ? renderTabCell(currentSetItems[3]) : (
            <div className="flex min-h-0 min-w-0 flex-1 basis-0 items-center justify-center" aria-hidden />
          )}

          <div className="flex min-h-0 min-w-0 flex-1 basis-0 items-center justify-center">
            <button
              type="button"
              className="flex h-[48px] w-full max-w-[3rem] items-center justify-center rounded-xl touch-manipulation active:scale-[0.94] transition-transform duration-200 ease-out"
              aria-label={`${hint} — ${t('navigation.itinerary')}`}
              onClick={() => goToSet(1)}
            >
              <ChevronRight
                className={`h-5 w-5 ${activeSet === 1 ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
