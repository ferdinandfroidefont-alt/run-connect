import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  gradientForSearchLetter,
  messageSearchResultCardStyle,
  MESSAGE_SEARCH_MAQUETTE_BLUE,
} from '@/lib/messageSearchMaquette';

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
            <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
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
      <div className="flex flex-col items-center px-8 py-16 text-center">
        <div
          className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#F2F2F7]"
          aria-hidden
        >
          <User className="h-9 w-9 text-[#8E8E93]" strokeWidth={1.8} />
        </div>
        <p className="m-0 text-[19px] font-extrabold tracking-tight text-[#0A0F1F]">Aucun profil trouvé</p>
        <p className="mb-0 mt-1.5 max-w-[280px] text-[15px] leading-snug text-[#8E8E93]">
          Aucun résultat pour « {searchQuery} »
        </p>
      </div>
    );
  }

  const letterFor = (profile: Profile) =>
    (profile.display_name || profile.username || "?").trim()[0] ?? "?";

  return (
    <div className="space-y-2 px-3 pb-6 pt-3">
      {profiles.map((profile) => {
        const isFriend = friendIds.has(profile.user_id);
        const initial = letterFor(profile).toUpperCase();
        const subtitleSuffix = profile.country?.trim() || "Athlète";

        return (
          <div
            key={profile.user_id}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-transform active:scale-[0.99]"
            style={messageSearchResultCardStyle}
            onClick={() => handleProfileClick(profile.user_id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleProfileClick(profile.user_id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="relative h-[50px] w-[50px] shrink-0">
              {profile.avatar_url ? (
                <Avatar className="h-[50px] w-[50px] border-0 shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
                  <AvatarImage src={profile.avatar_url} className="object-cover" />
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
                {profile.display_name}
              </p>
              <p className="m-0 mt-0.5 truncate text-[13px] font-semibold text-[#8E8E93]">
                @{profile.username}
                <span className="opacity-60"> · </span>
                {subtitleSuffix}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isFriend) void handleFollow(profile.user_id);
              }}
              disabled={isFriend || followLoadingIds.has(profile.user_id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold tracking-tight transition-transform active:scale-95 ${
                isFriend ? "text-[#0A0F1F]" : "text-white shadow-[0_3px_10px_rgba(0,122,255,0.25)]"
              } disabled:opacity-60`}
              style={{
                background: isFriend ? "#F2F2F7" : MESSAGE_SEARCH_MAQUETTE_BLUE,
              }}
            >
              {followLoadingIds.has(profile.user_id) ? "…" : isFriend ? "Ami" : "Suivre"}
            </button>
          </div>
        );
      })}
    </div>
  );
};
