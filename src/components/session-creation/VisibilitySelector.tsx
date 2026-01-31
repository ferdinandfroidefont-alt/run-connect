import React, { useState, useEffect, useMemo } from 'react';
import { Users, Globe, Building2, Search, Lock, Check, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
}

const VISIBILITY_OPTIONS = [
  {
    value: 'friends' as VisibilityType,
    label: 'Amis uniquement',
    description: 'Visible par vos amis',
    icon: Users,
    color: 'bg-green-500',
    iconColor: 'text-green-500',
    recommended: true,
    premium: false,
  },
  {
    value: 'club' as VisibilityType,
    label: 'Club',
    description: 'Visible par les membres du club',
    icon: Building2,
    color: 'bg-blue-500',
    iconColor: 'text-blue-500',
    recommended: false,
    premium: false,
  },
  {
    value: 'public' as VisibilityType,
    label: 'Tout le monde',
    description: 'Visible dans Découvrir',
    icon: Globe,
    color: 'bg-orange-500',
    iconColor: 'text-orange-500',
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
    // Check premium requirement
    if (type === 'public' && !isPremium) {
      return;
    }
    // Check club requirement
    if (type === 'club' && !clubId) {
      return;
    }
    onVisibilityChange(type);
  };

  const hiddenCount = hiddenFromUsers.length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
        Qui peut voir
      </div>

      {/* Visibility options - iOS grouped list style */}
      <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
        {VISIBILITY_OPTIONS.map((option) => {
          const isSelected = visibilityType === option.value;
          const isDisabled = 
            (option.value === 'public' && !isPremium) ||
            (option.value === 'club' && !clubId);

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
              {/* Icon */}
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                option.color + "/10"
              )}>
                <option.icon className={cn("w-5 h-5", option.iconColor)} />
              </div>

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
                  {option.premium && !isPremium && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-0 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {option.description}
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
        <>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mt-6">
            Masquer pour (optionnel)
          </div>

          <div className="bg-card rounded-xl overflow-hidden">
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
        </>
      )}
    </div>
  );
};
