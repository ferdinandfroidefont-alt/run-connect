import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Capacitor } from '@capacitor/core';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { 
  Smartphone, 
  Battery, 
  Settings, 
  Shield, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  ExternalLink 
} from 'lucide-react';

interface DeviceInfo {
  manufacturer: string;
  model: string;
  platform: string;
  osVersion: string;
  isAndroid: boolean;
}

interface OptimizationStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  instructions: string[];
}

export const AndroidNotificationOptimizer = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [optimizationSteps, setOptimizationSteps] = useState<OptimizationStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [isOptimized, setIsOptimized] = useState(false);

  // Detect device and set optimization steps
  useEffect(() => {
    const detectDevice = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getInfo();
        const deviceData: DeviceInfo = {
          manufacturer: info.manufacturer || 'Unknown',
          model: info.model || 'Unknown',
          platform: info.platform || 'Unknown',
          osVersion: info.osVersion || 'Unknown',
          isAndroid: info.platform === 'android'
        };

        setDeviceInfo(deviceData);
        
        if (deviceData.isAndroid) {
          generateOptimizationSteps(deviceData);
        }
      } catch (error) {
        console.error('❌ Error detecting device:', error);
      }
    };

    detectDevice();
  }, []);

  const generateOptimizationSteps = (device: DeviceInfo) => {
    const steps: OptimizationStep[] = [
      {
        id: 'battery-optimization',
        title: 'Désactiver l\'optimisation de batterie',
        description: 'Empêcher Android de mettre l\'app en veille',
        isCompleted: false,
        isRequired: true,
        instructions: getBatteryOptimizationInstructions(device.manufacturer)
      },
      {
        id: 'autostart',
        title: 'Activer le démarrage automatique',
        description: 'Autoriser l\'app à démarrer automatiquement',
        isCompleted: false,
        isRequired: true,
        instructions: getAutostartInstructions(device.manufacturer)
      },
      {
        id: 'notification-channels',
        title: 'Configurer les canaux de notification',
        description: 'S\'assurer que tous les types de notifications sont activés',
        isCompleted: false,
        isRequired: true,
        instructions: [
          'Aller dans Paramètres > Applications > RunConnect',
          'Toucher "Notifications"',
          'Vérifier que "Autoriser les notifications" est activé',
          'Vérifier que chaque canal de notification est activé',
          'Régler l\'importance sur "Élevée" pour les notifications importantes'
        ]
      },
      {
        id: 'background-activity',
        title: 'Autoriser l\'activité en arrière-plan',
        description: 'Permettre à l\'app de fonctionner en arrière-plan',
        isCompleted: false,
        isRequired: device.manufacturer.toLowerCase().includes('xiaomi') || 
                   device.manufacturer.toLowerCase().includes('huawei') ||
                   device.manufacturer.toLowerCase().includes('oppo') ||
                   device.manufacturer.toLowerCase().includes('vivo'),
        instructions: getBackgroundActivityInstructions(device.manufacturer)
      },
      {
        id: 'lock-screen',
        title: 'Notifications sur écran verrouillé',
        description: 'Afficher les notifications même quand l\'écran est verrouillé',
        isCompleted: false,
        isRequired: false,
        instructions: [
          'Aller dans Paramètres > Sécurité > Notifications sur écran verrouillé',
          'Sélectionner "Afficher tout le contenu"',
          'Ou aller dans Paramètres > Applications > RunConnect > Notifications',
          'Activer "Sur l\'écran de verrouillage"'
        ]
      }
    ];

    setOptimizationSteps(steps);
  };

  const getBatteryOptimizationInstructions = (manufacturer: string): string[] => {
    const baseInstructions = [
      'Aller dans Paramètres > Batterie',
      'Toucher "Optimisation de la batterie" ou "Optimisation des applications"',
      'Chercher "RunConnect" dans la liste',
      'Toucher sur RunConnect et sélectionner "Ne pas optimiser"'
    ];

    switch (manufacturer.toLowerCase()) {
      case 'samsung':
        return [
          'Aller dans Paramètres > Applications > RunConnect',
          'Toucher "Batterie"',
          'Sélectionner "Optimisé" puis "Applications non optimisées"',
          'Chercher RunConnect et l\'ajouter à la liste'
        ];
      case 'huawei':
        return [
          'Aller dans Paramètres > Batterie > Lancement d\'app',
          'Chercher RunConnect',
          'Désactiver "Gérer automatiquement"',
          'Activer "Lancement automatique", "Lancement secondaire" et "Exécuter en arrière-plan"'
        ];
      case 'xiaomi':
        return [
          'Aller dans Paramètres > Batterie et performances > Gérer l\'utilisation de la batterie des apps',
          'Chercher RunConnect',
          'Sélectionner "Pas de restrictions"',
          'Ou aller dans Sécurité > Autostart et activer RunConnect'
        ];
      default:
        return baseInstructions;
    }
  };

  const getAutostartInstructions = (manufacturer: string): string[] => {
    switch (manufacturer.toLowerCase()) {
      case 'xiaomi':
        return [
          'Ouvrir l\'app "Sécurité"',
          'Toucher "Autostart" ou "Démarrage automatique"',
          'Chercher RunConnect et activer l\'interrupteur'
        ];
      case 'huawei':
        return [
          'Aller dans Paramètres > Batterie > Lancement d\'app',
          'Chercher RunConnect',
          'Activer "Lancement automatique" et "Lancement secondaire"'
        ];
      case 'oppo':
      case 'oneplus':
        return [
          'Aller dans Paramètres > Batterie > Optimisation de batterie',
          'Toucher "Apps non optimisées"',
          'Chercher RunConnect et sélectionner "Ne pas optimiser"'
        ];
      case 'vivo':
        return [
          'Aller dans Paramètres > Batterie > Gestion d\'arrière-plan',
          'Chercher RunConnect',
          'Activer "Autoriser l\'activité en arrière-plan"'
        ];
      default:
        return [
          'Aller dans Paramètres > Applications > RunConnect',
          'Chercher les options de démarrage automatique',
          'Activer toutes les permissions d\'arrière-plan'
        ];
    }
  };

  const getBackgroundActivityInstructions = (manufacturer: string): string[] => {
    switch (manufacturer.toLowerCase()) {
      case 'xiaomi':
        return [
          'Ouvrir l\'app "Sécurité"',
          'Toucher "Économiseur de batterie"',
          'Toucher "Gérer les apps"',
          'Chercher RunConnect et sélectionner "Pas de restrictions"'
        ];
      case 'huawei':
        return [
          'Aller dans Paramètres > Batterie > Lancement d\'app',
          'Chercher RunConnect',
          'Activer "Exécuter en arrière-plan"'
        ];
      case 'oppo':
        return [
          'Aller dans Paramètres > Batterie > Économiseur d\'énergie',
          'Toucher "Protection en veille"',
          'Ajouter RunConnect à la liste blanche'
        ];
      case 'vivo':
        return [
          'Aller dans Paramètres > Batterie > Gestion d\'arrière-plan',
          'Activer "Autoriser l\'activité en arrière-plan" pour RunConnect'
        ];
      default:
        return [
          'Aller dans Paramètres > Applications > RunConnect',
          'Vérifier que l\'activité en arrière-plan est autorisée'
        ];
    }
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const markStepCompleted = (stepId: string) => {
    setOptimizationSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, isCompleted: true } : step
      )
    );

    enhancedToast.success({
      title: 'Étape complétée',
      description: 'Étape d\'optimisation marquée comme complétée'
    });

    // Check if all required steps are complete
    const updatedSteps = optimizationSteps.map(step => 
      step.id === stepId ? { ...step, isCompleted: true } : step
    );
    
    const allRequiredCompleted = updatedSteps
      .filter(step => step.isRequired)
      .every(step => step.isCompleted);
    
    if (allRequiredCompleted) {
      setIsOptimized(true);
      enhancedToast.success({
        title: 'Optimisation terminée!',
        description: 'Toutes les étapes requises ont été complétées'
      });
    }
  };

  const openSystemSettings = () => {
    // In a real app, this would open the system settings
    enhancedToast.info({
      title: 'Ouvrir les paramètres',
      description: 'Veuillez ouvrir manuellement les paramètres système'
    });
  };

  if (!Capacitor.isNativePlatform() || !deviceInfo?.isAndroid) {
    return (
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          L'optimisation des notifications Android n'est disponible que sur les appareils Android natifs.
        </AlertDescription>
      </Alert>
    );
  }

  const completedSteps = optimizationSteps.filter(step => step.isCompleted).length;
  const requiredSteps = optimizationSteps.filter(step => step.isRequired).length;
  const requiredCompleted = optimizationSteps.filter(step => step.isRequired && step.isCompleted).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Optimisation Android
            {isOptimized && <CheckCircle className="h-5 w-5 text-success" />}
          </CardTitle>
          <CardDescription>
            Optimisez les paramètres Android pour garantir la réception des notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Informations de l'appareil:</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>Fabricant: {deviceInfo.manufacturer}</div>
              <div>Modèle: {deviceInfo.model}</div>
              <div>Version Android: {deviceInfo.osVersion}</div>
              <div>Plateforme: {deviceInfo.platform}</div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Progression:</span>
              <Badge variant={isOptimized ? "default" : "secondary"}>
                {completedSteps}/{optimizationSteps.length} étapes
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Requises:</span>
              <Badge variant={requiredCompleted === requiredSteps ? "default" : "destructive"}>
                {requiredCompleted}/{requiredSteps}
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openSystemSettings}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Paramètres système
            </Button>
          </div>

          {/* Optimization Steps */}
          <div className="space-y-3">
            {optimizationSteps.map((step) => (
              <Card key={step.id} className="border">
                <Collapsible>
                  <CollapsibleTrigger
                    onClick={() => toggleStep(step.id)}
                    className="w-full"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {step.isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : step.isRequired ? (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          ) : (
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <CardTitle className="text-base">
                              {step.title}
                              {step.isRequired && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Requis
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {step.description}
                            </CardDescription>
                          </div>
                        </div>
                        {expandedSteps.has(step.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-2">Instructions:</p>
                          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                            {step.instructions.map((instruction, index) => (
                              <li key={index}>{instruction}</li>
                            ))}
                          </ol>
                        </div>
                        {!step.isCompleted && (
                          <Button
                            onClick={() => markStepCompleted(step.id)}
                            size="sm"
                            className="w-full"
                          >
                            Marquer comme complété
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>

          {/* Final Success Message */}
          {isOptimized && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Optimisation terminée!</p>
                  <p className="text-sm">
                    Votre appareil Android est maintenant optimisé pour recevoir les notifications RunConnect de manière fiable.
                    Redémarrez l'application pour que tous les changements prennent effet.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};