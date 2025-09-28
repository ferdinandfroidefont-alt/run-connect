import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { 
  Smartphone, 
  Camera, 
  Image, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Settings
} from 'lucide-react';

interface DiagnosticResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
}

export const GalleryDiagnostic = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const { toast } = useToast();
  const { selectFromGallery } = useCamera();

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      const info = await Device.getInfo();
      setDeviceInfo(info);
    } catch (error) {
      console.error('Erreur info appareil:', error);
    }
  };

  const runFullDiagnostic = async () => {
    setTesting(true);
    const testResults: DiagnosticResult[] = [];

    // Test 1: Détection appareil
    try {
      const info = await Device.getInfo();
      testResults.push({
        test: 'Détection appareil',
        success: true,
        message: `${info.manufacturer} ${info.model} - Android ${info.osVersion}`,
        details: info
      });
    } catch (error) {
      testResults.push({
        test: 'Détection appareil',
        success: false,
        message: 'Échec détection appareil',
        details: error
      });
    }

    // Test 2: Plugin natif disponible
    try {
      const pluginAvailable = !!(window as any).Capacitor?.Plugins?.PermissionsPlugin;
      testResults.push({
        test: 'Plugin natif',
        success: pluginAvailable,
        message: pluginAvailable ? 'Plugin PermissionsPlugin disponible' : 'Plugin non trouvé',
        details: { pluginAvailable }
      });
    } catch (error) {
      testResults.push({
        test: 'Plugin natif',
        success: false,
        message: 'Erreur vérification plugin',
        details: error
      });
    }

    // Test 3: Stratégie Android 13+
    if (deviceInfo?.osVersion && parseInt(deviceInfo.osVersion) >= 13) {
      try {
        const result = await (window as any).Capacitor?.Plugins?.PermissionsPlugin?.forceOpenGallery?.();
        testResults.push({
          test: 'Android 13+ Photo Picker',
          success: !!result?.success,
          message: result?.success ? 'Photo Picker fonctionne' : 'Photo Picker échec',
          details: result
        });
      } catch (error) {
        testResults.push({
          test: 'Android 13+ Photo Picker',
          success: false,
          message: 'Erreur Photo Picker',
          details: error
        });
      }
    }

    // Test 4: Test galerie standard
    try {
      const file = await selectFromGallery();
      testResults.push({
        test: 'Sélection galerie',
        success: !!file,
        message: file ? `Fichier sélectionné: ${file.name}` : 'Aucun fichier sélectionné',
        details: file ? { name: file.name, size: file.size, type: file.type } : null
      });
    } catch (error) {
      testResults.push({
        test: 'Sélection galerie',
        success: false,
        message: 'Erreur sélection galerie',
        details: error
      });
    }

    setResults(testResults);
    setTesting(false);

    // Toast résumé
    const successCount = testResults.filter(r => r.success).length;
    toast({
      title: "Diagnostic terminé",
      description: `${successCount}/${testResults.length} tests réussis`,
      variant: successCount === testResults.length ? "default" : "destructive"
    });
  };

  const testQuickGallery = async () => {
    try {
      const file = await selectFromGallery();
      if (file) {
        toast({
          title: "Test réussi",
          description: `Fichier sélectionné: ${file.name}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Test échoué",
          description: "Aucun fichier sélectionné",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur test",
        description: `Erreur: ${error}`,
        variant: "destructive"
      });
    }
  };

  const openSettings = async () => {
    try {
      await (window as any).Capacitor?.Plugins?.PermissionsPlugin?.openAppSettings?.();
      toast({
        title: "Paramètres ouverts",
        description: "Vérifiez les permissions dans les paramètres",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir les paramètres",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getDeviceIcon = () => {
    if (deviceInfo?.manufacturer?.toLowerCase().includes('xiaomi')) {
      return '📱';
    }
    if (deviceInfo?.manufacturer?.toLowerCase().includes('samsung')) {
      return '📱';
    }
    return '📱';
  };

  const isMIUI = () => {
    return deviceInfo?.manufacturer?.toLowerCase().includes('xiaomi') ||
           deviceInfo?.model?.toLowerCase().includes('redmi') ||
           deviceInfo?.model?.toLowerCase().includes('poco');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Diagnostic Galerie Android
        </CardTitle>
        <CardDescription>
          Testez l'accès galerie sur votre appareil Android
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Info appareil */}
        {deviceInfo && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getDeviceIcon()}</span>
              <span className="font-medium">
                {deviceInfo.manufacturer} {deviceInfo.model}
              </span>
              {isMIUI() && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  MIUI
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Android {deviceInfo.osVersion} (API {deviceInfo.webViewVersion})
            </div>
          </div>
        )}

        {/* Avertissement MIUI */}
        {isMIUI() && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Appareil MIUI détecté. Des permissions spéciales peuvent être nécessaires.
            </AlertDescription>
          </Alert>
        )}

        {/* Boutons de test */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={runFullDiagnostic}
            disabled={testing}
            className="flex items-center gap-2"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            Diagnostic Complet
          </Button>

          <Button
            variant="outline"
            onClick={testQuickGallery}
            className="flex items-center gap-2"
          >
            <Image className="w-4 h-4" />
            Test Rapide
          </Button>

          <Button
            variant="outline"
            onClick={openSettings}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Paramètres
          </Button>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Résultats des tests:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.success)}
                  <span className="font-medium">{result.test}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm">{result.message}</div>
                  {result.details && (
                    <div className="text-xs text-gray-500">
                      {JSON.stringify(result.details, null, 2).substring(0, 50)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Instructions:</strong></p>
          <p>• Le diagnostic teste différentes méthodes d'accès galerie</p>
          <p>• Android 13+ utilise le Photo Picker natif (plus sécurisé)</p>
          <p>• MIUI nécessite parfois des permissions spéciales</p>
          <p>• En cas d'échec, utilisez "Paramètres" pour vérifier les permissions</p>
        </div>
      </CardContent>
    </Card>
  );
};