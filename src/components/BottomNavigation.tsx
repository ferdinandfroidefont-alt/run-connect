import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { openCreateSession } = useAppContext();

  const navItems = [
    { path: '/', emoji: '🗺️', label: t('navigation.home'), color: 'from-blue-500 to-cyan-400' },
    { path: '/my-sessions', emoji: '🚴‍♂️', label: t('navigation.mySessions'), color: 'from-purple-500 to-pink-500' },
    { path: '/messages', emoji: '💬', label: t('navigation.messages'), color: 'from-orange-500 to-amber-400' },
    { path: '/feed', emoji: '📱', label: 'Feed', color: 'from-green-500 to-emerald-400' }
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
    <nav className="fixed bottom-0 left-0 right-0 glass-primary shadow-2xl z-50 pb-safe">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
      
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        
        <div className="grid grid-cols-5 items-center px-3 pt-6 pb-4">
          {/* Carte */}
          <div className="flex justify-center -translate-y-3">
            {navItems.slice(0, 1).map(({ path, emoji, label, color }) => {
              const isActive = location.pathname === path;
              return (
                <button 
                  key={path} 
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300",
                    isActive 
                      ? `text-foreground bg-gradient-to-br ${color} shadow-lg shadow-blue-500/30 scale-105` 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className={cn("text-xs font-medium", isActive && "text-white")}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Mes Séances */}
          <div className="flex justify-center -translate-y-3">
            {navItems.slice(1, 2).map(({ path, emoji, label, color }) => {
              const isActive = location.pathname === path;
              return (
                <button 
                  key={path} 
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300",
                    isActive 
                      ? `text-foreground bg-gradient-to-br ${color} shadow-lg shadow-purple-500/30 scale-105` 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className={cn("text-xs font-medium", isActive && "text-white")}>{label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Bouton Créer au centre - Enhanced with rainbow glow */}
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
              className="flex flex-col items-center gap-1 px-4 py-2.5 bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground rounded-full transition-all hover:scale-110 -translate-y-6 shadow-xl animate-rainbow-glow"
              style={{ backgroundSize: '200% 100%' }}
            >
              <Plus size={22} className="animate-pulse" />
              <span className="text-[10px] font-bold">{t('sessions.create').toUpperCase()}</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex justify-center -translate-y-3">
            {navItems.slice(2, 3).map(({ path, emoji, label, color }) => {
              const isActive = location.pathname === path;
              const isMessages = path === '/messages';
              
              return (
                <button 
                  key={path} 
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 relative",
                    isActive 
                      ? `text-foreground bg-gradient-to-br ${color} shadow-lg shadow-orange-500/30 scale-105` 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                  )}
                >
                  <div className="relative">
                    <span className="text-2xl">{emoji}</span>
                    {isMessages && totalUnreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2.5 h-5 min-w-5 p-0 flex items-center justify-center text-xs bg-gradient-to-r from-red-500 to-pink-500 animate-pulse shadow-lg shadow-red-500/50"
                      >
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </Badge>
                    )}
                  </div>
                  <span className={cn("text-xs font-medium", isActive && "text-white")}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Feed */}
          <div className="flex justify-center -translate-y-3">
            {navItems.slice(3, 4).map(({ path, emoji, label, color }) => {
              const isActive = location.pathname === path;
              return (
                <button 
                  key={path} 
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300",
                    isActive 
                      ? `text-foreground bg-gradient-to-br ${color} shadow-lg shadow-green-500/30 scale-105` 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className={cn("text-xs font-medium", isActive && "text-white")}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
