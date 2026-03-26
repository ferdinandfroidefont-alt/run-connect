import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  MessageCircle,
  Newspaper,
  Plus,
  PenTool,
  CheckCircle,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';

const COL_SHARE = '20%';

type NavItem = {
  path: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  label: string;
  tutorialId?: string;
  badge?: 'messages';
  isActive: (pathname: string) => boolean;
};

function splitNavRows(items: NavItem[]) {
  const left: NavItem[] = [];
  const right: NavItem[] = [];
  let afterSpacer = false;
  for (const it of items) {
    if (it.path === '/messages') afterSpacer = true;
    if (afterSpacer) right.push(it);
    else left.push(it);
  }
  return { left, right };
}

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { openCreateSession, hideBottomNav } = useAppContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const pathname = location.pathname;

  const navItems: NavItem[] = [
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
      badge: 'messages',
      isActive: (p) => p === '/messages' || p.startsWith('/messages/'),
    },
    {
      path: '/feed',
      icon: Newspaper,
      label: t('navigation.feed'),
      tutorialId: 'nav-feed',
      isActive: (p) => p === '/feed' || p.startsWith('/feed/'),
    },
    {
      path: '/route-create',
      icon: PenTool,
      label: t('navigation.itinerary'),
      isActive: (p) => p === '/route-create' || p === '/route-creation' || p.startsWith('/route-creation/'),
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
  ];

  const { left: leftRow, right: rightRow } = splitNavRows(navItems);

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

  const refreshScrollHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    refreshScrollHints();
    const ro = new ResizeObserver(() => refreshScrollHints());
    ro.observe(el);
    return () => ro.disconnect();
  }, [refreshScrollHints, hideBottomNav]);

  const scrollByOneColumn = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.2;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const renderNavButton = (item: NavItem) => {
    const { path, icon: Icon, label, tutorialId, badge } = item;
    const isActive = item.isActive(pathname);
    const showBadge = badge === 'messages' && totalUnreadCount > 0;

    return (
      <button
        key={path}
        type="button"
        onClick={() => navigate(path)}
        style={{ flex: `0 0 ${COL_SHARE}` }}
        className="flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0 rounded-xl mx-0.5 active:scale-[0.96] transition-transform duration-200 ease-out touch-manipulation"
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

  const hint = t('navigation.scrollNavHint');

  return (
    <nav
      className="relative z-[100] w-full shrink-0 bg-background pointer-events-auto"
      role="navigation"
      aria-label="Navigation principale"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="ios-nav-shell relative h-[var(--nav-height)] w-full pt-0.5">
        <div
          ref={scrollRef}
          onScroll={refreshScrollHints}
          className="relative z-0 flex h-full w-full flex-row flex-nowrap items-center overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]"
        >
          {leftRow.map(renderNavButton)}
          <div
            style={{ flex: `0 0 ${COL_SHARE}` }}
            className="pointer-events-none mx-0.5 min-w-0 shrink-0"
            aria-hidden
          />
          {rightRow.map(renderNavButton)}
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-0 z-[24] h-full w-[20%] max-w-[5.5rem] -translate-x-1/2 bg-background"
          aria-hidden
        />

        {canScrollLeft && (
          <button
            type="button"
            className="absolute left-0 top-0 bottom-0 z-[26] flex w-7 items-center justify-start bg-gradient-to-r from-background from-35% to-transparent pl-0.5 touch-manipulation"
            aria-label={`${hint} — ${t('navigation.home')}`}
            onClick={() => scrollByOneColumn(-1)}
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground drop-shadow-sm" strokeWidth={2} aria-hidden />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            className="absolute right-0 top-0 bottom-0 z-[26] flex w-7 items-center justify-end bg-gradient-to-l from-background from-35% to-transparent pr-0.5 touch-manipulation"
            aria-label={`${hint} — ${t('navigation.itinerary')}`}
            onClick={() => scrollByOneColumn(1)}
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground drop-shadow-sm" strokeWidth={2} aria-hidden />
          </button>
        )}

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
