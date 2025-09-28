import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, XCircle, Smartphone, Settings, Users, RefreshCw, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useContacts } from '@/hooks/useContacts';
import { nativeManager } from '@/lib/nativeInit';
import { detectNativeAndroid } from '@/lib/detectNativeAndroid';

interface DiagnosticStep {
  id: string;
  name: string;
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
  details?: any;
}

export const ContactsDiagnostic: React.FC = () => {
  const { toast } = useToast();
  const { 
    contacts, 
    loading: contactsLoading, 
    hasPermission, 
    isNative,
    checkPermissions,
    requestPermissions,
    loadContacts 
  } = useContacts();

  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { id: 'native', name: 'Détection mode natif', status: 'idle' },
    { id: 'plugin', name: 'Plugin Capacitor Contacts', status: 'idle' },
    { id: 'permissions', name: 'Permissions contacts', status: 'idle' },
    { id: 'access', name: 'Accès aux contacts', status: 'idle' },
    { id: 'load', name: 'Chargement contacts', status: 'idle' }
  ]);

  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    runInitialDiagnostic();
  }, []);

  const updateStep = (id: string, status: DiagnosticStep['status'], message?: string, details?: any) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status, message, details } : step
    ));
  };

  const runInitialDiagnostic = async () => {
    console.log('🔍 ContactsDiagnostic: Diagnostic initial...');
    
    // Test détection native
    try {
      const native = await nativeManager.ensureNativeStatus();
      const androidNative = await detectNativeAndroid();
      
      updateStep('native', native ? 'success' : 'error', 
        native ? 'Mode natif détecté' : 'Mode web - fonctionnalités limitées',
        { native, androidNative, platform: navigator.platform, userAgent: navigator.userAgent.substring(0, 100) }
      );
    } catch (error) {
      updateStep('native', 'error', `Erreur détection: ${error}`);
    }

    // Test plugin
    try {
      const { Contacts } = await import('@capacitor-community/contacts');
      updateStep('plugin', 'success', 'Plugin Contacts disponible', { pluginLoaded: true });
    } catch (error) {
      updateStep('plugin', 'error', `Plugin indisponible: ${error}`);
    }

    // Check permissions initiales
    try {
      const hasPerms = await checkPermissions();
      updateStep('permissions', hasPerms ? 'success' : 'idle', 
        hasPerms ? 'Permissions accordées' : 'Permissions non accordées'
      );
    } catch (error) {
      updateStep('permissions', 'error', `Erreur permissions: ${error}`);
    }

    // Get device info si disponible
    try {
      if (typeof window !== 'undefined' && (window as any).PermissionsPlugin) {
        const info = await (window as any).PermissionsPlugin.getDeviceInfo();
        setDeviceInfo(info);
        console.log('📱 Device info:', info);
      }
    } catch (error) {
      console.log('📱 Device info non disponible:', error);
    }
  };

  const runFullDiagnostic = async () => {
    if (testing) return;
    
    setTesting(true);
    console.log('🔍 ContactsDiagnostic: Diagnostic complet...');

    try {
      // Reset statuses
      setSteps(prev => prev.map(step => ({ ...step, status: 'idle', message: undefined })));

      // Step 1: Native detection
      updateStep('native', 'testing');
      const native = await nativeManager.ensureNativeStatus();
      updateStep('native', native ? 'success' : 'error', 
        native ? 'Mode natif confirmé' : 'Mode web - contacts indisponibles'
      );

      if (!native) {
        toast({
          title: "Mode web détecté",
          description: "Les contacts nécessitent le mode natif de l'application",
          variant: "destructive"
        });
        setTesting(false);
        return;
      }

      // Step 2: Plugin check
      updateStep('plugin', 'testing');
      try {
        const { Contacts } = await import('@capacitor-community/contacts');
        updateStep('plugin', 'success', 'Plugin Contacts chargé');
      } catch (error) {
        updateStep('plugin', 'error', `Plugin Contacts non disponible: ${error}`);
        setTesting(false);
        return;
      }

      // Step 3: Permissions
      updateStep('permissions', 'testing');
      const hasPerms = await requestPermissions();
      updateStep('permissions', hasPerms ? 'success' : 'error', 
        hasPerms ? 'Permissions accordées' : 'Permissions refusées ou échec'
      );

      if (!hasPerms) {
        toast({
          title: "Permissions refusées",
          description: "L'accès aux contacts a été refusé",
          variant: "destructive"
        });
        setTesting(false);
        return;
      }

      // Step 4: Access test
      updateStep('access', 'testing');
      try {
        const { Contacts } = await import('@capacitor-community/contacts');
        const result = await Contacts.checkPermissions();
        updateStep('access', result.contacts === 'granted' ? 'success' : 'error',
          `Status: ${result.contacts}`
        );
      } catch (error) {
        updateStep('access', 'error', `Erreur accès: ${error}`);
      }

      // Step 5: Load contacts
      updateStep('load', 'testing');
      try {
        const loadedContacts = await loadContacts();
        updateStep('load', 'success', 
          `${loadedContacts.length} contacts chargés`,
          { count: loadedContacts.length, sample: loadedContacts.slice(0, 3) }
        );

        toast({
          title: "Diagnostic réussi",
          description: `${loadedContacts.length} contacts trouvés`,
        });

      } catch (error) {
        updateStep('load', 'error', `Erreur chargement: ${error}`);
        toast({
          title: "Erreur chargement",
          description: `${error}`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('🔍 Erreur diagnostic:', error);
      toast({
        title: "Erreur diagnostic",
        description: `${error}`,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'testing': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-100 text-green-800">Succès</Badge>;
      case 'error': return <Badge variant="destructive">Erreur</Badge>;
      case 'testing': return <Badge variant="secondary">Test...</Badge>;
      default: return <Badge variant="outline">En attente</Badge>;
    }
  };

  const openSettings = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).PermissionsPlugin) {
        await (window as any).PermissionsPlugin.openAppSettings();
        toast({
          title: "Paramètres ouverts",
          description: "Accordez les permissions et revenez dans l'app",
        });
      } else {
        toast({
          title: "Plugin indisponible",
          description: "Impossible d'ouvrir les paramètres automatiquement",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible d'ouvrir les paramètres: ${error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Diagnostic Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Diagnostic d'accès aux contacts
          </DialogTitle>
          <DialogDescription>
            Testez et déboguez l'accès aux contacts de votre appareil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Info */}
          {deviceInfo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Informations appareil
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-medium">Fabricant:</span>
                  <span>{deviceInfo.manufacturer} {deviceInfo.brand}</span>
                  <span className="font-medium">Modèle:</span>
                  <span>{deviceInfo.model}</span>
                  <span className="font-medium">Android:</span>
                  <span>{deviceInfo.androidRelease} (API {deviceInfo.androidVersion})</span>
                  <span className="font-medium">Interface:</span>
                  <span>
                    {deviceInfo.isMIUI && "MIUI"}
                    {deviceInfo.isEmui && "EMUI"}
                    {deviceInfo.isOneUI && "One UI"}
                    {deviceInfo.isOxygenOS && "OxygenOS"}
                    {deviceInfo.isColorOS && "ColorOS"}
                    {!deviceInfo.isMIUI && !deviceInfo.isEmui && !deviceInfo.isOneUI && 
                     !deviceInfo.isOxygenOS && !deviceInfo.isColorOS && "Android standard"}
                  </span>
                  <span className="font-medium">Stratégie:</span>
                  <span className="font-mono text-xs">{deviceInfo.strategy}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status actuel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Mode:</span>
                <Badge variant={isNative ? "default" : "secondary"}>
                  {isNative ? "Natif" : "Web"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Permissions:</span>
                <Badge variant={hasPermission ? "default" : "outline"}>
                  {hasPermission ? "Accordées" : "Non accordées"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Contacts:</span>
                <Badge variant={contacts.length > 0 ? "default" : "outline"}>
                  {contacts.length} trouvés
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic Steps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Étapes de diagnostic</span>
                <Button 
                  size="sm" 
                  onClick={runFullDiagnostic}
                  disabled={testing}
                >
                  {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Tester"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(step.status)}
                      <span className="text-sm font-medium">{step.name}</span>
                    </div>
                    {getStatusBadge(step.status)}
                  </div>
                  {step.message && (
                    <p className="text-xs text-muted-foreground ml-6">{step.message}</p>
                  )}
                  {step.details && (
                    <details className="ml-6">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        Détails techniques
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  {index < steps.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openSettings}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Ouvrir paramètres
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runInitialDiagnostic}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Warnings */}
          {deviceInfo?.isMIUI && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Appareil MIUI détecté</p>
                <p className="text-orange-700">
                  Les appareils Xiaomi/Redmi nécessitent souvent une configuration manuelle des permissions.
                  Utilisez le bouton "Ouvrir paramètres" pour accorder les permissions.
                </p>
              </div>
            </div>
          )}

          {!isNative && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Mode web détecté</p>
                <p className="text-blue-700">
                  L'accès aux contacts nécessite l'application native. Installez l'app depuis le Play Store.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};