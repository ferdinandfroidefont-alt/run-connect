import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Check, X, User, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export const NotificationCenter = ({ onSessionUpdated }: NotificationCenterProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleAcceptRequest = async (notification: Notification) => {
    if (!user || notification.type !== 'session_request') return;

    setLoading(true);
    try {
      const { session_id, request_user_id } = notification.data;

      // Add user to session participants
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert([{
          session_id,
          user_id: request_user_id
        }]);

      if (participantError) throw participantError;

      // Update session participant count
      const { data: session } = await supabase
        .from('sessions')
        .select('current_participants')
        .eq('id', session_id)
        .single();

      if (session) {
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            current_participants: (session.current_participants || 0) + 1
          })
          .eq('id', session_id);

        if (updateError) throw updateError;
      }

      // Update request status
      const { error: requestError } = await supabase
        .from('session_requests')
        .update({ status: 'accepted' })
        .eq('session_id', session_id)
        .eq('user_id', request_user_id);

      if (requestError) throw requestError;

      // Mark notification as read
      await markAsRead(notification.id);

      // Create notification for requester
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: request_user_id,
          title: 'Demande acceptée !',
          message: `Votre demande pour rejoindre "${notification.data.session_title}" a été acceptée`,
          type: 'session_accepted'
        }]);

      if (notificationError) console.error('Error creating notification:', notificationError);

      toast({ title: "Demande acceptée", description: "L'utilisateur a été ajouté à la séance" });
      onSessionUpdated?.();
      fetchNotifications();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (notification: Notification) => {
    if (!user || notification.type !== 'session_request') return;

    setLoading(true);
    try {
      const { session_id, request_user_id } = notification.data;

      // Update request status
      const { error: requestError } = await supabase
        .from('session_requests')
        .update({ status: 'rejected' })
        .eq('session_id', session_id)
        .eq('user_id', request_user_id);

      if (requestError) throw requestError;

      // Mark notification as read
      await markAsRead(notification.id);

      // Create notification for requester
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: request_user_id,
          title: 'Demande refusée',
          message: `Votre demande pour rejoindre "${notification.data.session_title}" a été refusée`,
          type: 'session_rejected'
        }]);

      if (notificationError) console.error('Error creating notification:', notificationError);

      toast({ title: "Demande refusée" });
      fetchNotifications();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle follow request acceptance
  const handleAcceptFollow = async (notification: Notification) => {
    if (!user || notification.type !== 'follow_request') return;

    setLoading(true);
    try {
      const { follow_id, follower_id } = notification.data;

      // Accept the follow request
      const { error } = await supabase.rpc('accept_follow_request', { 
        follow_id: follow_id 
      });

      if (error) throw error;

      // Mark notification as read
      await markAsRead(notification.id);

      // Create notification for follower
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: follower_id,
          title: 'Demande acceptée !',
          message: 'Votre demande de suivi a été acceptée',
          type: 'follow_accepted'
        }]);

      if (notificationError) console.error('Error creating notification:', notificationError);

      toast({ title: "Demande acceptée", description: "Vous avez un nouvel abonné" });
      fetchNotifications();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', follow_id);

      if (error) throw error;

      // Mark notification as read
      await markAsRead(notification.id);

      toast({ title: "Demande refusée" });
      fetchNotifications();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="relative cursor-pointer">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} nouvelle${unreadCount > 1 ? 's' : ''} notification${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune notification
            </p>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className={`${!notification.read ? 'border-primary bg-primary/5' : ''}`}>
                <CardContent className="p-4">
                   <div className="flex items-start gap-3">
                     <div className="flex-shrink-0">
                       {notification.type === 'follow_request' ? (
                         <UserPlus className="h-5 w-5 text-primary" />
                       ) : (
                         <User className="h-5 w-5 text-primary" />
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between mb-1">
                         <h4 className="text-sm font-medium">{notification.title}</h4>
                         {!notification.read && (
                           <Badge variant="secondary" className="text-xs">Nouveau</Badge>
                         )}
                       </div>
                       <p className="text-sm text-muted-foreground mb-2">
                         {notification.message}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {format(new Date(notification.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                       </p>
                       
                       {notification.type === 'session_request' && !notification.read && (
                         <>
                           <Separator className="my-3" />
                           <div className="flex gap-2">
                             <Button
                               size="sm"
                               onClick={() => handleAcceptRequest(notification)}
                               disabled={loading}
                               className="flex-1"
                             >
                               <Check className="h-4 w-4 mr-1" />
                               Accepter
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleRejectRequest(notification)}
                               disabled={loading}
                               className="flex-1"
                             >
                               <X className="h-4 w-4 mr-1" />
                               Refuser
                             </Button>
                           </div>
                         </>
                       )}

                       {notification.type === 'follow_request' && !notification.read && (
                         <>
                           <Separator className="my-3" />
                           <div className="flex gap-2">
                             <Button
                               size="sm"
                               onClick={() => handleAcceptFollow(notification)}
                               disabled={loading}
                               className="flex-1"
                             >
                               <Check className="h-4 w-4 mr-1" />
                               Accepter
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleRejectFollow(notification)}
                               disabled={loading}
                               className="flex-1"
                             >
                               <X className="h-4 w-4 mr-1" />
                               Refuser
                             </Button>
                           </div>
                         </>
                       )}
                     </div>
                   </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};