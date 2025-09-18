import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  MapPin, 
  Camera, 
  Users, 
  Bell, 
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { androidPermissions } from '@/lib/androidPermissions';
import { Capacitor } from '@capacitor/core';

interface DeviceInfo {
  manufacturer?: string;
  model?: string;
  version?: string;
  sdkInt?: number;
  isMIUI?: boolean;
}

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export const MobileCompatibilityTest = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    if (Capacitor.getPlatform() === 'android') {
      const info = await androidPermissions.getDeviceInfo();
      setDeviceInfo(info);
    }
  };

  const addTestResult = (test: string, status: TestResult['status'], message: string, details?: string) => {
    setTestResults(prev => [...prev, { test, status, message, details }]);
  };

  const runFullCompatibilityTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const tests = [
      { name: 'Détection du périphérique', weight: 10 },
      { name: 'Test ouverture paramètres', weight: 20 },
      { name: 'Test permissions localisation', weight: 20 },
      { name: 'Test permissions caméra', weight: 15 },
      { name: 'Test permissions contacts', weight: 15 },
      { name: 'Test permissions notifications', weight: 20 }
    ];

    let currentProgress = 0;

    try {
      // Test 1: Détection du périphérique
      await new Promise(resolve => setTimeout(resolve, 500));
      if (Capacitor.getPlatform() !== 'android') {
        addTestResult('Détection', 'error', 'Non compatible - Pas sur Android', 'Cette app nécessite Android');
        setProgress(100);
        setIsRunning(false);
        return;
      }

      const info = await androidPermissions.getDeviceInfo();
      if (info) {
        let deviceMessage = `${info.manufacturer} ${info.model} (Android ${info.version})`;
        if (info.isMIUI) {
          deviceMessage += ' - MIUI détecté ✓';
          addTestResult('Détection', 'success', deviceMessage, 'Optimisations MIUI activées');
        } else {
          addTestResult('Détection', 'success', deviceMessage, 'Périphérique Android standard');
        }
      } else {
        addTestResult('Détection', 'warning', 'Périphérique non identifié', 'Les tests peuvent être limités');
      }
      
      currentProgress += tests[0].weight;
      setProgress(currentProgress);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Test 2: Ouverture des paramètres
      try {
        const opened = await androidPermissions.openAppSettings();
        if (opened) {
          addTestResult('Paramètres', 'success', 'Ouverture réussie', 'L\'app peut ouvrir les paramètres Android');
          toast({
            title: "Paramètres ouverts",
            description: "Vérifiez que les paramètres RunConnect se sont ouverts",
          });
        } else {
          addTestResult('Paramètres', 'error', 'Échec ouverture', 'Impossible d\'ouvrir les paramètres automatiquement');
        }
      } catch (e) {
        addTestResult('Paramètres', 'error', 'Erreur paramètres', 'Exception lors de l\'ouverture');
      }
      
      currentProgress += tests[1].weight;
      setProgress(currentProgress);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 3: Permissions localisation
      try {
        const locationGranted = await androidPermissions.forceRequestLocationPermissions();
        if (locationGranted) {
          addTestResult('Localisation', 'success', 'Permission accordée', 'GPS et localisation fonctionnels');
        } else {
          if (info?.isMIUI) {
            addTestResult('Localisation', 'warning', 'Permission refusée', 'Sur MIUI: Paramètres > Apps > RunConnect > Permissions > Localisation');
          } else {
            addTestResult('Localisation', 'warning', 'Permission refusée', 'Activez manuellement dans les paramètres');
          }
        }
      } catch (e) {
        addTestResult('Localisation', 'error', 'Erreur localisation', 'Impossible de demander la permission');
      }
      
      currentProgress += tests[2].weight;
      setProgress(currentProgress);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 4: Permissions caméra
      try {
        const cameraGranted = await androidPermissions.forceRequestCameraPermissions();
        if (cameraGranted) {
          addTestResult('Caméra', 'success', 'Permission accordée', 'Caméra et photos accessibles');
        } else {
          addTestResult('Caméra', 'warning', 'Permission refusée', 'Nécessaire pour les photos de profil');
        }
      } catch (e) {
        addTestResult('Caméra', 'error', 'Erreur caméra', 'Impossible de demander la permission');
      }
      
      currentProgress += tests[3].weight;
      setProgress(currentProgress);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 5: Permissions contacts
      try {
        const contactsGranted = await androidPermissions.forceRequestContactsPermissions();
        if (contactsGranted) {
          addTestResult('Contacts', 'success', 'Permission accordée', 'Suggestions d\'amis disponibles');
        } else {
          addTestResult('Contacts', 'warning', 'Permission refusée', 'Optionnel - pour trouver vos amis');
        }
      } catch (e) {
        addTestResult('Contacts', 'error', 'Erreur contacts', 'Impossible de demander la permission');
      }
      
      currentProgress += tests[4].weight;
      setProgress(currentProgress);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 6: Permissions notifications
      try {
        const notifResult = await androidPermissions.requestNotificationPermissions();
        if (notifResult.granted) {
          addTestResult('Notifications', 'success', 'Permission accordée', 'Notifications push activées');
        } else {
          let message = 'Permission refusée';
          let details = 'Activez manuellement dans les paramètres';
          
          if (notifResult.needsSettings) {
            message = 'Configuration manuelle requise';
            if (info?.isMIUI) {
              details = 'MIUI: Paramètres > Notifications > RunConnect > Autoriser';
            }
          }
          
          addTestResult('Notifications', 'warning', message, details);
        }
      } catch (e) {
        addTestResult('Notifications', 'error', 'Erreur notifications', 'Impossible de demander la permission');
      }
      
      currentProgress += tests[5].weight;
      setProgress(currentProgress);

    } catch (error) {
      addTestResult('Test global', 'error', 'Erreur inattendue', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  const getCompatibilityScore = () => {
    if (testResults.length === 0) return 0;
    
    const successCount = testResults.filter(r => r.status === 'success').length;
    const warningCount = testResults.filter(r => r.status === 'warning').length;
    
    return Math.round(((successCount * 100) + (warningCount * 50)) / testResults.length);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Test de compatibilité mobile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info périphérique */}
        {deviceInfo && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Périphérique détecté</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Marque:</strong> {deviceInfo.manufacturer}</p>
              <p><strong>Modèle:</strong> {deviceInfo.model}</p>
              <p><strong>Android:</strong> {deviceInfo.version} (API {deviceInfo.sdkInt})</p>
              {deviceInfo.isMIUI && (
                <Badge className="bg-orange-500 text-white">MIUI détecté</Badge>
              )}
            </div>
          </div>
        )}

        {/* Score de compatibilité */}
        {testResults.length > 0 && (
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(getCompatibilityScore())}`}>
              {getCompatibilityScore()}%
            </div>
            <p className="text-sm text-muted-foreground">Score de compatibilité</p>
          </div>
        )}

        {/* Barre de progression */}
        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              Test en cours... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Bouton de test */}
        <Button 
          onClick={runFullCompatibilityTest}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <Settings className="h-4 w-4 mr-2" />
              Lancer le test complet
            </>
          )}
        </Button>

        {/* Résultats */}
        {testResults.length > 0 && (
          <ScrollArea className="h-60 border rounded-lg p-4">
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{result.test}</h5>
                      <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                        {result.status === 'success' ? 'OK' : result.status === 'error' ? 'Erreur' : 'Attention'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Conseils MIUI */}
        {deviceInfo?.isMIUI && (
          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
              📱 Conseils pour MIUI (Xiaomi/Redmi)
            </h4>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <li>• Paramètres → Applications → RunConnect → Autorisations</li>
              <li>• Sécurité → Autorisations → Démarrage automatique → Activer RunConnect</li>
              <li>• Paramètres → Batterie → Économie → Ne pas optimiser RunConnect</li>
              <li>• Notifications → RunConnect → Tout autoriser</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};