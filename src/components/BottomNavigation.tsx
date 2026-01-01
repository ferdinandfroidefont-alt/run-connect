import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, MessageCircle, Newspaper, Plus } from 'lucide-react';
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
    { path: '/', icon: Home, label: t('navigation.home') },
    { path: '/my-sessions', icon: Calendar, label: t('navigation.mySessions') },
    { path: '/messages', icon: MessageCircle, label: t('navigation.messages') },
    { path: '/feed', icon: Newspaper, label: 'Feed' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
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
      <div className="grid grid-cols-5 items-end px-1 pt-2 pb-1">
        {/* Map */}
        <div className="flex justify-center">
          {navItems.slice(0, 1).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button 
                key={path} 
                onClick={() => handleNavigation(path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Sessions */}
        <div className="flex justify-center">
          {navItems.slice(1, 2).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button 
                key={path} 
                onClick={() => handleNavigation(path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Create button - iOS style */}
        <div className="flex justify-center">
          <button 
            onClick={() => {
              if (location.pathname === '/') {
                openCreateSession();
              } else {
                navigate('/');
                setTimeout(() => openCreateSession(), 100);
              }
            }} 
            className="flex items-center justify-center h-11 w-11 bg-primary text-primary-foreground rounded-full -translate-y-2 active:opacity-80 transition-opacity"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex justify-center">
          {navItems.slice(2, 3).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            const isMessages = path === '/messages';
            
            return (
              <button 
                key={path} 
                onClick={() => handleNavigation(path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.5} />
                  {isMessages && totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-[18px] min-w-[18px] px-1 flex items-center justify-center text-[11px] font-semibold bg-destructive text-destructive-foreground rounded-full">
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Feed */}
        <div className="flex justify-center">
          {navItems.slice(3, 4).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button 
                key={path} 
                onClick={() => handleNavigation(path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
