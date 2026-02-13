import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, UserPlus, Download, MapPin, Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";

interface PublicProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_premium: boolean | null;
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
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('r');
    if (refCode) {
      sessionStorage.setItem('referralCode', refCode);
      console.log('🎁 Code de parrainage détecté depuis profil public:', refCode);
      
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
          .select('user_id, username, display_name, avatar_url, bio, is_premium')
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

        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, title, activity_type, scheduled_at, location_name')
          .eq('organizer_id', profileData.user_id)
          .eq('is_private', false)
          .order('scheduled_at', { ascending: false })
          .limit(3);

        setSessions(sessionsData || []);
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
      <div className="min-h-screen flex items-center justify-center bg-secondary bg-pattern">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary bg-pattern">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto pt-12 px-4 pb-8 space-y-4"
      >
        {/* Profile Card */}
        <div className="bg-card rounded-[10px] overflow-hidden">
          <div className="flex flex-col items-center px-4 py-8 space-y-4">
            {/* Avatar */}
            <Avatar className="h-28 w-28 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Username */}
            <div className="text-center space-y-1">
              <h1 className="text-ios-title2 text-foreground flex items-center justify-center gap-2">
                {profile.username}
                {profile.is_premium && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[11px] px-2 py-0.5">
                    Premium
                  </Badge>
                )}
              </h1>
              {profile.display_name && (
                <p className="text-ios-subheadline text-muted-foreground">{profile.display_name}</p>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-center text-ios-subheadline text-muted-foreground max-w-[280px]">
                {profile.bio}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-sm pt-2">
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
        </div>

        {/* Sessions List - iOS Inset Grouped */}
        {sessions.length > 0 && (
          <div>
            <p className="ios-section-header">Dernières séances</p>
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
                  {index < sessions.length - 1 && <div className="ios-list-separator" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-ios-footnote text-muted-foreground">
            Rejoignez {profile.username} sur RunConnect
          </p>
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
