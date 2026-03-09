import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, UserPlus, Download, Crown, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { ProfileQuickStats } from "@/components/profile/ProfileQuickStats";
import { RecentActivities } from "@/components/profile/RecentActivities";
import { SportsBadges } from "@/components/profile/SportsBadges";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PublicProfileData {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  is_premium: boolean | null;
  created_at: string;
  running_records?: any;
  cycling_records?: any;
  swimming_records?: any;
  triathlon_records?: any;
  walking_records?: any;
}

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('r');
    if (refCode) {
      sessionStorage.setItem('referralCode', refCode);
      toast({
        title: "🎁 Code de parrainage détecté !",
        description: `Inscrivez-vous pour bénéficier du bonus de ${username}`,
        duration: 5000
      });
    }
  }, [username, toast]);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      if (!username) return;
      try {
        if (user) {
          const { data: ownProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .single();
          if (ownProfile?.username === username) {
            navigate('/profile');
            return;
          }
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, cover_image_url, bio, is_premium, created_at, running_records, cycling_records, swimming_records, triathlon_records, walking_records')
          .eq('username', username)
          .eq('is_private', false)
          .single();

        if (error || !profileData) {
          if (!user) {
            sessionStorage.setItem('targetProfileUsername', username);
            toast({ title: "Connectez-vous pour découvrir ce profil", description: `Inscrivez-vous pour suivre @${username}` });
            navigate('/auth');
          } else {
            toast({ title: "Profil introuvable", description: "Ce profil n'existe pas ou est privé", variant: "destructive" });
            navigate('/');
          }
          return;
        }

        setProfile(profileData);

        const [followerRes, followingRes] = await Promise.all([
          supabase.from('user_follows').select('id', { count: 'exact' }).eq('following_id', profileData.user_id).eq('status', 'accepted'),
          supabase.from('user_follows').select('id', { count: 'exact' }).eq('follower_id', profileData.user_id).eq('status', 'accepted'),
        ]);

        setFollowerCount(followerRes.data?.length || 0);
        setFollowingCount(followingRes.data?.length || 0);
      } catch (error) {
        console.error('Error fetching public profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [username, user, navigate, toast]);

  const handleSubscribe = () => {
    if (!user) {
      if (username) sessionStorage.setItem('targetProfileUsername', username);
      navigate('/auth');
      return;
    }
    setShowProfilePreview(true);
  };

  const handleOpenInApp = () => {
    window.location.href = `app.runconnect://profile/${username}`;
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=app.runconnect';
    }, 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="fixed inset-0 bg-secondary overflow-y-auto overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto pb-8"
      >
        {/* Cover Image */}
        <div className="relative">
          <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10">
            {profile.cover_image_url ? (
              <img src={profile.cover_image_url} alt="Couverture" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <div className="relative flex justify-center" style={{ marginTop: '-50px' }}>
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-card shadow-xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/40 font-bold">
                  {profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {profile.is_premium && (
                <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary border-3 border-card flex items-center justify-center">
                  <span className="text-primary-foreground text-xs">✓</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Identity */}
          <div className="flex flex-col items-center pt-3 pb-2 px-4">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h1 className="text-[22px] font-bold text-foreground">
                {profile.display_name || profile.username}
              </h1>
              {profile.is_premium && <Crown className="h-4 w-4 text-yellow-500" />}
            </div>
            <p className="text-[14px] text-muted-foreground mb-2">@{profile.username}</p>

            {profile.bio && (
              <p className="text-[14px] text-muted-foreground text-center max-w-[300px] mb-3 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Sports Badges */}
            <div className="mb-3">
              <SportsBadges
                runningRecords={profile.running_records}
                cyclingRecords={profile.cycling_records}
                swimmingRecords={profile.swimming_records}
                triathlonRecords={profile.triathlon_records}
                walkingRecords={profile.walking_records}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-sm pt-1">
              <Button onClick={handleSubscribe} className="flex-1 h-12 rounded-[10px] text-[17px] font-semibold">
                <UserPlus className="h-5 w-5 mr-2" />
                S'abonner
              </Button>
              {!isNative && (
                <Button variant="secondary" onClick={handleOpenInApp} className="h-12 rounded-[10px] text-[17px] font-semibold">
                  <Download className="h-5 w-5 mr-2" />
                  App
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="px-4">
            <ProfileQuickStats
              userId={profile.user_id}
              followerCount={followerCount}
              followingCount={followingCount}
            />
          </div>

          {/* Recent Activities */}
          <div className="px-4">
            <p className="text-[13px] text-muted-foreground uppercase tracking-wide pb-2">
              Activités récentes
            </p>
            <RecentActivities userId={profile.user_id} limit={3} />
          </div>

          {/* Member since */}
          <div className="px-4">
            <div className="bg-card rounded-[10px] overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="h-8 w-8 rounded-[6px] bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Membre depuis</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2 pb-4">
            <p className="text-[13px] text-muted-foreground">
              Rejoignez {profile.username} sur RunConnect
            </p>
          </div>
        </div>
      </motion.div>

      {showProfilePreview && profile && (
        <ProfilePreviewDialog
          userId={profile.user_id}
          onClose={() => setShowProfilePreview(false)}
        />
      )}
    </div>
  );
};

export default PublicProfile;
