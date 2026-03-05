import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, UserPlus, Download, MapPin, Calendar, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { OrganizerRatingBadge } from "@/components/OrganizerRatingBadge";
import { StreakBadge } from "@/components/StreakBadge";
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
}

interface Session {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string;
  location_name: string;
}

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
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

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, cover_image_url, bio, is_premium, created_at')
          .eq('username', username)
          .eq('is_private', false)
          .single();

        if (profileError || !profileData) {
          if (!user) {
            sessionStorage.setItem('targetProfileUsername', username);
            toast({
              title: "Connectez-vous pour découvrir ce profil",
              description: `Inscrivez-vous pour suivre @${username}`,
            });
            navigate('/auth');
          } else {
            toast({
              title: "Profil introuvable",
              description: "Ce profil n'existe pas ou est privé",
              variant: "destructive"
            });
            navigate('/');
          }
          return;
        }

        setProfile(profileData);

        // Fetch follow counts + sessions in parallel
        const [followerRes, followingRes, sessionsRes] = await Promise.all([
          supabase
            .from('user_follows')
            .select('id', { count: 'exact' })
            .eq('following_id', profileData.user_id)
            .eq('status', 'accepted'),
          supabase
            .from('user_follows')
            .select('id', { count: 'exact' })
            .eq('follower_id', profileData.user_id)
            .eq('status', 'accepted'),
          supabase
            .from('sessions')
            .select('id, title, activity_type, scheduled_at, location_name')
            .eq('organizer_id', profileData.user_id)
            .eq('is_private', false)
            .order('scheduled_at', { ascending: false })
            .limit(3),
        ]);

        setFollowerCount(followerRes.data?.length || 0);
        setFollowingCount(followingRes.data?.length || 0);
        setSessions(sessionsRes.data || []);
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
      if (username) {
        sessionStorage.setItem('targetProfileUsername', username);
      }
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

  if (!profile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-secondary overflow-y-auto overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto pb-8"
      >
        {/* Cover Image - Facebook Style */}
        <div className="relative">
          <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10">
            {profile.cover_image_url ? (
              <img
                src={profile.cover_image_url}
                alt="Couverture"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          {/* Avatar overlapping cover */}
          <div className="relative flex justify-center" style={{ marginTop: '-50px' }}>
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-card shadow-xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/40 font-bold">
                  {profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {profile.is_premium && (
                <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-green-500 border-3 border-card flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name, username, bio */}
          <div className="flex flex-col items-center pt-3 pb-2 px-4">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h1 className="text-[22px] font-bold text-foreground">
                {profile.display_name || profile.username}
              </h1>
              {profile.is_premium && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <p className="text-[14px] text-muted-foreground mb-2">@{profile.username}</p>

            {profile.bio && (
              <p className="text-[14px] text-muted-foreground text-center max-w-[300px] mb-3 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-6 py-3 w-full">
              <div className="text-center min-w-[60px]">
                <p className="text-[20px] font-bold text-foreground">{followerCount}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnés</p>
              </div>
              <div className="w-px h-8 bg-border/60" />
              <div className="text-center min-w-[60px]">
                <p className="text-[20px] font-bold text-foreground">{followingCount}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnements</p>
              </div>
            </div>

            {/* Badges inline */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              <OrganizerRatingBadge userId={profile.user_id} />
              <StreakBadge userId={profile.user_id} variant="compact" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-sm pt-1">
              <Button
                onClick={handleSubscribe}
                className="flex-1 h-12 rounded-[10px] text-[17px] font-semibold"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                S'abonner
              </Button>
              {!isNative && (
                <Button
                  variant="secondary"
                  onClick={handleOpenInApp}
                  className="h-12 rounded-[10px] text-[17px] font-semibold"
                >
                  <Download className="h-5 w-5 mr-2" />
                  App
                </Button>
              )}
            </div>
          </div>

          {/* Sessions List - iOS Inset Grouped */}
          {sessions.length > 0 && (
            <div className="px-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-0 pb-2">
                Dernières séances
              </p>
              <div className="bg-card rounded-[10px] overflow-hidden">
                {sessions.map((session, index) => (
                  <div key={session.id}>
                    <div className="flex items-center px-4 py-[11px]">
                      <div className="h-[30px] w-[30px] rounded-[7px] bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-foreground truncate">{session.title}</p>
                        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{session.location_name}</span>
                          <span>·</span>
                          <span className="flex-shrink-0">{new Date(session.scheduled_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2 text-[11px] flex-shrink-0">{session.activity_type}</Badge>
                    </div>
                    {index < sessions.length - 1 && <div className="h-px bg-border ml-[54px]" />}
                  </div>
                ))}
              </div>
            </div>
          )}

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
