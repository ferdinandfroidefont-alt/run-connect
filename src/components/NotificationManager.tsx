import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { MIUINotificationGuide } from '@/components/MIUINotificationGuide';
import { RedmiNote9Guide } from '@/components/RedmiNote9Guide';
import { TestLocalNotificationButton } from '@/components/TestLocalNotificationButton';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, TestTube, Settings, Smartphone, Globe, Stethoscope, Copy } from 'lucide-react';
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
    checkPermissionStatus, // Nouveau : forcer le recheck
    tokenSaving // 🔥 NIVEAU 8: État de sauvegarde du token
  } = usePushNotifications();
  const { lastPushError } = useSendNotification();
  const { deviceInfo } = useDeviceDetection();
  const { user } = useAuth();
  const { toast } = useToast();
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  const isMIUIDevice = deviceInfo?.isMIUI;

  // 🔥 NIVEAU 14: Récupérer le token FCM actuel en temps réel
  useEffect(() => {
    const fetchToken = async () => {
      if (!user?.id) return;
      
      try {
        setTokenLoading(true);
        const { data } = await supabase
          .from('profiles')
          .select('push_token, push_token_platform')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setCurrentToken(data?.push_token || null);
      } catch (error) {
        console.error('Error fetching token:', error);
        setCurrentToken(null);
      } finally {
        setTokenLoading(false);
      }
    };

    fetchToken();
    
    // Rafraîchir toutes les 5 secondes (pour détecter l'arrivée du token)
    const interval = setInterval(fetchToken, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // 🔥 NIVEAU 14: Écouter l'événement fcmTokenReady depuis Android
  useEffect(() => {
    const handleTokenReady = (event: any) => {
      console.log('✅ [DIAGNOSTIC] Token FCM reçu:', event.detail.token);
      setCurrentToken(event.detail.token);
    };

    window.addEventListener('fcmTokenReady', handleTokenReady);
    
    return () => {
      window.removeEventListener('fcmTokenReady', handleTokenReady);
    };
  }, []);

  // Forcer le rafraîchissement du statut
  const handleRefreshStatus = async () => {
    setRefreshing(true);
    console.log('🔄 [REFRESH] Force refresh notification status...');
    console.log('🔄 [REFRESH] window.androidPermissions AVANT:', JSON.stringify((window as any).androidPermissions));
    
    try {
      // Forcer le recheck complet
      await checkPermissionStatus();
      
      // Logger l'état après
      console.log('🔄 [REFRESH] permissionStatus APRÈS:', permissionStatus);
      console.log('🔄 [REFRESH] window.androidPermissions APRÈS:', JSON.stringify((window as any).androidPermissions));
      
      // Vérifier aussi via Capacitor
      try {
        const capacitorStatus = await PushNotifications.checkPermissions();
        console.log('🔄 [REFRESH] Capacitor checkPermissions:', JSON.stringify(capacitorStatus));
      } catch (e) {
        console.error('❌ [REFRESH] Capacitor check failed:', e);
      }
      
      toast({
        title: "Statut rafraîchi",
        description: "Consultez la console pour les détails"
      });
    } catch (error) {
      console.error('❌ [REFRESH] Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Diagnostic complet des notifications
  const diagnoseNotifications = async () => {
    if (!user) return;
    
    setDiagnosing(true);
    setDiagnosticResult(null);
    console.log('🔍 [DIAGNOSTIC] Start...');
    console.log('🔍 [DIAGNOSTIC] window.androidPermissions:', JSON.stringify((window as any).androidPermissions));

    try {
      // 1. Vérifier permissions via Capacitor
      const perms = await PushNotifications.checkPermissions();
      console.log('📱 [DIAGNOSTIC] Capacitor permissions:', JSON.stringify(perms));
      
      // 2. Vérifier token en base
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token, notifications_enabled')
        .eq('user_id', user.id)
        .single();

      const hasToken = !!profile?.push_token;
      console.log('💾 [DIAGNOSTIC] Token en base:', hasToken ? 'OUI ✅' : 'NON ❌');
      console.log('🔔 [DIAGNOSTIC] Notifications enabled:', profile?.notifications_enabled);

      if (hasToken) {
        setDiagnosticResult(`✅ Token FCM enregistré: ${profile.push_token.substring(0, 30)}...`);
        
        toast({
          title: "Diagnostic: OK",
          description: "Token FCM trouvé en base de données"
        });
      } else {
        setDiagnosticResult('❌ Aucun token FCM en base de données');
        
        // 3. Si permissions OK mais pas de token, forcer réenregistrement
        if (perms.receive === 'granted') {
          console.log('🔄 [DIAGNOSTIC] Permissions OK mais pas de token - forcer register()...');
          
          if (isNative) {
            await setupPushListeners();
            await PushNotifications.register();
            console.log('✅ [DIAGNOSTIC] PushNotifications.register() called');
            
            toast({
              title: "Réenregistrement",
              description: "Tentative de récupération du token FCM..."
            });
            
            // Attendre et revérifier
            setTimeout(async () => {
              const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('user_id', user.id)
                .single();
              
              if (updatedProfile?.push_token) {
                setDiagnosticResult(`✅ Token récupéré: ${updatedProfile.push_token.substring(0, 30)}...`);
                toast({
                  title: "Succès",
                  description: "Token FCM récupéré avec succès!"
                });
              } else {
                setDiagnosticResult('❌ Échec récupération token FCM - listener non déclenché');
                toast({
                  title: "Erreur",
                  description: "Le listener 'registration' ne s'est pas déclenché",
                  variant: "destructive"
                });
              }
            }, 3000);
          }
        } else {
          setDiagnosticResult(`⚠️ Permissions: ${perms.receive} - Activez dans les paramètres`);
        }
      }
    } catch (error) {
      console.error('❌ [DIAGNOSTIC] Error:', error);
      setDiagnosticResult('❌ Erreur lors du diagnostic');
      toast({
        title: "Erreur diagnostic",
        description: "Une erreur s'est produite",
        variant: "destructive"
      });
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
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                📱 Demande automatique au démarrage
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Les notifications vous sont demandées automatiquement au premier lancement de l'application. 
                Si vous avez refusé, désinstallez et réinstallez l'app, ou activez manuellement les notifications dans les paramètres Android.
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
              ✅ Notifications activées ! Vous recevrez les alertes de RunConnect.
            </p>
            {permissionStatus.granted && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Canal Android actif : high_importance_channel
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
              <TestLocalNotificationButton />
              <Button 
                variant="outline" 
                onClick={diagnoseNotifications} 
                disabled={diagnosing}
                className="gap-2"
              >
                <Stethoscope className="h-4 w-4" />
                {diagnosing ? 'Diagnostic...' : 'Diagnostic'}
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

        {/* 🧠 Diagnostic Ultra-Précis FCM */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-5 w-5" />
              🧠 Diagnostic Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Token actuel */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Token FCM actuel :</p>
              {tokenLoading ? (
                <p className="text-xs text-muted-foreground">Chargement...</p>
              ) : currentToken ? (
                <>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono break-all">
                    ✅ {currentToken}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Longueur : {currentToken.length} caractères
                  </p>
                </>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                  ❌ Token FCM : null
                </p>
              )}
            </div>

            {/* Dernière erreur */}
            {lastPushError && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Dernière analyse :</p>
                <div className="space-y-1">
                  <p className="text-xs">
                    <span className="font-medium">Stage :</span>{' '}
                    <span className="font-mono text-foreground">{lastPushError.stage}</span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Raison :</span>{' '}
                    <span className="text-foreground">{lastPushError.reason}</span>
                  </p>
                  {lastPushError.token !== null && (
                    <p className="text-xs">
                      <span className="font-medium">Token :</span>{' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        {lastPushError.token.substring(0, 30)}...
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cas spécial WebView Android */}
            {isNative && !currentToken && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  ⚠️ Aucun token FCM détecté (valeur null dans la WebView Android)
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Firebase n'a pas encore généré de token. Vérifiez :
                </p>
                <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 ml-4 list-disc space-y-1">
                  <li>Google Play Services installé</li>
                  <li>google-services.json configuré</li>
                  <li>Permissions POST_NOTIFICATIONS accordées</li>
                  <li>Logs Android : <code className="text-[10px]">adb logcat | grep RunConnectFCM</code></li>
                </ul>
              </div>
            )}

            {/* Plateforme */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {getPlatformIcon()}
              <span>Plateforme : {getPlatformLabel()}</span>
            </div>

            {/* Bouton copier logs */}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-2"
              onClick={() => {
                const logs = JSON.stringify({
                  token: currentToken,
                  lastError: lastPushError,
                  platform: isNative ? 'Android/iOS' : 'Web',
                  timestamp: new Date().toISOString()
                }, null, 2);
                
                navigator.clipboard.writeText(logs);
                toast({
                  title: "Logs copiés",
                  description: "Les informations de diagnostic ont été copiées dans le presse-papier"
                });
              }}
            >
              <Copy className="h-3 w-3" />
              Copier les logs de diagnostic
            </Button>
          </CardContent>
        </Card>

        {/* Guide MIUI spécialisé */}
        {deviceInfo.isRedmiNote9 && (
          <div className="mt-4">
            <RedmiNote9Guide />
          </div>
        )}
        
        {deviceInfo.isMIUI && !deviceInfo.isRedmiNote9 && (
          <div className="mt-4">
            <MIUINotificationGuide />
          </div>
        )}

        {/* Instructions générales si permissions refusées */}
        {permissionStatus.denied && !isMIUIDevice && isNative && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">
              📱 Activer les notifications
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