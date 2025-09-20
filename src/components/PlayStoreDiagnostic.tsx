import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Capacitor } from '@capacitor/core';
import { androidPermissions } from '@/lib/androidPermissions';
import { useToast } from "@/hooks/use-toast";

export const PlayStoreDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [testing, setTesting] = useState(false);
  const [pluginStatus, setPluginStatus] = useState<'checking' | 'ready' | 'initializing'>('checking');
  const { toast } = useToast();

  useEffect(() => {
    runInitialDiagnostic();
    
    // Écouter l'événement de plugin prêt
    const handlePluginReady = () => {
      setPluginStatus('ready');
      setTimeout(runInitialDiagnostic, 100);
    };
    
    window.addEventListener('permissionsPluginReady', handlePluginReady);
    return () => window.removeEventListener('permissionsPluginReady', handlePluginReady);
  }, []);

  const runInitialDiagnostic = async () => {
    console.log('🔥 DIAGNOSTIC PLAY STORE - Début');
    
    // Vérifier si le plugin est disponible, sinon attendre
    if (!window.PermissionsPlugin && pluginStatus === 'checking') {
      setPluginStatus('initializing');
      console.log('🔥 Plugin non disponible, attendre initialisation...');
      return;
    }
    
    const diagnostic: any = {
      // Détection plateforme
      capacitorPlatform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      
      // User Agent Analysis
      userAgent: navigator.userAgent,
      isAndroidUA: navigator.userAgent.toLowerCase().includes('android'),
      isWebView: navigator.userAgent.toLowerCase().includes('wv'),
      
      // Plugin availability
      hasPermissionsPlugin: !!window.PermissionsPlugin,
      pluginStatus: pluginStatus,
      
      // Capacitor specific
      capacitorNative: Capacitor.isNativePlatform(),
      capacitorWeb: Capacitor.getPlatform() === 'web',
      capacitorAndroid: Capacitor.getPlatform() === 'android',
      
      // Device info
      deviceInfo: null,
      timestamp: new Date().toISOString()
    };

    // Tester la disponibilité du plugin Android
    if (window.PermissionsPlugin) {
      try {
        diagnostic.deviceInfo = await androidPermissions.getDeviceInfo();
        console.log('🔥 Info périphérique obtenue:', diagnostic.deviceInfo);
      } catch (error) {
        console.error('🔥 Erreur info périphérique:', error);
        diagnostic.deviceInfoError = error.message;
      }
    }

    console.log('🔥 DIAGNOSTIC COMPLET:', diagnostic);
    setDiagnostics(diagnostic);
  };

  const testPermissionFlow = async () => {
    setTesting(true);
    console.log('🔥 TEST FLOW PERMISSIONS');

    try {
      // Test 1: Plugin Android disponible
      if (!window.PermissionsPlugin) {
        throw new Error('Plugin Android PermissionsPlugin non disponible');
      }

      // Test 2: Demande permissions géolocalisation
      console.log('🔥 Test permissions géolocalisation...');
      const locationResult = await window.PermissionsPlugin.forceRequestLocationPermissions();
      console.log('🔥 Résultat géolocalisation:', locationResult);

      // Test 3: Demande permissions caméra  
      console.log('🔥 Test permissions caméra...');
      const cameraResult = await window.PermissionsPlugin.forceRequestCameraPermissions();
      console.log('🔥 Résultat caméra:', cameraResult);

      // Test 4: Ouverture paramètres
      console.log('🔥 Test ouverture paramètres...');
      const settingsResult = await window.PermissionsPlugin.openAppSettings();
      console.log('🔥 Résultat paramètres:', settingsResult);

      toast({
        title: "Tests terminés",
        description: "Vérifiez les logs de la console pour les détails",
        variant: "default"
      });

    } catch (error: any) {
      console.error('🔥 ERREUR TEST FLOW:', error);
      toast({
        title: "Erreur de test", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getBadgeVariant = (value: boolean | undefined) => {
    if (value === true) return "default";
    if (value === false) return "destructive";
    return "secondary";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🔥 Diagnostic Play Store AAB</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Détection Plateforme */}
        <div className="space-y-2">
          <h3 className="font-semibold">Détection Plateforme</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Capacitor Platform: <Badge variant={getBadgeVariant(true)}>{diagnostics.capacitorPlatform}</Badge></div>
            <div>Is Native: <Badge variant={getBadgeVariant(diagnostics.isNative)}>{String(diagnostics.isNative)}</Badge></div>
            <div>Android UA: <Badge variant={getBadgeVariant(diagnostics.isAndroidUA)}>{String(diagnostics.isAndroidUA)}</Badge></div>
            <div>WebView: <Badge variant={getBadgeVariant(diagnostics.isWebView)}>{String(diagnostics.isWebView)}</Badge></div>
          </div>
        </div>

        {/* Plugin Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Plugin Status</h3>
          <div>
            Permissions Plugin: <Badge variant={getBadgeVariant(diagnostics.hasPermissionsPlugin)}>
              {diagnostics.hasPermissionsPlugin ? "DISPONIBLE" : "INDISPONIBLE"}
            </Badge>
          </div>
        </div>

        {/* Device Info */}
        {diagnostics.deviceInfo && (
          <div className="space-y-2">
            <h3 className="font-semibold">Info Périphérique</h3>
            <div className="text-sm space-y-1">
              <div>Fabricant: <Badge>{diagnostics.deviceInfo.manufacturer}</Badge></div>
              <div>Modèle: <Badge>{diagnostics.deviceInfo.model}</Badge></div>
              <div>Android: <Badge>{diagnostics.deviceInfo.version}</Badge></div>
              <div>SDK: <Badge>{diagnostics.deviceInfo.sdkInt}</Badge></div>
              <div>MIUI: <Badge variant={getBadgeVariant(diagnostics.deviceInfo.isMIUI)}>
                {String(diagnostics.deviceInfo.isMIUI)}
              </Badge></div>
            </div>
          </div>
        )}

        {/* User Agent */}
        <div className="space-y-2">
          <h3 className="font-semibold">User Agent</h3>
          <div className="text-xs bg-muted p-2 rounded">
            {diagnostics.userAgent}
          </div>
        </div>

        {/* Diagnostic Alerts */}
        {diagnostics.capacitorPlatform === 'web' && diagnostics.isAndroidUA && (
          <Alert>
            <AlertDescription>
              🚨 PROBLÈME DÉTECTÉ: Capacitor détecte 'web' mais vous êtes sur Android. 
              C'est le problème classique des AAB Play Store.
            </AlertDescription>
          </Alert>
        )}

        {pluginStatus === 'initializing' && (
          <Alert>
            <AlertDescription>
              ⏳ INITIALISATION: Le plugin de permissions se charge... Veuillez patienter.
            </AlertDescription>
          </Alert>
        )}

        {pluginStatus === 'ready' && !diagnostics.hasPermissionsPlugin && (
          <Alert>
            <AlertDescription>
              🚨 ERREUR PLUGIN: Le plugin de permissions n'a pas pu être initialisé correctement.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button 
            onClick={testPermissionFlow} 
            disabled={testing || !diagnostics.hasPermissionsPlugin}
            className="w-full"
          >
            {testing ? "Test en cours..." : "🧪 Tester Flow Permissions"}
          </Button>

          <Button 
            onClick={runInitialDiagnostic} 
            variant="outline"
            className="w-full"
          >
            🔄 Actualiser Diagnostic
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Diagnostic effectué: {diagnostics.timestamp}
        </div>
      </CardContent>
    </Card>
  );
};