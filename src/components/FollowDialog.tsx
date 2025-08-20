import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserCheck, Heart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { OnlineStatus } from "@/components/OnlineStatus";

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
}

export const FollowDialog = ({ 
  open, 
  onOpenChange, 
  type, 
  followerCount, 
  followingCount 
}: FollowDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchFollowData();
    }
  }, [open, user]);

  const fetchFollowData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch followers (people who follow me)
      const { data: followersData } = await supabase
        .from('user_follows')
        .select('follower_id, status')
        .eq('following_id', user.id)
        .eq('status', 'accepted');

      // Fetch following (people I follow)  
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id, status')
        .eq('follower_id', user.id)
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

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      // Remove from following list
      setFollowing(prev => prev.filter(u => u.user_id !== targetUserId));
      toast({
        title: "Désabonné",
        description: "Vous ne suivez plus cet utilisateur"
      });
    } catch (error: any) {
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
        .delete()
        .eq('follower_id', followerUserId)
        .eq('following_id', user.id);

      if (error) throw error;

      // Remove from followers list
      setFollowers(prev => prev.filter(u => u.user_id !== followerUserId));
      toast({
        title: "Abonné supprimé",
        description: "Cet utilisateur ne vous suit plus"
      });
    } catch (error: any) {
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
  }) => (
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
                 <Avatar className="h-12 w-12">
                   <AvatarImage src={userItem.avatar_url} />
                   <AvatarFallback>
                     {userItem.username?.[0] || userItem.display_name?.[0] || '?'}
                   </AvatarFallback>
                 </Avatar>
                 <div className="flex-1">
                   <div className="flex items-center gap-2">
                     <p className="font-medium">
                       {userItem.username || userItem.display_name}
                     </p>
                     <OnlineStatus userId={userItem.user_id} size="sm" />
                   </div>
                   <p className="text-sm text-muted-foreground">
                     @{userItem.username}
                   </p>
                   <OnlineStatus userId={userItem.user_id} showText size="sm" className="mt-1" />
                 </div>
               </div>
              {showUnfollowButton && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unfollowUser(userItem.user_id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Ne plus suivre
                </Button>
              )}
              {showRemoveButton && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeFollower(userItem.user_id)}
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
    </Dialog>
  );
};