import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, User, UserPlus, UserCheck, Lock, MessageCircle } from "lucide-react";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  follower_count?: number;
  following_count?: number;
}

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (userId: string) => void;
}

export const UserSearchDialog = ({ open, onOpenChange, onStartConversation }: UserSearchDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<string | null>(null);
  const [areFriends, setAreFriends] = useState(false);
  const [loading, setLoading] = useState(false);

  // Search for users and load their stats
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_safe_public_profiles', {
        profile_user_ids: [] // Will be populated by search
      });

      // If we need to search, do a limited search first to get IDs
      const { data: searchData, error: searchError } = await supabase
        .from('profiles')
        .select('user_id')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .eq('is_private', false) // Only search public profiles
        .limit(20);

      if (searchError) throw searchError;

      const userIds = searchData?.map(item => item.user_id) || [];
      
      if (userIds.length === 0) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      // Get safe public profiles for found users
      const { data: profilesData, error: profilesError } = await supabase.rpc('get_safe_public_profiles', {
        profile_user_ids: userIds
      });

      if (profilesError) throw profilesError;

      // Load follower counts for each profile
      const profilesWithStats = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: followerData } = await supabase.rpc('get_follower_count', { 
            profile_user_id: profile.user_id 
          });
          const { data: followingData } = await supabase.rpc('get_following_count', { 
            profile_user_id: profile.user_id 
          });
          
          return {
            ...profile,
            is_private: false, // Ces profils sont déjà filtrés comme publics
            follower_count: followerData || 0,
            following_count: followingData || 0
          };
        })
      );

      setSearchResults(profilesWithStats);
    } catch (error: any) {
      console.error('Error searching users:', error);
    }
  };

  // Check follow status and friendship
  const checkFollowStatus = async (userId: string) => {
    if (!user) return;

    try {
      // Check follow status
      const { data, error } = await supabase
        .from('user_follows')
        .select('id, status')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (data) {
        setFollowStatus(data.status);
        setIsFollowing(data.status === 'accepted');
      } else {
        setFollowStatus(null);
        setIsFollowing(false);
      }

      // Check if they are friends (mutual following)
      const { data: friendsData } = await supabase.rpc('are_users_friends', {
        user1_id: user.id,
        user2_id: userId
      });
      
      setAreFriends(friendsData || false);
    } catch (error: any) {
      setFollowStatus(null);
      setIsFollowing(false);
      setAreFriends(false);
    }
  };

  // Follow/unfollow user with improved error handling and status updates
  const toggleFollow = async () => {
    if (!user || !selectedProfile) return;

    setLoading(true);
    try {
      if (followStatus === 'accepted') {
        // Unfollow - marquer comme "unfollowed" au lieu de supprimer
        const { error } = await supabase
          .from('user_follows')
          .update({ status: 'unfollowed' })
          .eq('follower_id', user.id)
          .eq('following_id', selectedProfile.user_id);

        if (error) throw error;
        
        setFollowStatus('unfollowed');
        setIsFollowing(false);
        setAreFriends(false);
        
        toast({ title: "Succès", description: "Vous ne suivez plus cet utilisateur" });
      } else if (followStatus === 'pending' || followStatus === 'unfollowed') {
        // Cancel pending request ou supprimer unfollowed
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', selectedProfile.user_id);

        if (error) throw error;
        
        setFollowStatus(null);
        setIsFollowing(false);
        
        const message = followStatus === 'pending' 
          ? "Demande de suivi annulée" 
          : "Relation supprimée";
        toast({ title: "Succès", description: message });
      } else {
        // Vérifier s'il y a une relation précédente
        const { data: existingFollow } = await supabase
          .from('user_follows')
          .select('status')
          .eq('follower_id', user.id)
          .eq('following_id', selectedProfile.user_id)
          .maybeSingle();

        if (existingFollow && existingFollow.status === 'unfollowed') {
          // Réactiver une relation précédemment acceptée
          const { error } = await supabase
            .from('user_follows')
            .update({ status: 'accepted' })
            .eq('follower_id', user.id)
            .eq('following_id', selectedProfile.user_id);

          if (error) throw error;

          setFollowStatus('accepted');
          setIsFollowing(true);
          
          const { data: friendsData } = await supabase.rpc('are_users_friends', {
            user1_id: user.id,
            user2_id: selectedProfile.user_id
          });
          setAreFriends(friendsData || false);
          
          toast({ title: "Réabonnement réussi", description: "Vous suivez de nouveau cet utilisateur" });
        } else {
          // Send follow request - toujours pending pour nouveau
          const { error } = await supabase
            .from('user_follows')
            .insert([{
              follower_id: user.id,
              following_id: selectedProfile.user_id,
              status: 'pending'
            }]);

          if (error) throw error;
          
          setFollowStatus('pending');
          setIsFollowing(false);
          
          toast({ 
            title: "Demande envoyée", 
            description: "Votre demande de suivi a été envoyée" 
          });
        }
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de modifier le suivi", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedProfile) {
      checkFollowStatus(selectedProfile.user_id);
    }
  }, [selectedProfile, user]);

  if (selectedProfile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProfile(null)}
              >
                ←
              </Button>
              Profil utilisateur
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Profile Header */}
            <div className="text-center space-y-3">
              <div className="relative mx-auto w-20">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={selectedProfile.avatar_url || ""} />
                  <AvatarFallback className="text-lg">
                    {(selectedProfile.username || selectedProfile.display_name || "").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {areFriends && <OnlineStatus userId={selectedProfile.user_id} />}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedProfile.username || selectedProfile.display_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{selectedProfile.username}
                </p>
                {selectedProfile.is_private && (
                  <Badge variant="outline" className="mt-1">
                    <Lock className="h-3 w-3 mr-1" />
                    Privé
                  </Badge>
                )}
              </div>

              {/* Stats */}
              {(!selectedProfile.is_private || isFollowing) && (
                <div className="flex justify-center gap-6 py-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedProfile.follower_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Abonnés</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedProfile.following_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Abonnements</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {selectedProfile.bio && !selectedProfile.is_private && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">{selectedProfile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Private account message */}
            {selectedProfile.is_private && !isFollowing && (
              <Card className="border-muted">
                <CardContent className="p-4 text-center">
                  <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Ce compte est privé. Suivez-le pour voir son contenu.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={toggleFollow}
                disabled={loading}
                variant={isFollowing ? "outline" : "default"}
                className="flex-1"
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Suivi
                  </>
                 ) : followStatus === 'pending' ? (
                   <>
                     <UserPlus className="h-4 w-4 mr-2" />
                     En attente
                   </>
                 ) : followStatus === 'unfollowed' ? (
                   <>
                     <UserPlus className="h-4 w-4 mr-2" />
                     Suivre à nouveau
                   </>
                 ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Suivre
                  </>
                )}
              </Button>
              
              {areFriends && (
                <Button
                  onClick={() => {
                    onStartConversation(selectedProfile.user_id);
                    onOpenChange(false);
                    setSelectedProfile(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher des utilisateurs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom d'utilisateur ou nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.length === 0 && searchQuery && (
              <p className="text-center text-muted-foreground text-sm py-4">
                Aucun utilisateur trouvé
              </p>
            )}
            
            {searchResults.map((profile) => (
              <div
                key={profile.user_id}
                onClick={() => setSelectedProfile(profile)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback>
                      {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineStatus userId={profile.user_id} className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile.username || profile.display_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                      @{profile.username}
                    </p>
                    {profile.is_private && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};