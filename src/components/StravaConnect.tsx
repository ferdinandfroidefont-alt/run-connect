import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { StravaConnectButton, StravaPoweredBy, StravaViewLink } from '@/components/strava/StravaBrand';

const STRAVA_SETTINGS_ORANGE = '#FC5200';
const SETTINGS_CARD_SHADOW =
  '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)';

interface StravaConnectProps {
  profile?: {
    strava_connected?: boolean;
    strava_verified_at?: string;
    strava_user_id?: string;
  };
  isOwnProfile?: boolean;
  onProfileUpdate?: () => void;
  /** Aligné maquette RunConnect (9).jsx — sous-page Réglages → Connexions */
  presentation?: 'card' | 'settings-pixel';
}

export const StravaConnect = ({
  profile,
  isOwnProfile = false,
  onProfileUpdate,
  presentation = 'card',
}: StravaConnectProps) => {
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

  if (presentation === 'settings-pixel') {
    return (
      <div
        className="mx-4 mb-3 min-w-0 max-w-full p-4"
        style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: SETTINGS_CARD_SHADOW,
        }}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <Activity className="h-[18px] w-[18px]" color={STRAVA_SETTINGS_ORANGE} strokeWidth={2.6} />
          <p
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: STRAVA_SETTINGS_ORANGE,
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            Compatible avec Strava
          </p>
        </div>
        {profile?.strava_connected ? (
          <>
            <p
              style={{
                fontSize: 15,
                color: '#0A0F1F',
                lineHeight: 1.4,
                margin: 0,
                marginBottom: 14,
              }}
            >
              Votre compte Strava est connecté et vérifié.
              {profile.strava_verified_at
                ? ` Vérifié le ${new Date(profile.strava_verified_at).toLocaleDateString('fr-FR')}.`
                : ''}
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 font-semibold text-green-800">
                Connecté
              </Badge>
            </div>
            {profile.strava_user_id ? (
              <div className="mb-3">
                <StravaViewLink href={`https://www.strava.com/athletes/${profile.strava_user_id}`} />
              </div>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleStravaDisconnect()}
              className="w-full py-3 transition-opacity active:opacity-90 disabled:opacity-60"
              style={{
                background: 'white',
                borderRadius: 9999,
                border: '1px solid #E5E5EA',
                color: '#0A0F1F',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Déconnexion…' : 'Déconnecter Strava'}
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 15,
                color: '#0A0F1F',
                lineHeight: 1.4,
                margin: 0,
                marginBottom: 14,
              }}
            >
              Connectez votre compte Strava pour être vérifié et gagner en crédibilité auprès des autres sportifs.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleStravaConnect()}
              className="flex w-full items-center justify-center gap-2 py-3 transition-opacity active:opacity-90 disabled:opacity-60"
              style={{
                background: STRAVA_SETTINGS_ORANGE,
                borderRadius: 9999,
                color: 'white',
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '-0.01em',
              }}
            >
              <Activity className="h-4 w-4 text-white" strokeWidth={2.6} />
              {loading ? 'Connexion…' : 'Se connecter avec Strava'}
            </button>
          </>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          <Activity className="h-3 w-3" color={STRAVA_SETTINGS_ORANGE} strokeWidth={2.6} />
          <p style={{ fontSize: 12, color: '#8E8E93', margin: 0 }}>Compatible avec Strava</p>
        </div>
      </div>
    );
  }

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
              <StravaViewLink href={`https://www.strava.com/athletes/${profile.strava_user_id}`} />
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
