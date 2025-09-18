import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { androidPermissions } from '@/lib/androidPermissions';
import { forceGetPosition } from '@/lib/forceNativePermissions';
import { useGeolocation } from '@/hooks/useGeolocation';

export const LocationTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastResult, setLastResult] = useState<{
    method?: string;
    success?: boolean;
    error?: string;
    position?: { lat: number; lng: number; accuracy?: number };
  }>({});
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();

  useEffect(() => {
    // Récupérer les infos du périphérique au montage
    if (androidPermissions.isAndroid()) {
      androidPermissions.getDeviceInfo().then(setDeviceInfo);
    }
  }, []);

  const testNativeLocation = async () => {
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
      console.log('🔥 Test géolocalisation native...');
      
      // D'abord demander les permissions
      const granted = await androidPermissions.forceRequestLocationPermissions();
      if (!granted) {
        throw new Error('Permissions géolocalisation refusées');
      }

      // Puis obtenir la position
      const position = await forceGetPosition();
      
      setLastResult({
        method: 'plugin-natif',
        success: true,
        position: {
          lat: (position as any).lat,
          lng: (position as any).lng,
          accuracy: (position as any).accuracy
        }
      });

      toast({
        title: "✅ Position obtenue!",
        description: `Lat: ${(position as any).lat.toFixed(4)}, Lng: ${(position as any).lng.toFixed(4)}${deviceInfo?.isMIUI ? ' (MIUI optimisé)' : ''}`
      });

    } catch (error: any) {
      console.error('🔥 Erreur géolocalisation native:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'plugin-natif'
      });
      
      if (deviceInfo?.isMIUI) {
        toast({
          title: "⚠️ Géolocalisation MIUI échouée",
          description: "Vérifiez les permissions dans Paramètres > Apps > RunConnect > Autorisations",
          variant: "destructive"
        });
      } else {
        toast({
          title: "❌ Erreur géolocalisation native",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const testStandardLocation = async () => {
    setTesting(true);
    setLastResult({});

    try {
      console.log('🔥 Test géolocalisation standard (hook useGeolocation)...');
      const position = await getCurrentPosition();
      
      if (position) {
        setLastResult({
          method: 'standard-hook',
          success: true,
          position: {
            lat: position.lat,
            lng: position.lng
          }
        });
        
        toast({
          title: "✅ Position standard OK!",
          description: `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}`
        });
      } else {
        throw new Error('Position null (standard)');
      }

    } catch (error: any) {
      console.error('🔥 Erreur géolocalisation standard:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'standard-hook'
      });
      
      toast({
        title: "❌ Erreur géolocalisation standard",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const testWebLocation = async () => {
    setTesting(true);
    setLastResult({});

    try {
      console.log('🔥 Test géolocalisation web native...');
      
      if (!navigator.geolocation) {
        throw new Error('Géolocalisation non supportée');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        });
      });
      
      setLastResult({
        method: 'web-native',
        success: true,
        position: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      });
      
      toast({
        title: "✅ Position web OK!",
        description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
      });

    } catch (error: any) {
      console.error('🔥 Erreur géolocalisation web:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'web-native'
      });
      
      toast({
        title: "❌ Erreur géolocalisation web",
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
          📍 Test Géolocalisation FORCÉ
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
          {lastResult.position && (
            <div className="text-sm bg-green-50 border border-green-200 rounded p-2">
              <strong>Position:</strong><br />
              Lat: {lastResult.position.lat.toFixed(4)}<br />
              Lng: {lastResult.position.lng.toFixed(4)}
              {lastResult.position.accuracy && (
                <>
                  <br />Précision: {lastResult.position.accuracy.toFixed(0)}m
                </>
              )}
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
              Sur {deviceInfo.manufacturer} {deviceInfo.model}, vérifiez que l&apos;autorisation &quot;Localisation&quot; est activée dans Paramètres &gt; Apps &gt; RunConnect.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button 
            onClick={testNativeLocation}
            disabled={testing || !androidPermissions.isAndroid()}
            className="w-full"
            variant={deviceInfo?.isMIUI ? "default" : "outline"}
          >
            {testing ? "🔥 Test..." : "🔥 Plugin Android Natif"}
            {deviceInfo?.isMIUI && " (Recommandé MIUI)"}
          </Button>
          
          <Button
            onClick={testStandardLocation}
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            {testing ? "🔥 Test..." : "🎯 Hook useGeolocation"}
          </Button>

          <Button
            onClick={testWebLocation}
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            {testing ? "🔥 Test..." : "🌐 Web Native"}
          </Button>
        </div>

        {!androidPermissions.isAndroid() && (
          <p className="text-sm text-muted-foreground">
            ⚠️ Ce composant fonctionne uniquement sur Android natif
          </p>
        )}
        
        <div className="text-xs text-muted-foreground">
          <strong>Instructions:</strong> Testez les 3 méthodes pour voir laquelle fonctionne le mieux sur votre appareil.
        </div>
      </CardContent>
    </Card>
  );
};