import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  MessageCircle,
  Newspaper,
  Plus,
  Crown,
  PenTool,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import { cn } from '@/lib/utils';

const CENTER_SPACER_W = '4.75rem'; /* ~76px : laisse passer le + sans masquer les libellés */
const SCROLL_STEP_PX = 132;

type NavLinkItem = {
  kind: 'link';
  path: string;
  icon: LucideIcon;
  label: string;
  tutorial?: string;
  isActive: (pathname: string) => boolean;
};

type NavSpacerItem = { kind: 'spacer' };

type NavItem = NavLinkItem | NavSpacerItem;

/** Clé d’onglet pour scroll automatique (doit correspondre aux `path` des entrées `link`). */
function resolveBottomNavScrollKey(pathname: string): string | null {
  if (pathname === '/') return '/';
  if (pathname === '/my-sessions' || pathname.startsWith('/my-sessions/'))
    return '/my-sessions';
  if (pathname === '/messages' || pathname.startsWith('/messages/'))
    return '/messages';
  if (pathname === '/feed') return '/feed';
  if (pathname.startsWith('/route-create') || pathname.startsWith('/route-creation'))
    return '/route-create';
  if (pathname.startsWith('/confirm-presence')) return '/confirm-presence';
  if (pathname === '/leaderboard') return '/leaderboard';
  return null;
}

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { openCreateSession, hideBottomNav } = useAppContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const navItems: NavItem[] = [
    {
      kind: 'link',
      path: '/',
      icon: Home,
      label: t('navigation.home'),
      isActive: (p) => p === '/',
    },
    {
      kind: 'link',
      path: '/my-sessions',
      icon: Calendar,
      label: t('navigation.mySessions'),
      tutorial: 'nav-sessions',
      isActive: (p) =>
        p === '/my-sessions' || p.startsWith('/my-sessions/'),
    },
    { kind: 'spacer' },
    {
      kind: 'link',
      path: '/messages',
      icon: MessageCircle,
      label: t('navigation.messages'),
      tutorial: 'nav-messages',
      isActive: (p) => p === '/messages' || p.startsWith('/messages/'),
    },
    {
      kind: 'link',
      path: '/feed',
      icon: Newspaper,
      label: t('navigation.feed'),
      tutorial: 'nav-feed',
      isActive: (p) => p === '/feed',
    },
    {
      kind: 'link',
      path: '/route-create',
      icon: PenTool,
      label: t('navigation.itinerary'),
      isActive: (p) =>
        p.startsWith('/route-create') || p.startsWith('/route-creation'),
    },
    {
      kind: 'link',
      path: '/confirm-presence',
      icon: CheckCircle,
      label: t('navigation.presence'),
      isActive: (p) => p.startsWith('/confirm-presence'),
    },
    {
      kind: 'link',
      path: '/leaderboard',
      icon: Crown,
      label: t('navigation.leaderboard'),
      isActive: (p) => p === '/leaderboard',
    },
  ];

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        scheduleFetch
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener('messages-read', scheduleFetch);
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useLayoutEffect(() => {
    updateScrollHints();
  }, [updateScrollHints, hideBottomNav]);

  useEffect(() => {
    const onResize = () => updateScrollHints();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateScrollHints]);

  useEffect(() => {
    const key = resolveBottomNavScrollKey(location.pathname);
    if (!key) return;
    const btn = itemRefs.current.get(key);
    const ro = scrollRef.current;
    if (!btn || !ro) return;
    const btnRect = btn.getBoundingClientRect();
    const roRect = ro.getBoundingClientRect();
    if (btnRect.left < roRect.left + 4 || btnRect.right > roRect.right - 4) {
      btn.scrollIntoView({
        inline: 'nearest',
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [location.pathname]);

  const scrollByDelta = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (hideBottomNav) return null;

  return (
    <nav
      className="relative z-[100] w-full shrink-0 bg-background pointer-events-auto"
      role="navigation"
      aria-label="Navigation principale"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="ios-nav-shell relative flex h-[var(--nav-height)] w-full items-center pt-0.5">
        <button
          type="button"
          aria-label={t('navigation.scrollTabsLeft')}
          disabled={!canScrollLeft}
          onClick={() => scrollByDelta(-SCROLL_STEP_PX)}
          className={cn(
            'flex h-full w-9 shrink-0 items-center justify-center touch-manipulation transition-opacity',
            canScrollLeft
              ? 'text-muted-foreground active:opacity-70'
              : 'pointer-events-none text-muted-foreground/25'
          )}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>

        <div
          ref={scrollRef}
          onScroll={updateScrollHints}
          className="flex min-h-0 min-w-0 flex-1 snap-x snap-proximity items-stretch gap-1 overflow-x-auto overflow-y-hidden py-1 scrollbar-hide scroll-smooth"
        >
          {navItems.map((item) => {
            if (item.kind === 'spacer') {
              return (
                <div
                  key="center-spacer"
                  className="pointer-events-none shrink-0 snap-start"
                  style={{ width: CENTER_SPACER_W }}
                  aria-hidden
                />
              );
            }

            const { path, icon: Icon, label, tutorial } = item;
            const isActive = item.isActive(location.pathname);
            const showBadge =
              path === '/messages' && totalUnreadCount > 0;

            return (
              <button
                key={path}
                type="button"
                ref={(el) => {
                  if (el) itemRefs.current.set(path, el);
                  else itemRefs.current.delete(path);
                }}
                data-tutorial={tutorial}
                onClick={() => navigate(path)}
                className={cn(
                  'flex min-w-[4rem] max-w-[5.25rem] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-ios-lg border px-1.5 py-1.5 touch-manipulation transition-all duration-200 ease-out min-h-[48px]',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15'
                    : 'border-border/60 bg-card text-muted-foreground active:scale-[0.97]'
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-colors duration-200',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                    strokeWidth={isActive ? 2.35 : 1.75}
                    aria-hidden
                  />
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-background bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'w-full truncate text-center text-[10px] font-medium leading-tight tracking-tight',
                    isActive ? 'font-semibold text-primary-foreground' : ''
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={t('navigation.scrollTabsRight')}
          disabled={!canScrollRight}
          onClick={() => scrollByDelta(SCROLL_STEP_PX)}
          className={cn(
            'flex h-full w-9 shrink-0 items-center justify-center touch-manipulation transition-opacity',
            canScrollRight
              ? 'text-muted-foreground active:opacity-70'
              : 'pointer-events-none text-muted-foreground/25'
          )}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>

        {/* + fixe au centre : le flux horizontal continue dessous (spacer) */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 top-0 z-[2] flex -translate-x-1/2 items-center justify-center pt-0.5">
          <button
            type="button"
            onClick={() => {
              location.pathname === '/'
                ? openCreateSession()
                : (navigate('/'), setTimeout(openCreateSession, 100));
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
