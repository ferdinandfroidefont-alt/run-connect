import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { androidPermissions } from '@/lib/androidPermissions';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellRing, Smartphone } from 'lucide-react';

export const NotificationTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastResult, setLastResult] = useState<{
    method?: string;
    success?: boolean;
    error?: string;
    needsSettings?: boolean;
    advice?: string;
  }>({});
  const { toast } = useToast();
  const { isRegistered, requestPermissions, isNative } = usePushNotifications();

  useEffect(() => {
    // Récupérer les infos du périphérique au montage
    if (androidPermissions.isAndroid()) {
      androidPermissions.getDeviceInfo().then(setDeviceInfo);
    }
  }, []);

  const testNativeNotifications = async () => {
    if (!androidPermissions.isAndroid()) {
      toast({
        title: "Android uniquement",
        description: "Ce test fonctionne uniquement sur Android natif",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    setLastResult({});

    try {
      console.log('🔥 Test permissions notifications natives...');
      const result = await androidPermissions.requestNotificationPermissions();
      
      setLastResult({
        method: 'plugin-natif',
        success: result.granted,
        needsSettings: result.needsSettings,
        advice: result.advice
      });

      if (result.granted) {
        toast({
          title: "✅ Permissions notifications accordées!",
          description: `Via plugin Android natif${deviceInfo?.isMIUI ? ' (MIUI optimisé)' : ''}`
        });
        
        // Tester une notification locale
        setTimeout(async () => {
          const notifSuccess = await androidPermissions.showLocalNotification(
            "🎉 Test réussi!", 
            "Les notifications push fonctionnent parfaitement!"
          );
          
          if (notifSuccess) {
            console.log('🔥 Notification locale affichée avec succès');
          }
        }, 1000);
        
      } else {
        toast({
          title: result.needsSettings ? "⚠️ Configuration requise" : "❌ Permissions refusées",
          description: result.advice || "Vérifiez les paramètres de notifications",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('🔥 Erreur notifications natives:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'plugin-natif'
      });
      
      toast({
        title: "❌ Erreur notifications natives",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const testCapacitorNotifications = async () => {
    setTesting(true);
    setLastResult({});

    try {
      console.log('🔥 Test notifications Capacitor...');
      const success = await requestPermissions();
      
      setLastResult({
        method: 'capacitor',
        success: success
      });

      if (success) {
        toast({
          title: "✅ Capacitor notifications OK!",
          description: "Notifications configurées via Capacitor"
        });
      } else {
        throw new Error('Capacitor notifications échoué');
      }

    } catch (error: any) {
      console.error('🔥 Erreur notifications Capacitor:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'capacitor'
      });
      
      toast({
        title: "❌ Erreur Capacitor",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const testWebNotifications = async () => {
    setTesting(true);
    setLastResult({});

    try {
      console.log('🔥 Test notifications web...');
      
      if (!('Notification' in window)) {
        throw new Error('Notifications web non supportées');
      }

      const permission = await Notification.requestPermission();
      const success = permission === 'granted';
      
      setLastResult({
        method: 'web',
        success: success
      });

      if (success) {
        // Tester une notification web
        new Notification('🎉 Test réussi!', {
          body: 'Les notifications web fonctionnent!',
          icon: '/favicon.png'
        });
        
        toast({
          title: "✅ Notifications web OK!",
          description: "Notification de test affichée"
        });
      } else {
        throw new Error('Permission notifications web refusée');
      }

    } catch (error: any) {
      console.error('🔥 Erreur notifications web:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'web'
      });
      
      toast({
        title: "❌ Erreur notifications web",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (success?: boolean) => {
    if (success === undefined) return <Badge variant="secondary">Non testé</Badge>;
    return success 
      ? <Badge variant="default" className="bg-green-500">✅ Succès</Badge>
      : <Badge variant="destructive">❌ Échec</Badge>;
  };

  const getDeviceTypeIcon = () => {
    if (!deviceInfo) return "📱";
    if (deviceInfo.isMIUI) return "🔴"; // Xiaomi/Redmi
    return "📱";
  };

  return (
    <Card className="border rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Test Notifications Push FORCÉ
        </CardTitle>
        {deviceInfo && (
          <div className="text-sm text-muted-foreground">
            {getDeviceTypeIcon()} {deviceInfo.manufacturer} {deviceInfo.model} 
            {deviceInfo.isMIUI && <span className="text-red-500 font-semibold"> (MIUI)</span>}
            <br />
            Android {deviceInfo.version} (API {deviceInfo.sdkInt})
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span>Dernière méthode:</span>
            <Badge variant="outline">{lastResult.method || 'Aucune'}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Statut:</span>
            {getStatusBadge(lastResult.success)}
          </div>
          <div className="flex justify-between items-center">
            <span>Capacitor actuel:</span>
            <Badge variant={isRegistered ? "default" : "secondary"}>
              {isRegistered ? "✅ Actif" : "⚪ Inactif"}
            </Badge>
          </div>
          {lastResult.advice && (
            <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
              <strong>Conseil:</strong> {lastResult.advice}
            </div>
          )}
          {lastResult.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              <strong>Erreur:</strong> {lastResult.error}
            </div>
          )}
        </div>

        {deviceInfo?.isMIUI && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
            <div className="font-semibold text-red-700 flex items-center gap-2">
              🔴 Appareil MIUI/Xiaomi détecté
            </div>
            <div className="text-red-600 mt-1">
              Sur {deviceInfo.manufacturer} {deviceInfo.model}, les notifications peuvent nécessiter:
              <br />• Paramètres &gt; Apps &gt; RunConnect &gt; Notifications &gt; Autoriser
              <br />• Paramètres &gt; Notifications &gt; Autoriser les notifications
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button 
            onClick={testNativeNotifications}
            disabled={testing || !androidPermissions.isAndroid()}
            className="w-full"
            variant={deviceInfo?.isMIUI ? "default" : "outline"}
          >
            <Bell className="h-4 w-4 mr-2" />
            {testing ? "🔥 Test..." : "🔥 Plugin Android Natif"}
            {deviceInfo?.isMIUI && " (Recommandé MIUI)"}
          </Button>
          
          <Button
            onClick={testCapacitorNotifications}
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            {testing ? "🔥 Test..." : "📱 Capacitor Push"}
          </Button>

          <Button
            onClick={testWebNotifications}
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            <BellRing className="h-4 w-4 mr-2" />
            {testing ? "🔥 Test..." : "🌐 Notifications Web"}
          </Button>
        </div>

        {!androidPermissions.isAndroid() && (
          <p className="text-sm text-muted-foreground">
            ⚠️ Plugin natif disponible uniquement sur Android
          </p>
        )}
        
        <div className="text-xs text-muted-foreground">
          <strong>Instructions:</strong> Testez les 3 méthodes. Le plugin natif affichera une vraie notification push Android.
        </div>
      </CardContent>
    </Card>
  );
};