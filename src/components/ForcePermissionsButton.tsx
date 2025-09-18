import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { androidPermissions } from '@/lib/androidPermissions';

export const ForcePermissionsButton = () => {
  const [testing, setTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [results, setResults] = useState<{
    location?: boolean;
    camera?: boolean;
    contacts?: boolean;
  }>({});
  const { toast } = useToast();

  useEffect(() => {
    // Récupérer les infos du périphérique au montage
    if (androidPermissions.isAndroid()) {
      androidPermissions.getDeviceInfo().then(setDeviceInfo);
    }
  }, []);

  const testAllPermissions = async () => {
    if (!androidPermissions.isAndroid()) {
      toast({
        title: "Android uniquement",
        description: "Ce test fonctionne uniquement sur Android natif",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    const newResults: typeof results = {};

    try {
      // Test géolocalisation
      console.log('🔥 Test permissions géolocalisation...');
      newResults.location = await androidPermissions.forceRequestLocationPermissions();
      
      // Test caméra
      console.log('🔥 Test permissions caméra...');
      newResults.camera = await androidPermissions.forceRequestCameraPermissions();
      
      // Test contacts
      console.log('🔥 Test permissions contacts...');
      newResults.contacts = await androidPermissions.forceRequestContactsPermissions();

      setResults(newResults);

      const allGranted = Object.values(newResults).every(Boolean);
      
      // Mettre à jour les infos du périphérique
      const updatedDeviceInfo = await androidPermissions.getDeviceInfo();
      setDeviceInfo(updatedDeviceInfo);
      
      if (allGranted) {
        toast({
          title: "✅ Toutes les permissions accordées!",
          description: "Vérifiez maintenant Paramètres > Apps > RunConnect"
        });
      } else if (updatedDeviceInfo?.isMIUI) {
        toast({
          title: "⚠️ Appareil MIUI/Xiaomi détecté",
          description: "Sur MIUI, allez dans Paramètres > Apps > RunConnect > Autorisations pour autoriser manuellement",
          variant: "destructive"
        });
      } else {
        toast({
          title: "⚠️ Certaines permissions manquent",
          description: "Ouvrez les paramètres pour autoriser manuellement"
        });
      }

    } catch (error) {
      console.error('🔥 Erreur test permissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de tester les permissions",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const openSettings = async () => {
    try {
      await androidPermissions.openAppSettings();
      
      if (deviceInfo?.isMIUI) {
        toast({
          title: "Paramètres MIUI ouverts",
          description: "Allez dans Autorisations > Activez Géolocalisation, Caméra, Contacts"
        });
      } else {
        toast({
          title: "Paramètres ouverts",
          description: "Autorisez les permissions dans Paramètres"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir les paramètres",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (granted?: boolean) => {
    if (granted === undefined) return <Badge variant="secondary">Non testé</Badge>;
    return granted 
      ? <Badge variant="default" className="bg-green-500">✅ Accordée</Badge>
      : <Badge variant="destructive">❌ Refusée</Badge>;
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
          🔥 Test Permissions Android FORCÉ
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
            <span>Géolocalisation:</span>
            {getStatusBadge(results.location)}
          </div>
          <div className="flex justify-between items-center">
            <span>Caméra/Galerie:</span>
            {getStatusBadge(results.camera)}
          </div>
          <div className="flex justify-between items-center">
            <span>Contacts:</span>
            {getStatusBadge(results.contacts)}
          </div>
        </div>

        {deviceInfo?.isMIUI && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
            <div className="font-semibold text-red-700 flex items-center gap-2">
              🔴 Appareil MIUI/Xiaomi détecté
            </div>
            <div className="text-red-600 mt-1">
              Sur {deviceInfo.manufacturer} {deviceInfo.model}, les permissions peuvent nécessiter une configuration manuelle dans les paramètres MIUI.
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={testAllPermissions}
            disabled={testing || !androidPermissions.isAndroid()}
            className="flex-1"
          >
            {testing ? "🔥 Test en cours..." : "🔥 FORCER TOUTES les permissions"}
          </Button>
          
          <Button
            variant="outline"
            onClick={openSettings}
            disabled={!androidPermissions.isAndroid()}
          >
            ⚙️ Paramètres
          </Button>
        </div>

        {!androidPermissions.isAndroid() && (
          <p className="text-sm text-muted-foreground">
            ⚠️ Ce composant fonctionne uniquement sur Android natif
          </p>
        )}
      </CardContent>
    </Card>
  );
};