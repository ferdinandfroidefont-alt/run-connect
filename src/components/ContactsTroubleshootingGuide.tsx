import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Smartphone, Settings, Users, CheckCircle, XCircle, Info } from 'lucide-react';

interface TroubleshootingGuideProps {
  deviceInfo?: any;
  isNative?: boolean;
  hasPermission?: boolean;
  error?: string;
}

export const ContactsTroubleshootingGuide: React.FC<TroubleshootingGuideProps> = ({
  deviceInfo,
  isNative,
  hasPermission,
  error
}) => {
  const getManufacturerSteps = () => {
    if (!deviceInfo) return null;

    const manufacturer = deviceInfo.manufacturer?.toLowerCase() || '';
    const isMIUI = deviceInfo.isMIUI;
    const isEmui = deviceInfo.isEmui;
    const isOneUI = deviceInfo.isOneUI;
    const androidVersion = deviceInfo.androidVersion || 0;

    if (isMIUI || manufacturer.includes('xiaomi')) {
      return {
        title: "MIUI / Xiaomi",
        icon: "🔴",
        difficulty: "Difficile",
        steps: [
          "Ouvrez Paramètres > Applications",
          "Trouvez RunConnect",
          "Touchez 'Autorisations' ou 'Permissions'",
          "Trouvez 'Contacts' et activez",
          androidVersion >= 10 ? "Sur Android 10+: Activez aussi 'Autorisations spéciales'" : null,
          "Redémarrez l'application",
          "Si problème persiste: Paramètres > Confidentialité > Gestionnaire d'autorisations"
        ].filter(Boolean)
      };
    }

    if (isEmui || manufacturer.includes('huawei') || manufacturer.includes('honor')) {
      return {
        title: "EMUI / Huawei",
        icon: "🟠",
        difficulty: "Moyen",
        steps: [
          "Ouvrez Paramètres > Applications et notifications",
          "Sélectionnez RunConnect",
          "Touchez 'Autorisations'",
          "Activez 'Contacts'",
          "Vérifiez dans 'Gestionnaire d'autorisations' aussi"
        ]
      };
    }

    if (isOneUI || manufacturer.includes('samsung')) {
      return {
        title: "One UI / Samsung",
        icon: "🔵",
        difficulty: "Facile",
        steps: [
          "Ouvrez Paramètres > Applications",
          "Trouvez RunConnect",
          "Touchez 'Autorisations'",
          "Activez 'Contacts'",
          "Redémarrez l'application si nécessaire"
        ]
      };
    }

    if (manufacturer.includes('oneplus')) {
      return {
        title: "OxygenOS / OnePlus",
        icon: "🟢",
        difficulty: "Facile",
        steps: [
          "Ouvrez Paramètres > Apps & notifications",
          "Sélectionnez RunConnect",
          "Touchez 'Permissions'",
          "Activez 'Contacts'"
        ]
      };
    }

    if (manufacturer.includes('oppo') || manufacturer.includes('realme')) {
      return {
        title: "ColorOS / Oppo",
        icon: "🟡",
        difficulty: "Moyen",
        steps: [
          "Ouvrez Paramètres > Applications",
          "Trouvez RunConnect",
          "Touchez 'Autorisations d'application'",
          "Activez 'Contacts'",
          "Vérifiez aussi dans Paramètres > Confidentialité"
        ]
      };
    }

    return {
      title: "Android Standard",
      icon: "🟢",
      difficulty: "Facile",
      steps: [
        "Ouvrez Paramètres > Applications",
        "Trouvez RunConnect",
        "Touchez 'Autorisations'",
        "Activez 'Contacts'"
      ]
    };
  };

  const manufacturerGuide = getManufacturerSteps();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Facile": return "bg-green-100 text-green-800";
      case "Moyen": return "bg-yellow-100 text-yellow-800";
      case "Difficile": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const commonIssues = [
    {
      problem: "Permission refusée",
      solution: "Utilisez le guide spécifique à votre fabricant ci-dessous"
    },
    {
      problem: "Mode web détecté",
      solution: "Installez l'application depuis le Play Store pour accéder aux contacts"
    },
    {
      problem: "Plugin non disponible",
      solution: "Redémarrez l'application et attendez quelques secondes"
    },
    {
      problem: "Contacts vides",
      solution: "Vérifiez que vous avez des contacts enregistrés sur votre téléphone"
    },
    {
      problem: "Erreur de chargement",
      solution: "Accordez d'abord les permissions puis redémarrez l'app"
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guide de dépannage - Accès aux contacts
          </CardTitle>
          <CardDescription>
            Solutions pour résoudre les problèmes d'accès aux contacts
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Diagnostic rapide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mode application:
            </span>
            <div className="flex items-center gap-2">
              {isNative ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <Badge variant={isNative ? "default" : "destructive"}>
                {isNative ? "Natif ✓" : "Web ✗"}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Permissions:
            </span>
            <div className="flex items-center gap-2">
              {hasPermission ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <Badge variant={hasPermission ? "default" : "destructive"}>
                {hasPermission ? "Accordées ✓" : "Manquantes ✗"}
              </Badge>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Device-specific guide */}
      {manufacturerGuide && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-lg">{manufacturerGuide.icon}</span>
                Instructions pour {manufacturerGuide.title}
              </span>
              <Badge className={getDifficultyColor(manufacturerGuide.difficulty)}>
                {manufacturerGuide.difficulty}
              </Badge>
            </CardTitle>
            {deviceInfo && (
              <CardDescription>
                {deviceInfo.manufacturer} {deviceInfo.model} - Android {deviceInfo.androidRelease}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {manufacturerGuide.steps.map((step, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Common issues */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Problèmes fréquents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {commonIssues.map((issue, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{issue.problem}</p>
                  <p className="text-sm text-muted-foreground">{issue.solution}</p>
                </div>
              </div>
              {index < commonIssues.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Additional tips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Conseils supplémentaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Redémarrez l'application après avoir accordé les permissions</p>
          <p>• Sur certains appareils, les permissions peuvent prendre quelques secondes à se mettre à jour</p>
          <p>• Si le problème persiste, désinstallez et réinstallez l'application</p>
          <p>• Les contacts synchronisés avec Google sont généralement mieux pris en charge</p>
        </CardContent>
      </Card>
    </div>
  );
};