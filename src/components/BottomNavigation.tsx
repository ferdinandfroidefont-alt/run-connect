import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SimplePermissionsTest } from './SimplePermissionsTest';
const navItems = [{
  path: '/',
  emoji: '🗺️',
  label: 'Carte'
}, {
  path: '/my-sessions',
  emoji: '🚴‍♂️',
  label: 'Mes Séances'
}, {
  path: '/messages',
  emoji: '💬',
  label: 'Messages'
}, {
  path: '/leaderboard',
  emoji: '🏆',
  label: 'Classement'
}];
export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const {
    openCreateSession
  } = useAppContext();

  // Compter le nombre total de messages non lus
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        // Récupérer toutes les conversations de l'utilisateur
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id},is_group.eq.true`);

        if (convError) throw convError;

        let totalUnread = 0;

        // Compter les messages non lus pour chaque conversation
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
        console.log('📊 Total unread messages updated:', totalUnread);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Listen for custom messages-read events
    const handleMessagesRead = () => {
      console.log('🔄 Custom messages-read event detected');
      fetchUnreadCount();
    };

    window.addEventListener('messages-read', handleMessagesRead);

    // Subscribe to realtime changes for messages
    const channel = supabase
      .channel('unread-messages-count')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        console.log('🔄 Message change detected, updating unread count');
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      window.removeEventListener('messages-read', handleMessagesRead);
      supabase.removeChannel(channel);
    };
  }, [user]);
  return (
    <>
      {/* Nouvelle barre du bas - couvre tout l'espace */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card pb-safe z-40">
        <div className="flex items-center justify-center py-2 min-h-[40px]">
          <SimplePermissionsTest />
        </div>
      </nav>
      
      {/* Barre de navigation principale collée au-dessus */}
      <nav className="fixed bottom-6 left-0 right-0 bg-card border-t border-border z-50">
        <div className="grid grid-cols-5 items-center px-4 py-2">
          {/* Première colonne - Carte */}
          <div className="flex justify-center">
            {navItems.slice(0, 1).map(({ path, emoji, label }) => {
              const isActive = location.pathname === path;
              return (
                <button 
                  key={path} 
                  onClick={() => navigate(path)} 
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-lg transition-colors h-full", 
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-xl mt-1">{emoji}</span>
                  <span className="text-xs font-medium mt-1">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Deuxième colonne - Mes Séances */}
          <div className="flex justify-center">
            {navItems.slice(1, 2).map(({ path, emoji, label }) => {
              const isActive = location.pathname === path;
              return (
                <button 
                  key={path} 
                  onClick={() => navigate(path)} 
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-lg transition-colors h-full", 
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-xl mt-1">{emoji}</span>
                  <span className="text-xs font-medium mt-1">{label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Troisième colonne - Bouton Créer au centre */}
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
              className="flex flex-col justify-start items-center gap-1 px-6 py-3 bg-primary text-primary-foreground rounded-full transition-all hover:bg-primary/90 shadow-xl -translate-y-6 scale-110"
            >
              <Plus size={24} className="mt-1" />
              <span className="text-xs font-medium mt-1">CRÉER</span>
            </button>
          </div>

          {/* Quatrième colonne - Messages */}
          <div className="flex justify-center">
            {navItems.slice(2, 3).map(({ path, emoji, label }) => {
              const isActive = location.pathname === path;
              const isMessages = path === '/messages';
              
              return (
                <button 
                  key={path} 
                  onClick={() => navigate(path)} 
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-lg transition-colors relative h-full", 
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <div className="relative mt-1">
                    <span className="text-xl">{emoji}</span>
                    {isMessages && totalUnreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs min-w-4"
                      >
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-medium mt-1">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Cinquième colonne - Classement */}
          <div className="flex justify-center">
            {navItems.slice(3, 4).map(({ path, emoji, label }) => {
              const isActive = location.pathname === path;
              return (
                <button 
                  key={path} 
                  onClick={() => navigate(path)} 
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-lg transition-colors h-full", 
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-xl mt-1">{emoji}</span>
                  <span className="text-xs font-medium mt-1">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};