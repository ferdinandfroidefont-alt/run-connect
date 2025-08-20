import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, UserPlus, UserMinus, Crown, Heart, MapPin, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { OnlineStatus } from "@/components/OnlineStatus";

interface Profile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  is_premium: boolean;
  created_at: string;
  walking_records: any;
  running_records: any;
  cycling_records: any;
  swimming_records: any;
  triathlon_records: any;
}

interface ProfilePreviewDialogProps {
  userId: string | null;
  onClose: () => void;
}

export const ProfilePreviewDialog = ({ userId, onClose }: ProfilePreviewDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // If user is viewing their own profile, show a simplified version or redirect
  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      if (!isOwnProfile) {
        checkFollowStatus();
      }
      fetchFollowCounts();
    }
  }, [userId, user, isOwnProfile]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, age, bio, is_premium, created_at, walking_records, running_records, cycling_records, swimming_records, triathlon_records')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !userId) return;

    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .eq('status', 'accepted')
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowCounts = async () => {
    if (!userId) return;

    try {
      // Count followers
      const { data: followerData } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId)
        .eq('status', 'accepted');

      // Count following
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId)
        .eq('status', 'accepted');

      setFollowerCount(followerData?.length || 0);
      setFollowingCount(followingData?.length || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !userId) return;

    setActionLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast({ title: "Vous ne suivez plus cette personne" });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert([{
            follower_id: user.id,
            following_id: userId,
            status: 'accepted' // For now, auto-accept follows
          }]);

        if (error) throw error;

        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast({ title: "Vous suivez maintenant cette personne" });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil utilisateur
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Profile Header */}
            <Card>
              <CardContent className="flex flex-col items-center py-6">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-lg">
                    {(profile.username || profile.display_name)?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-semibold">
                    {profile.username || profile.display_name}
                  </h2>
                  {profile.is_premium && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                {/* Online Status */}
                <div className="mb-2">
                  <OnlineStatus userId={profile.user_id} showText size="md" />
                </div>

                {profile.is_premium && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 mb-4">
                    Premium
                  </Badge>
                )}

                {isOwnProfile && (
                  <Badge variant="secondary" className="mb-4">
                    Votre profil
                  </Badge>
                )}

                <div className="flex gap-4 mb-4">
                  <div className="text-center">
                    <p className="font-bold text-lg">{followerCount}</p>
                    <p className="text-sm text-muted-foreground">Abonnés</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{followingCount}</p>
                    <p className="text-sm text-muted-foreground">Abonnements</p>
                  </div>
                </div>

                {!isOwnProfile && user && (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={actionLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className="w-full"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : isFollowing ? (
                      <UserMinus className="h-4 w-4 mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    {actionLoading 
                      ? "Chargement..." 
                      : isFollowing 
                      ? "Ne plus suivre" 
                      : "Suivre"
                    }
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Bio */}
            {profile.bio && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-primary" />
                    <span className="font-medium">À propos</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Age - Only show for own profile */}
            {profile.age && isOwnProfile && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">Âge</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.age} ans</p>
                </CardContent>
              </Card>
            )}

            {/* Sports Records - Show to everyone (public records) */}
            {(
              <>
                {/* Walking Records */}
                {profile.walking_records && Object.keys(profile.walking_records).length > 0 && Object.values(profile.walking_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🚶‍♂️ Records Marche</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.walking_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Running Records */}
                {profile.running_records && Object.keys(profile.running_records).length > 0 && Object.values(profile.running_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🏃‍♂️ Records Course à pied</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.running_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cycling Records */}
                {profile.cycling_records && Object.keys(profile.cycling_records).length > 0 && Object.values(profile.cycling_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🚴‍♂️ Records Cyclisme</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.cycling_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Swimming Records */}
                {profile.swimming_records && Object.keys(profile.swimming_records).length > 0 && Object.values(profile.swimming_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🏊‍♂️ Records Natation</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.swimming_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Member since */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">Membre depuis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-muted-foreground">Profil non trouvé</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};