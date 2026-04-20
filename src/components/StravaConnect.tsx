import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { StravaConnectButton, StravaPoweredBy } from '@/components/strava/StravaBrand';

interface StravaConnectProps {
  profile?: {
    strava_connected?: boolean;
    strava_verified_at?: string;
    strava_user_id?: string;
  };
  isOwnProfile?: boolean;
  onProfileUpdate?: () => void;
}

export const StravaConnect = ({ profile, isOwnProfile = false, onProfileUpdate }: StravaConnectProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  
  useEffect(() => {
    const handleStravaAuthSuccess = async () => {
      toast.success('Connexion Strava reussie !');
      setTimeout(() => {
        if (onProfileUpdate) {
          onProfileUpdate();
        } else {
          window.location.reload();
        }
      }, 1000);
    };
    
    window.addEventListener('stravaAuthSuccess', handleStravaAuthSuccess);
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

      if (isNative) {
        await Browser.open({ 
          url: data.authUrl,
          presentationStyle: 'popover'
        });
      } else {
        window.open(data.authUrl, 'strava_auth', 'width=600,height=700');
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'strava_auth_success') {
            toast.success('Connexion Strava reussie !');
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
      toast.error('Erreur lors de la connexion a Strava');
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
      toast.success('Compte Strava deconnecte');
      setTimeout(() => {
        if (onProfileUpdate) {
          onProfileUpdate();
        } else {
          window.location.reload();
        }
      }, 500);
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      toast.error('Erreur lors de la deconnexion');
    } finally {
      setLoading(false);
    }
  };

  if (!isOwnProfile) return null;

  return (
    <Card className="ios-card w-full min-w-0 overflow-hidden rounded-ios-md border border-border/60 bg-card shadow-[var(--shadow-card)]">
      <CardHeader className="space-y-0 px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-[17px]">
          <StravaPoweredBy variant="text" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.strava_connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connecte
              </Badge>
              {profile.strava_verified_at && (
                <span className="text-sm text-muted-foreground">
                  Verifie le {new Date(profile.strava_verified_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Votre compte Strava est connecte et verifie.
            </p>
            {profile.strava_user_id && (
              <a
                href={`https://www.strava.com/athletes/${profile.strava_user_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-[#FC4C02] underline"
              >
                Voir sur Strava
              </a>
            )}
            <Button 
              variant="outline" 
              onClick={handleStravaDisconnect}
              disabled={loading}
              className="w-full"
            >
              Deconnecter Strava
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm text-muted-foreground">
              Connectez votre compte Strava pour etre verifie et gagner en credibilite 
              aupres des autres sportifs.
            </p>
            <StravaConnectButton onClick={handleStravaConnect} loading={loading} />
          </div>
        )}
        <StravaPoweredBy variant="logo" />
      </CardContent>
    </Card>
  );
};
