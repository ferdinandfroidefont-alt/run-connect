import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "@/components/OnlineStatus";
import { Search, MessageCircle, Users, ChevronRight, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { MessagesMaquetteSubpageShell } from "@/components/messages/MessagesMaquetteSubpageShell";

const ACTION_BLUE = "#007AFF";

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
    case "contacts":
      return "Contact";
    case "mutual_friends":
      return `${mutualCount} ami${mutualCount > 1 ? "s" : ""} en commun`;
    case "common_clubs":
      return "Même club";
    case "friends_of_friends":
      return "Ami d'ami";
    case "active_users":
      return "Actif";
    case "popular":
      return "Populaire";
    default:
      return "Suggéré";
  }
};

interface NewConversationViewProps {
  onBack: () => void;
  onStartConversation: (userId: string) => void;
  onAvatarClick: (avatarUrl: string | null, username: string) => void;
}

const scrollHideStyle = {
  scrollbarWidth: "none" as const,
  msOverflowStyle: "none" as const,
  WebkitOverflowScrolling: "touch" as const,
};

function RowDivider() {
  return <div className="ml-[68px] h-px bg-[#F2F2F7]" />;
}

export const NewConversationView = ({ onBack, onStartConversation, onAvatarClick }: NewConversationViewProps) => {
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
          .from("conversations")
          .select("participant_1, participant_2, updated_at")
          .eq("is_group", false)
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
          .order("updated_at", { ascending: false })
          .limit(8);

        if (recentConvs && recentConvs.length > 0) {
          const recentUserIds = recentConvs.map((conv) =>
            conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
          );
          const { data: profiles } = await supabase.rpc("get_safe_public_profiles", {
            profile_user_ids: recentUserIds,
          });
          if (profiles) setRecentFriends(profiles);
        }
      } catch (error) {
        console.error("Error loading recent friends:", error);
      }
    };
    void loadRecentFriends();
  }, [user]);

  useEffect(() => {
    const loadAllFriends = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data: followingData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .eq("status", "accepted");

        const { data: followersData } = await supabase
          .from("user_follows")
          .select("follower_id")
          .eq("following_id", user.id)
          .eq("status", "accepted");

        if (followingData && followersData) {
          const followingIds = new Set(followingData.map((f) => f.following_id));
          const followerIds = new Set(followersData.map((f) => f.follower_id));
          const mutualFriendIds = [...followingIds].filter((id) => followerIds.has(id));

          if (mutualFriendIds.length > 0) {
            const { data: profiles } = await supabase.rpc("get_safe_public_profiles", {
              profile_user_ids: mutualFriendIds,
            });
            if (profiles) setAllFriends(profiles as Profile[]);
          }
        }
      } catch (error) {
        console.error("Error loading all friends:", error);
      } finally {
        setLoading(false);
      }
    };
    void loadAllFriends();
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = allFriends.filter(
      (friend) =>
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
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .eq("status", "accepted");

      const friendIds = new Set(friendsData?.map((f) => f.following_id) || []);
      setFriendsSet(friendIds);

      const { data: dismissedData } = await supabase
        .from("dismissed_suggestions")
        .select("dismissed_user_id")
        .eq("user_id", user.id);

      const dismissed = new Set(dismissedData?.map((d) => d.dismissed_user_id) || []);
      setDismissedIds(dismissed);

      const { data, error } = await supabase.rpc("get_friend_suggestions_prioritized", {
        current_user_id: user.id,
        suggestion_limit: 20,
      });

      if (error) console.error("Error fetching suggestions:", error);

      let filteredSuggestions: ProfileSuggestion[] = (data || [])
        .filter((s: ProfileSuggestion) => !friendIds.has(s.user_id) && !dismissed.has(s.user_id))
        .map((s: ProfileSuggestion) => ({
          user_id: s.user_id,
          username: s.username,
          display_name: s.display_name,
          avatar_url: s.avatar_url,
          mutual_friends_count: s.mutual_friends_count || 0,
          source: s.source,
        }));

      if (filteredSuggestions.length === 0) {
        const { data: popularUsers } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .neq("user_id", user.id)
          .not("username", "is", null)
          .order("last_seen", { ascending: false })
          .limit(30);

        if (popularUsers && popularUsers.length > 0) {
          filteredSuggestions = popularUsers
            .filter((p) => p.user_id && !friendIds.has(p.user_id) && !dismissed.has(p.user_id))
            .map((p) => ({
              user_id: p.user_id!,
              username: p.username || "Utilisateur",
              display_name: p.display_name || p.username || "Utilisateur",
              avatar_url: p.avatar_url || "",
              mutual_friends_count: 0,
              source: "popular",
            })) as ProfileSuggestion[];
        }
      }
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadSuggestions();
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
      .from("dismissed_suggestions")
      .insert({ user_id: user.id, dismissed_user_id: userId });

    if (error) {
      console.error("Error dismissing suggestion:", error);
      setDismissedIds(dismissedIds);
    } else {
      const remainingSuggestions = suggestions.filter(
        (s) => !newDismissed.has(s.user_id) && !friendsSet.has(s.user_id)
      );
      if (remainingSuggestions.length < 3) {
        void loadMoreSuggestions(newDismissed);
      }
    }
  };

  const loadMoreSuggestions = async (currentDismissed: Set<string>) => {
    if (!user) return;
    try {
      const { data: popularUsers } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .neq("user_id", user.id)
        .not("username", "is", null)
        .order("last_seen", { ascending: false })
        .limit(50);

      if (popularUsers && popularUsers.length > 0) {
        const existingIds = new Set(suggestions.map((s) => s.user_id));
        const newSuggestions = popularUsers
          .filter(
            (p) =>
              !friendsSet.has(p.user_id!) &&
              !currentDismissed.has(p.user_id!) &&
              !existingIds.has(p.user_id!)
          )
          .map((p) => ({
            user_id: p.user_id!,
            username: p.username || "Utilisateur",
            display_name: p.display_name || p.username || "Utilisateur",
            avatar_url: p.avatar_url || "",
            mutual_friends_count: 0,
            source: "popular",
          })) as ProfileSuggestion[];

        if (newSuggestions.length > 0) {
          setSuggestions((prev) => [...prev, ...newSuggestions]);
        }
      }
    } catch (error) {
      console.error("Error loading more suggestions:", error);
    }
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedIds.has(s.user_id) && !friendsSet.has(s.user_id)
  );

  const displayedFriends = searchQuery.trim() ? searchResults : allFriends;

  const tree = (
    <MessagesMaquetteSubpageShell title="Nouveau message" titleSizePx={32} onBack={onBack}>
      {/* Recherche */}
      <div className="flex items-center gap-2 rounded-full bg-[#E8E8ED] px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-[#8E8E93]" strokeWidth={2.5} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un ami..."
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C7C7CC] active:opacity-80"
            aria-label="Effacer la recherche"
          >
            <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {searchQuery.trim() ? (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <h3 className="mb-3 mt-5 text-[20px] font-extrabold text-[#0A0F1F]">
              {displayedFriends.length} résultat{displayedFriends.length !== 1 ? "s" : ""}
            </h3>
            {displayedFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <MessageCircle className="h-6 w-6 text-[#8E8E93]" />
                </div>
                <p className="text-[17px] text-[#8E8E93]">Aucun ami trouvé</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {displayedFriends.map((friend, i) => (
                  <div key={friend.user_id}>
                    {i > 0 ? <RowDivider /> : null}
                    <button
                      type="button"
                      onClick={() => startConversationFromRow(friend.user_id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-[#F8F8F8]"
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          className="h-12 w-12"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAvatarClick(friend.avatar_url, friend.username || friend.display_name || "Utilisateur");
                          }}
                        >
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-[#E5E5EA] text-[16px] font-bold text-[#0A0F1F]">
                            {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus userId={friend.user_id} className="absolute bottom-0 right-0 h-3 w-3 border-2 border-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-bold text-[#0A0F1F]">
                          {friend.display_name || friend.username}
                        </p>
                        <p className="truncate text-[13px] text-[#8E8E93]">@{friend.username}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {recentFriends.length > 0 && (
              <>
                <h3 className="mb-3 mt-5 text-[20px] font-extrabold text-[#0A0F1F]">Récents</h3>
                <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1" style={scrollHideStyle}>
                  {recentFriends.map((friend) => (
                    <button
                      key={friend.user_id}
                      type="button"
                      onClick={() => onStartConversation(friend.user_id)}
                      className="flex min-w-0 flex-shrink-0 flex-col items-center active:scale-95"
                    >
                      <div className="relative">
                        <Avatar className="h-14 w-14 border-2 border-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-[#E5E5EA] text-[17px] font-bold text-[#0A0F1F]">
                            {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus userId={friend.user_id} className="absolute bottom-0 right-0 h-3 w-3 border-2 border-white" />
                      </div>
                      <p className="mt-1.5 max-w-[72px] truncate text-center text-[13px] font-semibold text-[#0A0F1F]">
                        {(friend.display_name || friend.username || "").split(" ")[0]}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mb-3 mt-6 flex items-center justify-between">
              <h3 className="text-[20px] font-extrabold text-[#0A0F1F]">Suggestions</h3>
              <button
                type="button"
                onClick={() => void loadSuggestions()}
                className="flex items-center gap-1 text-[15px] font-semibold active:opacity-70"
                style={{ color: ACTION_BLUE }}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2.4} />
                Actualiser
              </button>
            </div>

            {suggestionsLoading ? (
              <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1" style={scrollHideStyle}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex w-28 flex-shrink-0 flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-[#E5E5EA]" />
                    <div className="h-3 w-16 animate-pulse rounded-full bg-[#E5E5EA]" />
                  </div>
                ))}
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <Users className="h-4 w-4 text-[#8E8E93]" />
                <span className="text-[15px] text-[#8E8E93]">Aucune suggestion</span>
              </div>
            ) : (
              <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1" style={scrollHideStyle}>
                {visibleSuggestions.map((profile) => (
                  <div
                    key={profile.user_id}
                    className="relative w-28 flex-shrink-0 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <button
                      type="button"
                      onClick={(e) => dismissSuggestion(profile.user_id, e)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#C7C7CC] active:opacity-80"
                      aria-label="Masquer"
                    >
                      <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewUserId(profile.user_id)}
                      className="flex w-full flex-col items-center"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="bg-[#E5E5EA] text-[15px] font-bold text-[#0A0F1F]">
                          {(profile.display_name || profile.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-2 w-full truncate text-center text-[14px] font-bold text-[#0A0F1F]">
                        {profile.display_name?.split(" ")[0] || profile.username}
                      </p>
                      <p className="w-full truncate text-center text-[12px] text-[#8E8E93]">
                        {getSourceLabel(profile.source, profile.mutual_friends_count)}
                      </p>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h3 className="mb-2 mt-6 text-[20px] font-extrabold text-[#0A0F1F]">Tous les amis</h3>
            {loading ? (
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    {i > 0 ? <RowDivider /> : null}
                    <div className="flex items-center gap-3 px-3 py-3">
                      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-[#E5E5EA]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 animate-pulse rounded-full bg-[#E5E5EA]" />
                        <div className="h-3 w-24 animate-pulse rounded-full bg-[#E5E5EA]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : allFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <Users className="h-6 w-6 text-[#8E8E93]" />
                </div>
                <p className="text-[17px] text-[#8E8E93]">Aucun ami pour le moment</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {allFriends.map((friend, i) => (
                  <div key={friend.user_id}>
                    {i > 0 ? <RowDivider /> : null}
                    <button
                      type="button"
                      onClick={() => startConversationFromRow(friend.user_id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-[#F8F8F8]"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-[#E5E5EA] text-[16px] font-bold text-[#0A0F1F]">
                            {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus userId={friend.user_id} className="absolute bottom-0 right-0 h-3 w-3 border-2 border-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-bold text-[#0A0F1F]">
                          {friend.display_name || friend.username}
                        </p>
                        <p className="truncate text-[13px] text-[#8E8E93]">@{friend.username}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {selectedPreviewUserId ? (
        <ProfilePreviewDialog userId={selectedPreviewUserId} onClose={() => setSelectedPreviewUserId(null)} />
      ) : null}
    </MessagesMaquetteSubpageShell>
  );

  if (typeof document === "undefined") return null;
  return createPortal(tree, document.body);
};
