import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const UltraSimpleAndroidTest = () => {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [pluginFound, setPluginFound] = useState(false);
  const [pluginStatus, setPluginStatus] = useState<'checking' | 'ready' | 'initializing'>('checking');

  const addDiagnostic = (message: string) => {
    console.log('🔥', message);
    setDiagnostics(prev => [...prev, message]);
  };

  const runDiagnostics = () => {
    setDiagnostics([]);
    
    // 1. Vérifications basiques
    addDiagnostic(`Platform: ${(window as any).Capacitor?.getPlatform?.()} `);
    addDiagnostic(`UserAgent: ${navigator.userAgent.includes('Android') ? 'Android détecté' : 'Pas Android'}`);
    addDiagnostic(`Capacitor: ${!!(window as any).Capacitor ? 'Présent' : 'ABSENT'}`);
    addDiagnostic(`PermissionsPlugin: ${!!window.PermissionsPlugin ? 'TROUVÉ ✅' : 'MANQUANT ❌'}`);
    
    // 2. Vérifier l'objet Capacitor
    if ((window as any).Capacitor) {
      const capacitor = (window as any).Capacitor;
      addDiagnostic(`Capacitor.Plugins: ${capacitor.Plugins ? Object.keys(capacitor.Plugins).join(', ') : 'Aucun'}`);
      addDiagnostic(`Capacitor.isNativePlatform: ${capacitor.isNativePlatform?.()}`);
    }
    
    // 3. Vérifier window.PermissionsPlugin
    if (window.PermissionsPlugin) {
      setPluginFound(true);
      addDiagnostic(`Plugin methods: ${Object.keys(window.PermissionsPlugin).join(', ')}`);
      addDiagnostic('✅ Plugin Android Permissions ACTIF (natif ou fallback)');
    } else {
      setPluginFound(false);
      addDiagnostic('❌ Plugin PermissionsPlugin complètement absent du window');
    }
    
    // 4. Test direct d'une méthode
    if (window.PermissionsPlugin?.getDeviceInfo) {
      addDiagnostic('Tentative getDeviceInfo...');
      window.PermissionsPlugin.getDeviceInfo()
        .then(result => addDiagnostic(`Device Info: ${JSON.stringify(result)}`))
        .catch(error => addDiagnostic(`Erreur Device Info: ${error}`));
    }
  };

  const forceTestLocationPermission = async () => {
    if (!window.PermissionsPlugin) {
      addDiagnostic('❌ Pas de plugin - impossible de tester');
      return;
    }
    
    try {
      addDiagnostic('🔥 TENTATIVE PERMISSION GÉOLOC...');
      const result = await window.PermissionsPlugin.forceRequestLocationPermissions();
      addDiagnostic(`Résultat: ${JSON.stringify(result)}`);
    } catch (error) {
      addDiagnostic(`❌ ERREUR: ${error}`);
    }
  };

  useEffect(() => {
    runDiagnostics();
    
    // Écouter l'événement de plugin prêt
    const handlePluginReady = () => {
      setPluginStatus('ready');
      addDiagnostic('🔥 EVENT: Plugin prêt détecté !');
      setTimeout(runDiagnostics, 100);
    };
    
    window.addEventListener('permissionsPluginReady', handlePluginReady);
    
    // Attendre et re-vérifier si pas encore trouvé
    const timeout = setTimeout(() => {
      if (!pluginFound) {
        setPluginStatus('initializing');
        addDiagnostic('--- APRÈS 3 SECONDES - Plugin en cours d\'initialisation ---');
        runDiagnostics();
      }
    }, 3000);
    
    return () => {
      window.removeEventListener('permissionsPluginReady', handlePluginReady);
      clearTimeout(timeout);
    };
  }, [pluginFound]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔥 DIAGNOSTIC ULTRA SIMPLE ANDROID</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {pluginStatus === 'initializing' && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              ⏳ Plugin en cours d'initialisation... Veuillez patienter.
            </div>
          )}
          
          {pluginStatus === 'ready' && pluginFound && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              ✅ Système de permissions prêt !
            </div>
          )}
          
          <div className="grid gap-2">
            <Button onClick={runDiagnostics} variant="outline">
              🔄 Relancer Diagnostic
            </Button>
            
            <Button 
              onClick={forceTestLocationPermission}
              disabled={!pluginFound}
              className="bg-red-600 hover:bg-red-700"
            >
              🔥 TESTER PERMISSION GÉOLOC
            </Button>
          </div>
        </div>

        <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
          {diagnostics.length === 0 ? (
            <div>En cours de diagnostic...</div>
          ) : (
            diagnostics.map((diag, i) => (
              <div key={i}>{diag}</div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};