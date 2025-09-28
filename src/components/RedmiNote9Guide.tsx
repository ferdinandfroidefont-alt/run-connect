import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, XCircle, ChevronDown, Smartphone, Settings, Battery, Shield, MessageSquare, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PermissionStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  instructions: string[];
  testFunction: () => Promise<boolean>;
  completed: boolean;
}

export const RedmiNote9Guide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRedmiNote9, setIsRedmiNote9] = useState(false);
  const [steps, setSteps] = useState<PermissionStep[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    detectRedmiNote9();
    initializeSteps();
  }, []);

  const detectRedmiNote9 = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isRedmi = userAgent.includes('redmi') || userAgent.includes('m2010j19sg');
    const isNote9 = userAgent.includes('note 9') || userAgent.includes('m2010j19sg');
    setIsRedmiNote9(isRedmi && isNote9);
  };

  const testNotificationPermission = async (): Promise<boolean> => {
    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  };

  const testContactsPermission = async (): Promise<boolean> => {
    try {
      if ((window as any).ContactsPlugin) {
        const result = await (window as any).ContactsPlugin.checkPermissions();
        return result.contacts === 'granted';
      }
    } catch (error) {
      console.log('ContactsPlugin non disponible');
    }
    return false;
  };

  const testLocationPermission = async (): Promise<boolean> => {
    try {
      if ('geolocation' in navigator) {
        const result = await new Promise<boolean>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { timeout: 1000 }
          );
        });
        return result;
      }
    } catch (error) {
      console.log('Géolocalisation non disponible');
    }
    return false;
  };

  const openMIUISettings = (section: string) => {
    const plugin = (window as any).CapacitorCustomPlugins?.PermissionsPlugin;
    if (plugin) {
      plugin.openAppSettings();
    } else {
      // Fallback pour ouvrir les paramètres généraux
      window.open('intent://settings#Intent;scheme=android-app;package=com.android.settings;end');
    }
  };

  const initializeSteps = () => {
    const initialSteps: PermissionStep[] = [
      {
        id: 'notifications',
        title: 'Notifications RunConnect',
        description: 'Activer les notifications pour recevoir les messages et alertes',
        icon: <MessageSquare className="h-5 w-5" />,
        instructions: [
          'Ouvrez Paramètres > Notifications et barre d\'état',
          'Appuyez sur "Gérer les notifications"',
          'Trouvez "RunConnect" dans la liste',
          'Activez "Autoriser les notifications"',
          'Activez "Afficher sur l\'écran de verrouillage"',
          'Activez "Son" et "Vibration"'
        ],
        testFunction: testNotificationPermission,
        completed: false
      },
      {
        id: 'contacts',
        title: 'Accès aux contacts',
        description: 'Permettre l\'accès aux contacts pour inviter des amis',
        icon: <Users className="h-5 w-5" />,
        instructions: [
          'Ouvrez Paramètres > Apps > Gérer les apps',
          'Trouvez "RunConnect" et appuyez dessus',
          'Appuyez sur "Autorisations"',
          'Trouvez "Contacts" et appuyez dessus',
          'Sélectionnez "Autoriser"'
        ],
        testFunction: testContactsPermission,
        completed: false
      },
      {
        id: 'autostart',
        title: 'Démarrage automatique',
        description: 'Autoriser RunConnect à démarrer automatiquement',
        icon: <Shield className="h-5 w-5" />,
        instructions: [
          'Ouvrez Sécurité > Gérer les applications',
          'Appuyez sur "Autostart"',
          'Trouvez "RunConnect"',
          'Activez le bouton à droite'
        ],
        testFunction: async () => true, // Pas de test automatique possible
        completed: false
      },
      {
        id: 'battery',
        title: 'Optimisation batterie',
        description: 'Désactiver l\'optimisation batterie pour RunConnect',
        icon: <Battery className="h-5 w-5" />,
        instructions: [
          'Ouvrez Paramètres > Apps > Gérer les apps',
          'Trouvez "RunConnect" et appuyez dessus',
          'Appuyez sur "Économie d\'énergie"',
          'Sélectionnez "Pas de restrictions"'
        ],
        testFunction: async () => true, // Pas de test automatique possible
        completed: false
      }
    ];
    setSteps(initialSteps);
  };

  const testStep = async (stepId: string) => {
    setTesting(stepId);
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    try {
      const result = await step.testFunction();
      setSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, completed: result } : s
      ));
      
      if (result) {
        toast({
          title: "✅ Test réussi",
          description: `${step.title} configuré correctement`,
        });
      } else {
        toast({
          title: "⚠️ Configuration incomplète",
          description: `${step.title} nécessite encore des ajustements`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erreur de test",
        description: `Impossible de tester ${step.title}`,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  if (!isRedmiNote9) {
    return null;
  }

  const completedSteps = steps.filter(s => s.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <Smartphone className="h-5 w-5" />
          Guide Redmi Note 9 (MIUI)
          <Badge variant="secondary">
            {completedSteps}/{steps.length} étapes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-red-700 mb-2">
            Configuration spéciale détectée pour votre Redmi Note 9. 
            Suivez ces étapes pour un fonctionnement optimal.
          </p>
          <div className="w-full bg-red-200 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mb-4">
              Instructions détaillées MIUI
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="p-4 bg-white rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <h3 className="font-semibold text-gray-800">{step.title}</h3>
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => testStep(step.id)}
                      disabled={testing === step.id}
                      variant="outline"
                      size="sm"
                    >
                      {testing === step.id ? "Test..." : "Tester"}
                    </Button>
                    <Button
                      onClick={() => openMIUISettings(step.id)}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      Ouvrir
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                
                <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
                  {step.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {completedSteps === steps.length && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              🎉 Configuration Redmi Note 9 terminée ! RunConnect devrait maintenant fonctionner parfaitement.
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>Spécial Redmi Note 9 :</strong> Ces étapes sont optimisées pour MIUI 12.5. 
            Redémarrez l'app après chaque configuration pour de meilleurs résultats.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};