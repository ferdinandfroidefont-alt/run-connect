import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSendNotification } from "@/hooks/useSendNotification";
import { OnlineStatus } from "./OnlineStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { Users, UserCheck, X, UserMinus, UserX, ChevronRight } from "lucide-react";
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
  targetUserId?: string;
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
  const { sendPushNotification } = useSendNotification();
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

    const userId = targetUserId || user.id;

    try {
      setLoading(true);

      const { data: followersData } = await supabase
        .from('user_follows')
        .select('follower_id, status')
        .eq('following_id', userId)
        .eq('status', 'accepted');

      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id, status')
        .eq('follower_id', userId)
        .eq('status', 'accepted');

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

      setFollowing(prev => prev.filter(u => u.user_id !== targetUserId));
      
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

      setFollowers(prev => prev.filter(u => u.user_id !== followerUserId));
      
      await supabase
        .from('notifications')
        .insert({
          user_id: followerUserId,
          type: 'follower_removed',
          title: 'Abonné supprimé',
          message: `${user.email} a supprimé votre abonnement`,
          data: { removed_by: user.id }
        });

      await sendPushNotification(
        followerUserId,
        'Abonné supprimé',
        `${user.email?.split('@')[0] || 'Un utilisateur'} a supprimé votre abonnement`,
        'follower_removed',
        { removed_by: user.id }
      );
      
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
    
    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {showUnfollowButton ? "Aucun abonnement pour le moment" : "Aucun abonné pour le moment"}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            {showUnfollowButton ? "Découvrez des profils pour commencer à suivre !" : "Partagez votre profil pour être suivi !"}
          </p>
        </div>
      );
    }
    
    return (
      <div className="pt-4">
        <div className="bg-card rounded-[10px] border border-border overflow-hidden">
          {users.map((userItem, index) => (
            <div
              key={userItem.user_id}
              className={`flex items-center gap-3 p-3 hover:bg-secondary transition-all duration-200 cursor-pointer ${
                index !== users.length - 1 ? 'border-b border-border' : ''
              }`}
              onClick={() => navigateToProfile(userItem.user_id)}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={userItem.avatar_url} />
                  <AvatarFallback className="bg-secondary text-foreground">
                    {userItem.username?.[0] || userItem.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <OnlineStatus userId={userItem.user_id} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {userItem.display_name || userItem.username}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  @{userItem.username}
                </p>
              </div>

              {isViewingOwnProfile && showUnfollowButton && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openConfirmDialog('unfollow', userItem.user_id, userItem.display_name || userItem.username)}
                    className="h-8 w-8 rounded-full bg-secondary hover:bg-destructive/10 transition-colors flex items-center justify-center group"
                    title="Ne plus suivre"
                  >
                    <UserX className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </button>
                </div>
              )}
              {isViewingOwnProfile && showRemoveButton && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openConfirmDialog('remove', userItem.user_id, userItem.display_name || userItem.username)}
                    className="h-8 w-8 rounded-full bg-secondary hover:bg-destructive/10 transition-colors flex items-center justify-center group"
                    title="Supprimer"
                  >
                    <UserMinus className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </button>
                </div>
              )}
              
              {!isViewingOwnProfile && (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full max-h-full rounded-none border-0 p-0 bg-secondary sm:max-w-md sm:max-h-[70vh] sm:rounded-lg sm:border flex flex-col">
        {/* iOS Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
          <div className="w-8" />
          <h2 className="text-lg font-semibold text-foreground">Réseaux</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-secondary transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Tabs defaultValue={type} className="flex-1 flex flex-col overflow-hidden">
          {/* iOS Segmented Control */}
          <div className="px-4 pt-4">
            <TabsList className="w-full bg-secondary p-1 rounded-[10px] border border-border">
              <TabsTrigger 
                value="followers" 
                className="flex-1 gap-2 rounded-[8px] text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <Users className="h-4 w-4" />
                Abonnés
                {followerCount > 0 && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    {followerCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="following" 
                className="flex-1 gap-2 rounded-[8px] text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <UserCheck className="h-4 w-4" />
                Abonnements
                {followingCount > 0 && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    {followingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="followers" className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <UserList users={followers} showRemoveButton />
            )}
          </TabsContent>

          <TabsContent value="following" className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <UserList users={following} showUnfollowButton />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      <ProfilePreviewDialog 
        userId={selectedUserId} 
        onClose={closeProfilePreview}
      />

      <AlertDialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
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
            <AlertDialogCancel className="rounded-[8px]">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[8px]">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
