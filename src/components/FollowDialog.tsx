import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
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
import { Users, UserPlus, UserMinus, X, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

/** Palette feuille Réseaux (maquette JSX partagée) */
const NETWORKS_BG = "#F2F2F7";
const ACTION_BLUE = "#007AFF";
const DEMANDES_RED = "#FF3B30";
const IOS_SEP = "#E5E5EA";
const TITLE_INK = "#0A0F1F";

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
  const navigate = useNavigate();
  const {
    unfollow,
    removeFollower,
    acceptFollowRequest,
    rejectFollowRequest,
    getPendingRequests,
    getSentPendingRequests,
    cancelFollowRequest,
    followBack,
    loading: followLoading,
  } = useFollow();

  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentPendingRequests, setSentPendingRequests] = useState<SentPendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(type);
  const [requestsSubTab, setRequestsSubTab] = useState<'received' | 'sent'>('sent');
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

  const showRequestsTab = !targetUserId || targetUserId === user?.id;

  useEffect(() => {
    if (open) setActiveTab(type);
  }, [open, type]);

  const fetchFollowData = useCallback(async () => {
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
  }, [user, targetUserId]);

  const fetchPendingRequests = useCallback(async () => {
    if (!user || targetUserId) return;
    const requests = await getPendingRequests();
    setPendingRequests(requests);
  }, [user, targetUserId, getPendingRequests]);

  const fetchSentPendingRequests = useCallback(async () => {
    if (!user || targetUserId) return;
    const requests = await getSentPendingRequests();
    setSentPendingRequests(requests);
  }, [user, targetUserId, getSentPendingRequests]);

  useEffect(() => {
    if (open && user) {
      void fetchFollowData();
      void fetchPendingRequests();
      void fetchSentPendingRequests();
    }
  }, [open, user, fetchFollowData, fetchPendingRequests, fetchSentPendingRequests]);

  const openConfirmDialog = (t: 'unfollow' | 'remove', uid: string, userName: string) => {
    setConfirmDialog({
      open: true,
      type: t,
      userId: uid,
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
      void fetchFollowData();
    }
  };

  const handleRejectRequest = async (followerId: string) => {
    const success = await rejectFollowRequest(followerId);
    if (success) {
      setPendingRequests(prev => prev.filter(r => r.follower_id !== followerId));
    }
  };

  const handleFollowBack = async (userIdToFollow: string) => {
    const success = await followBack(userIdToFollow);
    if (success) {
      setFollowers(prev =>
        prev.map(f => (f.user_id === userIdToFollow ? { ...f, isFollowingBack: true } : f))
      );
    }
  };

  const handleCancelSentRequest = async (followingId: string) => {
    const success = await cancelFollowRequest(followingId);
    if (success) {
      setSentPendingRequests(prev => prev.filter(r => r.following_id !== followingId));
    }
  };

  const navigateToUserProfile = (uid: string) => {
    if (!uid) return;
    onOpenChange(false);
    if (uid === user?.id) {
      navigate("/profile");
      return;
    }
    navigate(`/profile/${uid}`);
  };

  const mainTabsBase = [
    { id: "followers" as const, label: "Abonnés", icon: Users, count: followerCount, activeColor: ACTION_BLUE },
    { id: "following" as const, label: "Abonnements", icon: UserPlus, count: followingCount, activeColor: ACTION_BLUE },
  ];

  const mainTabs =
    showRequestsTab
      ? [
          ...mainTabsBase,
          {
            id: "requests" as const,
            label: "Demandes",
            icon: Clock,
            count: pendingRequests.length + sentPendingRequests.length,
            activeColor: DEMANDES_RED,
          },
        ]
      : mainTabsBase;

  const emptyBlock = (
    <div className="flex flex-1 items-center justify-center py-12">
      <p className="text-[15px]" style={{ color: "#8E8E93" }}>
        Aucun utilisateur
      </p>
    </div>
  );

  const PendingRequestsRows = () => {
    if (pendingRequests.length === 0) return emptyBlock;

    return (
      <div
        className="overflow-hidden bg-white"
        style={{
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        {pendingRequests.map((request, index) => (
          <div key={request.id}>
            {index > 0 ? <div className="ml-[76px] h-px" style={{ background: IOS_SEP }} /> : null}
            <div
              className="flex cursor-pointer items-center gap-3 px-3 py-3"
              onClick={() => navigateToUserProfile(request.follower_id)}
            >
              <div className="relative h-14 w-14 shrink-0">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={request.avatar_url || undefined} />
                  <AvatarFallback
                    className="text-lg font-extrabold"
                    style={{ background: "#E5E5EA", color: "#8E8E93" }}
                  >
                    {request.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[17px] font-extrabold"
                  style={{ color: TITLE_INK, letterSpacing: "-0.01em" }}
                >
                  {request.display_name || request.username}
                </p>
                <p className="mt-0.5 truncate text-sm" style={{ color: "#8E8E93" }}>
                  @{request.username}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => void handleAcceptRequest(request.follower_id)}
                  disabled={followLoading}
                  className="shrink-0 rounded-full px-4 py-2 text-[15px] font-bold text-white transition-transform active:scale-[0.97]"
                  style={{ background: ACTION_BLUE }}
                >
                  Accepter
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectRequest(request.follower_id)}
                  disabled={followLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95"
                  style={{ background: "white", borderColor: IOS_SEP }}
                  aria-label="Refuser la demande"
                >
                  <X className="h-5 w-5" color={DEMANDES_RED} strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SentPendingRows = () => {
    if (sentPendingRequests.length === 0) return emptyBlock;

    return (
      <div
        className="overflow-hidden bg-white"
        style={{
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        {sentPendingRequests.map((request, index) => (
          <div key={request.id}>
            {index > 0 ? <div className="ml-[76px] h-px" style={{ background: IOS_SEP }} /> : null}
            <div
              className="flex cursor-pointer items-center gap-3 px-3 py-3"
              onClick={() => navigateToUserProfile(request.following_id)}
            >
              <div className="relative h-14 w-14 shrink-0">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={request.avatar_url || undefined} />
                  <AvatarFallback
                    className="text-lg font-extrabold"
                    style={{ background: "#E5E5EA", color: "#8E8E93" }}
                  >
                    {request.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[17px] font-extrabold"
                  style={{ color: TITLE_INK, letterSpacing: "-0.01em" }}
                >
                  {request.display_name || request.username}
                </p>
                <p className="mt-0.5 truncate text-sm" style={{ color: "#8E8E93" }}>
                  @{request.username}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span
                  className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-extrabold"
                  style={{ background: "#FFF1D6", color: "#A67700" }}
                >
                  En attente
                </span>
                <button
                  type="button"
                  onClick={() => void handleCancelSentRequest(request.following_id)}
                  disabled={followLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95"
                  style={{ background: "white", borderColor: IOS_SEP }}
                  aria-label="Annuler la demande"
                >
                  <X className="h-5 w-5" color={DEMANDES_RED} strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const UserRows = ({
    users,
    mode,
  }: {
    users: FollowUser[];
    mode: "followers" | "following";
  }) => {
    const isViewingOwnProfile = !targetUserId || targetUserId === user?.id;

    if (users.length === 0) return emptyBlock;

    return (
      <div
        className="overflow-hidden bg-white"
        style={{
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        {users.map((userItem, index) => (
          <div key={userItem.user_id}>
            {index > 0 ? <div className="ml-[76px] h-px" style={{ background: IOS_SEP }} /> : null}
            <div
              className={cn(
                "flex cursor-pointer items-center gap-3 px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/40"
              )}
              onClick={() => navigateToUserProfile(userItem.user_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigateToUserProfile(userItem.user_id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="relative h-14 w-14 shrink-0">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={userItem.avatar_url || undefined} />
                  <AvatarFallback
                    className="text-lg font-extrabold"
                    style={{ background: "#E5E5EA", color: "#8E8E93" }}
                  >
                    {(userItem.display_name?.[0] || userItem.username?.[0] || "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <OnlineStatus userId={userItem.user_id} networksMaquette />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[17px] font-extrabold"
                  style={{ color: TITLE_INK, letterSpacing: "-0.01em" }}
                >
                  {userItem.display_name || userItem.username}
                </p>
                <p className="mt-0.5 truncate text-sm" style={{ color: "#8E8E93" }}>
                  @{userItem.username}
                </p>
              </div>

              {isViewingOwnProfile && mode === "followers" && !userItem.isFollowingBack && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => void handleFollowBack(userItem.user_id)}
                    disabled={followLoading}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border-[1.5px] px-4 py-2 transition-transform active:scale-[0.97]"
                    style={{ borderColor: ACTION_BLUE, background: "white" }}
                  >
                    <UserPlus className="h-4 w-4" color={ACTION_BLUE} strokeWidth={2.4} />
                    <span className="text-[15px] font-bold" style={{ color: ACTION_BLUE }}>
                      Suivre
                    </span>
                  </button>
                </div>
              )}

              {isViewingOwnProfile && mode === "followers" && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() =>
                      openConfirmDialog(
                        "remove",
                        userItem.user_id,
                        userItem.display_name || userItem.username
                      )
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                    style={{ background: NETWORKS_BG }}
                    aria-label="Retirer abonné"
                  >
                    <UserMinus className="h-5 w-5" color="#8E8E93" strokeWidth={2.2} />
                  </button>
                </div>
              )}

              {isViewingOwnProfile && mode === "following" && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() =>
                      openConfirmDialog(
                        "unfollow",
                        userItem.user_id,
                        userItem.display_name || userItem.username
                      )
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                    style={{ background: NETWORKS_BG }}
                    aria-label="Se désabonner"
                  >
                    <UserMinus className="h-5 w-5" color="#8E8E93" strokeWidth={2.2} />
                  </button>
                </div>
              )}

              {!isViewingOwnProfile && (
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const loadingBlock = (
    <div className="flex flex-1 items-center justify-center py-16">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: ACTION_BLUE }}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        fullScreen
        stackNested
        className="z-[160] flex flex-col gap-0 overflow-hidden p-0"
        style={{
          background: NETWORKS_BG,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        }}
      >
        {/* HEADER */}
        <div
          className="flex shrink-0 items-center px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))]"
          style={{ background: "white", borderBottom: `1px solid ${IOS_SEP}` }}
        >
          <div className="w-9 shrink-0" />
          <h1
            className="m-0 flex-1 text-center text-[22px] font-extrabold tracking-[-0.02em]"
            style={{ color: TITLE_INK }}
          >
            Réseaux
          </h1>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" color="#8E8E93" strokeWidth={2.4} />
          </button>
        </div>

        {/* PILLS */}
        <div
          className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3 [-webkit-overflow-scrolling:touch]"
          style={{ background: "white", borderBottom: `1px solid ${IOS_SEP}` }}
        >
          {mainTabs.map((t) => {
            const sel = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className="flex shrink-0 items-center gap-2 transition-transform active:scale-[0.97]"
                style={{
                  background: sel ? t.activeColor : "white",
                  color: sel ? "white" : TITLE_INK,
                  borderRadius: 9999,
                  padding: "10px 18px 10px 14px",
                  fontWeight: 700,
                  fontSize: 16,
                  border: sel ? "none" : `1px solid ${IOS_SEP}`,
                  boxShadow: sel
                    ? `0 2px 8px ${t.activeColor}40`
                    : "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                <span className="shrink-0 tracking-[-0.01em]">{t.label}</span>
                <span
                  className="shrink-0 rounded-full px-2 py-px text-[13px] font-extrabold tabular-nums"
                  style={{
                    background: sel ? "rgba(0,0,0,0.18)" : "#D9E8FF",
                    color: sel ? "white" : ACTION_BLUE,
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* SOUS-TABS DEMANDES */}
        {activeTab === "requests" && showRequestsTab && (
          <div className="flex shrink-0 gap-2 px-4 pt-3" style={{ background: NETWORKS_BG }}>
            {(
              [
                { id: "received" as const, label: "Reçues", count: pendingRequests.length },
                { id: "sent" as const, label: "Envoyées", count: sentPendingRequests.length },
              ] as const
            ).map((sub) => {
              const sel = requestsSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setRequestsSubTab(sub.id)}
                  className="flex flex-1 items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  style={{
                    background: sel ? ACTION_BLUE : "white",
                    color: sel ? "white" : TITLE_INK,
                    borderRadius: 9999,
                    padding: 10,
                    fontWeight: 700,
                    fontSize: 15,
                    border: sel ? "none" : `1px solid ${IOS_SEP}`,
                  }}
                >
                  <span>{sub.label}</span>
                  <span
                    className="rounded-full px-[7px] py-px text-xs font-extrabold tabular-nums"
                    style={{
                      background: sel ? "rgba(0,0,0,0.18)" : "#D9E8FF",
                      color: sel ? "white" : ACTION_BLUE,
                    }}
                  >
                    {sub.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* LISTE */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3"
          style={{ background: NETWORKS_BG }}
        >
          {activeTab === "followers" &&
            (loading ? loadingBlock : <UserRows users={followers} mode="followers" />)}

          {activeTab === "following" &&
            (loading ? loadingBlock : <UserRows users={following} mode="following" />)}

          {activeTab === "requests" && showRequestsTab && (
            <>
              {loading
                ? loadingBlock
                : requestsSubTab === "received"
                  ? <PendingRequestsRows />
                  : <SentPendingRows />}
            </>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {confirmDialog.type === 'unfollow' ? 'Ne plus suivre ?' : 'Supprimer l\'abonné ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'unfollow'
                ? `Êtes-vous sûr de vouloir ne plus suivre ${confirmDialog.userName} ? Vous pourrez le/la suivre à nouveau plus tard.`
                : `Êtes-vous sûr de vouloir supprimer ${confirmDialog.userName} de vos abonnés ? Cette personne ne vous suivra plus.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[8px]">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirm()}
              className="rounded-[8px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
