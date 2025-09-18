import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { androidPermissions } from '@/lib/androidPermissions';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Settings, Smartphone, Zap } from 'lucide-react';

interface DeviceGuide {
  manufacturer: string;
  model?: string;
  icon: string;
  type: 'miui' | 'samsung' | 'huawei' | 'oppo' | 'vivo' | 'oneplus' | 'standard';
  compatibilityLevel: 'excellent' | 'good' | 'requires-setup' | 'problematic';
  specificInstructions: {
    location: string[];
    camera: string[];
    notifications: string[];
    gallery: string[];
    general: string[];
  };
  knownIssues?: string[];
  optimizations?: string[];
}

const deviceGuides: Record<string, DeviceGuide> = {
  xiaomi: {
    manufacturer: 'Xiaomi/Redmi',
    icon: '🔴',
    type: 'miui',
    compatibilityLevel: 'requires-setup',
    specificInstructions: {
      location: [
        'Paramètres > Apps > RunConnect > Autorisations > Localisation',
        'Activez "Autoriser tout le temps" ou "Pendant l\'utilisation"',
        'Vérifiez que le GPS est activé dans Paramètres > Localisation'
      ],
      camera: [
        'Paramètres > Apps > RunConnect > Autorisations > Caméra',
        'Activez l\'autorisation Caméra',
        'Si problème galerie: Paramètres > Apps > RunConnect > Autorisations > Stockage'
      ],
      notifications: [
        'Paramètres > Apps > RunConnect > Notifications',
        'Activez "Afficher les notifications"',
        'Paramètres > Notifications et barre d\'état > Notifications d\'app > RunConnect',
        'Activez toutes les catégories de notifications'
      ],
      gallery: [
        'Paramètres > Apps > RunConnect > Autorisations > Stockage',
        'Activez "Accès aux photos et fichiers multimédias"',
        'Si échec: Utilisez le plugin natif (bouton recommandé MIUI)'
      ],
      general: [
        'Paramètres > Batterie et performance > Gérer l\'utilisation de la batterie',
        'Trouvez RunConnect > Pas de restrictions',
        'Paramètres > Autorisations > Démarrage automatique > RunConnect (ON)'
      ]
    },
    knownIssues: [
      'Galerie Capacitor peut échouer - utiliser plugin natif',
      'Notifications peuvent être bloquées par l\'optimisation batterie',
      'Permissions peuvent se réinitialiser après mise à jour MIUI'
    ],
    optimizations: [
      'Désactiver l\'optimisation batterie pour RunConnect',
      'Activer le démarrage automatique',
      'Utiliser les plugins natifs plutôt que Capacitor standard'
    ]
  },
  samsung: {
    manufacturer: 'Samsung',
    icon: '🔵',
    type: 'samsung',
    compatibilityLevel: 'good',
    specificInstructions: {
      location: [
        'Paramètres > Applications > RunConnect > Autorisations > Localisation',
        'Choisir "Autoriser tout le temps" ou "Autoriser uniquement pendant l\'utilisation"'
      ],
      camera: [
        'Paramètres > Applications > RunConnect > Autorisations > Appareil photo',
        'Activer l\'autorisation'
      ],
      notifications: [
        'Paramètres > Applications > RunConnect > Notifications',
        'Activer "Autoriser les notifications"'
      ],
      gallery: [
        'Paramètres > Applications > RunConnect > Autorisations > Stockage',
        'Activer l\'accès au stockage'
      ],
      general: [
        'Samsung fonctionne généralement bien avec les permissions standard'
      ]
    }
  },
  huawei: {
    manufacturer: 'Huawei',
    icon: '🟠',
    type: 'huawei',
    compatibilityLevel: 'requires-setup',
    specificInstructions: {
      location: [
        'Paramètres > Applications > RunConnect > Autorisations > Position',
        'Choisir "Toujours demander" ou "Autoriser"'
      ],
      camera: [
        'Paramètres > Applications > RunConnect > Autorisations > Appareil photo'
      ],
      notifications: [
        'Paramètres > Applications > RunConnect > Notifications',
        'Paramètres > Batterie > Gestion de l\'alimentation > RunConnect > Gestion manuelle'
      ],
      gallery: [
        'Paramètres > Applications > RunConnect > Autorisations > Stockage'
      ],
      general: [
        'Paramètres > Batterie > Démarrage d\'applications > RunConnect (ON)',
        'Paramètres > Batterie > Gestion de l\'alimentation > RunConnect > Gestion manuelle'
      ]
    },
    knownIssues: [
      'EMUI peut tuer l\'app en arrière-plan',
      'Notifications parfois bloquées par la gestion d\'alimentation'
    ]
  },
  oppo: {
    manufacturer: 'OPPO',
    icon: '🟢',
    type: 'oppo',
    compatibilityLevel: 'requires-setup',
    specificInstructions: {
      location: [
        'Paramètres > Applications > RunConnect > Autorisations > Localisation'
      ],
      camera: [
        'Paramètres > Applications > RunConnect > Autorisations > Caméra'
      ],
      notifications: [
        'Paramètres > Applications > RunConnect > Notifications',
        'Paramètres > Batterie > Optimisation de la batterie > RunConnect (OFF)'
      ],
      gallery: [
        'Paramètres > Applications > RunConnect > Autorisations > Stockage'
      ],
      general: [
        'Paramètres > Batterie > Optimisation de la batterie > RunConnect (Désactivé)',
        'Paramètres > Applications > Gestion des applications > RunConnect > Démarrage automatique (ON)'
      ]
    }
  },
  vivo: {
    manufacturer: 'Vivo',
    icon: '🟣',
    type: 'vivo',
    compatibilityLevel: 'requires-setup',
    specificInstructions: {
      location: [
        'Paramètres > Applications et notifications > RunConnect > Autorisations > Localisation'
      ],
      camera: [
        'Paramètres > Applications et notifications > RunConnect > Autorisations > Caméra'
      ],
      notifications: [
        'Paramètres > Applications et notifications > RunConnect > Notifications'
      ],
      gallery: [
        'Paramètres > Applications et notifications > RunConnect > Autorisations > Stockage'
      ],
      general: [
        'Paramètres > Batterie > Gestion de l\'alimentation en arrière-plan > RunConnect (Autoriser)'
      ]
    }
  },
  oneplus: {
    manufacturer: 'OnePlus',
    icon: '🔴',
    type: 'oneplus',
    compatibilityLevel: 'good',
    specificInstructions: {
      location: [
        'Paramètres > Applications > RunConnect > Autorisations > Localisation'
      ],
      camera: [
        'Paramètres > Applications > RunConnect > Autorisations > Caméra'
      ],
      notifications: [
        'Paramètres > Applications > RunConnect > Notifications'
      ],
      gallery: [
        'Paramètres > Applications > RunConnect > Autorisations > Stockage'
      ],
      general: [
        'OnePlus fonctionne généralement bien avec OxygenOS'
      ]
    }
  },
  standard: {
    manufacturer: 'Android Standard',
    icon: '📱',
    type: 'standard',
    compatibilityLevel: 'excellent',
    specificInstructions: {
      location: [
        'Paramètres > Applications > RunConnect > Autorisations > Localisation'
      ],
      camera: [
        'Paramètres > Applications > RunConnect > Autorisations > Caméra'
      ],
      notifications: [
        'Paramètres > Applications > RunConnect > Notifications'
      ],
      gallery: [
        'Paramètres > Applications > RunConnect > Autorisations > Stockage'
      ],
      general: [
        'Android standard fonctionne avec les permissions par défaut'
      ]
    }
  }
};

export const DeviceSpecificGuide = () => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [currentGuide, setCurrentGuide] = useState<DeviceGuide | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (androidPermissions.isAndroid()) {
      androidPermissions.getDeviceInfo().then((info) => {
        setDeviceInfo(info);
        detectDeviceGuide(info);
      });
    }
  }, []);

  const detectDeviceGuide = (info: any) => {
    const manufacturer = info.manufacturer?.toLowerCase() || '';
    
    if (info.isMIUI || manufacturer.includes('xiaomi') || manufacturer.includes('redmi')) {
      setCurrentGuide(deviceGuides.xiaomi);
    } else if (manufacturer.includes('samsung')) {
      setCurrentGuide(deviceGuides.samsung);
    } else if (manufacturer.includes('huawei') || manufacturer.includes('honor')) {
      setCurrentGuide(deviceGuides.huawei);
    } else if (manufacturer.includes('oppo')) {
      setCurrentGuide(deviceGuides.oppo);
    } else if (manufacturer.includes('vivo')) {
      setCurrentGuide(deviceGuides.vivo);
    } else if (manufacturer.includes('oneplus')) {
      setCurrentGuide(deviceGuides.oneplus);
    } else {
      setCurrentGuide(deviceGuides.standard);
    }
  };

  const openSettings = async () => {
    try {
      await androidPermissions.openAppSettings();
      toast({
        title: "Paramètres ouverts",
        description: "Suivez les instructions ci-dessous pour votre appareil"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Ouvrez les paramètres manuellement",
        variant: "destructive"
      });
    }
  };

  const getCompatibilityBadge = (level: DeviceGuide['compatibilityLevel']) => {
    switch (level) {
      case 'excellent':
        return <Badge variant="default" className="bg-green-500">✅ Excellente</Badge>;
      case 'good':
        return <Badge variant="default" className="bg-blue-500">👍 Bonne</Badge>;
      case 'requires-setup':
        return <Badge variant="secondary" className="bg-yellow-500">⚙️ Config requise</Badge>;
      case 'problematic':
        return <Badge variant="destructive">⚠️ Problématique</Badge>;
    }
  };

  if (!androidPermissions.isAndroid()) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Ce guide est disponible uniquement sur Android</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentGuide || !deviceInfo) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Détection de l'appareil en cours...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Guide Spécifique à Votre Appareil
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{currentGuide.icon}</span>
          <span>{deviceInfo.manufacturer} {deviceInfo.model}</span>
          {getCompatibilityBadge(currentGuide.compatibilityLevel)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Instructions par fonctionnalité */}
        <div className="space-y-4">
          <div className="border rounded p-3">
            <h4 className="font-medium flex items-center gap-2 mb-2">
              📍 Géolocalisation
            </h4>
            <ul className="text-sm space-y-1 ml-4">
              {currentGuide.specificInstructions.location.map((instruction, index) => (
                <li key={index} className="list-disc">{instruction}</li>
              ))}
            </ul>
          </div>

          <div className="border rounded p-3">
            <h4 className="font-medium flex items-center gap-2 mb-2">
              📸 Caméra & Galerie
            </h4>
            <ul className="text-sm space-y-1 ml-4">
              {currentGuide.specificInstructions.camera.map((instruction, index) => (
                <li key={index} className="list-disc">{instruction}</li>
              ))}
              {currentGuide.specificInstructions.gallery.map((instruction, index) => (
                <li key={index} className="list-disc">{instruction}</li>
              ))}
            </ul>
          </div>

          <div className="border rounded p-3">
            <h4 className="font-medium flex items-center gap-2 mb-2">
              🔔 Notifications
            </h4>
            <ul className="text-sm space-y-1 ml-4">
              {currentGuide.specificInstructions.notifications.map((instruction, index) => (
                <li key={index} className="list-disc">{instruction}</li>
              ))}
            </ul>
          </div>

          {currentGuide.specificInstructions.general.length > 1 && (
            <div className="border rounded p-3">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                ⚙️ Configuration Générale
              </h4>
              <ul className="text-sm space-y-1 ml-4">
                {currentGuide.specificInstructions.general.map((instruction, index) => (
                  <li key={index} className="list-disc">{instruction}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Problèmes connus */}
        {currentGuide.knownIssues && currentGuide.knownIssues.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              Problèmes Connus
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1 ml-4">
              {currentGuide.knownIssues.map((issue, index) => (
                <li key={index} className="list-disc">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimisations */}
        {currentGuide.optimizations && currentGuide.optimizations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4" />
              Optimisations Recommandées
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 ml-4">
              {currentGuide.optimizations.map((optimization, index) => (
                <li key={index} className="list-disc">{optimization}</li>
              ))}
            </ul>
          </div>
        )}

        <Button 
          onClick={openSettings}
          className="w-full"
          variant="outline"
        >
          <Settings className="h-4 w-4 mr-2" />
          Ouvrir les Paramètres de l'App
        </Button>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <strong>Conseil:</strong> Ces instructions sont spécifiques à votre modèle {deviceInfo.manufacturer} {deviceInfo.model}.
          Si vous rencontrez des problèmes, suivez d'abord les étapes de configuration générale,
          puis utilisez les tests individuels pour vérifier chaque fonctionnalité.
        </div>
      </CardContent>
    </Card>
  );
};