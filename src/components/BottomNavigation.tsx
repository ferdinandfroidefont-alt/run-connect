import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, MessageCircle, Newspaper, Plus } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { openCreateSession, hideBottomNav } = useAppContext();

  const navItems = [
    { path: '/', icon: Home, label: t('navigation.home') },
    { path: '/my-sessions', icon: Calendar, label: t('navigation.mySessions') },
    { path: '/messages', icon: MessageCircle, label: t('navigation.messages') },
    { path: '/feed', icon: Newspaper, label: 'Feed' }
  ];

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

        const convIds = (conversations || []).map(c => c.id);
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
    };

    fetchUnreadCount();
    window.addEventListener('messages-read', fetchUnreadCount);

    const channel = supabase
      .channel('unread-messages-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnreadCount)
      .subscribe();

    return () => {
      window.removeEventListener('messages-read', fetchUnreadCount);
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (hideBottomNav) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 ios-nav-shell pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-5 items-end h-[var(--nav-height)] pb-1">
        {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const tutorialId = path === '/my-sessions' ? 'nav-sessions' : undefined;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl mx-0.5 active:scale-[0.96] transition-transform duration-200 ease-out touch-manipulation"
              data-tutorial={tutorialId}
            >
              <Icon
                className={`h-[26px] w-[26px] transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={isActive ? 2.4 : 1.65}
              />
              <span
                className={`text-[11px] leading-none tracking-tight max-w-[4.5rem] truncate ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'}`}
              >
                {label}
              </span>
            </button>
          );
        })}

        <div className="flex items-center justify-center pb-1">
          <button
            onClick={() => {
              location.pathname === '/' ? openCreateSession() : (navigate('/'), setTimeout(openCreateSession, 100));
            }}
            className="h-[54px] w-[54px] rounded-[1.15rem] bg-primary flex items-center justify-center text-primary-foreground active:scale-[0.94] transition-all duration-200 ease-out shadow-lg shadow-primary/28 ring-[3px] ring-background dark:ring-background touch-manipulation"
            data-tutorial="create-session"
            aria-label={t('navigation.createSession')}
          >
            <Plus className="h-7 w-7" strokeWidth={2.25} />
          </button>
        </div>

        {navItems.slice(2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === '/messages' && totalUnreadCount > 0;
          const tutorialId = path === '/messages' ? 'nav-messages' : path === '/feed' ? 'nav-feed' : undefined;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl mx-0.5 relative active:scale-[0.96] transition-transform duration-200 ease-out touch-manipulation"
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
        })}
      </div>
    </nav>
  );
};