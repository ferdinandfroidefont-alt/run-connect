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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background pb-2">
      <div className="h-px bg-border" />
      <div className="grid grid-cols-5 items-center h-[72px]">
        {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center justify-center h-full">
              <Icon className={`h-7 w-7 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{label}</span>
            </button>
          );
        })}

        <div className="flex items-center justify-center">
          <button onClick={() => { location.pathname === '/' ? openCreateSession() : (navigate('/'), setTimeout(openCreateSession, 100)); }} className="h-14 w-14 rounded-full bg-primary flex items-center justify-center active:opacity-70 shadow-lg">
            <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
          </button>
        </div>

        {navItems.slice(2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === '/messages' && totalUnreadCount > 0;
          return (
            <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center justify-center h-full relative">
              <div className="relative">
                <Icon className={`h-7 w-7 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                {showBadge && <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[11px] font-semibold rounded-full px-1">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</span>}
              </div>
              <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};