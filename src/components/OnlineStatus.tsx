import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  userId: string;
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

interface UserStatus {
  is_online: boolean;
  last_seen: string;
  show_online_status: boolean;
}

export const OnlineStatus = ({ userId, className, showText = false, size = "sm" }: OnlineStatusProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [areFriends, setAreFriends] = useState(false);

  useEffect(() => {
    if (!user || userId === user.id) return;

    const checkFriendshipAndFetchStatus = async () => {
      try {
        // Check if users are friends
        const { data: friendsData } = await supabase.rpc('are_users_friends', {
          user1_id: user.id,
          user2_id: userId
        });

        setAreFriends(friendsData || false);

        if (friendsData) {
          // Fetch user status
          const { data } = await supabase
            .from('profiles')
            .select('is_online, last_seen, show_online_status')
            .eq('user_id', userId)
            .single();

          if (data) {
            setStatus(data);
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkFriendshipAndFetchStatus();

    // Set up realtime subscription for online status
    const channel = supabase
      .channel('online_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (areFriends && payload.new) {
            setStatus({
              is_online: payload.new.is_online,
              last_seen: payload.new.last_seen,
              show_online_status: payload.new.show_online_status
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, areFriends]);

  // Don't show status if not friends or user doesn't want to show it
  if (!areFriends || !status?.show_online_status) {
    return null;
  }

  const getLastSeenText = () => {
    if (status.is_online) {
      return "En ligne";
    }
    
    const lastSeen = new Date(status.last_seen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 5) {
      return "À l'instant";
    }
    
    return `Vu ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: fr })}`;
  };

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3", 
    lg: "h-4 w-4"
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Circle 
        className={cn(
          sizeClasses[size],
          status.is_online 
            ? "fill-green-500 text-green-500" 
            : "fill-gray-400 text-gray-400"
        )} 
      />
      {showText && (
        <span 
          className={cn(
            "text-xs",
            status.is_online ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {getLastSeenText()}
        </span>
      )}
    </div>
  );
};