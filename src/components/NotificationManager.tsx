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
import { Bell, BellOff, TestTube, Settings, Smartphone, Globe, Stethoscope } from 'lucide-react';
import { PushNotifications } from '@capacitor/push-notifications';

export const NotificationManager = () => {
  const { 
    isRegistered, 
    permissionStatus, 
    requestPermissions, 
    testNotification,
    isNative, 
    isSupported,
    setupPushListeners,
    checkPermissionStatus // Nouveau : forcer le recheck
  } = usePushNotifications();
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
            <p className="text-sm text-muted-foreground">
              Activez les notifications pour recevoir les alertes de RunConnect en temps réel.
            </p>
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={requestPermissions} className="flex-1 gap-2">
                <Bell className="h-4 w-4" />
                Activer les notifications
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRefreshStatus} 
                disabled={refreshing}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {refreshing ? 'Vérif...' : 'Vérifier'}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              💡 Si vous avez déjà activé les notifications dans les paramètres du téléphone, cliquez sur "Vérifier".
            </p>
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
              <Button variant="outline" onClick={testNotification} className="gap-2">
                <TestTube className="h-4 w-4" />
                Tester
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