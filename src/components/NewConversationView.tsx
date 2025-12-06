import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OnlineStatus } from "@/components/OnlineStatus";
import { ArrowLeft, Search, MessageCircle, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

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

  const displayedFriends = searchQuery.trim() ? searchResults : allFriends;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="h-full flex flex-col">
        {/* Premium Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border-b border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Nouveau message</h1>
                <p className="text-xs text-muted-foreground">Choisissez un ami</p>
              </div>
            </div>
          </div>
        </motion.div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Quick Suggestions - Recent Friends */}
            {recentFriends.length > 0 && !searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-medium text-muted-foreground">Amis récents</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {recentFriends.map((friend, index) => (
                    <motion.div
                      key={friend.user_id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onStartConversation(friend.user_id)}
                      className="flex flex-col items-center gap-2 cursor-pointer group"
                    >
                      <div className="relative">
                        <Avatar className="h-14 w-14 ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all duration-300">
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
                            {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus userId={friend.user_id} className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs text-center truncate w-16">
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
                  className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </motion.div>

            {/* All Friends List */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {searchQuery.trim() ? `Résultats (${displayedFriends.length})` : 'Tous les amis'}
              </h2>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-white/10 rounded" />
                        <div className="h-3 w-16 bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedFriends.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery.trim() ? "Aucun ami trouvé" : "Aucun ami pour le moment"}
                  </p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    Abonnez-vous à des utilisateurs pour leur envoyer des messages
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {displayedFriends.map((friend, index) => (
                    <motion.div
                      key={friend.user_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => onStartConversation(friend.user_id)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all duration-200"
                    >
                      <div className="relative">
                        <Avatar 
                          className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAvatarClick(friend.avatar_url, friend.username || friend.display_name || "Utilisateur");
                          }}
                        >
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                            {(friend.username || friend.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus userId={friend.user_id} className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.username || friend.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                      </div>
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Create Club Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={onCreateClub}
              className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 cursor-pointer hover:border-primary/40 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Besoin d'un groupe ?</p>
                  <p className="text-sm text-muted-foreground">Créez un club pour discuter à plusieurs</p>
                </div>
                <ArrowLeft className="h-5 w-5 text-muted-foreground rotate-180" />
              </div>
            </motion.div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
