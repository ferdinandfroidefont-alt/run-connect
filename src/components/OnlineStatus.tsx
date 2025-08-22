import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnlineStatusProps {
  userId: string;
  showOnlineStatus?: boolean;
  className?: string;
}

export const OnlineStatus = ({ userId, showOnlineStatus = true, className = "" }: OnlineStatusProps) => {
  const [isOnline, setIsOnline] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const checkOnlineStatus = async () => {
      if (!userId || !showOnlineStatus) return;

      try {
        // Get user's online status and last seen
        const { data, error } = await supabase
          .from('profiles')
          .select('is_online, last_seen, show_online_status')
          .eq('user_id', userId)
          .single();

        if (error || !data || !mounted) return;

        // Only show online status if user allows it
        if (!data.show_online_status) {
          setIsOnline(false);
          return;
        }

        // Consider user online if:
        // 1. is_online is true, OR
        // 2. last_seen is within the last 5 minutes
        const lastSeen = new Date(data.last_seen || 0);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        setIsOnline(data.is_online || lastSeen > fiveMinutesAgo);
      } catch (error) {
        console.error('Error checking online status:', error);
      }
    };

    checkOnlineStatus();

    // Set up real-time subscription for online status changes
    const channel = supabase
      .channel('online-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (!mounted || !payload.new?.show_online_status) return;
          
          const lastSeen = new Date(payload.new.last_seen || 0);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          setIsOnline(payload.new.is_online || lastSeen > fiveMinutesAgo);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, showOnlineStatus]);

  // Update current user's online status
  useEffect(() => {
    if (!user || user.id !== userId) return;

    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const updateOnlineStatus = async (isOnline: boolean) => {
      if (!mounted) return;
      
      try {
        await supabase
          .from('profiles')
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    // Set user as online
    updateOnlineStatus(true);

    // Update last_seen every 30 seconds while active
    intervalId = setInterval(() => {
      updateOnlineStatus(true);
    }, 30000);

    // Set user as offline when leaving/closing
    const handleBeforeUnload = () => {
      // Use a simple update instead of sendBeacon since supabaseUrl is protected
      updateOnlineStatus(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      updateOnlineStatus(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, userId]);

  if (!showOnlineStatus || userId === user?.id) return null;

  return (
    <div 
      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      } ${className}`}
      title={isOnline ? 'En ligne' : 'Hors ligne'}
    />
  );
};