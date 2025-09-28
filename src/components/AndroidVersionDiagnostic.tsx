import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { Capacitor } from '@capacitor/core';
import { CheckCircle, XCircle, AlertCircle, Smartphone, Camera, Image } from 'lucide-react';

interface DeviceInfo {
  manufacturer: string;
  brand: string;
  model: string;
  androidVersion: number;
  androidRelease: string;
  isMIUI: boolean;
  isEmui: boolean;
  isOneUI: boolean;
  isOxygenOS: boolean;
  isColorOS: boolean;
  strategy: string;
}

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

export function AndroidVersionDiagnostic() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();
  const { selectFromGallery } = useCamera();

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const info = await (window as any).Capacitor?.Plugins?.PermissionsPlugin?.getDeviceInfo?.();
        if (info) {
          setDeviceInfo(info);
        }
      }
    } catch (error) {
      console.log('❌ Erreur info appareil:', error);
    }
  };

  const runVersionSpecificTest = async () => {
    if (!deviceInfo) {
      toast({
        title: "❌ Erreur",
        description: "Informations appareil non disponibles",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults([]);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Détection version Android
      testResults.push({
        name: "Détection version Android",
        success: true,
        message: `Android ${deviceInfo.androidVersion} (${deviceInfo.androidRelease})`,
        details: {
          version: deviceInfo.androidVersion,
          release: deviceInfo.androidRelease
        }
      });

      // Test 2: Stratégie détectée
      testResults.push({
        name: "Stratégie fabricant",
        success: true,
        message: `Stratégie: ${deviceInfo.strategy}`,
        details: {
          manufacturer: deviceInfo.manufacturer,
          brand: deviceInfo.brand,
          strategy: deviceInfo.strategy
        }
      });

      // Test 3: Permissions spécifiques à la version
      const permissionsTest = await testVersionPermissions(deviceInfo.androidVersion);
      testResults.push(permissionsTest);

      // Test 4: Test galerie optimisé
      const galleryTest = await testVersionGallery(deviceInfo.androidVersion);
      testResults.push(galleryTest);

      // Test 5: Compatibilité UI spéciale
      const uiTest = testSpecialUI(deviceInfo);
      testResults.push(uiTest);

      setResults(testResults);

      const successCount = testResults.filter(r => r.success).length;
      toast({
        title: successCount === testResults.length ? "✅ Tests réussis" : "⚠️ Tests partiels",
        description: `${successCount}/${testResults.length} tests réussis`,
        variant: successCount === testResults.length ? "default" : "destructive"
      });

    } catch (error) {
      console.error('❌ Erreur test version:', error);
      toast({
        title: "❌ Erreur test",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testVersionPermissions = async (androidVersion: number): Promise<TestResult> => {
    try {
      const permissionsPlugin = (window as any).Capacitor?.Plugins?.PermissionsPlugin;
      if (!permissionsPlugin) {
        return {
          name: "Permissions version-spécifiques",
          success: false,
          message: "Plugin permissions non disponible"
        };
      }

      const result = await permissionsPlugin.forceRequestCameraPermissions();
      
      return {
        name: `Permissions Android ${androidVersion}`,
        success: result.granted,
        message: result.granted ? 
          `Permissions OK (${result.strategy})` : 
          "Permissions refusées",
        details: result
      };

    } catch (error) {
      return {
        name: "Permissions version-spécifiques",
        success: false,
        message: `Erreur: ${error}`
      };
    }
  };

  const testVersionGallery = async (androidVersion: number): Promise<TestResult> => {
    try {
      const start = Date.now();
      const file = await selectFromGallery();
      const duration = Date.now() - start;

      if (file) {
        let strategy = "Standard";
        if (androidVersion >= 33) strategy = "Photo Picker Android 13+";
        else if (androidVersion >= 29) strategy = "Storage Access Framework";
        else if (androidVersion >= 23) strategy = "Stratégie fabricant";

        return {
          name: `Galerie Android ${androidVersion}`,
          success: true,
          message: `Succès (${strategy}) - ${Math.round(duration/1000)}s`,
          details: {
            fileName: file.name,
            size: file.size,
            type: file.type,
            duration
          }
        };
      } else {
        return {
          name: `Galerie Android ${androidVersion}`,
          success: false,
          message: "Aucun fichier sélectionné"
        };
      }

    } catch (error) {
      return {
        name: "Test galerie version-spécifique",
        success: false,
        message: `Erreur: ${error}`
      };
    }
  };

  const testSpecialUI = (device: DeviceInfo): TestResult => {
    const specialUIs = [];
    
    if (device.isMIUI) specialUIs.push("MIUI");
    if (device.isEmui) specialUIs.push("EMUI");
    if (device.isOneUI) specialUIs.push("One UI");
    if (device.isOxygenOS) specialUIs.push("OxygenOS");
    if (device.isColorOS) specialUIs.push("ColorOS");

    return {
      name: "Interface spécialisée",
      success: true,
      message: specialUIs.length > 0 ? 
        `Détecté: ${specialUIs.join(', ')}` : 
        "Interface Android standard",
      details: {
        specialUIs,
        hasSpecialUI: specialUIs.length > 0
      }
    };
  };

  const getStatusIcon = (success: boolean) => {
    return success ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getVersionBadge = (version: number) => {
    if (version >= 33) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Android 13+</Badge>;
    } else if (version >= 29) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Android 10-12</Badge>;
    } else if (version >= 23) {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800">Android 6-9</Badge>;
    } else {
      return <Badge variant="destructive">Android Legacy</Badge>;
    }
  };

  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ce diagnostic n'est disponible que sur Android</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Diagnostic Version Android
        </CardTitle>
        <CardDescription>
          Test complet de compatibilité galerie par version Android
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {deviceInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Fabricant:</span> {deviceInfo.manufacturer}
              </div>
              <div>
                <span className="font-medium">Modèle:</span> {deviceInfo.model}
              </div>
              <div>
                <span className="font-medium">Version:</span> {getVersionBadge(deviceInfo.androidVersion)}
              </div>
              <div>
                <span className="font-medium">Stratégie:</span> {deviceInfo.strategy}
              </div>
            </div>

            {(deviceInfo.isMIUI || deviceInfo.isEmui || deviceInfo.isOneUI || deviceInfo.isOxygenOS || deviceInfo.isColorOS) && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Interface spécialisée détectée</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Optimisations spécifiques activées pour cette interface
                </p>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={runVersionSpecificTest} 
          disabled={loading || !deviceInfo}
          className="w-full"
        >
          {loading ? (
            <>
              <Camera className="h-4 w-4 mr-2 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <Image className="h-4 w-4 mr-2" />
              Tester la version Android
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <h4 className="font-medium">Résultats du test:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(result.success)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{result.name}</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-blue-600">
                        Voir détails
                      </summary>
                      <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Android 13+:</strong> Photo Picker API natif</p>
          <p><strong>Android 10-12:</strong> Storage Access Framework</p>
          <p><strong>Android 6-9:</strong> Stratégies fabricant spécialisées</p>
        </div>
      </CardContent>
    </Card>
  );
}