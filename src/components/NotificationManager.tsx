import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, TestTube, Settings, Smartphone, Globe } from 'lucide-react';
import { PushNotifications } from '@capacitor/push-notifications';
import { useSendNotification } from '@/hooks/useSendNotification';

export const NotificationManager = () => {
  const { 
    isRegistered, 
    permissionStatus, 
    requestPermissions, 
    testNotification,
    isNative, 
    isSupported,
    setupPushListeners,
    checkPermissionStatus,
    tokenSaving,
  } = usePushNotifications();
  const { lastPushError } = useSendNotification();
  const { deviceInfo } = useDeviceDetection();
  const { user } = useAuth();
  const { toast } = useToast();
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isMIUIDevice = deviceInfo?.isMIUI;

  // Forcer le rafraîchissement du statut
  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await checkPermissionStatus();
      toast({ title: "Statut rafraîchi" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de rafraîchir", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  // Forcer la régénération du token FCM
  const forceRefreshToken = async () => {
    if (!isNative) {
      toast({ title: "Mobile requis", description: "Disponible uniquement sur Android/iOS", variant: "destructive" });
      return;
    }
    
    setDiagnosing(true);
    try {
      await PushNotifications.register();
      toast({ title: "Génération en cours…", description: "Le token sera mis à jour automatiquement." });
      
      setTimeout(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('user_id', user!.id)
          .single();
        
        toast({
          title: data?.push_token ? "Token récupéré" : "Token introuvable",
          description: data?.push_token
            ? data.push_token.slice(0, 40) + "…"
            : "Vérifie les permissions ou redémarre l'app",
          variant: data?.push_token ? "default" : "destructive"
        });
        setDiagnosing(false);
      }, 1500);
    } catch {
      setDiagnosing(false);
      toast({ title: "Erreur", description: "Impossible de régénérer le token", variant: "destructive" });
    }
  };

  const forceSaveToken = async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Utilisateur non connecté", variant: "destructive" });
      return;
    }
    
    const fcmToken = (window as any).fcmToken;
    if (!fcmToken) {
      toast({ title: "Token absent", description: "Régénérez d'abord le token.", variant: "destructive" });
      return;
    }
    
    setDiagnosing(true);
    try {
      const platform = (window as any).fcmTokenPlatform
        || (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : null)
        || ((window as any).AndroidBridge ? 'android' : 'web');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: fcmToken,
          push_token_platform: platform,
          push_token_updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) {
        toast({ title: "Erreur sauvegarde", description: `${error.code}: ${error.message}`, variant: "destructive" });
      } else {
        toast({ title: "Token sauvegardé", description: `${fcmToken.substring(0, 30)}...` });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message, variant: "destructive" });
    } finally {
      setDiagnosing(false);
    }
  };

  const diagnoseNotifications = async () => {
    if (!user) return;
    
    setDiagnosing(true);
    setDiagnosticResult(null);

    try {
      const perms = await PushNotifications.checkPermissions();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token, notifications_enabled')
        .eq('user_id', user.id)
        .single();

      const hasToken = !!profile?.push_token;

      if (hasToken) {
        setDiagnosticResult(`Token FCM enregistré: ${profile.push_token.substring(0, 30)}...`);
        toast({ title: "Diagnostic: OK", description: "Token FCM trouvé en base de données" });
      } else {
        setDiagnosticResult('Aucun token FCM en base de données');
        
        if (perms.receive === 'granted') {
          if (isNative) {
            await setupPushListeners();
            await PushNotifications.register();
            toast({ title: "Réenregistrement", description: "Tentative de récupération du token FCM..." });
            
            setTimeout(async () => {
              const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('user_id', user.id)
                .single();
              
              if (updatedProfile?.push_token) {
                setDiagnosticResult(`Token récupéré: ${updatedProfile.push_token.substring(0, 30)}...`);
                toast({ title: "Succès", description: "Token FCM récupéré" });
              } else {
                setDiagnosticResult('Échec récupération token FCM');
                toast({ title: "Erreur", description: "Le listener 'registration' ne s'est pas déclenché", variant: "destructive" });
              }
            }, 3000);
          }
        } else {
          setDiagnosticResult(`Permissions: ${perms.receive} — Activez dans les paramètres`);
        }
      }
    } catch {
      setDiagnosticResult('Erreur lors du diagnostic');
      toast({ title: "Erreur diagnostic", description: "Une erreur s'est produite", variant: "destructive" });
    } finally {
      setDiagnosing(false);
    }
  };

  const getStatusBadge = () => {
    if (permissionStatus.granted) {
      return <Badge variant="default" className="gap-1"><Bell className="h-3 w-3" />Activées</Badge>;
    } else if (permissionStatus.denied) {
      return <Badge variant="destructive" className="gap-1"><BellOff className="h-3 w-3" />Refusées</Badge>;
    } else {
      return <Badge variant="secondary" className="gap-1"><Bell className="h-3 w-3" />En attente</Badge>;
    }
  };

  const getPlatformIcon = () => {
    if (isNative) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Globe className="h-4 w-4" />;
  };

  const getPlatformLabel = () => {
    if (isNative) {
      return "Application native";
    }
    return "Navigateur web";
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications non supportées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Les notifications push ne sont pas supportées sur cet appareil.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {getPlatformIcon()}
          <span>{getPlatformLabel()}</span>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!permissionStatus.granted ? (
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Demande automatique au démarrage
              </p>
              <p className="text-xs text-blue-700">
                Les notifications vous sont demandées automatiquement au premier lancement de l'application. 
                Si vous avez refusé, activez manuellement les notifications dans les paramètres de votre appareil.
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={handleRefreshStatus} 
                disabled={refreshing}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {refreshing ? 'Vérif...' : 'Vérifier le statut'}
              </Button>
              
              {isNative && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const plugin = (window as any).CapacitorCustomPlugins?.PermissionsPlugin;
                    if (plugin) {
                      plugin.openAppSettings();
                    } else if (typeof (window as any).AndroidBridge?.openAppSettings === 'function') {
                      (window as any).AndroidBridge.openAppSettings();
                    }
                  }}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Paramètres Android
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
              <p className="text-sm text-green-600">
              Notifications activées ! Vous recevrez les alertes de RunConnect.
            </p>
            {permissionStatus.granted && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Canal Android actif : runconnect_channel
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={testNotification} 
                disabled={!isRegistered || tokenSaving}
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                {tokenSaving ? "Sauvegarde..." : "Tester"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={diagnoseNotifications} 
                disabled={diagnosing}
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                {diagnosing ? 'Diagnostic...' : 'Diagnostic'}
              </Button>
              <Button 
                onClick={forceRefreshToken} 
                disabled={diagnosing || !isNative}
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                {diagnosing ? 'Génération…' : 'Régénérer le token'}
              </Button>
              <Button 
                variant="outline" 
                onClick={forceSaveToken} 
                disabled={diagnosing}
                className="gap-2 border-orange-500/50 text-orange-600"
              >
                <Settings className="h-4 w-4" />
                {diagnosing ? 'Sauvegarde...' : 'Forcer sauvegarde'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRefreshStatus} 
                disabled={refreshing}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {refreshing ? 'Rafraîchir...' : 'Rafraîchir'}
              </Button>
              {isNative && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Ouvrir les paramètres Android
                    const plugin = (window as any).CapacitorCustomPlugins?.PermissionsPlugin;
                    if (plugin) {
                      plugin.openAppSettings();
                    }
                  }}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Button>
              )}
            </div>
            
            {diagnosticResult && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-mono">{diagnosticResult}</p>
              </div>
            )}
            
          </div>
        )}

        {/* Instructions si permissions refusées */}
        {permissionStatus.denied && !isMIUIDevice && isNative && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">
              Activer les notifications
            </h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Ouvrez les <strong>Paramètres</strong> de votre téléphone</li>
              <li>Allez dans <strong>Applications</strong> ou <strong>Gestionnaire d&apos;applications</strong></li>
              <li>Trouvez <strong>RunConnect</strong></li>
              <li>Appuyez sur <strong>Notifications</strong></li>
              <li>Activez toutes les notifications</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};