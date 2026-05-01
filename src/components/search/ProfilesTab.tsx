import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  country?: string | null;
  follower_count?: number;
}

export const ProfilesTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());

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
          
          return {
            ...profile,
            is_private: false,
            follower_count: followerData || 0,
          };
        })
      );

      setProfiles(profilesWithStats);

      if (user?.id && userIds.length > 0) {
        const [{ data: outgoing }, { data: incoming }] = await Promise.all([
          supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user.id)
            .eq('status', 'accepted')
            .in('following_id', userIds),
          supabase
            .from('user_follows')
            .select('follower_id')
            .eq('following_id', user.id)
            .eq('status', 'accepted')
            .in('follower_id', userIds),
        ]);

        const outgoingSet = new Set((outgoing || []).map((item) => item.following_id));
        const mutualFriends = new Set(
          (incoming || [])
            .map((item) => item.follower_id)
            .filter((id) => outgoingSet.has(id))
        );
        setFriendIds(mutualFriends);
      } else {
        setFriendIds(new Set());
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user || followLoadingIds.has(targetUserId)) return;

    setFollowLoadingIds((prev) => new Set(prev).add(targetUserId));
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: 'pending'
        });

      if (error && error.code !== '23505') throw error;
      toast({
        title: 'Demande envoyée',
        description: "Votre demande d'abonnement a ete envoyee"
      });
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer la demande",
        variant: 'destructive'
      });
    } finally {
      setFollowLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleProfileClick = (userId: string) => {
    if (userId && userId !== user?.id) {
      navigate(`/profile/${userId}`);
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
      <div className="bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-start p-8 pt-20 text-center flex-1 min-h-0 h-full">
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
    <>
    <div className="bg-white">
      {profiles.map((profile, index) => {
        const canOpen = friendIds.has(profile.user_id);
        return (
          <div key={profile.user_id} className="relative">
            <div
              className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 transition-colors active:bg-secondary/60"
              onClick={() => handleProfileClick(profile.user_id)}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-foreground">{profile.display_name}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  Athlete · {profile.country || 'Ville a renseigner'}
                </p>
                <p className="text-[11px] text-muted-foreground/90">{profile.follower_count || 0} abonnes</p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (canOpen) {
                    void handleStartConversation(profile);
                  } else {
                    void handleFollow(profile.user_id);
                  }
                }}
                disabled={followLoadingIds.has(profile.user_id)}
                className={`h-7 rounded-full px-3 text-[11px] font-semibold transition-colors ${
                  canOpen
                    ? 'bg-secondary text-foreground active:bg-secondary/80'
                    : 'bg-[#2563EB] text-white active:bg-[#1D4ED8]'
                } disabled:opacity-60`}
              >
                {followLoadingIds.has(profile.user_id) ? '...' : canOpen ? 'Ouvrir' : 'Suivre'}
              </button>
            </div>

            {index < profiles.length - 1 && (
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-[62px] right-4 h-px bg-[linear-gradient(to_right,rgba(0,0,0,0),rgba(0,0,0,0.08)_10%,rgba(0,0,0,0.08)_90%,rgba(0,0,0,0))]"
              />
            )}
          </div>
        );
      })}
    </div>

    </>
  );
};
