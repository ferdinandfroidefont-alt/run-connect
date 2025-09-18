import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { androidPermissions } from '@/lib/androidPermissions';
import { forceOpenGallery } from '@/lib/forceNativePermissions';
import { useCamera } from '@/hooks/useCamera';

export const GalleryTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [lastResult, setLastResult] = useState<{
    method?: string;
    success?: boolean;
    error?: string;
  }>({});
  const { toast } = useToast();
  const { selectFromGallery } = useCamera();

  useEffect(() => {
    // Récupérer les infos du périphérique au montage
    if (androidPermissions.isAndroid()) {
      androidPermissions.getDeviceInfo().then(setDeviceInfo);
    }
  }, []);

  const testNativeGallery = async () => {
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
      console.log('🔥 Test ouverture galerie native...');
      const result = await androidPermissions.forceOpenGallery();
      
      setLastResult({
        method: result.method || 'plugin-natif',
        success: result.success
      });

      if (result.success) {
        toast({
          title: "✅ Galerie ouverte avec succès!",
          description: `Méthode: ${result.method || 'plugin-natif'}${deviceInfo?.isMIUI ? ' (MIUI optimisé)' : ''}`
        });
      } else {
        throw new Error('Échec ouverture galerie native');
      }

    } catch (error: any) {
      console.error('🔥 Erreur galerie native:', error);
      setLastResult({
        success: false,
        error: error.message
      });
      
      if (deviceInfo?.isMIUI) {
        toast({
          title: "⚠️ Galerie MIUI échouée",
          description: "Essayez la méthode Capacitor ou vérifiez les permissions dans Paramètres > Apps > RunConnect",
          variant: "destructive"
        });
      } else {
        toast({
          title: "❌ Erreur galerie native",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const testCapacitorGallery = async () => {
    setTesting(true);
    setLastResult({});

    try {
      console.log('🔥 Test ouverture galerie Capacitor forcée...');
      const result = await forceOpenGallery();
      
      if (result && result !== 'native-plugin-success') {
        setLastResult({
          method: 'capacitor-force',
          success: true
        });
        
        toast({
          title: "✅ Galerie Capacitor ouverte!",
          description: "Image sélectionnée avec Capacitor"
        });
      } else {
        throw new Error('Aucune image sélectionnée');
      }

    } catch (error: any) {
      console.error('🔥 Erreur galerie Capacitor:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'capacitor-force'
      });
      
      toast({
        title: "❌ Erreur galerie Capacitor",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const testStandardGallery = async () => {
    setTesting(true);
    setLastResult({});

    try {
      console.log('🔥 Test galerie standard (hook useCamera)...');
      const result = await selectFromGallery();
      
      if (result) {
        setLastResult({
          method: 'standard-hook',
          success: true
        });
        
        toast({
          title: "✅ Galerie standard OK!",
          description: "Image sélectionnée avec useCamera hook"
        });
      } else {
        throw new Error('Aucune image sélectionnée (standard)');
      }

    } catch (error: any) {
      console.error('🔥 Erreur galerie standard:', error);
      setLastResult({
        success: false,
        error: error.message,
        method: 'standard-hook'
      });
      
      toast({
        title: "❌ Erreur galerie standard",
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
          📸 Test Accès Galerie FORCÉ
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
              Bug connu: Capacitor Camera + Galerie MIUI/Redmi. Le plugin natif contourne ce problème.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button 
            onClick={testNativeGallery}
            disabled={testing || !androidPermissions.isAndroid()}
            className="w-full"
            variant={deviceInfo?.isMIUI ? "default" : "outline"}
          >
            {testing ? "🔥 Test..." : "🔥 Plugin Android Natif"}
            {deviceInfo?.isMIUI && " (Recommandé MIUI)"}
          </Button>
          
          <Button
            onClick={testCapacitorGallery}
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            {testing ? "🔥 Test..." : "📱 Capacitor Forcé"}
          </Button>

          <Button
            onClick={testStandardGallery}
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            {testing ? "🔥 Test..." : "🎯 Hook Standard"}
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