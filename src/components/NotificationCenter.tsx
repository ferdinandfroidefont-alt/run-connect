import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIsIosPhoneLayout } from "@/hooks/useIsIosPhoneLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { Bell, Check, X, User, UserPlus, UserCheck, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  data: any;
}
interface NotificationCenterProps {
  onSessionUpdated?: () => void;
}
export const NotificationCenter = ({
  onSessionUpdated
}: NotificationCenterProps) => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    sendPushNotification
  } = useSendNotification();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [profilePreviewUserId, setProfilePreviewUserId] = useState<string | null>(null);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [acceptedFollows, setAcceptedFollows] = useState<Set<string>>(new Set());
  const [followedBack, setFollowedBack] = useState<Set<string>>(new Set());
  const [alreadyFollowing, setAlreadyFollowing] = useState<Set<string>>(new Set());
  const [pendingAcceptNotification, setPendingAcceptNotification] = useState<Notification | null>(null);
  const [pendingRejectNotification, setPendingRejectNotification] = useState<Notification | null>(null);
  const [pendingAcceptClubNotification, setPendingAcceptClubNotification] = useState<Notification | null>(null);
  const [pendingDeclineClubNotification, setPendingDeclineClubNotification] = useState<Notification | null>(null);
  const [pendingAcceptFollowNotification, setPendingAcceptFollowNotification] = useState<Notification | null>(null);
  const [pendingRejectFollowNotification, setPendingRejectFollowNotification] = useState<Notification | null>(null);
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };
  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Set up real-time subscription for new notifications
      const channel = supabase.channel('notifications').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        console.log('New notification received:', payload);
        const newNotification = payload.new as Notification;
        // Deduplicate: don't add if already in list
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotification.id)) return prev;
          return [newNotification, ...prev];
        });

        // Show toast for new notification
        toast({
          title: newNotification.title,
          description: newNotification.message
        });
      }).on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        const updatedNotification = payload.new as Notification;
        setNotifications(prev => prev.map(n => n.id === updatedNotification.id ? updatedNotification : n));
      }).on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        const deletedNotification = payload.old as Notification;
        setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast]);

  // Check actual follow status for all follow_request notifications (source of truth)
  const [followStatuses, setFollowStatuses] = useState<Map<string, string>>(new Map());
  
  useEffect(() => {
    const checkFollowStatuses = async () => {
      if (!user || notifications.length === 0) return;
      const followRequestNotifs = notifications.filter(n => n.type === 'follow_request' && n.data?.follower_id);
      if (followRequestNotifs.length === 0) return;
      
      const followerIds = [...new Set(followRequestNotifs.map(n => n.data.follower_id))];
      
      // Check actual user_follows status for each follower -> me
      const { data: incomingFollows } = await supabase
        .from('user_follows')
        .select('follower_id, status')
        .eq('following_id', user.id)
        .in('follower_id', followerIds);
      
      // Check if I already follow them back
      const { data: outgoingFollows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', followerIds);
      
      const statusMap = new Map<string, string>();
      for (const fid of followerIds) {
        const incoming = incomingFollows?.find(f => f.follower_id === fid);
        statusMap.set(fid, incoming?.status || 'none');
      }
      setFollowStatuses(statusMap);
      
      if (outgoingFollows && outgoingFollows.length > 0) {
        setAlreadyFollowing(new Set(outgoingFollows.map(f => f.following_id)));
      }
    };
    checkFollowStatuses();
  }, [user, notifications]);
  const handleAcceptClubInvitation = async (notification: Notification) => {
    if (!user || notification.type !== 'club_invitation') return;
    setLoading(true);
    try {
      const {
        invitation_id
      } = notification.data;

      // Appeler la fonction pour accepter l'invitation
      const {
        data,
        error
      } = await supabase.rpc('accept_club_invitation', {
        invitation_id
      });
      if (error) throw error;
      if (data) {
        // Insert system message: "a rejoint le club"
        const clubId = notification.data?.club_id;
        if (clubId) {
          await supabase.from('messages').insert([{
            conversation_id: clubId,
            sender_id: user.id,
            content: 'a rejoint le club',
            message_type: 'system'
          }]);
        }

        toast({
          title: "Succès",
          description: "Vous avez rejoint le club !"
        });

        // Marquer la notification comme lue
        await supabase.from('notifications').update({
          read: true
        }).eq('id', notification.id);
        fetchNotifications();
        onSessionUpdated?.();
      } else {
        toast({
          title: "Erreur",
          description: "Invitation introuvable ou expirée",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error accepting club invitation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accepter l'invitation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setPendingAcceptClubNotification(null);
    }
  };
  
  const confirmAcceptClubInvitation = (notification: Notification) => {
    setPendingAcceptClubNotification(notification);
  };
  const handleDeclineClubInvitation = async (notification: Notification) => {
    if (!user || notification.type !== 'club_invitation') return;
    setLoading(true);
    try {
      const {
        invitation_id
      } = notification.data;

      // Appeler la fonction pour refuser l'invitation
      const {
        data,
        error
      } = await supabase.rpc('decline_club_invitation', {
        invitation_id
      });
      if (error) throw error;
      toast({
        title: "Invitation refusée",
        description: "L'invitation a été refusée"
      });

      // Marquer la notification comme lue
      await supabase.from('notifications').update({
        read: true
      }).eq('id', notification.id);
      fetchNotifications();
    } catch (error: any) {
      console.error('Error declining club invitation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser l'invitation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setPendingDeclineClubNotification(null);
    }
  };
  
  const confirmDeclineClubInvitation = (notification: Notification) => {
    setPendingDeclineClubNotification(notification);
  };
  const handleAcceptRequest = async (notification: Notification) => {
    if (!user || notification.type !== 'session_request') return;
    setLoading(true);
    try {
      const {
        session_id,
        request_user_id
      } = notification.data;

      // FIRST: Update request status to 'accepted'
      const {
        error: requestError
      } = await supabase.from('session_requests').update({
        status: 'accepted'
      }).eq('session_id', session_id).eq('user_id', request_user_id);
      if (requestError) throw requestError;

      // THEN: Add user to session participants
      const {
        error: participantError
      } = await supabase.from('session_participants').insert([{
        session_id,
        user_id: request_user_id
      }]);
      if (participantError) throw participantError;

      // Update session participant count
      const {
        data: session
      } = await supabase.from('sessions').select('current_participants').eq('id', session_id).single();
      if (session) {
        const {
          error: updateError
        } = await supabase.from('sessions').update({
          current_participants: (session.current_participants || 0) + 1
        }).eq('id', session_id);
        if (updateError) throw updateError;
      }

      // Mark notification as read
      await markAsRead(notification.id);

      // Create notification for requester
      const {
        error: notificationError
      } = await supabase.from('notifications').insert([{
        user_id: request_user_id,
        title: 'Demande acceptée !',
        message: `Votre demande pour rejoindre "${notification.data.session_title}" a été acceptée`,
        type: 'session_accepted'
      }]);
      if (notificationError) console.error('Error creating notification:', notificationError);

      // Envoyer notification push
      await sendPushNotification(request_user_id, 'Demande acceptée !', `Votre demande pour rejoindre "${notification.data.session_title}" a été acceptée`, 'session_accepted', {
        session_id,
        session_title: notification.data.session_title
      });
      toast({
        title: "Demande acceptée",
        description: "L'utilisateur a été ajouté à la séance"
      });
      onSessionUpdated?.();
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setPendingAcceptNotification(null);
    }
  };
  
  const confirmAcceptRequest = (notification: Notification) => {
    setPendingAcceptNotification(notification);
  };
  const handleRejectRequest = async (notification: Notification) => {
    if (!user || notification.type !== 'session_request') return;
    setLoading(true);
    try {
      const {
        session_id,
        request_user_id
      } = notification.data;

      // Update request status
      const {
        error: requestError
      } = await supabase.from('session_requests').update({
        status: 'rejected'
      }).eq('session_id', session_id).eq('user_id', request_user_id);
      if (requestError) throw requestError;

      // Mark notification as read
      await markAsRead(notification.id);

      // Create notification for requester
      const {
        error: notificationError
      } = await supabase.from('notifications').insert([{
        user_id: request_user_id,
        title: 'Demande refusée',
        message: `Votre demande pour rejoindre "${notification.data.session_title}" a été refusée`,
        type: 'session_rejected'
      }]);
      if (notificationError) console.error('Error creating notification:', notificationError);
      toast({
        title: "Demande refusée"
      });
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setPendingRejectNotification(null);
    }
  };
  
  const confirmRejectRequest = (notification: Notification) => {
    setPendingRejectNotification(notification);
  };

  // Handle follow request acceptance
  const handleAcceptFollow = async (notification: Notification) => {
    if (!user || notification.type !== 'follow_request') return;
    setLoading(true);
    try {
      const { follow_id, follower_id } = notification.data;

      // Accept the follow request
      const { error } = await supabase.rpc('accept_follow_request', { follow_id });
      if (error) throw error;

      // Mark ALL follow_request notifications from this follower as read (handles duplicates)
      const relatedNotifIds = notifications
        .filter(n => n.type === 'follow_request' && n.data?.follower_id === follower_id)
        .map(n => n.id);
      
      for (const nid of relatedNotifIds) {
        await supabase.from('notifications').update({ read: true }).eq('id', nid);
      }

      // Optimistic UI: update local state immediately
      setAcceptedFollows(prev => new Set([...prev, ...relatedNotifIds]));
      setFollowStatuses(prev => new Map(prev).set(follower_id, 'accepted'));
      setNotifications(prev => prev.map(n => 
        relatedNotifIds.includes(n.id) ? { ...n, read: true } : n
      ));

      // Send push notification (FCM only, DB insert skipped by edge function)
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, user_id')
        .eq('user_id', user.id)
        .single();
      
      const acceptorName = currentUserProfile?.display_name || 'Un utilisateur';
      await sendPushNotification(
        follower_id,
        'Demande acceptée ! 🎉',
        `${acceptorName} a accepté votre demande de suivi`,
        'follow_accepted',
        { acceptor_id: user.id, acceptor_name: acceptorName, acceptor_avatar: currentUserProfile?.avatar_url }
      );

      toast({ title: "Demande acceptée", description: "Vous avez un nouvel abonné" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setPendingAcceptFollowNotification(null);
    }
  };
  
  const confirmAcceptFollow = (notification: Notification) => {
    setPendingAcceptFollowNotification(notification);
  };

  // Handle follow back - follow the person who followed us
  const handleFollowBack = async (notification: Notification) => {
    if (!user || notification.type !== 'follow_request') return;
    setLoading(true);
    try {
      const {
        follower_id,
        follower_name
      } = notification.data;

      // Check if already following
      const {
        data: existingFollow
      } = await supabase.from('user_follows').select('id').eq('follower_id', user.id).eq('following_id', follower_id).single();
      if (existingFollow) {
        toast({
          title: "Déjà suivi",
          description: "Vous suivez déjà cette personne"
        });
        return;
      }

      // Create follow relationship
      const {
        error
      } = await supabase.from('user_follows').insert([{
        follower_id: user.id,
        following_id: follower_id,
        status: 'accepted'
      }]);
      if (error) throw error;

      // Marquer comme suivi en retour
      setFollowedBack(prev => new Set([...prev, notification.id]));
      setAlreadyFollowing(prev => new Set([...prev, follower_id]));

      // Send push notification only (avoid duplicate DB notifications)
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();

      await sendPushNotification(
        follower_id,
        'Nouveau suivi !',
        `${myProfile?.display_name || myProfile?.username || 'Un utilisateur'} vous suit en retour`,
        'follow_back',
        { followed_by: user.id }
      );

      toast({
        title: "Suivi ajouté",
        description: `Vous suivez maintenant ${follower_name}`
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle follow request rejection
  const handleRejectFollow = async (notification: Notification) => {
    if (!user || notification.type !== 'follow_request') return;
    setLoading(true);
    try {
      const { follow_id, follower_id } = notification.data;

      // Delete the follow request
      const { error } = await supabase.from('user_follows').delete().eq('id', follow_id);
      if (error) throw error;

      // Mark ALL follow_request notifications from this follower as read
      const relatedNotifIds = notifications
        .filter(n => n.type === 'follow_request' && n.data?.follower_id === follower_id)
        .map(n => n.id);
      
      for (const nid of relatedNotifIds) {
        await supabase.from('notifications').update({ read: true }).eq('id', nid);
      }

      // Optimistic UI update
      setFollowStatuses(prev => new Map(prev).set(follower_id, 'none'));
      setNotifications(prev => prev.map(n => 
        relatedNotifIds.includes(n.id) ? { ...n, read: true } : n
      ));

      toast({ title: "Demande refusée" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setPendingRejectFollowNotification(null);
    }
  };
  
  const confirmRejectFollow = (notification: Notification) => {
    setPendingRejectFollowNotification(notification);
  };
  const markAsRead = async (notificationId: string) => {
    try {
      // Mettre à jour l'état local immédiatement pour un feedback visuel instantané
      setNotifications(prev => prev.map(n => n.id === notificationId ? {
        ...n,
        read: true
      } : n));
      const {
        error
      } = await supabase.from('notifications').update({
        read: true
      }).eq('id', notificationId);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const {
        error
      } = await supabase.from('notifications').delete().eq('id', notificationId);
      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée avec succès"
      });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive"
      });
    }
  };
  const handleOpenProfilePreview = (userId: string) => {
    setProfilePreviewUserId(userId);
    setIsProfilePreviewOpen(true);
  };
  // Deduplicate follow_request notifications: keep only most recent per follower_id
  const deduplicatedNotifications = (() => {
    const seenFollowerIds = new Set<string>();
    return notifications.filter(n => {
      if (n.type === 'follow_request' && n.data?.follower_id) {
        if (seenFollowerIds.has(n.data.follower_id)) return false;
        seenFollowerIds.add(n.data.follower_id);
      }
      return true;
    });
  })();

  const unreadCount = deduplicatedNotifications.filter(n => !n.read).length;
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);
  const isIosPhone = useIsIosPhoneLayout();
  return <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            /* Pas h-10 w-10 : sur iOS WebKit, index.css force .h-10.w-10 à 2rem et décale le badge */
            "touch-manipulation relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[13px] border border-[#E5E7EB] bg-white",
            "shadow-[0_1px_3px_rgba(0,0,0,0.06)] outline-none transition-[opacity,transform] active:scale-[0.97] active:opacity-90",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-[22px] w-[22px] text-[#1A1A1A]" strokeWidth={1.85} />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute right-0 top-0 z-[1] min-h-[18px] -translate-y-1/2 translate-x-1/2 rounded-md bg-[#FF3B30] px-1.5",
                "text-center text-[10px] font-semibold leading-[18px] tracking-tight text-white shadow-sm",
                badgeLabel.length > 1 ? "min-w-[26px]" : "min-w-[18px]"
              )}
            >
              {badgeLabel}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="top"
        closeButtonClassName={isIosPhone ? "right-5 top-6" : undefined}
        className={cn(
          "box-border w-full max-w-full min-w-0 h-full min-h-screen border-0 overflow-x-hidden",
          isIosPhone
            ? "mx-auto max-w-lg py-6 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))]"
            : "p-6"
        )}
      >
        {/* Petite barre en haut comme dans MySessions */}
        <div className="w-full h-6 bg-background"></div>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} nouvelle${unreadCount > 1 ? 's' : ''} notification${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-6 h-[calc(100vh-8rem)] w-full min-w-0 max-w-full overflow-x-hidden">
          <div className={cn("min-w-0 max-w-full space-y-ios-3", isIosPhone ? "px-1" : "w-full pr-4")}>
            {deduplicatedNotifications.length === 0 ? <p className="text-center text-muted-foreground py-8">
                Aucune notification
              </p> : deduplicatedNotifications.map(notification => {
              // For follow_request, determine actual state from source of truth
              const followerStatus = notification.type === 'follow_request' && notification.data?.follower_id 
                ? followStatuses.get(notification.data.follower_id) || 'unknown'
                : null;
              const isFollowStillPending = followerStatus === 'pending';
              const isFollowAccepted = followerStatus === 'accepted';
              const isFollowGone = followerStatus === 'none';
              
              return <div key={notification.id} className={cn(
                "ios-card min-w-0 max-w-full overflow-hidden p-ios-4 cursor-pointer transition-colors active:bg-secondary",
                !notification.read && "ring-1 ring-primary/30 bg-primary/5"
              )} onClick={() => {
            if (!notification.read) {
              markAsRead(notification.id);
            }
              const handleNotificationNav = () => {
                const data = notification.data;
                if (notification.type === 'follow_accepted' && data?.acceptor_id) {
                  setIsOpen(false);
                  navigate(`/profile/${data.acceptor_id}`);
                } else if (notification.type === 'follow_request' && data?.follower_id) {
                  return;
                } else if (notification.type === 'session_accepted' && data?.session_id) {
                  setIsOpen(false);
                  navigate('/my-sessions');
                } else if (notification.type === 'session_request' && data?.session_id) {
                  return;
                } else if (notification.type === 'club_invitation') {
                  return;
                } else if (notification.type === 'follow_back' && data?.followed_by) {
                  setIsOpen(false);
                  navigate(`/profile/${data.followed_by}`);
                }
              };
              handleNotificationNav();
          }}>
                   <div className="flex min-w-0 max-w-full items-start gap-3">
                    {/* Avatar for session_request, follow_request, follow_accepted, and club_invitation with user data */}
                      {(notification.type === 'session_request' || notification.type === 'follow_request' || notification.type === 'follow_accepted' || notification.type === 'club_invitation') && notification.data && (notification.data.follower_avatar || notification.data.requester_avatar || notification.data.inviter_avatar || notification.data.acceptor_avatar) ? <div className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleOpenProfilePreview(notification.data.follower_id || notification.data.request_user_id || notification.data.inviter_id || notification.data.acceptor_id)}>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={notification.data.follower_avatar || notification.data.requester_avatar || notification.data.inviter_avatar || notification.data.acceptor_avatar} alt={notification.data.follower_name || notification.data.requester_name || notification.data.inviter_name || notification.data.acceptor_name || 'Utilisateur'} />
                            <AvatarFallback>
                              {(notification.data.follower_name || notification.data.requester_name || notification.data.inviter_name || notification.data.acceptor_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div> : <div className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                  const userId = notification.data?.follower_id || notification.data?.request_user_id || notification.data?.inviter_id || notification.data?.acceptor_id;
                  if (userId) {
                    handleOpenProfilePreview(userId);
                  }
                }}>
                          {notification.type === 'follow_request' ? <UserPlus className="h-5 w-5 text-primary" /> : notification.type === 'follow_accepted' ? <UserCheck className="h-5 w-5 text-green-600" /> : notification.type === 'club_invitation' ? <UserPlus className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-primary" />}
                        </div>}
                     
                     <div className="min-w-0 flex-1 max-w-full overflow-hidden pr-0 sm:pr-2">
                        <div className="mb-1 flex min-w-0 max-w-full items-start justify-between gap-2">
                          <h4 className="min-w-0 flex-1 text-sm font-medium leading-snug [overflow-wrap:anywhere] break-words line-clamp-2 sm:line-clamp-none">
                            {notification.title}
                          </h4>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {!notification.read && <Badge variant="secondary" className="whitespace-nowrap text-xs">Nouveau</Badge>}
                            <Button variant="ghost" size="sm" onClick={e => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }} className="h-7 w-7 shrink-0 p-0 hover:bg-destructive hover:text-destructive-foreground" title="Supprimer la notification">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                       <p className="mb-2 max-w-full text-sm text-muted-foreground [overflow-wrap:anywhere] break-words">
                         {notification.message}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {format(new Date(notification.created_at), "d MMM 'à' HH:mm", {
                      locale: fr
                    })}
                       </p>
                       
                       {notification.type === 'session_request' && !notification.read && <>
                           <Separator className="my-3" />
                           <div className="flex gap-2">
                             <Button size="sm" onClick={() => confirmAcceptRequest(notification)} disabled={loading} className="flex-1">
                               <Check className="h-4 w-4 mr-1" />
                               Accepter
                             </Button>
                             <Button size="sm" variant="outline" onClick={() => confirmRejectRequest(notification)} disabled={loading} className="flex-1">
                               <X className="h-4 w-4 mr-1" />
                               Refuser
                             </Button>
                           </div>
                         </>}

                        {notification.type === 'club_invitation' && !notification.read && <>
                            <Separator className="my-3" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => confirmAcceptClubInvitation(notification)} disabled={loading} className="flex-1">
                                <Check className="h-4 w-4 mr-1" />
                                Rejoindre
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => confirmDeclineClubInvitation(notification)} disabled={loading} className="flex-1">
                                <X className="h-4 w-4 mr-1" />
                                Refuser
                              </Button>
                            </div>
                          </>}

                        {notification.type === 'follow_request' && <>
                           <Separator className="my-3" />
                           <div className="flex flex-col gap-2">
                             {/* Show Accept/Reject only if follow is ACTUALLY still pending */}
                             {isFollowStillPending && !acceptedFollows.has(notification.id) && <div className="flex gap-2">
                                 <Button size="sm" onClick={() => confirmAcceptFollow(notification)} disabled={loading} className="flex-1">
                                   <Check className="h-4 w-4 mr-1" />
                                   Accepter
                                 </Button>
                                 <Button size="sm" variant="outline" onClick={() => confirmRejectFollow(notification)} disabled={loading} className="flex-1">
                                   <X className="h-4 w-4 mr-1" />
                                   Refuser
                                 </Button>
                               </div>}
                              {/* Show accepted state */}
                              {(isFollowAccepted || acceptedFollows.has(notification.id)) && <>
                                {/* Show "follow back" only if not already following */}
                                {!followedBack.has(notification.id) && !alreadyFollowing.has(notification.data?.follower_id) && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleFollowBack(notification); }} disabled={loading} className="w-full">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Ajouter en retour
                                  </Button>}
                                {(followedBack.has(notification.id) || alreadyFollowing.has(notification.data?.follower_id)) && <div className="w-full text-center text-sm text-muted-foreground py-2">
                                    ✓ Vous suivez déjà cette personne
                                  </div>}
                              </>}
                              {/* Show "rejected/gone" passive state */}
                              {isFollowGone && !isFollowStillPending && !isFollowAccepted && !acceptedFollows.has(notification.id) && <div className="w-full text-center text-sm text-muted-foreground py-2">
                                  Demande traitée
                                </div>}
                           </div>
                         </>}
                     </div>
                   </div>
              </div>})}
          </div>
        </ScrollArea>
        
        {/* Profile Preview Dialog */}
        <ProfilePreviewDialog userId={isProfilePreviewOpen ? profilePreviewUserId : null} onClose={() => {
        setIsProfilePreviewOpen(false);
        setProfilePreviewUserId(null);
      }} />
      </SheetContent>

      {/* Accept Request Confirmation Dialog - iOS Style */}
      <AlertDialog open={!!pendingAcceptNotification} onOpenChange={(open) => !open && setPendingAcceptNotification(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Accepter la demande
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Voulez-vous accepter cette demande de participation ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-muted-foreground text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={() => pendingAcceptNotification && handleAcceptRequest(pendingAcceptNotification)}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-primary text-[17px] font-semibold"
            >
              {loading ? "Traitement..." : "Accepter"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Request Confirmation Dialog - iOS Style */}
      <AlertDialog open={!!pendingRejectNotification} onOpenChange={(open) => !open && setPendingRejectNotification(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Refuser la demande
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Voulez-vous refuser cette demande de participation ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-muted-foreground text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={() => pendingRejectNotification && handleRejectRequest(pendingRejectNotification)}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
            >
              {loading ? "Traitement..." : "Refuser"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Club Invitation Confirmation Dialog - iOS Style */}
      <AlertDialog open={!!pendingAcceptClubNotification} onOpenChange={(open) => !open && setPendingAcceptClubNotification(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Rejoindre le club
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Voulez-vous rejoindre ce club ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-muted-foreground text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={() => pendingAcceptClubNotification && handleAcceptClubInvitation(pendingAcceptClubNotification)}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-primary text-[17px] font-semibold"
            >
              {loading ? "Traitement..." : "Rejoindre"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline Club Invitation Confirmation Dialog - iOS Style */}
      <AlertDialog open={!!pendingDeclineClubNotification} onOpenChange={(open) => !open && setPendingDeclineClubNotification(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Refuser l'invitation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Voulez-vous refuser cette invitation au club ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-muted-foreground text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={() => pendingDeclineClubNotification && handleDeclineClubInvitation(pendingDeclineClubNotification)}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
            >
              {loading ? "Traitement..." : "Refuser"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Follow Request Confirmation Dialog - iOS Style */}
      <AlertDialog open={!!pendingAcceptFollowNotification} onOpenChange={(open) => !open && setPendingAcceptFollowNotification(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Accepter l'abonnement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Voulez-vous accepter cette demande d'abonnement ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-muted-foreground text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={() => pendingAcceptFollowNotification && handleAcceptFollow(pendingAcceptFollowNotification)}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-primary text-[17px] font-semibold"
            >
              {loading ? "Traitement..." : "Accepter"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Follow Request Confirmation Dialog - iOS Style */}
      <AlertDialog open={!!pendingRejectFollowNotification} onOpenChange={(open) => !open && setPendingRejectFollowNotification(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Refuser l'abonnement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Voulez-vous refuser cette demande d'abonnement ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-muted-foreground text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={() => pendingRejectFollowNotification && handleRejectFollow(pendingRejectFollowNotification)}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
            >
              {loading ? "Traitement..." : "Refuser"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>;
};