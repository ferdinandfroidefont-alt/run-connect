import { useLocation, useNavigate } from 'react-router-dom';
import { Map, Calendar, MessageCircle, Rss, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const { openCreateSession } = useAppContext();

  const navItems = [
    { path: '/', icon: Map, label: t('navigation.home') },
    { path: '/my-sessions', icon: Calendar, label: t('navigation.mySessions') },
    { path: '/messages', icon: MessageCircle, label: t('navigation.messages') },
    { path: '/feed', icon: Rss, label: 'Feed' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleCreateSession = () => {
    if (location.pathname === '/') {
      openCreateSession();
    } else {
      navigate('/');
      setTimeout(() => openCreateSession(), 100);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id},is_group.eq.true`);

        if (convError) throw convError;

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

    const handleMessagesRead = () => {
      fetchUnreadCount();
    };

    window.addEventListener('messages-read', handleMessagesRead);

    const channel = supabase
      .channel('unread-messages-count')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      window.removeEventListener('messages-read', handleMessagesRead);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button 
              key={path} 
              onClick={() => handleNavigation(path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}

        {/* Center Create Button */}
        <button 
          onClick={handleCreateSession} 
          className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full -mt-4 shadow-sm"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>

        {navItems.slice(2).map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const isMessages = path === '/messages';
          
          return (
            <button 
              key={path} 
              onClick={() => handleNavigation(path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isMessages && totalUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
