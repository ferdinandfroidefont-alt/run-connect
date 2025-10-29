import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SimplePermissionsTest } from './SimplePermissionsTest';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const {
    openCreateSession
  } = useAppContext();

  // Navigation items with translations
  const navItems = [{
    path: '/',
    emoji: '🗺️',
    label: t('navigation.home')
  }, {
    path: '/my-sessions',
    emoji: '🚴‍♂️',
    label: t('navigation.mySessions')
  }, {
    path: '/messages',
    emoji: '💬',
    label: t('navigation.messages')
  }, {
    path: '/leaderboard',
    emoji: '🏆',
    label: t('navigation.leaderboard')
  }];

  // Navigation INSTANTANÉE sans délai
  const handleNavigation = (path: string) => {
    navigate(path);
  };

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
      <nav className="fixed bottom-0 left-0 right-0 glass-premium pb-safe z-40">
        <div className="flex items-center justify-center py-2 min-h-[40px]">
          <SimplePermissionsTest />
        </div>
      </nav>
      
      {/* Barre de navigation principale flottante glassmorphic premium */}
      <nav className="fixed bottom-0 left-0 right-0 glass-premium shadow-2xl z-50 mx-auto max-w-md">
        <div className="relative">
          {/* Effet lumineux subtil au fond */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
          
          <div className="grid grid-cols-5 items-center px-4 py-2">
          {/* Première colonne - Carte */}
          <div className="flex justify-center">
            {navItems.slice(0, 1).map(({ path, emoji, label }) => {
              const isActive = location.pathname === path;
              return (
                <button 
                  key={path} 
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-xl instant-button h-full transition-all duration-300",
                    isActive 
                      ? "text-primary bg-primary/20 shadow-glow scale-105" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:scale-105"
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
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-xl instant-button h-full transition-all duration-300",
                    isActive 
                      ? "text-primary bg-primary/20 shadow-glow scale-105" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:scale-105"
                  )}
                >
                  <span className="text-xl mt-1">{emoji}</span>
                  <span className="text-xs font-medium mt-1">{label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Troisième colonne - Bouton Créer au centre avec effet premium */}
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
              className="flex flex-col justify-start items-center gap-0.5 px-4 py-3 bg-gradient-to-br from-primary to-accent text-white rounded-full transition-all hover:shadow-glow hover:scale-110 active:scale-95 -translate-y-4 scale-110 shadow-xl shadow-primary/50 animate-glow-pulse"
            >
              <Plus size={20} />
              <span className="text-[10px] font-bold">{t('sessions.create').toUpperCase()}</span>
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
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-xl instant-button relative h-full transition-all duration-300",
                    isActive 
                      ? "text-primary bg-primary/20 shadow-glow scale-105" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:scale-105"
                  )}
                >
                  <div className="relative mt-1">
                    <span className="text-xl">{emoji}</span>
                    {isMessages && totalUnreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs min-w-4 animate-bounce-subtle bg-gradient-to-r from-red-500 to-red-600 shadow-lg"
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
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    "flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-xl instant-button h-full transition-all duration-300",
                    isActive 
                      ? "text-primary bg-primary/20 shadow-glow scale-105" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:scale-105"
                  )}
                >
                  <span className="text-xl mt-1">{emoji}</span>
                  <span className="text-xs font-medium mt-1">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </nav>
    </>
  );
};