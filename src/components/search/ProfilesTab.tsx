import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OnlineStatus } from '@/components/OnlineStatus';
import { useNavigate } from 'react-router-dom';
import { User, UserPlus, UserCheck, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  follower_count?: number;
  following_count?: number;
}

export const ProfilesTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchProfiles();
    } else {
      setProfiles([]);
    }
  }, [searchQuery]);

  const searchProfiles = async () => {
    if (!searchQuery.trim()) {
      setProfiles([]);
      return;
    }

    try {
      setLoading(true);
      const { data: searchData, error: searchError } = await supabase
        .from('profiles')
        .select('user_id')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .eq('is_private', false)
        .limit(20);

      if (searchError) throw searchError;
      const userIds = searchData?.map(item => item.user_id) || [];
      
      if (userIds.length === 0) {
        setProfiles([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase.rpc('get_safe_public_profiles', {
        profile_user_ids: userIds
      });

      if (profilesError) throw profilesError;

      const profilesWithStats = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: followerData } = await supabase.rpc('get_follower_count', { 
            profile_user_id: profile.user_id 
          });
          const { data: followingData } = await supabase.rpc('get_following_count', { 
            profile_user_id: profile.user_id 
          });
          
          return {
            ...profile,
            is_private: false,
            follower_count: followerData || 0,
            following_count: followingData || 0
          };
        })
      );

      setProfiles(profilesWithStats);
    } catch (error: any) {
      console.error('Error searching users:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
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

      // Vérifier si une conversation existe déjà
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

      // Créer une nouvelle conversation
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

  if (!searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center flex-1 min-h-0 h-full">
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Rechercher des utilisateurs</h3>
        <p className="text-sm text-muted-foreground">
          Entrez un nom d'utilisateur pour commencer la recherche
        </p>
      </div>
    );
  }

  if (profiles.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun résultat</h3>
        <p className="text-sm text-muted-foreground">
          Aucun utilisateur trouvé pour "{searchQuery}"
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {profiles.map((profile) => (
        <Card key={profile.user_id} className="glass-card cursor-pointer hover:bg-card/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative" onClick={() => handleProfileClick(profile.user_id)}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <OnlineStatus userId={profile.user_id} />
                </div>
              </div>
              
              <div className="flex-1 min-w-0" onClick={() => handleProfileClick(profile.user_id)}>
                <h4 className="font-semibold truncate">{profile.display_name}</h4>
                <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground truncate mt-1">{profile.bio}</p>
                )}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {profile.follower_count || 0} abonnés
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {profile.following_count || 0} abonnements
                  </span>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartConversation(profile);
                }}
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
