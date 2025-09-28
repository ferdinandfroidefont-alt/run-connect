import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { MIUINotificationGuide } from '@/components/MIUINotificationGuide';
import { RedmiNote9Guide } from '@/components/RedmiNote9Guide';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Bell, BellOff, TestTube, Settings, Smartphone, Globe } from 'lucide-react';

export const NotificationManager = () => {
  const { 
    isRegistered, 
    permissionStatus, 
    requestPermissions, 
    testNotification,
    isNative, 
    isSupported 
  } = usePushNotifications();
  const { deviceInfo } = useDeviceDetection();

  const isMIUIDevice = deviceInfo?.isMIUI;

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
            <Button onClick={requestPermissions} className="w-full gap-2">
              <Bell className="h-4 w-4" />
              Activer les notifications
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-green-600">
              ✅ Notifications activées ! Vous recevrez les alertes de RunConnect.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={testNotification} className="gap-2">
                <TestTube className="h-4 w-4" />
                Tester
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