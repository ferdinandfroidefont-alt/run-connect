import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [profilePreviewUserId, setProfilePreviewUserId] = useState<string | null>(null);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [acceptedFollows, setAcceptedFollows] = useState<Set<string>>(new Set());
  const [followedBack, setFollowedBack] = useState<Set<string>>(new Set());
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
        setNotifications(prev => [newNotification, ...prev]);

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
        console.log('Notification updated:', payload);
        const updatedNotification = payload.new as Notification;
        setNotifications(prev => prev.map(n => n.id === updatedNotification.id ? updatedNotification : n));
      }).on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        console.log('Notification deleted:', payload);
        const deletedNotification = payload.old as Notification;
        setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast]);
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
    }
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
    }
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
    }
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
    }
  };

  // Handle follow request acceptance
  const handleAcceptFollow = async (notification: Notification) => {
    if (!user || notification.type !== 'follow_request') return;
    setLoading(true);
    try {
      const {
        follow_id,
        follower_id
      } = notification.data;

      // Accept the follow request
      const {
        error
      } = await supabase.rpc('accept_follow_request', {
        follow_id: follow_id
      });
      if (error) throw error;

      // Marquer la notification comme lue
      await markAsRead(notification.id);

      // Ajouter à la liste des demandes acceptées pour garder les boutons visibles
      setAcceptedFollows(prev => new Set([...prev, notification.id]));

      // Get current user profile data for the notification
      const {
        data: currentUserProfile,
        error: profileError
      } = await supabase.from('profiles').select('display_name, avatar_url, user_id').eq('user_id', user?.id).single();
      console.log('Current user profile for notification:', currentUserProfile);
      console.log('Profile error:', profileError);
      const acceptorName = currentUserProfile?.display_name || 'Un utilisateur';
      console.log('Acceptor name:', acceptorName);

      // Create notification for follower
      const {
        error: notificationError
      } = await supabase.from('notifications').insert([{
        user_id: follower_id,
        title: 'Demande acceptée !',
        message: `${acceptorName} a accepté votre demande de suivi`,
        type: 'follow_accepted',
        data: {
          acceptor_id: user?.id,
          acceptor_name: acceptorName,
          acceptor_avatar: currentUserProfile?.avatar_url
        }
      }]);
      if (notificationError) console.error('Error creating notification:', notificationError);
      toast({
        title: "Demande acceptée",
        description: "Vous avez un nouvel abonné"
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
    }
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

      // Create notification for the person we're following back
      const {
        error: notificationError
      } = await supabase.from('notifications').insert([{
        user_id: follower_id,
        title: 'Nouveau suivi !',
        message: 'Quelqu\'un vous suit en retour',
        type: 'follow_back'
      }]);
      if (notificationError) console.error('Error creating notification:', notificationError);
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
      const {
        follow_id,
        follower_id
      } = notification.data;

      // Delete the follow request
      const {
        error
      } = await supabase.from('user_follows').delete().eq('id', follow_id);
      if (error) throw error;

      // Mark notification as read
      await markAsRead(notification.id);
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
    }
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
  const unreadCount = notifications.filter(n => !n.read).length;
  return <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="relative cursor-pointer">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground mx-[6px]" />
          {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>}
        </div>
      </SheetTrigger>
      <SheetContent side="top" className="w-full h-full min-h-screen p-6 border-0 max-w-none">
        {/* Petite barre en haut comme dans MySessions */}
        <div className="w-full h-6 bg-background"></div>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} nouvelle${unreadCount > 1 ? 's' : ''} notification${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-4 pr-4">
            {notifications.length === 0 ? <p className="text-center text-muted-foreground py-8">
                Aucune notification
              </p> : notifications.map(notification => <Card key={notification.id} className={`${!notification.read ? 'border-primary bg-primary/5' : ''} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => {
            if (!notification.read) {
              markAsRead(notification.id);
            }
          }}>
                <CardContent className="p-4">
                   <div className="flex items-start gap-3">
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
                     
                     <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium truncate">{notification.title}</h4>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {!notification.read && <Badge variant="secondary" className="text-xs">Nouveau</Badge>}
                            <Button variant="ghost" size="sm" onClick={e => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }} className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground" title="Supprimer la notification">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                       <p className="text-sm text-muted-foreground mb-2 break-words pr-8">
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
                             <Button size="sm" onClick={() => handleAcceptRequest(notification)} disabled={loading} className="flex-1">
                               <Check className="h-4 w-4 mr-1" />
                               Accepter
                             </Button>
                             <Button size="sm" variant="outline" onClick={() => handleRejectRequest(notification)} disabled={loading} className="flex-1">
                               <X className="h-4 w-4 mr-1" />
                               Refuser
                             </Button>
                           </div>
                         </>}

                        {notification.type === 'club_invitation' && !notification.read && <>
                            <Separator className="my-3" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAcceptClubInvitation(notification)} disabled={loading} className="flex-1">
                                <Check className="h-4 w-4 mr-1" />
                                Rejoindre
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeclineClubInvitation(notification)} disabled={loading} className="flex-1">
                                <X className="h-4 w-4 mr-1" />
                                Refuser
                              </Button>
                            </div>
                          </>}

                        {notification.type === 'follow_request' && <>
                           <Separator className="my-3" />
                           <div className="flex flex-col gap-2">
                             {/* Montrer accepter/refuser seulement si pas encore accepté */}
                             {!acceptedFollows.has(notification.id) && !notification.read && <div className="flex gap-2">
                                 <Button size="sm" onClick={() => handleAcceptFollow(notification)} disabled={loading} className="flex-1">
                                   <Check className="h-4 w-4 mr-1" />
                                   Accepter
                                 </Button>
                                 <Button size="sm" variant="outline" onClick={() => handleRejectFollow(notification)} disabled={loading} className="flex-1">
                                   <X className="h-4 w-4 mr-1" />
                                   Refuser
                                 </Button>
                               </div>}
                             {/* Montrer "ajouter en retour" si accepté ou si déjà lu, mais pas si déjà suivi en retour */}
                             {(acceptedFollows.has(notification.id) || notification.read) && !followedBack.has(notification.id) && <Button size="sm" variant="secondary" onClick={() => handleFollowBack(notification)} disabled={loading} className="w-full">
                                 <UserPlus className="h-4 w-4 mr-2" />
                                 Ajouter en retour
                               </Button>}
                             {/* Montrer confirmation si déjà suivi en retour */}
                             {followedBack.has(notification.id) && <div className="w-full text-center text-sm text-muted-foreground py-2">
                                 ✓ Vous suivez maintenant cette personne en retour
                               </div>}
                           </div>
                         </>}
                     </div>
                   </div>
                </CardContent>
              </Card>)}
          </div>
        </ScrollArea>
        
        {/* Profile Preview Dialog */}
        <ProfilePreviewDialog userId={isProfilePreviewOpen ? profilePreviewUserId : null} onClose={() => {
        setIsProfilePreviewOpen(false);
        setProfilePreviewUserId(null);
      }} />
      </SheetContent>
    </Sheet>;
};