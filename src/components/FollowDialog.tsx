import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Users, UserCheck, X, UserMinus, UserX, ChevronRight, Clock, UserPlus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { useFollow } from "@/hooks/useFollow";

interface FollowUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: string;
  isFollowingBack?: boolean;
}

interface PendingRequest {
  id: string;
  follower_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface SentPendingRequest {
  id: string;
  following_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
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
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const { unfollow, removeFollower, acceptFollowRequest, rejectFollowRequest, getPendingRequests, getSentPendingRequests, cancelFollowRequest, followBack, loading: followLoading } = useFollow();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentPendingRequests, setSentPendingRequests] = useState<SentPendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(type);
  const [requestsSubTab, setRequestsSubTab] = useState<'received' | 'sent'>('received');
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
      fetchPendingRequests();
      fetchSentPendingRequests();
    }
  }, [open, user, targetUserId]);

  const fetchPendingRequests = async () => {
    if (!user || targetUserId) return; // Only show pending for own profile
    const requests = await getPendingRequests();
    setPendingRequests(requests);
  };

  const fetchSentPendingRequests = async () => {
    if (!user || targetUserId) return; // Only show for own profile
    const requests = await getSentPendingRequests();
    setSentPendingRequests(requests);
  };

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

      // Get the list of people I follow (to check "follow back")
      const myFollowingIds = new Set(
        followingData?.map(f => f.following_id) || []
      );

      if (followersData && followersData.length > 0) {
        const followerIds = followersData.map(f => f.follower_id);
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', followerIds);

        const followersWithProfiles = followerProfiles?.map(profile => ({
          ...profile,
          status: 'accepted',
          isFollowingBack: myFollowingIds.has(profile.user_id)
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
      const success = await unfollow(confirmDialog.userId);
      if (success) {
        setFollowing(prev => prev.filter(u => u.user_id !== confirmDialog.userId));
      }
    } else if (confirmDialog.type === 'remove') {
      const success = await removeFollower(confirmDialog.userId);
      if (success) {
        setFollowers(prev => prev.filter(u => u.user_id !== confirmDialog.userId));
      }
    }

    closeConfirmDialog();
  };

  const handleAcceptRequest = async (followerId: string) => {
    const success = await acceptFollowRequest(followerId);
    if (success) {
      setPendingRequests(prev => prev.filter(r => r.follower_id !== followerId));
      fetchFollowData();
    }
  };

  const handleRejectRequest = async (followerId: string) => {
    const success = await rejectFollowRequest(followerId);
    if (success) {
      setPendingRequests(prev => prev.filter(r => r.follower_id !== followerId));
    }
  };

  const handleFollowBack = async (userId: string) => {
    const success = await followBack(userId);
    if (success) {
      setFollowers(prev => prev.map(f => 
        f.user_id === userId ? { ...f, isFollowingBack: true } : f
      ));
    }
  };

  const handleCancelSentRequest = async (followingId: string) => {
    const success = await cancelFollowRequest(followingId);
    if (success) {
      setSentPendingRequests(prev => prev.filter(r => r.following_id !== followingId));
    }
  };

  const PendingRequestsList = () => {
    if (pendingRequests.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            Aucune demande en attente
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Les nouvelles demandes de suivi apparaîtront ici
          </p>
        </div>
      );
    }

    return (
      <div className="pt-4">
        <div className="bg-card rounded-[10px] border border-border overflow-hidden">
          {pendingRequests.map((request, index) => (
            <div
              key={request.id}
              className={`flex items-center gap-3 p-3 ${
                index !== pendingRequests.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div 
                className="relative cursor-pointer"
                onClick={() => navigateToProfile(request.follower_id)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-foreground">
                    {request.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigateToProfile(request.follower_id)}
              >
                <p className="font-medium text-foreground truncate">
                  {request.display_name || request.username}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  @{request.username}
                </p>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAcceptRequest(request.follower_id)}
                  disabled={followLoading}
                  className="h-8 px-3 rounded-full"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectRequest(request.follower_id)}
                  disabled={followLoading}
                  className="h-8 px-3 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SentPendingRequestsList = () => {
    if (sentPendingRequests.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            Aucune demande envoyée
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Vos demandes de suivi en attente apparaîtront ici
          </p>
        </div>
      );
    }

    return (
      <div className="pt-4">
        <div className="bg-card rounded-[10px] border border-border overflow-hidden">
          {sentPendingRequests.map((request, index) => (
            <div
              key={request.id}
              className={`flex items-center gap-3 p-3 ${
                index !== sentPendingRequests.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div 
                className="relative cursor-pointer"
                onClick={() => navigateToProfile(request.following_id)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-foreground">
                    {request.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigateToProfile(request.following_id)}
              >
                <p className="font-medium text-foreground truncate">
                  {request.display_name || request.username}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  @{request.username}
                </p>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                  En attente
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelSentRequest(request.following_id)}
                  disabled={followLoading}
                  className="h-8 px-3 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
      <div>
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

              {/* Follow back button for followers */}
              {isViewingOwnProfile && showRemoveButton && !userItem.isFollowingBack && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFollowBack(userItem.user_id)}
                    disabled={followLoading}
                    className="h-8 px-3 rounded-full text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Suivre
                  </Button>
                </div>
              )}

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
      <DialogContent hideCloseButton className="!grid-cols-1 w-full h-[100dvh] max-w-full !max-h-[100dvh] rounded-none border-0 p-0 !gap-0 bg-secondary sm:max-w-md sm:h-[70vh] sm:max-h-[70vh] sm:rounded-lg sm:border !flex !flex-col !overflow-hidden">
        {/* iOS Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-background border-b border-border">
          <div className="w-8" />
          <h2 className="text-lg font-semibold text-foreground">Réseaux</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-secondary transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* iOS Segmented Control */}
          <div className="flex-shrink-0 relative z-10 px-4 py-2 bg-background border-b border-border">
            <TabsList className="w-full bg-secondary p-1 rounded-[10px]">
              <TabsTrigger 
                value="followers" 
                className="flex-1 gap-1 rounded-[8px] text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <Users className="h-3.5 w-3.5" />
                Abonnés
                {followerCount > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                    {followerCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="following" 
                className="flex-1 gap-1 rounded-[8px] text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Abonnements
                {followingCount > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                    {followingCount}
                  </span>
                )}
              </TabsTrigger>
              {/* Pending requests tab - only for own profile */}
              {(!targetUserId || targetUserId === user?.id) && (
                <TabsTrigger 
                  value="requests" 
                  className="flex-1 gap-1 rounded-[8px] text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Demandes
                  {(pendingRequests.length > 0 || sentPendingRequests.length > 0) && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                      {pendingRequests.length + sentPendingRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="followers" className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 relative z-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <UserList users={followers} showRemoveButton />
            )}
          </TabsContent>

          <TabsContent value="following" className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 relative z-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <UserList users={following} showUnfollowButton />
            )}
          </TabsContent>

          <TabsContent value="requests" className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 flex flex-col relative z-0">
            {/* Sub-tabs for Received / Sent */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={requestsSubTab === 'received' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequestsSubTab('received')}
                className="flex-1 rounded-full text-xs"
              >
                Reçues
                {pendingRequests.length > 0 && (
                  <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </Button>
              <Button
                variant={requestsSubTab === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequestsSubTab('sent')}
                className="flex-1 rounded-full text-xs"
              >
                Envoyées
                {sentPendingRequests.length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {sentPendingRequests.length}
                  </span>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              requestsSubTab === 'received' ? <PendingRequestsList /> : <SentPendingRequestsList />
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
