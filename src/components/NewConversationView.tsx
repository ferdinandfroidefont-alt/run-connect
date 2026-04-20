import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "@/components/OnlineStatus";
import { ChevronLeft, Search, MessageCircle, Users, ChevronRight, X, RefreshCw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [selectedPreviewUserId, setSelectedPreviewUserId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadRecentFriends = async () => {
      if (!user) return;
      try {
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
          if (profiles) setRecentFriends(profiles);
        }
      } catch (error) {
        console.error('Error loading recent friends:', error);
      }
    };
    loadRecentFriends();
  }, [user]);

  useEffect(() => {
    const loadAllFriends = async () => {
      if (!user) return;
      try {
        setLoading(true);
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
          const mutualFriendIds = [...followingIds].filter(id => followerIds.has(id));

          if (mutualFriendIds.length > 0) {
            const { data: profiles } = await supabase.rpc('get_safe_public_profiles', {
              profile_user_ids: mutualFriendIds
            });
            if (profiles) setAllFriends(profiles);
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

      if (error) console.error('Error fetching suggestions:', error);

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
      const remainingSuggestions = suggestions.filter(
        s => !newDismissed.has(s.user_id) && !friendsSet.has(s.user_id)
      );
      if (remainingSuggestions.length < 3) {
        loadMoreSuggestions(newDismissed);
      }
    }
  };

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

  const scrollHideStyle = { scrollbarWidth: 'none' as const, msOverflowStyle: 'none' as const, WebkitOverflowScrolling: 'touch' as const };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/40"
          header={
            <div className="relative flex min-h-[56px] items-center justify-center px-4">
              <button
                onClick={onBack}
                className="absolute left-3 flex items-center gap-0.5 text-primary active:opacity-70"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Retour</span>
              </button>
              <h1 className="text-[17px] font-semibold text-foreground">Nouveau message</h1>
            </div>
          }
          scrollClassName="scroll-momentum overscroll-y-contain"
        >
          <div className="flex flex-col">
            {/* Search Bar - flush */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="px-4 py-3 bg-background"
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher un ami..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-[38px] text-[15px] bg-secondary/80 border-0 rounded-[10px] focus:bg-secondary"
                />
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {searchQuery.trim() ? (
                /* ── Search Results ── */
                <motion.div
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  <div className="px-4 py-2">
                    <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                      {displayedFriends.length} résultat{displayedFriends.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {displayedFriends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-[15px] text-muted-foreground">Aucun ami trouvé</p>
                    </div>
                  ) : (
                    <div className="bg-card">
                      {displayedFriends.map((friend, index) => (
                        <motion.div
                          key={friend.user_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => onStartConversation(friend.user_id)}
                          className="flex items-center gap-3 px-4 py-3 active:bg-secondary/80 cursor-pointer transition-colors border-b border-border/40 last:border-b-0"
                        >
                          <div className="relative">
                            <Avatar 
                              className="h-11 w-11"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAvatarClick(friend.avatar_url, friend.username || friend.display_name || "Utilisateur");
                              }}
                            >
                              <AvatarImage src={friend.avatar_url || ""} />
                              <AvatarFallback className="bg-secondary text-foreground text-[15px]">
                                {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <OnlineStatus userId={friend.user_id} className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-medium truncate text-foreground">
                              {friend.display_name || friend.username}
                            </p>
                            <p className="text-[13px] text-muted-foreground truncate">
                              @{friend.username}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* ── Default View ── */
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  {/* Recent Friends */}
                  {recentFriends.length > 0 && (
                    <div className="pt-2 pb-4">
                      <div className="px-4 pb-3">
                        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                          Récents
                        </p>
                      </div>
                      <div
                        className="flex gap-5 overflow-x-auto px-4"
                        style={scrollHideStyle}
                      >
                        {recentFriends.map((friend, index) => (
                          <motion.button
                            key={friend.user_id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.04 }}
                            onClick={() => onStartConversation(friend.user_id)}
                            className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
                          >
                            <div className="relative">
                              <Avatar className="h-[58px] w-[58px] ring-2 ring-border/60">
                                <AvatarImage src={friend.avatar_url || ""} />
                                <AvatarFallback className="bg-secondary text-foreground text-lg">
                                  {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <OnlineStatus userId={friend.user_id} className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[12px] text-foreground font-medium text-center truncate w-[60px]">
                              {(friend.display_name || friend.username || '').split(' ')[0]}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  <div className="border-t border-border/40">
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                          Suggestions
                        </p>
                      </div>
                      <button
                        onClick={loadSuggestions}
                        className="text-[13px] text-primary flex items-center gap-1 active:opacity-70"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>

                    {suggestionsLoading ? (
                      <div className="flex gap-4 overflow-x-auto px-4 pb-4" style={scrollHideStyle}>
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                            <div className="h-[72px] w-[72px] rounded-2xl bg-secondary animate-pulse" />
                            <div className="h-2.5 w-14 rounded-full bg-secondary animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : visibleSuggestions.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-6 mx-4 bg-secondary/50 rounded-xl">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[14px] text-muted-foreground">Aucune suggestion</span>
                      </div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto px-4 pb-4" style={scrollHideStyle}>
                        {visibleSuggestions.map((profile) => (
                          <motion.button
                            key={profile.user_id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setSelectedPreviewUserId(profile.user_id)}
                            className="relative flex flex-col items-center shrink-0 active:scale-95 transition-transform"
                          >
                            {/* Dismiss */}
                            <button
                              onClick={(e) => dismissSuggestion(profile.user_id, e)}
                              className="absolute -top-1 -right-1 z-10 h-5 w-5 rounded-full bg-background/90 backdrop-blur-sm border border-border/60 flex items-center justify-center active:bg-secondary"
                            >
                              <X className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>

                            {/* Card */}
                            <div className="w-[76px] flex flex-col items-center gap-1.5 pt-1">
                              <div className="relative">
                                <div className="p-[2px] rounded-2xl bg-gradient-to-br from-primary/80 to-primary/30">
                                  <Avatar className="h-[60px] w-[60px] rounded-2xl border-2 border-background">
                                    <AvatarImage src={profile.avatar_url} className="rounded-xl" />
                                    <AvatarFallback className="bg-secondary text-[17px] font-medium rounded-xl">
                                      {(profile.display_name || profile.username)?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </div>
                              <span className="text-[12px] text-foreground font-medium max-w-full truncate">
                                {profile.display_name?.split(' ')[0] || profile.username}
                              </span>
                              <span className="text-[10px] text-muted-foreground max-w-full truncate -mt-1">
                                {getSourceLabel(profile.source, profile.mutual_friends_count)}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* All Friends List */}
                  <div className="border-t border-border/40">
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                        Tous les amis
                      </p>
                    </div>

                    {loading ? (
                      <div className="bg-card">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                            <div className="h-11 w-11 rounded-full bg-secondary animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3.5 w-28 rounded-full bg-secondary animate-pulse" />
                              <div className="h-3 w-20 rounded-full bg-secondary animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : allFriends.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-[15px] text-muted-foreground">Aucun ami pour le moment</p>
                      </div>
                    ) : (
                      <div className="bg-card">
                        {allFriends.map((friend, index) => (
                          <motion.div
                            key={friend.user_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => onStartConversation(friend.user_id)}
                            className="flex items-center gap-3 px-4 py-3 active:bg-secondary/80 cursor-pointer transition-colors border-b border-border/40 last:border-b-0"
                          >
                            <div className="relative">
                              <Avatar className="h-11 w-11">
                                <AvatarImage src={friend.avatar_url || ""} />
                                <AvatarFallback className="bg-secondary text-foreground text-[15px]">
                                  {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <OnlineStatus userId={friend.user_id} className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-medium truncate text-foreground">
                                {friend.display_name || friend.username}
                              </p>
                              <p className="text-[13px] text-muted-foreground truncate">
                                @{friend.username}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Create Club */}
                  <div className="border-t border-border/40 bg-card">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      onClick={onCreateClub}
                      className="flex items-center gap-3.5 px-4 py-3.5 active:bg-secondary/80 cursor-pointer transition-colors"
                    >
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-foreground">Créer un club</p>
                        <p className="text-[13px] text-muted-foreground">Discuter à plusieurs</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
