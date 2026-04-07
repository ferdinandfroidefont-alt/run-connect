import { useState, useEffect, useRef, useLayoutEffect } from "react";
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
import { cn } from "@/lib/utils";

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

  const tabScrollRef = useRef<HTMLDivElement>(null);
  const showRequestsTab = !targetUserId || targetUserId === user?.id;

  useEffect(() => {
    if (open) setActiveTab(type);
  }, [open, type]);

  useEffect(() => {
    if (open && user) {
      fetchFollowData();
      fetchPendingRequests();
      fetchSentPendingRequests();
    }
  }, [open, user, targetUserId]);

  /** Onglet actif centré dans la zone scroll (effet carrousel iOS) */
  useLayoutEffect(() => {
    if (!open || !tabScrollRef.current) return;
    const root = tabScrollRef.current;
    const node = root.querySelector<HTMLElement>(`[data-follow-tab="${activeTab}"]`);
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  }, [activeTab, open, showRequestsTab]);

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
        <div className="flex min-h-[min(360px,55dvh)] flex-1 flex-col items-center justify-center px-4 py-8">
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
      <div className="pt-1">
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
        <div className="flex min-h-[min(360px,55dvh)] flex-1 flex-col items-center justify-center px-4 py-8">
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
      <div className="pt-1">
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
        <div className="flex min-h-[min(360px,55dvh)] flex-1 flex-col items-center justify-center px-4 py-8">
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
      <DialogContent
        hideCloseButton
        fullScreen
        stackNested
        className="z-[160] flex flex-col gap-0 overflow-hidden bg-secondary p-0"
      >
        {/* iOS Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
          <div className="w-8" />
          <h2 className="text-[17px] font-semibold text-foreground">Réseaux</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary"
        >
          {/* Carrousel d’onglets : scroll horizontal, onglet actif centré */}
          <div className="shrink-0 border-b border-border/80 bg-background/95 backdrop-blur-md">
            <div
              ref={tabScrollRef}
              className={cn(
                "flex w-full overflow-x-auto overscroll-x-contain scroll-smooth",
                "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]",
                "[&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]",
                "px-[max(1rem,calc(50vw-76px))]"
              )}
            >
              <TabsList
                className={cn(
                  "inline-flex h-auto min-h-[52px] w-max items-stretch gap-2 rounded-none border-0 bg-transparent py-2 pl-0 pr-0",
                  "snap-none"
                )}
              >
                <TabsTrigger
                  value="followers"
                  data-follow-tab="followers"
                  className={cn(
                    "group snap-center shrink-0 gap-1.5 rounded-[12px] border border-transparent px-5 py-2.5 text-[13px] font-semibold transition-all duration-300 ease-out",
                    "min-h-[44px] min-w-[132px] justify-center data-[state=inactive]:text-muted-foreground",
                    "data-[state=active]:border-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md",
                    "data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted/80"
                  )}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Abonnés</span>
                  {followerCount > 0 && (
                    <span className="rounded-full bg-primary-foreground/25 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground group-data-[state=inactive]:bg-primary/15 group-data-[state=inactive]:text-primary">
                      {followerCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="following"
                  data-follow-tab="following"
                  className={cn(
                    "group snap-center shrink-0 gap-1.5 rounded-[12px] border border-transparent px-5 py-2.5 text-[13px] font-semibold transition-all duration-300 ease-out",
                    "min-h-[44px] min-w-[132px] justify-center data-[state=inactive]:text-muted-foreground",
                    "data-[state=active]:border-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md",
                    "data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted/80"
                  )}
                >
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span>Abonnements</span>
                  {followingCount > 0 && (
                    <span className="rounded-full bg-primary-foreground/25 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground group-data-[state=inactive]:bg-primary/15 group-data-[state=inactive]:text-primary">
                      {followingCount}
                    </span>
                  )}
                </TabsTrigger>
                {showRequestsTab && (
                  <TabsTrigger
                    value="requests"
                    data-follow-tab="requests"
                    className={cn(
                      "group snap-center shrink-0 gap-1.5 rounded-[12px] border border-transparent px-5 py-2.5 text-[13px] font-semibold transition-all duration-300 ease-out",
                      "min-h-[44px] min-w-[132px] justify-center data-[state=inactive]:text-muted-foreground",
                      "data-[state=active]:border-destructive/25 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground data-[state=active]:shadow-md",
                      "data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted/80"
                    )}
                  >
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Demandes</span>
                    {(pendingRequests.length > 0 || sentPendingRequests.length > 0) && (
                      <span className="rounded-full bg-destructive-foreground/30 px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground group-data-[state=inactive]:bg-destructive/15 group-data-[state=inactive]:text-destructive">
                        {pendingRequests.length + sentPendingRequests.length}
                      </span>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>

          <TabsContent
            value="followers"
            className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary p-0 focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pb-[max(10px,env(safe-area-inset-bottom,10px))] pt-3">
              {loading ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <UserList users={followers} showRemoveButton />
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="following"
            className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary p-0 focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pb-[max(10px,env(safe-area-inset-bottom,10px))] pt-3">
              {loading ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <UserList users={following} showUnfollowButton />
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="requests"
            className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary p-0 focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pb-[max(10px,env(safe-area-inset-bottom,10px))] pt-3">
              <div className="mb-3 flex shrink-0 gap-2">
                <Button
                  variant={requestsSubTab === "received" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestsSubTab("received")}
                  className="h-10 flex-1 rounded-full text-[12px] font-semibold"
                >
                  Reçues
                  {pendingRequests.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-destructive-foreground/20 px-1.5 py-0.5 text-[10px]">
                      {pendingRequests.length}
                    </span>
                  )}
                </Button>
                <Button
                  variant={requestsSubTab === "sent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestsSubTab("sent")}
                  className="h-10 flex-1 rounded-full text-[12px] font-semibold"
                >
                  Envoyées
                  {sentPendingRequests.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
                      {sentPendingRequests.length}
                    </span>
                  )}
                </Button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                {loading ? (
                  <div className="flex flex-1 items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : requestsSubTab === "received" ? (
                  <PendingRequestsList />
                ) : (
                  <SentPendingRequestsList />
                )}
              </div>
            </div>
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
