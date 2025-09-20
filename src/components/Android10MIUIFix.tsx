import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, AlertTriangle, ExternalLink } from "lucide-react";

export const Android10MIUIFix = () => {
  const { toast } = useToast();
  const [tested, setTested] = useState(false);

  const openDetailedInstructions = () => {
    const instructions = `
🔴 VOTRE TÉLÉPHONE: Android 10 + MIUI (Xiaomi/Redmi)

⚠️ PROBLÈME CONNU: Android 10 + MIUI bloque les permissions automatiques

✅ SOLUTION OBLIGATOIRE - CONFIGURATION MANUELLE:

📍 POUR LA LOCALISATION:
1. Ouvrez Paramètres Android
2. Apps → Gérer les apps → RunConnect
3. Autorisations → Localisation
4. Sélectionnez "Autoriser tout le temps" (pas "Seulement pendant l'utilisation")
5. IMPORTANT: Activez aussi "Localisation précise"

📸 POUR LA CAMÉRA:
1. Paramètres → Apps → RunConnect
2. Autorisations → Appareil photo → Autoriser

👥 POUR LES CONTACTS:
1. Paramètres → Apps → RunConnect  
2. Autorisations → Contacts → Autoriser

🔔 POUR LES NOTIFICATIONS:
1. Paramètres → Apps → RunConnect
2. Notifications → Autoriser toutes
3. ET AUSSI: Paramètres → Notifications → RunConnect → Tout activer

🔋 OPTIMISATION BATTERIE (IMPORTANT):
1. Paramètres → Batterie → Optimisation batterie
2. Trouvez RunConnect → Ne pas optimiser

🚫 DÉMARRAGE AUTOMATIQUE:
1. Paramètres → Apps → Autorisations → Démarrage automatique
2. Activez RunConnect

⚡ APPS EN ARRIÈRE-PLAN:
1. Paramètres → Batterie → Apps en arrière-plan
2. RunConnect → Aucune restriction

🔄 APRÈS CONFIGURATION:
- Redémarrez le téléphone
- Redémarrez l'application RunConnect
`;

    alert(instructions);
    setTested(true);
  };

  const openMIUISettings = () => {
    // Essayer d'ouvrir les paramètres spécifiques MIUI seulement si le plugin existe
    try {
      if (typeof window !== 'undefined' && window.PermissionsPlugin) {
        window.PermissionsPlugin.openAppSettings();
      } else {
        // Fallback
        toast({
          title: "Ouvrez manuellement",
          description: "Allez dans Paramètres > Apps > RunConnect > Autorisations",
          duration: 8000
        });
      }
    } catch (error) {
      toast({
        title: "Ouvrez manuellement",
        description: "Allez dans Paramètres > Apps > RunConnect > Autorisations",
        duration: 8000
      });
    }
  };

  const testLocationAgain = () => {
    toast({
      title: "Test de localisation",
      description: "Essayez maintenant de localiser votre position dans l'app",
      duration: 5000
    });
  };

  return (
    <Card className="border-red-500 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Smartphone className="h-5 w-5" />
          Fix Android 10 + MIUI
          <Badge variant="destructive">OBLIGATOIRE</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Android 10 + MIUI détecté!</strong><br/>
            Votre téléphone (version Q P1A.190711.020) nécessite une configuration manuelle obligatoire.
            Les permissions automatiques sont bloquées par MIUI sur Android 10.
          </AlertDescription>
        </Alert>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Configuration OBLIGATOIRE</h4>
          <p className="text-yellow-700 text-sm">
            Sur Android 10 + MIUI, AUCUNE permission ne peut être accordée automatiquement. 
            Vous DEVEZ les configurer manuellement dans les paramètres Android.
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={openDetailedInstructions}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            📋 VOIR LES INSTRUCTIONS COMPLÈTES
          </Button>

          <Button 
            onClick={openMIUISettings}
            variant="outline"
            className="w-full"
          >
            ⚙️ Ouvrir Paramètres RunConnect
          </Button>

          {tested && (
            <Button 
              onClick={testLocationAgain}
              variant="secondary"
              className="w-full"
            >
              🔄 Tester après configuration
            </Button>
          )}
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h5 className="font-semibold text-blue-800 mb-1">🎯 Points clés pour votre téléphone:</h5>
          <ul className="text-blue-700 text-xs space-y-1">
            <li>• Localisation: Choisir "Autoriser tout le temps" + "Localisation précise"</li>
            <li>• Désactiver l'optimisation batterie pour RunConnect</li>
            <li>• Activer le démarrage automatique</li>
            <li>• Redémarrer le téléphone après configuration</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};