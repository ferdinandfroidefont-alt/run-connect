import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "@/components/OnlineStatus";
import { ChevronLeft, Search, MessageCircle, Users, ChevronRight, X, RefreshCw } from "lucide-react";
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

const scrollHideStyle = {
  scrollbarWidth: 'none' as const,
  msOverflowStyle: 'none' as const,
  WebkitOverflowScrolling: 'touch' as const,
};

export const NewConversationView = ({
  onBack,
  onStartConversation,
  onCreateClub,
  onAvatarClick,
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
            profile_user_ids: recentUserIds,
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
              profile_user_ids: mutualFriendIds,
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
        suggestion_limit: 20,
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
          source: s.source,
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
              source: 'popular',
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

  const startConversationFromRow = (userId: string) => {
    onStartConversation(userId);
  };

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
            source: 'popular',
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
    <div className="fixed inset-0 z-50" style={{ backgroundColor: '#ffffff' }}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0"
          header={
            <div
              className="relative flex items-center justify-center"
              style={{
                minHeight: 44,
                paddingLeft: 16,
                paddingRight: 16,
                backgroundColor: 'rgba(255,255,255,0.85)',
                backdropFilter: 'saturate(180%) blur(20px)',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <button
                onClick={onBack}
                className="absolute left-3 flex items-center gap-0.5 active:opacity-70 transition-opacity"
                style={{ color: '#0066cc' }}
              >
                <ChevronLeft className="h-5 w-5" style={{ strokeWidth: 2 }} />
                <span style={{ fontSize: 17, letterSpacing: '-0.374px', fontWeight: 400 }}>Retour</span>
              </button>
              <h1 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>
                Nouveau message
              </h1>
            </div>
          }
          scrollClassName="scroll-momentum overscroll-y-contain"
        >
          <div className="flex flex-col">

            {/* ── Search Bar ── */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f5f5f7' }}>
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ width: 15, height: 15, color: '#7a7a7a' }}
                />
                <input
                  type="text"
                  placeholder="Rechercher un ami…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    paddingLeft: 40,
                    paddingRight: searchQuery ? 40 : 20,
                    fontSize: 17,
                    fontWeight: 400,
                    letterSpacing: '-0.374px',
                    color: '#1d1d1f',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 9999,
                    outline: 'none',
                  }}
                  className="placeholder:text-[#7a7a7a]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center active:opacity-70"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 9999,
                      backgroundColor: '#d2d2d7',
                    }}
                  >
                    <X style={{ width: 11, height: 11, color: '#ffffff' }} />
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {searchQuery.trim() ? (
                /* ── Search Results ── */
                <motion.div
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col"
                >
                  {/* Section header */}
                  <div style={{ padding: '20px 16px 8px', backgroundColor: '#f5f5f7' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px', color: '#7a7a7a' }}>
                      {displayedFriends.length} résultat{displayedFriends.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {displayedFriends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center" style={{ paddingTop: 64, paddingBottom: 64, gap: 12 }}>
                      <div
                        className="flex items-center justify-center"
                        style={{ width: 56, height: 56, borderRadius: 9999, backgroundColor: '#f5f5f7' }}
                      >
                        <MessageCircle style={{ width: 24, height: 24, color: '#7a7a7a' }} />
                      </div>
                      <p style={{ fontSize: 17, letterSpacing: '-0.374px', color: '#7a7a7a' }}>
                        Aucun ami trouvé
                      </p>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#ffffff' }}>
                      {displayedFriends.map((friend, index) => (
                        <motion.div
                          key={friend.user_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02, duration: 0.15 }}
                          onClick={() => startConversationFromRow(friend.user_id)}
                          className="flex items-center cursor-pointer active:bg-[#f5f5f7] transition-colors"
                          style={{ gap: 12, padding: '11px 16px', borderBottom: '1px solid #e0e0e0' }}
                        >
                          <div className="relative shrink-0">
                            <Avatar
                              className="h-11 w-11"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAvatarClick(friend.avatar_url, friend.username || friend.display_name || 'Utilisateur');
                              }}
                            >
                              <AvatarImage src={friend.avatar_url || ''} />
                              <AvatarFallback style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: 17 }}>
                                {(friend.username || friend.display_name || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <OnlineStatus userId={friend.user_id} className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>
                              {friend.display_name || friend.username}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, fontWeight: 400, letterSpacing: '-0.224px', color: '#7a7a7a' }}>
                              @{friend.username}
                            </p>
                          </div>
                          <ChevronRight style={{ width: 16, height: 16, color: '#e0e0e0', flexShrink: 0 }} />
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
                  transition={{ duration: 0.15 }}
                  className="flex flex-col"
                >

                  {/* ── Recent Friends ── */}
                  {recentFriends.length > 0 && (
                    <div style={{ paddingTop: 24, paddingBottom: 24, backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px', color: '#7a7a7a', padding: '0 16px 12px' }}>
                        Récents
                      </p>
                      <div
                        className="flex overflow-x-auto"
                        style={{ gap: 20, padding: '0 16px', ...scrollHideStyle }}
                      >
                        {recentFriends.map((friend, index) => (
                          <motion.button
                            key={friend.user_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.04, duration: 0.15 }}
                            onClick={() => onStartConversation(friend.user_id)}
                            className="flex flex-col items-center shrink-0 active:scale-95 transition-transform"
                            style={{ gap: 6 }}
                          >
                            <div className="relative">
                              <Avatar style={{ width: 58, height: 58 }}>
                                <AvatarImage src={friend.avatar_url || ''} />
                                <AvatarFallback style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: 20 }}>
                                  {(friend.username || friend.display_name || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <OnlineStatus userId={friend.user_id} className="w-3.5 h-3.5" />
                            </div>
                            <span
                              className="text-center truncate"
                              style={{ fontSize: 12, fontWeight: 400, letterSpacing: '-0.12px', color: '#1d1d1f', maxWidth: 60 }}
                            >
                              {(friend.display_name || friend.username || '').split(' ')[0]}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Suggestions ── */}
                  <div style={{ backgroundColor: '#f5f5f7', borderBottom: '1px solid #e0e0e0' }}>
                    <div className="flex items-center justify-between" style={{ padding: '20px 16px 12px' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px', color: '#7a7a7a' }}>
                        Suggestions
                      </p>
                      <button
                        onClick={loadSuggestions}
                        className="flex items-center gap-1 active:opacity-70 transition-opacity"
                        style={{ color: '#0066cc' }}
                      >
                        <RefreshCw style={{ width: 13, height: 13 }} />
                        <span style={{ fontSize: 14, letterSpacing: '-0.224px' }}>Actualiser</span>
                      </button>
                    </div>

                    {suggestionsLoading ? (
                      <div className="flex overflow-x-auto" style={{ gap: 12, padding: '0 16px 20px', ...scrollHideStyle }}>
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex flex-col items-center shrink-0" style={{ gap: 8 }}>
                            <div className="animate-pulse" style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: '#e0e0e0' }} />
                            <div className="animate-pulse" style={{ width: 48, height: 10, borderRadius: 9999, backgroundColor: '#e0e0e0' }} />
                          </div>
                        ))}
                      </div>
                    ) : visibleSuggestions.length === 0 ? (
                      <div
                        className="flex items-center justify-center"
                        style={{ margin: '0 16px 20px', padding: '20px 16px', borderRadius: 18, backgroundColor: '#ffffff', border: '1px solid #e0e0e0', gap: 8 }}
                      >
                        <Users style={{ width: 16, height: 16, color: '#7a7a7a' }} />
                        <span style={{ fontSize: 14, letterSpacing: '-0.224px', color: '#7a7a7a' }}>Aucune suggestion</span>
                      </div>
                    ) : (
                      <div className="flex overflow-x-auto" style={{ gap: 12, padding: '0 16px 20px', ...scrollHideStyle }}>
                        {visibleSuggestions.map((profile) => (
                          <motion.button
                            key={profile.user_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setSelectedPreviewUserId(profile.user_id)}
                            className="relative shrink-0 active:scale-95 transition-transform"
                          >
                            <button
                              onClick={(e) => dismissSuggestion(profile.user_id, e)}
                              className="absolute -top-1 -right-1 z-10 flex items-center justify-center active:opacity-70"
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 9999,
                                backgroundColor: '#7a7a7a',
                                border: '2px solid #f5f5f7',
                              }}
                            >
                              <X style={{ width: 10, height: 10, color: '#ffffff' }} />
                            </button>

                            <div
                              className="flex flex-col items-center"
                              style={{
                                width: 88,
                                padding: '16px 8px 12px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e0e0e0',
                                borderRadius: 18,
                                gap: 6,
                              }}
                            >
                              <Avatar style={{ width: 52, height: 52 }}>
                                <AvatarImage src={profile.avatar_url} />
                                <AvatarFallback style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: 17, fontWeight: 600 }}>
                                  {(profile.display_name || profile.username)?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className="truncate w-full text-center"
                                style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.12px', color: '#1d1d1f' }}
                              >
                                {profile.display_name?.split(' ')[0] || profile.username}
                              </span>
                              <span
                                className="truncate w-full text-center"
                                style={{ fontSize: 10, fontWeight: 400, letterSpacing: '-0.08px', color: '#7a7a7a', marginTop: -2 }}
                              >
                                {getSourceLabel(profile.source, profile.mutual_friends_count)}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── All Friends ── */}
                  <div>
                    <div style={{ padding: '20px 16px 8px', backgroundColor: '#f5f5f7', borderBottom: '1px solid #e0e0e0' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px', color: '#7a7a7a' }}>
                        Tous les amis
                      </p>
                    </div>

                    {loading ? (
                      <div style={{ backgroundColor: '#ffffff' }}>
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center"
                            style={{ gap: 12, padding: '11px 16px', borderBottom: '1px solid #e0e0e0' }}
                          >
                            <div className="animate-pulse shrink-0" style={{ width: 44, height: 44, borderRadius: 9999, backgroundColor: '#f5f5f7' }} />
                            <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="animate-pulse" style={{ height: 14, width: 120, borderRadius: 9999, backgroundColor: '#f5f5f7' }} />
                              <div className="animate-pulse" style={{ height: 12, width: 80, borderRadius: 9999, backgroundColor: '#f5f5f7' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : allFriends.length === 0 ? (
                      <div className="flex flex-col items-center justify-center" style={{ paddingTop: 48, paddingBottom: 48, gap: 12 }}>
                        <div
                          className="flex items-center justify-center"
                          style={{ width: 56, height: 56, borderRadius: 9999, backgroundColor: '#f5f5f7' }}
                        >
                          <Users style={{ width: 24, height: 24, color: '#7a7a7a' }} />
                        </div>
                        <p style={{ fontSize: 17, letterSpacing: '-0.374px', color: '#7a7a7a' }}>
                          Aucun ami pour le moment
                        </p>
                      </div>
                    ) : (
                      <div style={{ backgroundColor: '#ffffff' }}>
                        {allFriends.map((friend, index) => (
                          <motion.div
                            key={friend.user_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.02, duration: 0.15 }}
                            onClick={() => startConversationFromRow(friend.user_id)}
                            className="flex items-center cursor-pointer active:bg-[#f5f5f7] transition-colors"
                            style={{ gap: 12, padding: '11px 16px', borderBottom: '1px solid #e0e0e0' }}
                          >
                            <div className="relative shrink-0">
                              <Avatar style={{ width: 44, height: 44 }}>
                                <AvatarImage src={friend.avatar_url || ''} />
                                <AvatarFallback style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: 17 }}>
                                  {(friend.username || friend.display_name || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <OnlineStatus userId={friend.user_id} className="w-3 h-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>
                                {friend.display_name || friend.username}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, fontWeight: 400, letterSpacing: '-0.224px', color: '#7a7a7a' }}>
                                @{friend.username}
                              </p>
                            </div>
                            <ChevronRight style={{ width: 16, height: 16, color: '#e0e0e0', flexShrink: 0 }} />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Create Club ── */}
                  <div style={{ borderTop: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.2 }}
                      onClick={onCreateClub}
                      className="flex items-center cursor-pointer active:bg-[#f5f5f7] transition-colors"
                      style={{ gap: 12, padding: '11px 16px' }}
                    >
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 9999, backgroundColor: 'rgba(0,102,204,0.1)' }}
                      >
                        <Users style={{ width: 20, height: 20, color: '#0066cc' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>
                          Créer un club
                        </p>
                        <p style={{ fontSize: 14, fontWeight: 400, letterSpacing: '-0.224px', color: '#7a7a7a' }}>
                          Discuter à plusieurs
                        </p>
                      </div>
                      <ChevronRight style={{ width: 16, height: 16, color: '#e0e0e0', flexShrink: 0 }} />
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
