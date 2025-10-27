import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export const StravaTab = ({ searchQuery }: { searchQuery: string }) => {
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
    navigate('/profile?tab=settings&focus=strava');
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
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
        <h3 className="text-lg font-semibold mb-2">Strava non connecté</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connectez votre compte Strava pour voir vos amis qui utilisent RunConnect
        </p>
        <Button onClick={handleConnectStrava}>
          Connecter Strava
        </Button>
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
    <div className="p-4 space-y-3">
      {filteredFriends.map((friend) => (
        <Card key={friend.user_id} className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback>{friend.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{friend.display_name}</h4>
                <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
                <div className="flex items-center gap-1 mt-1">
                  <svg className="h-3 w-3 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
                  </svg>
                  <span className="text-xs text-muted-foreground">Ami Strava</span>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleStartConversation(friend)}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
