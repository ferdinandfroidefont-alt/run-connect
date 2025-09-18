import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { androidPermissions } from '@/lib/androidPermissions';
import { forceGetPosition } from '@/lib/forceNativePermissions';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { CheckCircle, XCircle, AlertCircle, Smartphone, Settings, Shield } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
  recommendation?: string;
}

export const CompatibilityTestSuite = () => {
  const [testing, setTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();
  const { requestPermissions, isNative } = usePushNotifications();

  useEffect(() => {
    // Détection du périphérique au montage
    if (androidPermissions.isAndroid()) {
      androidPermissions.getDeviceInfo().then((info) => {
        setDeviceInfo(info);
        // Ajouter test de compatibilité initiale
        checkInitialCompatibility(info);
      });
    } else {
      checkWebCompatibility();
    }
  }, []);

  const checkInitialCompatibility = (info: any) => {
    const initialResults: TestResult[] = [];

    // Vérification type d'appareil
    if (info.isMIUI) {
      initialResults.push({
        name: 'Appareil MIUI/Xiaomi détecté',
        status: 'warning',
        message: 'Nécessite configuration manuelle',
        details: `${info.manufacturer} ${info.model} avec MIUI`,
        recommendation: 'Utilisez les plugins natifs et vérifiez les paramètres manuellement'
      });
    } else if (info.manufacturer?.toLowerCase().includes('samsung')) {
      initialResults.push({
        name: 'Appareil Samsung détecté',
        status: 'success',
        message: 'Bonne compatibilité attendue',
        details: `${info.manufacturer} ${info.model}`
      });
    } else {
      initialResults.push({
        name: 'Appareil Android standard',
        status: 'success',
        message: 'Compatibilité normale',
        details: `${info.manufacturer} ${info.model} - Android ${info.version}`
      });
    }

    // Version Android
    const sdkInt = parseInt(info.sdkInt);
    if (sdkInt >= 33) {
      initialResults.push({
        name: 'Version Android',
        status: 'success',
        message: 'Android 13+ - Support complet',
        details: `API Level ${sdkInt}`
      });
    } else if (sdkInt >= 26) {
      initialResults.push({
        name: 'Version Android',
        status: 'warning',
        message: 'Android 8+ - Support partiel',
        details: `API Level ${sdkInt}`,
        recommendation: 'Certaines fonctionnalités peuvent nécessiter une configuration manuelle'
      });
    } else {
      initialResults.push({
        name: 'Version Android',
        status: 'error',
        message: 'Version trop ancienne',
        details: `API Level ${sdkInt}`,
        recommendation: 'Mise à jour recommandée pour une meilleure compatibilité'
      });
    }

    setResults(initialResults);
  };

  const checkWebCompatibility = () => {
    const webResults: TestResult[] = [
      {
        name: 'Plateforme Web',
        status: 'warning',
        message: 'Fonctionnalités limitées sur web',
        details: 'Certaines permissions nécessitent un environnement natif',
        recommendation: 'Utilisez l\'application mobile pour toutes les fonctionnalités'
      }
    ];
    setResults(webResults);
  };

  const runFullCompatibilityTest = async () => {
    if (!androidPermissions.isAndroid()) {
      toast({
        title: "Test Android uniquement",
        description: "Ce test complet nécessite Android natif",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    setProgress(0);
    const testResults: TestResult[] = [...results];

    try {
      // Test 1: Plugin Android natif
      setProgress(10);
      try {
        const hasPlugin = typeof (window as any).PermissionsPlugin === 'object';
        testResults.push({
          name: 'Plugin Android Natif',
          status: hasPlugin ? 'success' : 'error',
          message: hasPlugin ? 'Plugin disponible' : 'Plugin non disponible',
          details: hasPlugin ? 'Accès complet aux permissions système' : 'Fonctionnalités limitées',
          recommendation: !hasPlugin ? 'Vérifiez l\'installation Capacitor' : undefined
        });
      } catch (error) {
        testResults.push({
          name: 'Plugin Android Natif',
          status: 'error',
          message: 'Erreur détection plugin',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 2: Permissions géolocalisation
      setProgress(25);
      try {
        console.log('🧪 Test géolocalisation...');
        const locationGranted = await androidPermissions.forceRequestLocationPermissions();
        
        if (locationGranted) {
          try {
            const position = await forceGetPosition();
            testResults.push({
              name: 'Géolocalisation',
              status: 'success',
              message: 'Position obtenue avec succès',
              details: `Lat: ${(position as any).lat.toFixed(4)}, Lng: ${(position as any).lng.toFixed(4)}`
            });
          } catch (posError) {
            testResults.push({
              name: 'Géolocalisation',
              status: 'warning',
              message: 'Permission accordée mais position inaccessible',
              details: posError instanceof Error ? posError.message : 'Erreur position',
              recommendation: 'Vérifiez que le GPS est activé'
            });
          }
        } else {
          testResults.push({
            name: 'Géolocalisation',
            status: 'error',
            message: 'Permission refusée',
            recommendation: deviceInfo?.isMIUI 
              ? 'Allez dans Paramètres > Apps > RunConnect > Autorisations > Localisation'
              : 'Autorisez la géolocalisation dans les paramètres'
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Géolocalisation',
          status: 'error',
          message: 'Erreur test géolocalisation',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 3: Permissions caméra/galerie
      setProgress(50);
      try {
        console.log('🧪 Test caméra/galerie...');
        const cameraGranted = await androidPermissions.forceRequestCameraPermissions();
        
        if (cameraGranted) {
          try {
            const galleryResult = await androidPermissions.forceOpenGallery();
            testResults.push({
              name: 'Caméra/Galerie',
              status: galleryResult.success ? 'success' : 'warning',
              message: galleryResult.success ? 'Accès galerie confirmé' : 'Permission accordée mais problème galerie',
              details: galleryResult.method || 'Test galerie',
              recommendation: !galleryResult.success && deviceInfo?.isMIUI 
                ? 'Bug connu MIUI - utilisez le plugin natif'
                : undefined
            });
          } catch (galleryError) {
            testResults.push({
              name: 'Caméra/Galerie',
              status: 'warning',
              message: 'Permission accordée mais galerie inaccessible',
              details: galleryError instanceof Error ? galleryError.message : 'Erreur galerie',
              recommendation: 'Vérifiez les permissions de stockage'
            });
          }
        } else {
          testResults.push({
            name: 'Caméra/Galerie',
            status: 'error',
            message: 'Permission refusée',
            recommendation: deviceInfo?.isMIUI 
              ? 'Allez dans Paramètres > Apps > RunConnect > Autorisations > Caméra'
              : 'Autorisez l\'accès caméra dans les paramètres'
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Caméra/Galerie',
          status: 'error',
          message: 'Erreur test caméra',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 4: Notifications push
      setProgress(75);
      try {
        console.log('🧪 Test notifications...');
        const notifGranted = await androidPermissions.requestNotificationPermissions();
        
        if (notifGranted.granted) {
          // Test notification locale
          const testNotif = await androidPermissions.showLocalNotification('Test RunConnect', 'Notifications fonctionnelles!');
          testResults.push({
            name: 'Notifications Push',
            status: 'success',
            message: 'Notifications activées et testées',
            details: testNotif ? 'Notification locale affichée' : 'Permission accordée'
          });
        } else {
          testResults.push({
            name: 'Notifications Push',
            status: 'warning',
            message: 'Notifications non autorisées',
            details: notifGranted.advice || 'Configuration manuelle requise',
            recommendation: deviceInfo?.isMIUI 
              ? 'MIUI: Paramètres > Apps > RunConnect > Notifications > Autoriser'
              : 'Autorisez les notifications dans les paramètres'
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Notifications Push',
          status: 'error',
          message: 'Erreur test notifications',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 5: Contacts (optionnel)
      setProgress(90);
      try {
        console.log('🧪 Test contacts (optionnel)...');
        const contactsGranted = await androidPermissions.forceRequestContactsPermissions();
        testResults.push({
          name: 'Contacts (Optionnel)',
          status: contactsGranted ? 'success' : 'warning',
          message: contactsGranted ? 'Accès contacts autorisé' : 'Accès contacts refusé',
          details: 'Fonctionnalité optionnelle pour suggestions d\'amis',
          recommendation: !contactsGranted ? 'Vous pouvez activer plus tard dans les paramètres' : undefined
        });
      } catch (error) {
        testResults.push({
          name: 'Contacts (Optionnel)',
          status: 'warning',
          message: 'Test contacts ignoré',
          details: 'Fonctionnalité optionnelle'
        });
      }

      setProgress(100);
      setResults(testResults);

      // Résumé final
      const successCount = testResults.filter(r => r.status === 'success').length;
      const totalTests = testResults.length;
      
      if (successCount === totalTests) {
        toast({
          title: "✅ Parfaite compatibilité!",
          description: `Tous les tests réussis (${successCount}/${totalTests})`
        });
      } else if (successCount >= totalTests * 0.7) {
        toast({
          title: "✅ Bonne compatibilité",
          description: `${successCount}/${totalTests} tests réussis - quelques ajustements possibles`
        });
      } else {
        toast({
          title: "⚠️ Compatibilité partielle",
          description: `${successCount}/${totalTests} tests réussis - configuration requise`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('🧪 Erreur test global:', error);
      toast({
        title: "Erreur test global",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
      setProgress(0);
    }
  };

  const openSettings = async () => {
    try {
      await androidPermissions.openAppSettings();
      toast({
        title: "Paramètres ouverts",
        description: deviceInfo?.isMIUI 
          ? "MIUI: Vérifiez toutes les autorisations dans la section Autorisations"
          : "Vérifiez les permissions dans les paramètres de l'app"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir les paramètres automatiquement",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getDeviceTypeIcon = () => {
    if (!deviceInfo) return "📱";
    if (deviceInfo.isMIUI) return "🔴"; // Xiaomi/Redmi
    if (deviceInfo.manufacturer?.toLowerCase().includes('samsung')) return "🔵"; // Samsung
    return "📱"; // Autres Android
  };

  const compatibilityScore = results.length > 0 
    ? Math.round((results.filter(r => r.status === 'success').length / results.length) * 100)
    : 0;

  return (
    <Card className="border rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Test Compatibilité Complète
        </CardTitle>
        {deviceInfo && (
          <div className="text-sm text-muted-foreground">
            {getDeviceTypeIcon()} {deviceInfo.manufacturer} {deviceInfo.model}
            {deviceInfo.isMIUI && <span className="text-red-500 font-semibold"> (MIUI)</span>}
            <br />
            Android {deviceInfo.version} (API {deviceInfo.sdkInt})
            {compatibilityScore > 0 && (
              <span className="ml-2">
                - Score: <Badge variant={compatibilityScore >= 80 ? "default" : compatibilityScore >= 60 ? "secondary" : "destructive"}>
                  {compatibilityScore}%
                </Badge>
              </span>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {testing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Test en cours...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Résultats des tests:</h4>
            {results.map((result, index) => (
              <div key={index} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.name}</span>
                  </div>
                  <Badge variant={
                    result.status === 'success' ? 'default' : 
                    result.status === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.details && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {result.details}
                  </p>
                )}
                {result.recommendation && (
                  <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
                    <strong>Recommandation:</strong> {result.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={runFullCompatibilityTest}
            disabled={testing || !androidPermissions.isAndroid()}
            className="flex-1"
          >
            {testing ? (
              <>
                <Smartphone className="h-4 w-4 mr-2" />
                Test en cours...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Lancer Test Complet
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={openSettings}
            disabled={!androidPermissions.isAndroid()}
          >
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </div>

        {!androidPermissions.isAndroid() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
            <div className="font-semibold text-yellow-700">
              🌐 Environnement Web détecté
            </div>
            <div className="text-yellow-600 mt-1">
              Pour tester la compatibilité complète, utilisez l'application Android native.
              Les tests web sont limités aux fonctionnalités du navigateur.
            </div>
          </div>
        )}

        {deviceInfo?.isMIUI && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
            <div className="font-semibold text-red-700 flex items-center gap-2">
              🔴 Optimisations MIUI requises
            </div>
            <div className="text-red-600 mt-1 space-y-1">
              <div>• Paramètres &gt; Apps &gt; RunConnect &gt; Autorisations</div>
              <div>• Activez: Localisation, Caméra, Notifications</div>
              <div>• Si problème: Désactivez l'optimisation batterie pour RunConnect</div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <strong>À propos:</strong> Ce test vérifie la compatibilité complète de RunConnect avec votre appareil.
          Il teste toutes les permissions nécessaires et identifie les optimisations spécifiques à votre modèle.
        </div>
      </CardContent>
    </Card>
  );
};