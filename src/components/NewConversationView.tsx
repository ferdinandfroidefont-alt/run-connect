import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { OnlineStatus } from "@/components/OnlineStatus";
import { ChevronLeft, Search, MessageCircle, Users, ChevronRight, X, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

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

interface NewConversationViewProps {
  onBack: () => void;
  onStartConversation: (userId: string) => void;
  onCreateClub: () => void;
  onAvatarClick: (avatarUrl: string | null, username: string) => void;
}

export const NewConversationView = ({
  onBack,
  onStartConversation,
  onCreateClub,
  onAvatarClick
}: NewConversationViewProps) => {
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [recentFriends, setRecentFriends] = useState<Profile[]>([]);
  const [allFriends, setAllFriends] = useState<Profile[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile suggestions state
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [selectedPreviewUserId, setSelectedPreviewUserId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());


  // Load recent friends (based on recent conversations)
  useEffect(() => {
    const loadRecentFriends = async () => {
      if (!user) return;

      try {
        // Get recent conversations to find recent friends
        const { data: recentConvs } = await supabase
          .from('conversations')
          .select('participant_1, participant_2, updated_at')
          .eq('is_group', false)
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .limit(8);

        if (recentConvs && recentConvs.length > 0) {
          const recentUserIds = recentConvs.map(conv => 
            conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
          );

          const { data: profiles } = await supabase.rpc('get_safe_public_profiles', {
            profile_user_ids: recentUserIds
          });

          if (profiles) {
            setRecentFriends(profiles);
          }
        }
      } catch (error) {
        console.error('Error loading recent friends:', error);
      }
    };

    loadRecentFriends();
  }, [user]);

  // Load all friends
  useEffect(() => {
    const loadAllFriends = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get all mutual friends (accepted follows both ways)
        const { data: followingData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const { data: followersData } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', user.id)
          .eq('status', 'accepted');

        if (followingData && followersData) {
          const followingIds = new Set(followingData.map(f => f.following_id));
          const followerIds = new Set(followersData.map(f => f.follower_id));
          
          // Mutual friends (both following each other)
          const mutualFriendIds = [...followingIds].filter(id => followerIds.has(id));

          if (mutualFriendIds.length > 0) {
            const { data: profiles } = await supabase.rpc('get_safe_public_profiles', {
              profile_user_ids: mutualFriendIds
            });

            if (profiles) {
              setAllFriends(profiles);
            }
          }
        }
      } catch (error) {
        console.error('Error loading all friends:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllFriends();
  }, [user]);

  // Search friends
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = allFriends.filter(friend => 
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filtered);
  }, [searchQuery, allFriends]);

  // Load profile suggestions
  const loadSuggestions = async () => {
    if (!user) return;
    
    try {
      setSuggestionsLoading(true);
      
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
        // Fetch active users (with or without avatar)
        const { data: popularUsers } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .neq('user_id', user.id)
          .not('username', 'is', null)
          .order('last_seen', { ascending: false })
          .limit(30);

        if (popularUsers && popularUsers.length > 0) {
          filteredSuggestions = popularUsers
            .filter(p => p.user_id && !friendIds.has(p.user_id) && !dismissed.has(p.user_id))
            .map(p => ({
              user_id: p.user_id!,
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
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadSuggestions();
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
    } else {
      // Check if we need to load more suggestions after dismissal
      const remainingSuggestions = suggestions.filter(
        s => !newDismissed.has(s.user_id) && !friendsSet.has(s.user_id)
      );
      if (remainingSuggestions.length < 3) {
        loadMoreSuggestions(newDismissed);
      }
    }
  };

  // Load more suggestions when running low
  const loadMoreSuggestions = async (currentDismissed: Set<string>) => {
    if (!user) return;
    
    try {
      const { data: popularUsers } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .neq('user_id', user.id)
        .not('username', 'is', null)
        .order('last_seen', { ascending: false })
        .limit(50);

      if (popularUsers && popularUsers.length > 0) {
        const existingIds = new Set(suggestions.map(s => s.user_id));
        const newSuggestions = popularUsers
          .filter(p => 
            !friendsSet.has(p.user_id!) && 
            !currentDismissed.has(p.user_id!) &&
            !existingIds.has(p.user_id!)
          )
          .map(p => ({
            user_id: p.user_id!,
            username: p.username || 'Utilisateur',
            display_name: p.display_name || p.username || 'Utilisateur',
            avatar_url: p.avatar_url || '',
            mutual_friends_count: 0,
            source: 'popular'
          })) as ProfileSuggestion[];

        if (newSuggestions.length > 0) {
          setSuggestions(prev => [...prev, ...newSuggestions]);
        }
      }
    } catch (error) {
      console.error('Error loading more suggestions:', error);
    }
  };

  const visibleSuggestions = suggestions.filter(
    s => !dismissedIds.has(s.user_id) && !friendsSet.has(s.user_id)
  );

  const displayedFriends = searchQuery.trim() ? searchResults : allFriends;

  return (
    <div className="fixed inset-0 z-50 bg-secondary">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0 border-b border-border bg-card"
          header={
            <div className="relative flex min-h-[60px] items-center justify-center px-4">
              <button
                onClick={onBack}
                className="absolute left-4 flex items-center gap-1 text-primary active:opacity-70"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Retour</span>
              </button>
              <h1 className="text-[17px] font-semibold text-foreground">Nouveau message</h1>
            </div>
          }
          scrollClassName="scroll-momentum overscroll-y-contain"
        >
          <div className="space-y-6 p-4">
            {/* Quick Suggestions - Recent Friends Carousel */}
            {recentFriends.length > 0 && !searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground">Amis récents</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {recentFriends.map((friend, index) => (
                    <motion.div
                      key={friend.user_id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onStartConversation(friend.user_id)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0"
                    >
                      <div className="relative">
                        <Avatar className="h-16 w-16 border-2 border-border group-hover:border-primary transition-all duration-300">
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-secondary text-foreground text-lg">
                            {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus userId={friend.user_id} className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] text-center truncate w-16 text-foreground font-medium">
                        {friend.username || friend.display_name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un ami..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-card border-border rounded-[10px] focus:border-primary focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </motion.div>

            {/* Profile Suggestions Carousel */}
            {!searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground">Suggestions</h2>
                  <button
                    onClick={loadSuggestions}
                    className="text-[13px] text-primary flex items-center gap-1 active:opacity-70"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rafraîchir
                  </button>
                </div>

                {suggestionsLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                        <div className="h-2 w-12 rounded bg-muted animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : visibleSuggestions.length === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-4 bg-card rounded-[10px] border border-border">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[15px] text-muted-foreground">Chargement des suggestions...</span>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {visibleSuggestions.map((profile) => (
                      <button
                        key={profile.user_id}
                        onClick={() => setSelectedPreviewUserId(profile.user_id)}
                        className="flex flex-col items-center gap-1 min-w-fit relative active:opacity-70 transition-opacity flex-shrink-0"
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
                )}
              </motion.div>
            )}

            {/* Friends List when searching */}
            {searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  Résultats ({displayedFriends.length})
                </h2>
                
                {displayedFriends.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">Aucun ami trouvé</p>
                  </div>
                ) : (
                  <div className="bg-card rounded-[10px] border border-border overflow-hidden">
                    {displayedFriends.map((friend, index) => (
                      <motion.div
                        key={friend.user_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => onStartConversation(friend.user_id)}
                        className={`flex items-center gap-3 p-3 hover:bg-secondary cursor-pointer transition-all duration-200 ${
                          index !== displayedFriends.length - 1 ? 'border-b border-border' : ''
                        }`}
                      >
                        <div className="relative">
                          <Avatar 
                            className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAvatarClick(friend.avatar_url, friend.username || friend.display_name || "Utilisateur");
                            }}
                          >
                            <AvatarImage src={friend.avatar_url || ""} />
                            <AvatarFallback className="bg-secondary text-foreground">
                              {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <OnlineStatus userId={friend.user_id} className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">{friend.username || friend.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{friend.username}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Create Club Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={onCreateClub}
              className="bg-card rounded-[10px] border border-border p-4 cursor-pointer hover:bg-secondary transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Besoin d'un groupe ?</p>
                  <p className="text-sm text-muted-foreground">Créez un club pour discuter à plusieurs</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </motion.div>
          </div>
        </IosFixedPageHeaderShell>
      </div>

      {selectedPreviewUserId && (
        <ProfilePreviewDialog
          userId={selectedPreviewUserId}
          onClose={() => setSelectedPreviewUserId(null)}
        />
      )}
    </div>
  );
};
