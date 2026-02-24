import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, User, UserPlus, UserCheck, Lock, Loader2 } from "lucide-react";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
}

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId?: string;
  onMemberInvited?: (userId: string) => void;
}

export const InviteMembersDialog = ({ open, onOpenChange, clubId, onMemberInvited }: InviteMembersDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviteStates, setInviteStates] = useState<{ [key: string]: boolean }>({});

  // Search for users to invite
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search for users (excluding already invited ones if it's a club)
      const { data: searchData, error: searchError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, bio, is_private')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .eq('is_private', false)
        .limit(20);

      if (searchError) throw searchError;

      // If this is for a club, filter out existing members
      let filteredUsers = searchData || [];
      if (clubId) {
        const { data: membersData } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('conversation_id', clubId);
        
        const existingMemberIds = membersData?.map(m => m.user_id) || [];
        filteredUsers = filteredUsers.filter(user => !existingMemberIds.includes(user.user_id));
      }

      setSearchResults(filteredUsers);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher des utilisateurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Invite user to club
  const inviteUser = async (profile: Profile) => {
    if (!user || !clubId) return;

    setInviteStates(prev => ({ ...prev, [profile.user_id]: true }));

    try {
      const { error } = await supabase
        .from('club_invitations')
        .insert({
          club_id: clubId,
          inviter_id: user.id,
          invited_user_id: profile.user_id,
          status: 'pending'
        });

      if (error) throw error;

      // Récupérer les infos du club
      const { data: clubData } = await supabase
        .from('conversations')
        .select('group_name')
        .eq('id', clubId)
        .single();

      // Récupérer les infos de l'inviteur
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', user.id)
        .single();

      // Envoyer notification push
      if (clubData && inviterProfile) {
        await sendPushNotification(
          profile.user_id,
          'Invitation à rejoindre un club',
          `${inviterProfile.display_name || inviterProfile.username} vous invite à rejoindre le club "${clubData.group_name || 'Club'}"`,
          'club_invitation',
          {
            club_id: clubId,
            inviter_id: user.id,
            inviter_name: inviterProfile.display_name || inviterProfile.username,
            inviter_avatar: inviterProfile.avatar_url,
            club_name: clubData.group_name
          }
        );
      }

      setInvitedUsers(prev => new Set(prev).add(profile.user_id));
      onMemberInvited?.(profile.user_id);
      
      toast({
        title: "Invitation envoyée",
        description: `Invitation envoyée à ${profile.display_name || profile.username}`,
      });
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation",
        variant: "destructive"
      });
    } finally {
      setInviteStates(prev => ({ ...prev, [profile.user_id]: false }));
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Inviter des membres
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des utilisateurs à inviter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results with Scrollbar */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-muted/20 scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground pr-2 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Recherche en cours...</span>
                </div>
              )}

              {!loading && searchResults.length === 0 && searchQuery && (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">
                    Aucun utilisateur trouvé
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Essayez avec un autre terme de recherche
                  </p>
                </div>
              )}

              {!loading && searchQuery === "" && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">
                    Commencez à taper pour rechercher des utilisateurs
                  </p>
                </div>
              )}
              
              {!loading && searchResults.map((profile, index) => {
                const isInvited = invitedUsers.has(profile.user_id);
                const isInviting = inviteStates[profile.user_id];
                
                return (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.3s ease-out forwards'
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback className="text-sm font-semibold">
                          {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineStatus userId={profile.user_id} className="w-3 h-3" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {profile.display_name || profile.username}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                        {profile.is_private && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {profile.bio && (
                        <p className="text-xs text-muted-foreground truncate mt-1 max-w-48">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                    
                    <div className="shrink-0">
                      {isInvited ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Invité
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => inviteUser(profile)}
                          disabled={isInviting}
                          size="sm"
                          className="h-8 px-3"
                        >
                          {isInviting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-3 w-3 mr-1" />
                              Inviter
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};