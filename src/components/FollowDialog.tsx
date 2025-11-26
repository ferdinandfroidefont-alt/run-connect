import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSendNotification } from "@/hooks/useSendNotification";
import { OnlineStatus } from "./OnlineStatus";
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
import { Users, UserCheck, X, UserMinus, UserX } from "lucide-react";
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
      
      // Send notification to the removed follower (database + push)
      await supabase
        .from('notifications')
        .insert({
          user_id: followerUserId,
          type: 'follower_removed',
          title: 'Abonné supprimé',
          message: `${user.email} a supprimé votre abonnement`,
          data: { removed_by: user.id }
        });

      // Send push notification
      await sendPushNotification(
        followerUserId,
        'Abonné supprimé',
        `${user.email?.split('@')[0] || 'Un utilisateur'} a supprimé votre abonnement`,
        'follower_removed',
        { removed_by: user.id }
      );
      
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
    
    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl p-8 text-center">
            <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <p className="text-sm font-medium text-white mb-1">
              {showUnfollowButton ? "Aucun abonnement pour le moment" : "Aucun abonné pour le moment"}
            </p>
            <p className="text-xs text-slate-400">
              {showUnfollowButton ? "Découvrez des profils pour commencer à suivre !" : "Partagez votre profil pour être suivi !"}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2 pt-4">
        {users.map((userItem) => (
          <div
            key={userItem.user_id}
            className="bg-white/5 hover:bg-white/10 transition-all duration-200 rounded-xl border border-white/5 shadow-sm hover:shadow-md p-3 cursor-pointer"
            onClick={() => navigateToProfile(userItem.user_id)}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                  <AvatarImage src={userItem.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                    {userItem.username?.[0] || userItem.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <OnlineStatus userId={userItem.user_id} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {userItem.display_name || userItem.username}
                </p>
                <p className="text-sm text-slate-400 truncate">
                  @{userItem.username}
                </p>
              </div>

              {isViewingOwnProfile && showUnfollowButton && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openConfirmDialog('unfollow', userItem.user_id, userItem.display_name || userItem.username)}
                    className="h-8 w-8 rounded-full bg-transparent hover:bg-red-500/20 transition-colors flex items-center justify-center group"
                    title="Ne plus suivre"
                  >
                    <UserX className="h-4 w-4 text-slate-400 group-hover:text-red-400 transition-colors" />
                  </button>
                </div>
              )}
              {isViewingOwnProfile && showRemoveButton && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openConfirmDialog('remove', userItem.user_id, userItem.display_name || userItem.username)}
                    className="h-8 w-8 rounded-full bg-transparent hover:bg-red-500/20 transition-colors flex items-center justify-center group"
                    title="Supprimer"
                  >
                    <UserMinus className="h-4 w-4 text-slate-400 group-hover:text-red-400 transition-colors" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col p-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border-white/10 rounded-[22px] shadow-2xl shadow-black/50">
        {/* Header Premium */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20 border-b border-white/5">
          <div className="w-8" />
          <DialogTitle className="text-lg font-semibold text-white">Réseaux</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Tabs defaultValue={type} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 bg-slate-800/50 p-1.5 rounded-2xl border border-white/5">
            <TabsTrigger 
              value="followers" 
              className="flex-1 gap-2 rounded-xl data-[state=active]:bg-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5"
            >
              <Users className="h-4 w-4" />
              Abonnés
              {followerCount > 0 && (
                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">
                  {followerCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="following" 
              className="flex-1 gap-2 rounded-xl data-[state=active]:bg-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/5"
            >
              <UserCheck className="h-4 w-4" />
              Abonnements
              {followingCount > 0 && (
                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">
                  {followingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <UserList users={followers} showRemoveButton />
            )}
          </TabsContent>

          <TabsContent value="following" className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
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