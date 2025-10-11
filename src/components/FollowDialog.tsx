import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, UserCheck, Heart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";

interface FollowUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: string;
}

interface FollowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'followers' | 'following';
  followerCount: number;
  followingCount: number;
  targetUserId?: string; // ID de l'utilisateur dont on veut voir les abonnés/abonnements
}

export const FollowDialog = ({ 
  open, 
  onOpenChange, 
  type, 
  followerCount, 
  followingCount,
  targetUserId 
}: FollowDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'unfollow' | 'remove' | null;
    userId: string | null;
    userName: string | null;
  }>({
    open: false,
    type: null,
    userId: null,
    userName: null,
  });

  useEffect(() => {
    if (open && user) {
      fetchFollowData();
    }
  }, [open, user, targetUserId]);

  const fetchFollowData = async () => {
    if (!user) return;

    // Utiliser l'ID de l'utilisateur cible ou l'utilisateur connecté
    const userId = targetUserId || user.id;
    const isViewingOwnProfile = !targetUserId || targetUserId === user.id;

    try {
      setLoading(true);

      // Fetch followers (people who follow the target user)
      const { data: followersData } = await supabase
        .from('user_follows')
        .select('follower_id, status')
        .eq('following_id', userId)
        .eq('status', 'accepted');

      // Fetch following (people the target user follows)  
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id, status')
        .eq('follower_id', userId)
        .eq('status', 'accepted');

      // Get profiles for followers
      if (followersData && followersData.length > 0) {
        const followerIds = followersData.map(f => f.follower_id);
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', followerIds);

        const followersWithProfiles = followerProfiles?.map(profile => ({
          ...profile,
          status: 'accepted'
        })) || [];

        setFollowers(followersWithProfiles);
      } else {
        setFollowers([]);
      }

      // Get profiles for following
      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id);
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', followingIds);

        const followingWithProfiles = followingProfiles?.map(profile => ({
          ...profile,
          status: 'accepted'
        })) || [];

        setFollowing(followingWithProfiles);
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error('Error fetching follow data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (type: 'unfollow' | 'remove', userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      type,
      userId,
      userName,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      type: null,
      userId: null,
      userName: null,
    });
  };

  const handleConfirm = async () => {
    if (!confirmDialog.userId || !confirmDialog.type) return;

    if (confirmDialog.type === 'unfollow') {
      await unfollowUser(confirmDialog.userId);
    } else if (confirmDialog.type === 'remove') {
      await removeFollower(confirmDialog.userId);
    }

    closeConfirmDialog();
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .update({ status: 'unfollowed' })
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      // Remove from following list and update UI immediately
      setFollowing(prev => prev.filter(u => u.user_id !== targetUserId));
      
      // Trigger a refresh of follow data to update counts
      setTimeout(() => {
        fetchFollowData();
      }, 500);
      
      toast({
        title: "Désabonné",
        description: "Vous ne suivez plus cet utilisateur"
      });
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se désabonner",
        variant: "destructive"
      });
    }
  };

  const removeFollower = async (followerUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .update({ status: 'unfollowed' })
        .eq('follower_id', followerUserId)
        .eq('following_id', user.id);

      if (error) throw error;

      // Remove from followers list and update UI immediately
      setFollowers(prev => prev.filter(u => u.user_id !== followerUserId));
      
      // Send notification to the removed follower
      await supabase
        .from('notifications')
        .insert({
          user_id: followerUserId,
          type: 'follower_removed',
          title: 'Abonné supprimé',
          message: `${user.email} a supprimé votre abonnement`,
          data: { removed_by: user.id }
        });
      
      // Trigger a refresh of follow data to update counts
      setTimeout(() => {
        fetchFollowData();
      }, 500);
      
      toast({
        title: "Abonné supprimé",
        description: "Cet utilisateur ne vous suit plus"
      });
    } catch (error: any) {
      console.error('Error removing follower:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cet abonné",
        variant: "destructive"
      });
    }
  };

  const UserList = ({ users, showUnfollowButton = false, showRemoveButton = false }: { 
    users: FollowUser[], 
    showUnfollowButton?: boolean,
    showRemoveButton?: boolean
  }) => {
    const isViewingOwnProfile = !targetUserId || targetUserId === user?.id;
    
    return (
    <div className="space-y-3">
      {users.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {showUnfollowButton ? "Vous ne suivez personne pour le moment" : 
             showRemoveButton ? "Aucun abonné pour le moment" :
             "Aucun abonné pour le moment"}
          </p>
        </div>
      ) : (
        users.map((userItem) => (
          <Card key={userItem.user_id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar 
                    className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigateToProfile(userItem.user_id)}
                  >
                    <AvatarImage src={userItem.avatar_url} />
                    <AvatarFallback>
                      {userItem.username?.[0] || userItem.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineStatus userId={userItem.user_id} />
                </div>
                <div>
                  <p className="font-medium">
                    @{userItem.username}
                  </p>
                </div>
               </div>
               {/* Afficher les boutons seulement si on consulte son propre profil */}
               {isViewingOwnProfile && showUnfollowButton && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConfirmDialog('unfollow', userItem.user_id, userItem.display_name || userItem.username)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Ne plus suivre
                  </Button>
                )}
                {isViewingOwnProfile && showRemoveButton && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConfirmDialog('remove', userItem.user_id, userItem.display_name || userItem.username)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                )}
            </CardContent>
          </Card>
        ))
       )}
     </div>
   );
 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Réseaux
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={type} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Abonnés
              <Badge variant="secondary" className="ml-1">
                {followerCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Abonnements
              <Badge variant="secondary" className="ml-1">
                {followingCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4">
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              ) : (
                <UserList users={followers} showRemoveButton />
              )}
            </div>
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              ) : (
                <UserList users={following} showUnfollowButton />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      <ProfilePreviewDialog 
        userId={selectedUserId} 
        onClose={closeProfilePreview}
      />

      <AlertDialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'unfollow' ? 'Ne plus suivre ?' : 'Supprimer l\'abonné ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'unfollow' 
                ? `Êtes-vous sûr de vouloir ne plus suivre ${confirmDialog.userName} ? Vous pourrez le/la suivre à nouveau plus tard.`
                : `Êtes-vous sûr de vouloir supprimer ${confirmDialog.userName} de vos abonnés ? Cette personne ne vous suivra plus.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};