import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';

const GeolocationTestButton = () => {
  const [isTestingLoc, setIsTestingLoc] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');
  const { getCurrentPosition, checkPermissions, requestPermissions, loading } = useGeolocation();
  const { success, error } = useEnhancedToast();

  const testGeolocation = async () => {
    setIsTestingLoc(true);
    setLastResult('');
    
    try {
      console.log("🧪 TEST: Début test géolocalisation complet");
      
      // 1. Vérifier les permissions
      const perms = await checkPermissions();
      console.log("🧪 TEST: Permissions actuelles:", perms);
      setLastResult(prev => prev + `Permissions: ${JSON.stringify(perms)}\n`);
      
      // 2. Si pas de permissions, les demander
      if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') {
        console.log("🧪 TEST: Demande de permissions...");
        const newPerms = await requestPermissions();
        console.log("🧪 TEST: Nouvelles permissions:", newPerms);
        setLastResult(prev => prev + `Nouvelles permissions: ${JSON.stringify(newPerms)}\n`);
      }
      
      // 3. Tenter d'obtenir la position
      console.log("🧪 TEST: Tentative obtention position...");
      const position = await getCurrentPosition();
      console.log("🧪 TEST: Position obtenue:", position);
      
      if (position) {
        setLastResult(prev => prev + `✅ Position: ${position.lat}, ${position.lng}\n`);
        success(`Position obtenue: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`);
      } else {
        setLastResult(prev => prev + `❌ Position null\n`);
        error("Position null retournée");
      }
      
    } catch (error: any) {
      console.error("🧪 TEST: Erreur:", error);
      setLastResult(prev => prev + `❌ Erreur: ${error.message}\n`);
      error(`Erreur: ${error.message}`);
    } finally {
      setIsTestingLoc(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-background p-4 rounded-lg border shadow-lg max-w-sm z-50">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Test Géolocalisation
      </h3>
      
      <Button
        onClick={testGeolocation}
        disabled={isTestingLoc || loading}
        className="w-full mb-2"
        size="sm"
      >
        {isTestingLoc || loading ? 'Test en cours...' : 'Tester Position'}
      </Button>
      
      {lastResult && (
        <div className="mt-2 p-2 bg-muted rounded text-xs">
          <pre className="whitespace-pre-wrap text-xs">
            {lastResult}
          </pre>
        </div>
      )}
    </div>
  );
};

export default GeolocationTestButton;