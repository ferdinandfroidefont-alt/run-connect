import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [loading, setLoading] = useState(false);

  // Search for users
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, bio, is_private')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error);
    }
  };

  // Check if following a user
  const checkFollowStatus = async (userId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      setIsFollowing(!!data);
    } catch (error: any) {
      setIsFollowing(false);
    }
  };

  // Follow/unfollow user
  const toggleFollow = async () => {
    if (!user || !selectedProfile) return;

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', selectedProfile.user_id);

        if (error) throw error;
        setIsFollowing(false);
        toast({ title: "Succès", description: "Vous ne suivez plus cet utilisateur" });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert([{
            follower_id: user.id,
            following_id: selectedProfile.user_id
          }]);

        if (error) throw error;
        setIsFollowing(true);
        toast({ title: "Succès", description: "Vous suivez maintenant cet utilisateur" });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de modifier le suivi", variant: "destructive" });
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
              <Avatar className="h-20 w-20 mx-auto">
                <AvatarImage src={selectedProfile.avatar_url || ""} />
                <AvatarFallback className="text-lg">
                  {(selectedProfile.display_name || selectedProfile.username || "").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedProfile.display_name || selectedProfile.username}
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
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Suivre
                  </>
                )}
              </Button>
              
              {(!selectedProfile.is_private || isFollowing) && (
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
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback>
                    {(profile.display_name || profile.username || "").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile.display_name || profile.username}
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