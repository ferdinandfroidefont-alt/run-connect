import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StravaConnectProps {
  profile?: {
    strava_connected?: boolean;
    strava_verified_at?: string;
  };
  isOwnProfile?: boolean;
}

export const StravaConnect = ({ profile, isOwnProfile = false }: StravaConnectProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

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

      // Redirect to Strava OAuth
      window.location.href = data.authUrl;
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
      window.location.reload();
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  if (!isOwnProfile && profile?.strava_connected) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              ✓ Utilisateur vérifié Strava
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOwnProfile) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-orange-600">🏃</span>
          Connexion Strava
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.strava_connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ Connecté à Strava
              </Badge>
              {profile.strava_verified_at && (
                <span className="text-sm text-muted-foreground">
                  Vérifié le {new Date(profile.strava_verified_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Votre compte est vérifié. Les autres utilisateurs verront "Utilisateur vérifié Strava" 
              même s'ils ne sont pas vos amis.
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
          <div className="space-y-3">
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