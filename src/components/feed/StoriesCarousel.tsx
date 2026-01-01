import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';
import { X, Users, RefreshCw } from 'lucide-react';

interface ProfileSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  mutual_friends_count: number;
  source: string;
}

const getSourceLabel = (source: string, mutualCount: number): string => {
  switch (source) {
    case 'contacts':
      return 'Contact';
    case 'mutual_friends':
      return `${mutualCount} ami${mutualCount > 1 ? 's' : ''} en commun`;
    case 'common_clubs':
      return 'Même club';
    case 'friends_of_friends':
      return 'Ami d\'ami';
    case 'active_users':
      return 'Actif';
    case 'popular':
      return 'Populaire';
    default:
      return 'Suggéré';
  }
};

export const StoriesCarousel = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: friendsData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted');

      const friendIds = new Set(friendsData?.map(f => f.following_id) || []);
      setFriendsSet(friendIds);

      const { data: dismissedData } = await supabase
        .from('dismissed_suggestions')
        .select('dismissed_user_id')
        .eq('user_id', user.id);

      const dismissed = new Set(dismissedData?.map(d => d.dismissed_user_id) || []);
      setDismissedIds(dismissed);

      const { data, error } = await supabase.rpc('get_friend_suggestions_prioritized', {
        current_user_id: user.id,
        suggestion_limit: 20
      });

      if (error) {
        console.error('Error fetching suggestions:', error);
      }

      let filteredSuggestions: ProfileSuggestion[] = (data || [])
        .filter((s: ProfileSuggestion) => !friendIds.has(s.user_id) && !dismissed.has(s.user_id))
        .map((s: any) => ({
          user_id: s.user_id,
          username: s.username,
          display_name: s.display_name,
          avatar_url: s.avatar_url,
          mutual_friends_count: s.mutual_friends_count || 0,
          source: s.source
        }));

      if (filteredSuggestions.length === 0) {
        const { data: popularUsers } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .neq('user_id', user.id)
          .not('avatar_url', 'is', null)
          .not('username', 'is', null)
          .order('created_at', { ascending: false })
          .limit(15);

        if (popularUsers && popularUsers.length > 0) {
          filteredSuggestions = popularUsers
            .filter(p => !friendIds.has(p.user_id) && !dismissed.has(p.user_id))
            .map(p => ({
              user_id: p.user_id,
              username: p.username || 'Utilisateur',
              display_name: p.display_name || p.username || 'Utilisateur',
              avatar_url: p.avatar_url || '',
              mutual_friends_count: 0,
              source: 'popular'
            })) as ProfileSuggestion[];
        }
      }

      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const dismissSuggestion = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const newDismissed = new Set([...dismissedIds, userId]);
    setDismissedIds(newDismissed);

    const { error } = await supabase
      .from('dismissed_suggestions')
      .insert({ user_id: user.id, dismissed_user_id: userId });

    if (error) {
      console.error('Error dismissing suggestion:', error);
      setDismissedIds(dismissedIds);
    }
  };

  const visibleSuggestions = suggestions.filter(
    s => !dismissedIds.has(s.user_id) && !friendsSet.has(s.user_id)
  );

  if (loading) {
    return (
      <div className="flex gap-4 px-4 py-3 overflow-x-auto">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-[60px] w-[60px] rounded-full bg-secondary animate-pulse" />
            <div className="h-2 w-10 rounded bg-secondary animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <div className="py-4 px-4">
        <div className="flex items-center justify-center gap-3 py-4 bg-secondary rounded-[10px]">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-[15px] text-muted-foreground">Aucune nouvelle suggestion</span>
          <button
            onClick={loadData}
            className="h-8 px-3 text-[13px] text-primary flex items-center gap-1 active:opacity-70"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Rafraîchir
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="py-3">
        <div className="flex gap-3 px-4 overflow-x-auto">
          {visibleSuggestions.map((profile) => (
            <button
              key={profile.user_id}
              onClick={() => setSelectedUserId(profile.user_id)}
              className="flex flex-col items-center gap-1 min-w-fit relative active:opacity-70 transition-opacity"
            >
              {/* Dismiss button */}
              <button
                onClick={(e) => dismissSuggestion(profile.user_id, e)}
                className="absolute -top-0.5 -right-0.5 z-10 h-5 w-5 rounded-full bg-secondary border border-border flex items-center justify-center active:bg-muted"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>

              {/* Avatar with blue ring */}
              <div className="p-[2px] bg-primary rounded-full">
                <Avatar className="h-[56px] w-[56px] border-2 border-background">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-secondary text-[15px] font-medium">
                    {(profile.display_name || profile.username)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name */}
              <span className="text-[11px] text-foreground max-w-[60px] truncate">
                {profile.display_name?.split(' ')[0] || profile.username}
              </span>

              {/* Source label */}
              <span className="text-[9px] text-muted-foreground max-w-[70px] truncate">
                {getSourceLabel(profile.source, profile.mutual_friends_count)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedUserId && (
        <ProfilePreviewDialog
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
};