import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StravaConnectButton, StravaPoweredBy } from '@/components/strava/StravaBrand';
import { gradientForSearchLetter, messageSearchResultCardStyle } from '@/lib/messageSearchMaquette';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface StravaTabProps {
  searchQuery: string;
  onOpenSettings?: (focus?: string) => void;
}

export const StravaTab = ({ searchQuery, onOpenSettings }: StravaTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isStravaConnected, setIsStravaConnected] = useState<boolean | null>(null);

  useEffect(() => {
    loadStravaFriends();
  }, []);

  const loadStravaFriends = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Vérifier la connexion Strava
      const { data: profile } = await supabase
        .from('profiles')
        .select('strava_connected, strava_access_token')
        .eq('user_id', user.id)
        .single();

      const connected = profile?.strava_connected && profile?.strava_access_token ? true : false;
      setIsStravaConnected(connected);

      if (!connected) {
        setFriends([]);
        return;
      }

      // Charger les amis Strava via edge function
      const { data, error } = await supabase.functions.invoke('get-strava-friends');

      if (error || data?.error) {
        console.error('Error loading Strava friends:', error || data?.error);
        setFriends([]);
        return;
      }

      if (data?.friends) {
        setFriends(data.friends);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading Strava friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (profile: Profile) => {
    if (!user) return;

    try {
      // IMPORTANT: Vérifier si les utilisateurs sont amis mutuels
      const { data: areFriends } = await supabase.rpc('are_users_friends', {
        user1_id: user.id,
        user2_id: profile.user_id
      });

      if (!areFriends) {
        toast({
          title: "Impossible d'envoyer un message",
          description: "Vous devez être amis pour envoyer un message. Attendez que votre demande de suivi soit acceptée.",
          variant: "destructive"
        });
        return;
      }

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${profile.user_id}),and(participant_1.eq.${profile.user_id},participant_2.eq.${user.id})`)
        .eq('is_group', false)
        .single();

      if (existingConversation) {
        navigate(`/messages?conversation=${existingConversation.id}`);
        return;
      }

      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert([{
          participant_1: user.id,
          participant_2: profile.user_id,
          is_group: false
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/messages?conversation=${newConversation.id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la conversation",
        variant: "destructive"
      });
    }
  };

  const handleConnectStrava = () => {
    if (onOpenSettings) {
      onOpenSettings('strava');
    } else {
      navigate('/profile?tab=settings&focus=strava');
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 px-3 pb-6 pt-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3" style={messageSearchResultCardStyle}>
            <Skeleton className="h-[50px] w-[50px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isStravaConnected === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <svg className="h-16 w-16 text-[#FC4C02] mb-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
        </svg>
        <h3 className="text-lg font-semibold mb-2">Strava non connecte</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connectez votre compte Strava pour voir vos amis qui utilisent RunConnect
        </p>
        <div className="w-full max-w-xs">
          <StravaConnectButton onClick={handleConnectStrava} />
        </div>
        <StravaPoweredBy variant="logo" />
      </div>
    );
  }

  if (friends.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <svg className="h-16 w-16 text-[#FC4C02] mb-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
        </svg>
        <h3 className="text-lg font-semibold mb-2">Aucun ami Strava</h3>
        <p className="text-sm text-muted-foreground">
          Aucun de vos amis Strava n'utilise RunConnect pour le moment
        </p>
        <StravaPoweredBy variant="logo" />
      </div>
    );
  }

  const filteredFriends = searchQuery.trim()
    ? friends.filter(f => 
        f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  return (
    <div className="space-y-2 px-3 pb-6 pt-3">
      {filteredFriends.map((friend) => {
        const initial = (friend.display_name || friend.username || "?")[0]?.toUpperCase() ?? "?";
        return (
          <div
            key={friend.user_id}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-transform active:scale-[0.99]"
            style={messageSearchResultCardStyle}
            onClick={() => navigate(`/profile/${friend.user_id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/profile/${friend.user_id}`);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="relative h-[50px] w-[50px] shrink-0">
              {friend.avatar_url ? (
                <Avatar className="h-[50px] w-[50px] border-0 shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
                  <AvatarImage src={friend.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback
                    className="text-xl font-black text-white"
                    style={{ background: gradientForSearchLetter(initial) }}
                  >
                    {initial}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="flex h-[50px] w-[50px] items-center justify-center rounded-full text-xl font-black tracking-tight text-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
                  style={{ background: gradientForSearchLetter(initial) }}
                >
                  {initial}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-base font-extrabold leading-tight tracking-tight text-[#0A0F1F]">
                {friend.display_name}
              </p>
              <p className="m-0 mt-0.5 truncate text-[13px] font-semibold text-[#8E8E93]">
                @{friend.username}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <svg className="h-3 w-3 shrink-0 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171" />
                </svg>
                <span className="text-[12px] font-semibold text-[#8E8E93]">Ami Strava</span>
              </div>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-full text-[#007AFF]"
              onClick={(e) => {
                e.stopPropagation();
                void handleStartConversation(friend);
              }}
              aria-label="Envoyer un message"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};
