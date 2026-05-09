import React, { useState, useEffect, useMemo } from 'react';
import { Search, Lock, Check, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmojiBadge } from '@/components/apple';
import { cn } from '@/lib/utils';

export type VisibilityType = 'friends' | 'club' | 'public';

interface Friend {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface VisibilitySelectorProps {
  visibilityType: VisibilityType;
  hiddenFromUsers: string[];
  isPremium: boolean;
  onVisibilityChange: (type: VisibilityType) => void;
  onHiddenUsersChange: (userIds: string[]) => void;
  clubId?: string | null;
  /** N’affiche que la section « masquer certains amis » (liste déroulante). */
  friendsHiddenSectionOnly?: boolean;
  /** Fusionné dans un bloc parent continu (sans cartes imbriquées). */
  embedded?: boolean;
}

const VISIBILITY_OPTIONS = [
  {
    value: 'friends' as VisibilityType,
    label: 'Amis uniquement',
    description: 'Visible par vos amis',
    emoji: '👥',
    badgeClass: 'bg-[#34C759]',
    recommended: true,
    premium: false,
  },
  {
    value: 'club' as VisibilityType,
    label: 'Club',
    description: 'Visible par les membres du club',
    emoji: '🏢',
    badgeClass: 'bg-[#0A66D0]',
    recommended: false,
    premium: false,
  },
  {
    value: 'public' as VisibilityType,
    label: 'Public',
    description: 'Visible localement dans Découvrir',
    emoji: '🌐',
    badgeClass: 'bg-[#FF9500]',
    recommended: false,
    premium: true,
  },
];

export const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  visibilityType,
  hiddenFromUsers,
  isPremium,
  onVisibilityChange,
  onHiddenUsersChange,
  clubId,
  friendsHiddenSectionOnly = false,
  embedded = false,
}) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Get accepted friendships where current user is follower
        const { data: following } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        // Get accepted friendships where current user is being followed
        const { data: followers } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', user.id)
          .eq('status', 'accepted');

        // Get mutual friends (both directions accepted)
        const followingIds = following?.map(f => f.following_id) || [];
        const followerIds = followers?.map(f => f.follower_id) || [];
        const mutualFriendIds = followingIds.filter(id => followerIds.includes(id));

        if (mutualFriendIds.length === 0) {
          setFriends([]);
          return;
        }

        // Fetch friend profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', mutualFriendIds);

        setFriends(
          profiles?.map(p => ({
            user_id: p.user_id || '',
            display_name: p.display_name || p.username || 'Utilisateur',
            username: p.username || '',
            avatar_url: p.avatar_url,
          })) || []
        );
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  // Filter friends by search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter(
      friend =>
        friend.display_name.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const toggleHiddenUser = (userId: string) => {
    if (hiddenFromUsers.includes(userId)) {
      onHiddenUsersChange(hiddenFromUsers.filter(id => id !== userId));
    } else {
      onHiddenUsersChange([...hiddenFromUsers, userId]);
    }
  };

  const handleVisibilitySelect = (type: VisibilityType) => {
    // Check club requirement
    if (type === 'club' && !clubId) {
      return;
    }
    onVisibilityChange(type);
  };

  const hiddenCount = hiddenFromUsers.length;

  if (friendsHiddenSectionOnly) {
    return (
      <>
        {visibilityType === 'friends' && (
          <>
            <div className="flex items-center gap-2 px-1 pt-1">
              <EmojiBadge emoji="🙈" className="bg-[#AF52DE]" />
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Masquer pour (optionnel)
              </div>
            </div>

            <div
              className={cn(
                'overflow-hidden rounded-xl bg-card',
                embedded && 'rounded-none border-0 bg-transparent'
              )}
            >
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un ami..."
                    className="h-10 border-0 bg-secondary pl-9"
                  />
                </div>
              </div>

              <div className="max-h-48 divide-y divide-border overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Chargement...
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'Aucun ami trouvé' : 'Aucun ami'}
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isHidden = hiddenFromUsers.includes(friend.user_id);
                    return (
                      <button
                        key={friend.user_id}
                        type="button"
                        onClick={() => toggleHiddenUser(friend.user_id)}
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-secondary/50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                            {friend.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{friend.display_name}</p>
                          {friend.username ? (
                            <p className="truncate text-sm text-muted-foreground">@{friend.username}</p>
                          ) : null}
                        </div>
                        <Checkbox
                          checked={isHidden}
                          onCheckedChange={() => toggleHiddenUser(friend.user_id)}
                          className="shrink-0"
                        />
                      </button>
                    );
                  })
                )}
              </div>

              {hiddenCount > 0 && (
                <div className="border-t border-border bg-secondary/30 p-3">
                  <p className="text-center text-sm text-muted-foreground">
                    {hiddenCount} personne{hiddenCount > 1 ? 's' : ''} masquée{hiddenCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className={embedded ? 'divide-y divide-border/60' : 'space-y-4'}>
      <div className={cn('flex items-center gap-2', embedded ? 'px-4 py-3' : 'px-1')}>
        <EmojiBadge emoji="👁️" className="bg-[#5856D6]" />
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Qui peut voir
        </div>
      </div>

      {/* Visibility options - iOS grouped list style */}
      <div
        className={cn(
          'divide-y divide-border overflow-hidden',
          embedded ? 'rounded-none bg-transparent' : 'rounded-xl bg-card'
        )}
      >
        {VISIBILITY_OPTIONS.map((option) => {
          const isSelected = visibilityType === option.value;
          const isDisabled = 
            option.value === 'club' && !clubId;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleVisibilitySelect(option.value)}
              disabled={isDisabled}
              className={cn(
                "w-full flex items-center gap-3 p-4 text-left transition-colors",
                isDisabled ? "opacity-50 cursor-not-allowed" : "active:bg-secondary/50",
                isSelected && "bg-primary/5"
              )}
            >
              <EmojiBadge emoji={option.emoji} className={option.badgeClass} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium",
                    isDisabled && "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                  {option.recommended && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-0">
                      Recommandé
                    </Badge>
                  )}
                  {option.value === 'public' && isPremium && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      Portée illimitée
                    </Badge>
                  )}
                  {option.premium && !isPremium && option.value === 'public' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-0 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      Boost ou Premium
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {option.description}
                  {option.value === 'public' && !isPremium && ' (5 km par défaut)'}
                  {option.value === 'public' && isPremium && ' (illimité avec Premium)'}
                  {option.value === 'club' && !clubId && ' (sélectionnez un club)'}
                </p>
              </div>

              {/* Selection indicator */}
              <div className="shrink-0">
                {isDisabled ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Hidden users section - only show for friends visibility */}
      {visibilityType === 'friends' && friends.length > 0 && (
        <div className={embedded ? 'contents' : 'mt-6 space-y-4'}>
          <div className={cn('flex items-center gap-2', embedded ? 'px-4 py-3' : 'px-1')}>
            <EmojiBadge emoji="🙈" className="bg-[#AF52DE]" />
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Masquer pour (optionnel)
            </div>
          </div>

          <div
            className={cn(
              'overflow-hidden',
              embedded ? 'rounded-none bg-transparent' : 'rounded-xl bg-card'
            )}
          >
            {/* Search bar */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un ami..."
                  className="pl-9 h-10 bg-secondary border-0"
                />
              </div>
            </div>

            {/* Friends list */}
            <div className="max-h-48 overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Chargement...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'Aucun ami trouvé' : 'Aucun ami'}
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const isHidden = hiddenFromUsers.includes(friend.user_id);
                  return (
                    <button
                      key={friend.user_id}
                      type="button"
                      onClick={() => toggleHiddenUser(friend.user_id)}
                      className="w-full flex items-center gap-3 p-3 text-left active:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.display_name}</p>
                        {friend.username && (
                          <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
                        )}
                      </div>
                      <Checkbox
                        checked={isHidden}
                        onCheckedChange={() => toggleHiddenUser(friend.user_id)}
                        className="shrink-0"
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* Hidden count */}
            {hiddenCount > 0 && (
              <div className="p-3 border-t border-border bg-secondary/30">
                <p className="text-sm text-center text-muted-foreground">
                  {hiddenCount} personne{hiddenCount > 1 ? 's' : ''} masquée{hiddenCount > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
