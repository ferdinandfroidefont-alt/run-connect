import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSendNotification } from "@/hooks/useSendNotification";

export interface FollowStatus {
  isFollowing: boolean;
  isPending: boolean;
  isFollowedBy: boolean;
  isPendingFromThem: boolean;
}

export const useFollow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);

  const checkFollowStatus = useCallback(async (targetUserId: string): Promise<FollowStatus> => {
    if (!user || !targetUserId || user.id === targetUserId) {
      return { isFollowing: false, isPending: false, isFollowedBy: false, isPendingFromThem: false };
    }

    try {
      // Check if I'm following them
      const { data: myFollow } = await supabase
        .from('user_follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      // Check if they're following me
      const { data: theirFollow } = await supabase
        .from('user_follows')
        .select('status')
        .eq('follower_id', targetUserId)
        .eq('following_id', user.id)
        .maybeSingle();

      return {
        isFollowing: myFollow?.status === 'accepted',
        isPending: myFollow?.status === 'pending',
        isFollowedBy: theirFollow?.status === 'accepted',
        isPendingFromThem: theirFollow?.status === 'pending',
      };
    } catch (error) {
      console.error('Error checking follow status:', error);
      return { isFollowing: false, isPending: false, isFollowedBy: false, isPendingFromThem: false };
    }
  }, [user]);

  const sendFollowRequest = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !targetUserId) return false;

    try {
      setLoading(true);

      // Check if already exists
      const { data: existing } = await supabase
        .from('user_follows')
        .select('id, status')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Demande déjà envoyée",
          description: "Vous avez déjà envoyé une demande de suivi",
        });
        return false;
      }

      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      // Get my profile for notification
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (myProfile) {
        await sendPushNotification(
          targetUserId,
          'Nouvelle demande de suivi',
          `${myProfile.display_name || myProfile.username} souhaite vous suivre`,
          'follow_request',
          {
            follower_id: user.id,
            follower_name: myProfile.display_name || myProfile.username,
            follower_avatar: myProfile.avatar_url
          }
        );
      }

      toast({ title: "Demande de suivi envoyée" });
      return true;
    } catch (error: any) {
      console.error('Error sending follow request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande de suivi",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, sendPushNotification]);

  const cancelFollowRequest = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !targetUserId) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .eq('status', 'pending');

      if (error) throw error;

      toast({ title: "Demande de suivi annulée" });
      return true;
    } catch (error: any) {
      console.error('Error canceling follow request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la demande",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const acceptFollowRequest = useCallback(async (followerId: string): Promise<boolean> => {
    if (!user || !followerId) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_follows')
        .update({ status: 'accepted' })
        .eq('follower_id', followerId)
        .eq('following_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Get my profile for notification
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();

      if (myProfile) {
        await sendPushNotification(
          followerId,
          'Demande acceptée ! 🎉',
          `${myProfile.display_name || myProfile.username} a accepté votre demande. Vous pouvez maintenant lui envoyer des messages !`,
          'follow_accepted',
          { accepted_by: user.id, can_message: true }
        );
      }

      toast({ title: "Demande de suivi acceptée" });
      return true;
    } catch (error: any) {
      console.error('Error accepting follow request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accepter la demande",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, sendPushNotification]);

  const rejectFollowRequest = useCallback(async (followerId: string): Promise<boolean> => {
    if (!user || !followerId) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      toast({ title: "Demande de suivi refusée" });
      return true;
    } catch (error: any) {
      console.error('Error rejecting follow request:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la demande",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const unfollow = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !targetUserId) return false;

    try {
      setLoading(true);

      // DELETE instead of UPDATE to 'unfollowed'
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      toast({ title: "Vous ne suivez plus cette personne" });
      return true;
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se désabonner",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const removeFollower = useCallback(async (followerUserId: string): Promise<boolean> => {
    if (!user || !followerUserId) return false;

    try {
      setLoading(true);

      // DELETE instead of UPDATE to 'unfollowed'
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', followerUserId)
        .eq('following_id', user.id);

      if (error) throw error;

      await sendPushNotification(
        followerUserId,
        'Abonné supprimé',
        'Un utilisateur a supprimé votre abonnement',
        'follower_removed',
        { removed_by: user.id }
      );

      toast({ title: "Abonné supprimé" });
      return true;
    } catch (error: any) {
      console.error('Error removing follower:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cet abonné",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, sendPushNotification]);

  const followBack = useCallback(async (targetUserId: string): Promise<boolean> => {
    return sendFollowRequest(targetUserId);
  }, [sendFollowRequest]);

  const getPendingRequests = useCallback(async (): Promise<Array<{
    id: string;
    follower_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>> => {
    if (!user) return [];

    try {
      const { data: pendingFollows } = await supabase
        .from('user_follows')
        .select('id, follower_id, created_at')
        .eq('following_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!pendingFollows || pendingFollows.length === 0) return [];

      const followerIds = pendingFollows.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', followerIds);

      return pendingFollows.map(follow => {
        const profile = profiles?.find(p => p.user_id === follow.follower_id);
        return {
          id: follow.id,
          follower_id: follow.follower_id,
          username: profile?.username || '',
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          created_at: follow.created_at,
        };
      });
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }, [user]);

  const getSentPendingRequests = useCallback(async (): Promise<Array<{
    id: string;
    following_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>> => {
    if (!user) return [];

    try {
      const { data: pendingFollows } = await supabase
        .from('user_follows')
        .select('id, following_id, created_at')
        .eq('follower_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!pendingFollows || pendingFollows.length === 0) return [];

      const followingIds = pendingFollows.map(f => f.following_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', followingIds);

      return pendingFollows.map(follow => {
        const profile = profiles?.find(p => p.user_id === follow.following_id);
        return {
          id: follow.id,
          following_id: follow.following_id,
          username: profile?.username || '',
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          created_at: follow.created_at,
        };
      });
    } catch (error) {
      console.error('Error fetching sent pending requests:', error);
      return [];
    }
  }, [user]);

  return {
    loading,
    checkFollowStatus,
    sendFollowRequest,
    cancelFollowRequest,
    acceptFollowRequest,
    rejectFollowRequest,
    unfollow,
    removeFollower,
    followBack,
    getPendingRequests,
    getSentPendingRequests,
  };
};
