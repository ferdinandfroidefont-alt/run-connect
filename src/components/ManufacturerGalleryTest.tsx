import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Image, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';

interface DeviceInfo {
  manufacturer?: string;
  model?: string;
  brand?: string;
  androidVersion?: string;
  isMIUI?: boolean;
}

interface TestResult {
  method: string;
  success: boolean;
  message: string;
  strategy: string;
}

export function ManufacturerGalleryTest() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      const info = await (window as any).Capacitor?.Plugins?.PermissionsPlugin?.getDeviceInfo?.();
      setDeviceInfo(info);
    } catch (error) {
      console.error('Failed to load device info:', error);
    }
  };

  const getDeviceStrategy = () => {
    if (!deviceInfo) return 'standard';
    
    const manufacturer = deviceInfo.manufacturer?.toLowerCase() || '';
    const brand = deviceInfo.brand?.toLowerCase() || '';
    
    if (manufacturer.includes('xiaomi') || brand.includes('xiaomi') || deviceInfo.isMIUI) {
      return 'miui';
    }
    if (manufacturer.includes('samsung') || brand.includes('samsung')) {
      return 'samsung';
    }
    if (manufacturer.includes('huawei') || manufacturer.includes('honor') || 
        brand.includes('huawei') || brand.includes('honor')) {
      return 'huawei';
    }
    if (manufacturer.includes('oneplus') || brand.includes('oneplus')) {
      return 'oneplus';
    }
    if (manufacturer.includes('oppo') || manufacturer.includes('realme') ||
        brand.includes('oppo') || brand.includes('realme')) {
      return 'oppo';
    }
    if (manufacturer.includes('lg') || manufacturer.includes('lge') ||
        brand.includes('lg') || brand.includes('lge')) {
      return 'lg';
    }
    
    return 'standard';
  };

  const testManufacturerStrategy = async () => {
    setTesting(true);
    setResults([]);

    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      toast({
        title: "Test uniquement sur Android",
        description: "Ce test ne fonctionne que sur des appareils Android natifs",
        variant: "destructive"
      });
      setTesting(false);
      return;
    }

    const strategy = getDeviceStrategy();
    const newResults: TestResult[] = [];

    try {
      // Test de la stratégie optimisée
      try {
        const result = await (window as any).Capacitor?.Plugins?.PermissionsPlugin?.forceOpenGallery?.();
        newResults.push({
          method: `Stratégie ${strategy}`,
          success: !!result?.success,
          message: result?.success ? "Galerie ouverte avec succès" : "Échec de l'ouverture",
          strategy
        });
        
        toast({
          title: result?.success ? "Test réussi !" : "Test échoué",
          description: result?.success ? `La stratégie ${strategy} fonctionne correctement` : `La stratégie ${strategy} a échoué`,
          variant: result?.success ? "default" : "destructive"
        });
      } catch (error: any) {
        newResults.push({
          method: `Stratégie ${strategy}`,
          success: false,
          message: error.message || "Échec de l'ouverture",
          strategy
        });
        
        toast({
          title: "Test échoué",
          description: `La stratégie ${strategy} a échoué: ${error.message}`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      newResults.push({
        method: "Plugin natif",
        success: false,
        message: error.message || "Plugin non disponible",
        strategy: "none"
      });
      
      toast({
        title: "Erreur plugin",
        description: "Le plugin natif n'est pas disponible",
        variant: "destructive"
      });
    }

    setResults(newResults);
    setTesting(false);
  };

  const getStrategyIcon = (strategy: string) => {
    const icons = {
      miui: "🛡️",
      samsung: "📱",
      huawei: "🌸",
      oneplus: "⚡",
      oppo: "🎨",
      lg: "📺",
      standard: "🤖"
    };
    return icons[strategy as keyof typeof icons] || "📱";
  };

  const getStrategyDescription = (strategy: string) => {
    const descriptions = {
      miui: "Galerie MIUI + Intent spécialisé + File Explorer Xiaomi",
      samsung: "Samsung Gallery + Samsung My Files",
      huawei: "Huawei Gallery + Huawei File Manager",
      oneplus: "OnePlus Gallery + OnePlus File Manager",
      oppo: "Oppo Gallery (ColorOS) + Oppo File Manager",
      lg: "LG Gallery + LG File Manager",
      standard: "Galerie Android standard + Méthodes alternatives"
    };
    return descriptions[strategy as keyof typeof descriptions] || "Stratégie inconnue";
  };

  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Test Fabricant - Android Uniquement
          </CardTitle>
          <CardDescription>
            Ce composant teste les stratégies spécifiques par fabricant Android
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-muted-foreground">
              Ce test n'est disponible que sur des appareils Android natifs
            </p>
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
          Test Stratégie Fabricant
        </CardTitle>
        <CardDescription>
          Test la stratégie optimisée pour votre fabricant Android
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations de l'appareil */}
        {deviceInfo && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getStrategyIcon(getDeviceStrategy())}</span>
              <div>
                <p className="font-medium">
                  {deviceInfo.manufacturer} {deviceInfo.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  Android {deviceInfo.androidVersion} • Stratégie: {getDeviceStrategy()}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {getStrategyDescription(getDeviceStrategy())}
            </p>
          </div>
        )}

        {/* Bouton de test */}
        <Button 
          onClick={testManufacturerStrategy}
          disabled={testing}
          className="w-full"
        >
          <Image className="h-4 w-4 mr-2" />
          {testing ? "Test en cours..." : "Tester Stratégie Fabricant"}
        </Button>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Résultats du test :</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{result.method}</p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? "Réussi" : "Échec"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Ce test utilise la stratégie optimisée pour votre fabricant</p>
          <p>• Plusieurs méthodes de fallback sont testées automatiquement</p>
          <p>• Les permissions sont gérées selon votre version Android</p>
        </div>
      </CardContent>
    </Card>
  );
}