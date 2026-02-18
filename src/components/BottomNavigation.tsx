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

        let totalUnread = 0;
        for (const conv of conversations || []) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);
          totalUnread += count || 0;
        }
        setTotalUnreadCount(totalUnread);
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl pb-safe">
      <div className="h-px bg-border/50" />
      <div className="grid grid-cols-5 items-center h-[72px]">
        {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const tutorialId = path === '/my-sessions' ? 'nav-sessions' : undefined;
          return (
            <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center justify-center h-full pt-1 active:scale-90 transition-transform" data-tutorial={tutorialId}>
              <Icon className={`h-7 w-7 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] mt-0.5 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}

        <div className="flex items-center justify-center">
          <button onClick={() => { location.pathname === '/' ? openCreateSession() : (navigate('/'), setTimeout(openCreateSession, 100)); }} className="h-[52px] w-[52px] rounded-[16px] bg-primary flex items-center justify-center active:scale-90 transition-all duration-200 shadow-md shadow-primary/15 ring-1 ring-primary/20" data-tutorial="create-session">
            <Plus className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </button>
        </div>

        {navItems.slice(2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === '/messages' && totalUnreadCount > 0;
          const tutorialId = path === '/messages' ? 'nav-messages' : path === '/feed' ? 'nav-feed' : undefined;
          return (
            <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center justify-center h-full pt-1 relative active:scale-90 transition-transform" data-tutorial={tutorialId}>
              <div className="relative">
                <Icon className={`h-7 w-7 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                {showBadge && <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[11px] font-semibold rounded-full px-1">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</span>}
              </div>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};