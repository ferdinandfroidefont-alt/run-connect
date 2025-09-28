import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Smartphone, Settings, Battery, Shield } from 'lucide-react';

export const MIUINotificationGuide = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Smartphone className="h-5 w-5" />
          Guide Xiaomi MIUI (Redmi Note 9)
          <Badge variant="secondary">Spécialisé</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-orange-700 mb-4">
          Les appareils Xiaomi/MIUI nécessitent des étapes spéciales pour activer complètement les notifications.
        </p>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Instructions détaillées Redmi Note 9
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="space-y-6">
              {/* Étape 1: Notifications */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  1. Activer les notifications
                </h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
                  <li>Ouvrez <strong>Paramètres</strong> &gt; <strong>Notifications et barre d&apos;état</strong></li>
                  <li>Appuyez sur <strong>Gérer les notifications</strong></li>
                  <li>Trouvez <strong>RunConnect</strong> dans la liste</li>
                  <li>Activez <strong>&quot;Autoriser les notifications&quot;</strong></li>
                  <li>Activez <strong>&quot;Afficher sur l&apos;écran de verrouillage&quot;</strong></li>
                </ol>
              </div>

              {/* Étape 2: Autostart */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  2. Autoriser le démarrage automatique
                </h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
                  <li>Ouvrez <strong>Sécurité</strong> &gt; <strong>Gérer les applications</strong></li>
                  <li>Appuyez sur <strong>Autostart</strong></li>
                  <li>Trouvez <strong>RunConnect</strong> et activez le bouton</li>
                </ol>
              </div>

              {/* Étape 3: Optimisation batterie */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Battery className="h-4 w-4" />
                  3. Désactiver l&apos;optimisation de batterie
                </h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
                  <li>Ouvrez <strong>Paramètres</strong> &gt; <strong>Applications</strong> &gt; <strong>Gérer les applications</strong></li>
                  <li>Trouvez <strong>RunConnect</strong> et appuyez dessus</li>
                  <li>Appuyez sur <strong>Économie d&apos;énergie</strong></li>
                  <li>Sélectionnez <strong>&quot;Pas de restrictions&quot;</strong></li>
                </ol>
              </div>

              {/* Étape 4: Test */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">
                  4. Tester les notifications
                </h3>
                <p className="text-sm text-green-700 mb-3">
                  Après avoir suivi ces étapes, redémarrez RunConnect et testez les notifications.
                </p>
                <Button 
                  onClick={() => {
                    // Rediriger vers les paramètres de l'app
                    const plugin = (window as any).CapacitorCustomPlugins?.PermissionsPlugin;
                    if (plugin) {
                      plugin.openAppSettings();
                    } else {
                      window.open('intent://settings#Intent;scheme=android-app;package=com.android.settings;end');
                    }
                  }}
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Ouvrir Paramètres App
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>Astuce :</strong> Ces paramètres sont spécifiques à MIUI et peuvent varier selon la version. 
            Si vous ne trouvez pas une option, cherchez des termes similaires dans les paramètres.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};