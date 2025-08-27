import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { SettingsDialog } from "./SettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { User, UserPlus, UserMinus, Crown, Heart, MapPin, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Profile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  is_premium: boolean;
  is_admin?: boolean;
  created_at: string;
  walking_records: any;
  running_records: any;
  cycling_records: any;
  swimming_records: any;
  triathlon_records: any;
  strava_connected?: boolean;
  strava_verified_at?: string;
  strava_user_id?: string;
  instagram_connected?: boolean;
  instagram_verified_at?: string;
  instagram_username?: string;
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
  const [followRequestSent, setFollowRequestSent] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [areFriends, setAreFriends] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // If user is viewing their own profile, show a simplified version or redirect
  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      if (!isOwnProfile) {
        checkFollowStatus();
        checkFriendStatus();
      }
      fetchFollowCounts();
    }
  }, [userId, user, isOwnProfile]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      if (isOwnProfile) {
        // For own profile, can access all fields
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } else {
        // For other users, get public profile with all fields except private ones
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .eq('is_private', false)
          .single();

        if (error) throw error;
        setProfile(data);
      }
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
      const { data: followData } = await supabase
        .from('user_follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (followData) {
        setIsFollowing(followData.status === 'accepted');
        setFollowRequestSent(followData.status === 'pending');
      } else {
        setIsFollowing(false);
        setFollowRequestSent(false);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const checkFriendStatus = async () => {
    if (!user || !userId || isOwnProfile) return;

    try {
      const { data: friendsData } = await supabase.rpc('are_users_friends', {
        user1_id: user.id,
        user2_id: userId
      });
      
      setAreFriends(friendsData || false);
    } catch (error) {
      console.error('Error checking friend status:', error);
      setAreFriends(false);
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
      if (isFollowing || followRequestSent) {
        // Unfollow ou annuler la demande
        if (isFollowing) {
          // Marquer comme "unfollowed" au lieu de supprimer
          const { error } = await supabase
            .from('user_follows')
            .update({ status: 'unfollowed' })
            .eq('follower_id', user.id)
            .eq('following_id', userId);

          if (error) throw error;

          setIsFollowing(false);
          setFollowRequestSent(false);
          // Seulement décrémenter si c'était une relation 'accepted'
          setFollowerCount(prev => Math.max(0, prev - 1));
          setAreFriends(false);
          toast({ title: "Vous ne suivez plus cette personne" });
        } else {
          // Annuler une demande pending
          const { error } = await supabase
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userId);

          if (error) throw error;

          setIsFollowing(false);
          setFollowRequestSent(false);
          toast({ title: "Demande de suivi annulée" });
        }
      } else {
        // Vérifier s'il y a une relation précédente "unfollowed"
        const { data: existingFollow } = await supabase
          .from('user_follows')
          .select('status')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();

        if (existingFollow && existingFollow.status === 'unfollowed') {
          // Réactiver une relation précédemment acceptée
          const { error } = await supabase
            .from('user_follows')
            .update({ status: 'accepted' })
            .eq('follower_id', user.id)
            .eq('following_id', userId);

          if (error) throw error;

          setIsFollowing(true);
          setFollowRequestSent(false);
          toast({ title: "Réabonnement réussi" });
        } else {
          // Nouvelle demande de suivi
          const { error } = await supabase
            .from('user_follows')
            .insert([{
              follower_id: user.id,
              following_id: userId,
              status: 'pending'
            }]);

          if (error) throw error;

          setFollowRequestSent(true);
          toast({ title: "Demande de suivi envoyée" });
        }
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
                <div className="relative mb-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="text-lg">
                      {(profile.username || profile.display_name)?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isOwnProfile && areFriends && <OnlineStatus userId={profile.user_id} />}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-semibold">
                    {profile.username || profile.display_name}
                  </h2>
                  {profile.is_premium && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                  {profile.is_admin && (
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                      Admin
                    </Badge>
                  )}
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

                {/* Badge de vérification */}
                {(() => {
                  console.log('ProfilePreviewDialog - Profile state:', {
                    strava_connected: profile.strava_connected,
                    strava_verified_at: profile.strava_verified_at,
                    instagram_connected: profile.instagram_connected,
                    instagram_verified_at: profile.instagram_verified_at,
                    isOwnProfile
                  });
                  
                  const isStravaVerified = profile.strava_connected && profile.strava_verified_at;
                  const isInstagramVerified = profile.instagram_connected && profile.instagram_verified_at;
                  
                  console.log('ProfilePreviewDialog - Verification status:', {
                    isStravaVerified,
                    isInstagramVerified,
                    isOwnProfile
                  });
                  
                  if (isStravaVerified && isInstagramVerified) {
                    console.log('ProfilePreviewDialog - Showing both verified badges');
                    return (
                      <div className="mb-4 space-y-1">
                        <button
                          onClick={() => window.open(`https://www.strava.com/athletes/${profile.strava_user_id}`, '_blank')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors mr-2"
                        >
                          <span className="text-orange-600">🏃</span>
                          ✓ Strava
                        </button>
                        <button
                          onClick={() => window.open(`https://www.instagram.com/${profile.instagram_username}`, '_blank')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200 hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors"
                        >
                          <span className="text-pink-600">📷</span>
                          ✓ Instagram
                        </button>
                      </div>
                    );
                  } else if (isStravaVerified) {
                    console.log('ProfilePreviewDialog - Showing Strava verified badge');
                    return (
                      <div className="mb-4">
                        <button
                          onClick={() => window.open(`https://www.strava.com/athletes/${profile.strava_user_id}`, '_blank')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                        >
                          <span className="text-orange-600">🏃</span>
                          ✓ Utilisateur vérifié Strava
                        </button>
                      </div>
                    );
                  } else if (isInstagramVerified) {
                    console.log('ProfilePreviewDialog - Showing Instagram verified badge');
                    return (
                      <div className="mb-4">
                        <button
                          onClick={() => window.open(`https://www.instagram.com/${profile.instagram_username}`, '_blank')}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200 hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors"
                        >
                          <span className="text-pink-600">📷</span>
                          ✓ Utilisateur vérifié Instagram
                        </button>
                      </div>
                    );
                  } else {
                    console.log('ProfilePreviewDialog - Showing non-verified badge, isOwnProfile:', isOwnProfile);
                    return (
                      <div className="mb-4">
                        {isOwnProfile ? (
                          <button
                            onClick={() => {
                              console.log('ProfilePreviewDialog - Non-verified badge clicked, opening settings');
                              setShowSettingsDialog(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <span className="text-gray-500">⚠️</span>
                            Utilisateur non vérifié (synchroniser votre compte Strava ou Instagram dans les paramètres)
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            <span className="text-gray-500">⚠️</span>
                            Utilisateur non vérifié
                          </div>
                        )}
                      </div>
                    );
                  }
                })()}

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
                    variant={isFollowing ? "outline" : followRequestSent ? "secondary" : "default"}
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
                       : followRequestSent
                       ? "Demande envoyée"
                       : "Demander à suivre"
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

      {/* Settings Dialog */}
      {isOwnProfile && (
        <SettingsDialog 
          open={showSettingsDialog} 
          onOpenChange={(open) => setShowSettingsDialog(open)} 
        />
      )}
    </Dialog>
  );
};