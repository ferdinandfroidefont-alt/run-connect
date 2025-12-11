import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, UserPlus, Download, MapPin, Calendar } from "lucide-react";
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
    
    // Détecter le code de parrainage dans l'URL
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
        // Si l'utilisateur est déjà connecté et consulte son propre profil, rediriger vers le profil complet
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

        // Récupérer le profil public
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, bio, is_premium')
          .eq('username', username)
          .eq('is_private', false)
          .single();

        if (profileError || !profileData) {
          // Si utilisateur non connecté, stocker le username cible et rediriger vers auth
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

        // Récupérer les 3 dernières séances publiques
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
      // Stocker le username cible pour redirection post-auth
      if (username) {
        sessionStorage.setItem('targetProfileUsername', username);
      }
      navigate('/auth');
      return;
    }
    
    // Pour utilisateur connecté, ouvrir le ProfilePreviewDialog
    setShowProfilePreview(true);
  };

  const handleOpenInApp = () => {
    // Tenter d'ouvrir le deep link
    window.location.href = `app.runconnect://profile/${username}`;
    
    // Fallback : rediriger vers Google Play après 2s si échec
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=app.runconnect';
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/70 to-cyan-400">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/70 to-cyan-400 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto pt-12 space-y-6"
      >
        {/* Header avec photo et infos */}
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="pt-8 pb-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar */}
              <Avatar className="h-32 w-32 border-4 border-primary shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl bg-primary text-white">
                  {profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Username et nom */}
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                  {profile.username}
                  {profile.is_premium && (
                    <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-orange-500">
                      Premium
                    </Badge>
                  )}
                </h1>
                {profile.display_name && (
                  <p className="text-muted-foreground">{profile.display_name}</p>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-center text-sm text-muted-foreground max-w-md">
                  {profile.bio}
                </p>
              )}

              {/* Boutons d'action */}
              <div className="flex gap-3 w-full max-w-sm pt-4">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleSubscribe}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  S'abonner
                </Button>
                {!isNative && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleOpenInApp}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Ouvrir dans l'app
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dernières séances */}
        {sessions.length > 0 && (
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dernières séances
              </h2>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card key={session.id} className="bg-background/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium">{session.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location_name}
                            </span>
                            <span>
                              {new Date(session.scheduled_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">{session.activity_type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-white/80 text-sm">
            Rejoignez {profile.username} sur RunConnect
          </p>
          <p className="text-white/60 text-xs mt-1">
            L'application pour course et vélo
          </p>
        </div>
      </motion.div>

      {/* ProfilePreviewDialog pour utilisateurs connectés */}
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
