import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, CheckCircle, XCircle, AlertTriangle, Smartphone } from 'lucide-react';

export const AndroidNotificationCompatibilityTest = () => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [testing, setTesting] = useState(false);
  
  const { 
    requestPermissions, 
    permissionStatus, 
    testNotification,
    isNative 
  } = usePushNotifications();

  useEffect(() => {
    detectAndroidInfo();
  }, []);

  const detectAndroidInfo = () => {
    const userAgent = navigator.userAgent;
    const androidMatch = userAgent.match(/Android (\d+(?:\.\d+)?)/);
    const manufacturerGuess = guessManufacturer(userAgent);
    
    const info = {
      isAndroid: userAgent.includes('Android'),
      version: androidMatch ? androidMatch[1] : 'Non-Android',
      versionInt: androidMatch ? parseInt(androidMatch[1]) : 0,
      manufacturer: manufacturerGuess,
      userAgent: userAgent,
      isNative: isNative,
      supportLevel: getSupportLevel(androidMatch ? parseInt(androidMatch[1]) : 0)
    };
    
    setDeviceInfo(info);
  };

  const guessManufacturer = (userAgent: string): string => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco')) return 'Xiaomi/MIUI';
    if (ua.includes('samsung') || ua.includes('sm-')) return 'Samsung';
    if (ua.includes('oneplus')) return 'OnePlus';
    if (ua.includes('oppo')) return 'Oppo';
    if (ua.includes('vivo')) return 'Vivo';
    if (ua.includes('huawei') || ua.includes('honor')) return 'Huawei';
    return 'Autre/Générique';
  };

  const getSupportLevel = (androidVersion: number) => {
    if (androidVersion >= 13) return 'Android 13+ (POST_NOTIFICATIONS)';
    if (androidVersion >= 8) return 'Android 8-12 (Channels)';
    if (androidVersion >= 6) return 'Android 6-7 (Runtime)';
    if (androidVersion >= 4) return 'Android 4-5 (Basique)';
    return 'Non supporté';
  };

  const runCompatibilityTest = async () => {
    setTesting(true);
    const results: any = {};
    
    try {
      console.log('🧪 Test compatibilité notifications Android...');
      
      // Test 1: Détection plateforme
      results.platformDetection = {
        success: isNative,
        details: `Plateforme détectée: ${isNative ? 'Native' : 'Web'}`
      };
      
      // Test 2: Plugin disponibilité
      const hasPlugin = !!(window as any).CapacitorCustomPlugins?.PermissionsPlugin;
      results.pluginAvailability = {
        success: hasPlugin,
        details: `Plugin Android: ${hasPlugin ? 'Disponible' : 'Non disponible'}`
      };
      
      // Test 3: Demande permissions
      console.log('🧪 Test demande permissions...');
      const permissionResult = await requestPermissions();
      results.permissionRequest = {
        success: permissionResult,
        details: `Permissions: ${permissionResult ? 'Accordées' : 'Refusées'}`
      };
      
      // Test 4: Test notification (si permissions accordées)
      if (permissionResult) {
        console.log('🧪 Test envoi notification...');
        try {
          await testNotification();
          results.notificationTest = {
            success: true,
            details: 'Notification test envoyée'
          };
        } catch (error) {
          results.notificationTest = {
            success: false,
            details: 'Erreur envoi notification test'
          };
        }
      } else {
        results.notificationTest = {
          success: false,
          details: 'Test ignoré - permissions non accordées'
        };
      }
      
      setTestResults(results);
      
    } catch (error) {
      console.error('❌ Erreur test compatibilité:', error);
      results.error = {
        success: false,
        details: `Erreur: ${error}`
      };
      setTestResults(results);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (success === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getCompatibilityBadge = () => {
    if (!deviceInfo?.isAndroid) {
      return <Badge variant="secondary">Non-Android</Badge>;
    }
    
    if (deviceInfo.versionInt >= 13) {
      return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    } else if (deviceInfo.versionInt >= 8) {
      return <Badge variant="default" className="bg-blue-500">Bon</Badge>;
    } else if (deviceInfo.versionInt >= 6) {
      return <Badge variant="outline" className="border-yellow-500">Limité</Badge>;
    } else {
      return <Badge variant="destructive">Non supporté</Badge>;
    }
  };

  if (!deviceInfo) {
    return <div>Détection appareil...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Test compatibilité notifications Android
        </CardTitle>
        <div className="flex items-center gap-2">
          {getCompatibilityBadge()}
          <Badge variant="outline">
            {deviceInfo.manufacturer}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations appareil */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Android:</strong> {deviceInfo.version}</div>
          <div><strong>Fabricant:</strong> {deviceInfo.manufacturer}</div>
          <div><strong>Support:</strong> {deviceInfo.supportLevel}</div>
          <div><strong>Mode:</strong> {deviceInfo.isNative ? 'Natif' : 'Web'}</div>
        </div>

        {/* Status actuel */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4" />
            <span className="font-medium">État actuel</span>
          </div>
          <div className="text-sm space-y-1">
            <div>Permissions: {permissionStatus.granted ? '✅ Accordées' : '❌ Non accordées'}</div>
            <div>Refusées: {permissionStatus.denied ? '⚠️ Oui' : '✅ Non'}</div>
          </div>
        </div>

        {/* Bouton test */}
        <Button 
          onClick={runCompatibilityTest} 
          disabled={testing || !deviceInfo.isAndroid}
          className="w-full"
        >
          {testing ? 'Test en cours...' : 'Tester compatibilité'}
        </Button>

        {/* Résultats test */}
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Résultats du test</h4>
            {Object.entries(testResults).map(([key, result]: [string, any]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                {getStatusIcon(result.success)}
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-muted-foreground">- {result.details}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conseils spécifiques */}
        {deviceInfo.manufacturer === 'Xiaomi/MIUI' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800">⚠️ Appareil MIUI détecté</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Les appareils Xiaomi nécessitent souvent une activation manuelle dans Paramètres {'>'}
              Autorisations {'>'} Notifications et Paramètres {'>'} Batterie {'>'} Économie d&apos;énergie.
            </p>
          </div>
        )}

        {deviceInfo.versionInt < 8 && deviceInfo.isAndroid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800">⚠️ Version Android ancienne</h4>
            <p className="text-sm text-red-700 mt-1">
              Android {deviceInfo.version} a un support limité des notifications push. 
              Recommandation: mise à jour vers Android 8+.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};