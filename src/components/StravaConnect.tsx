import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

interface StravaConnectProps {
  profile?: {
    strava_connected?: boolean;
    strava_verified_at?: string;
  };
  isOwnProfile?: boolean;
  onProfileUpdate?: () => void; // Callback pour mettre à jour le profil parent
}

export const StravaConnect = ({ profile, isOwnProfile = false, onProfileUpdate }: StravaConnectProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  
  // 🔥 Listen for Strava auth success event from native app
  useEffect(() => {
    const handleStravaAuthSuccess = async (event: any) => {
      console.log('✅ Strava auth success event received:', event);
      
      toast.success('✅ Connexion Strava réussie !');
      
      // Wait a bit for the database to update
      setTimeout(() => {
        if (onProfileUpdate) {
          onProfileUpdate();
        } else {
          window.location.reload();
        }
      }, 1000);
    };
    
    // Listen for custom event from native
    window.addEventListener('stravaAuthSuccess', handleStravaAuthSuccess);
    
    // Cleanup
    return () => {
      window.removeEventListener('stravaAuthSuccess', handleStravaAuthSuccess);
    };
  }, [onProfileUpdate]);

  const handleStravaConnect = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('strava-connect', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      // 🔥 Use Browser plugin for better WebView management on native
      if (isNative) {
        console.log('📱 Opening Strava OAuth in native browser');
        await Browser.open({ 
          url: data.authUrl,
          presentationStyle: 'popover'
        });
        
        // The app will be notified via deep link + event when auth succeeds
      } else {
        // Web: Open in new window
        console.log('🌐 Opening Strava OAuth in web popup');
        window.open(data.authUrl, 'strava_auth', 'width=600,height=700');
        
        // Listen for message from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'strava_auth_success') {
            toast.success('✅ Connexion Strava réussie !');
            setTimeout(() => {
              if (onProfileUpdate) {
                onProfileUpdate();
              } else {
                window.location.reload();
              }
            }, 1000);
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
      }
    } catch (error) {
      console.error('Error connecting to Strava:', error);
      toast.error('Erreur lors de la connexion à Strava');
    } finally {
      setLoading(false);
    }
  };

  const handleStravaDisconnect = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('strava-disconnect', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Compte Strava déconnecté');
      
      // Attendre un peu pour que la DB se mette à jour puis forcer le rafraîchissement
      setTimeout(() => {
        if (onProfileUpdate) {
          onProfileUpdate();
        } else {
          window.location.reload();
        }
      }, 500);
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  // Ne pas montrer l'information Strava pour les autres utilisateurs
  if (!isOwnProfile) {
    return null;
  }

  return (
    <Card className="ios-card w-full min-w-0 overflow-hidden rounded-ios-md border border-border/60 bg-card">
      <CardHeader className="space-y-0 px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-[17px]">
          <span className="text-orange-600">🏃</span>
          Connexion Strava
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.strava_connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Connecté à Strava
              </Badge>
              {profile.strava_verified_at && (
                <span className="text-sm text-muted-foreground">
                  Vérifié le {new Date(profile.strava_verified_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Votre compte Strava est connecté et vérifié.
            </p>
            <Button 
              variant="outline" 
              onClick={handleStravaDisconnect}
              disabled={loading}
              className="w-full"
            >
              Déconnecter Strava
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm text-muted-foreground">
              Connectez votre compte Strava pour être vérifié et gagner en crédibilité 
              auprès des autres sportifs.
            </p>
            <Button 
              onClick={handleStravaConnect}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Connexion...' : 'Connecter avec Strava'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};