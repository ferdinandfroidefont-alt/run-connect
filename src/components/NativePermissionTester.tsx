import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { nativeManager } from '@/lib/nativeInit';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCamera } from '@/hooks/useCamera';
import { useContacts } from '@/hooks/useContacts';
import { Separator } from '@/components/ui/separator';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

export const NativePermissionTester = ({ onClose }: { onClose?: () => void }) => {
  const [nativeStatus, setNativeStatus] = useState<boolean | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const { getCurrentPosition } = useGeolocation();
  const { takePicture, selectFromGallery } = useCamera();
  const { loadContacts } = useContacts();

  useEffect(() => {
    // Obtenir le statut natif
    const checkNativeStatus = async () => {
      const isNative = await nativeManager.ensureNativeStatus();
      setNativeStatus(isNative);
    };
    
    checkNativeStatus();
  }, []);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTesting(prev => ({ ...prev, [testName]: true }));
    
    const startTime = Date.now();
    
    try {
      console.log(`🧪 DÉBUT TEST: ${testName}`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: true,
          data: result,
          duration
        }
      }));
      
      console.log(`🧪✅ TEST RÉUSSI: ${testName} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration
        }
      }));
      
      console.error(`🧪❌ TEST ÉCHOUÉ: ${testName} (${duration}ms)`, error);
    }
    
    setTesting(prev => ({ ...prev, [testName]: false }));
  };

  const testGeolocation = () => runTest('geolocation', async () => {
    const position = await getCurrentPosition();
    if (!position) throw new Error('Aucune position reçue');
    return {
      lat: position.lat,
      lng: position.lng,
      accuracy: 'N/A'
    };
  });

  const testCamera = () => runTest('camera', async () => {
    const file = await takePicture();
    if (!file) throw new Error('Aucune photo prise');
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    };
  });

  const testGallery = () => runTest('gallery', async () => {
    const file = await selectFromGallery();
    if (!file) throw new Error('Aucune image sélectionnée');
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    };
  });

  const testContacts = () => runTest('contacts', async () => {
    const contacts = await loadContacts();
    return {
      totalContacts: contacts.length,
      sampleNames: contacts.slice(0, 3).map(c => c.displayName)
    };
  });

  const testAll = () => {
    testGeolocation();
    setTimeout(() => testCamera(), 2000);
    setTimeout(() => testGallery(), 4000);
    setTimeout(() => testContacts(), 6000);
  };

  const getBadge = (testName: string) => {
    if (testing[testName]) return <Badge variant="secondary">⏳ Test...</Badge>;
    
    const result = results[testName];
    if (!result) return <Badge variant="outline">Non testé</Badge>;
    
    if (result.success) {
      return <Badge className="bg-green-500 hover:bg-green-600">✅ Succès</Badge>;
    } else {
      return <Badge variant="destructive">❌ Échec</Badge>;
    }
  };

  const formatResult = (result: TestResult) => {
    if (!result) return null;
    
    return (
      <div className="text-xs mt-2 p-2 bg-muted rounded">
        <div><strong>Durée:</strong> {result.duration}ms</div>
        {result.success ? (
          <div><strong>Données:</strong> {JSON.stringify(result.data, null, 2)}</div>
        ) : (
          <div className="text-red-500"><strong>Erreur:</strong> {result.error}</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>🧪 Test des Permissions Natives</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm">Statut:</span>
            {nativeStatus === null ? (
              <Badge variant="secondary">Vérification...</Badge>
            ) : nativeStatus ? (
              <Badge className="bg-green-500">📱 Mode Natif</Badge>
            ) : (
              <Badge variant="outline">🌐 Mode Web</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          
          {/* Test Géolocalisation */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex-1">
              <strong>🌍 Géolocalisation</strong>
              <div className="text-xs text-muted-foreground">
                Test de getCurrentPosition()
              </div>
              {formatResult(results['geolocation'])}
            </div>
            <div className="flex items-center space-x-2">
              {getBadge('geolocation')}
              <Button 
                size="sm" 
                onClick={testGeolocation}
                disabled={testing['geolocation']}
              >
                Tester
              </Button>
            </div>
          </div>

          <Separator />

          {/* Test Caméra */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex-1">
              <strong>📸 Caméra</strong>
              <div className="text-xs text-muted-foreground">
                Test de prise de photo
              </div>
              {formatResult(results['camera'])}
            </div>
            <div className="flex items-center space-x-2">
              {getBadge('camera')}
              <Button 
                size="sm" 
                onClick={testCamera}
                disabled={testing['camera']}
              >
                Tester
              </Button>
            </div>
          </div>

          <Separator />

          {/* Test Galerie */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex-1">
              <strong>🖼️ Galerie</strong>
              <div className="text-xs text-muted-foreground">
                Test de sélection d'image
              </div>
              {formatResult(results['gallery'])}
            </div>
            <div className="flex items-center space-x-2">
              {getBadge('gallery')}
              <Button 
                size="sm" 
                onClick={testGallery}
                disabled={testing['gallery']}
              >
                Tester
              </Button>
            </div>
          </div>

          <Separator />

          {/* Test Contacts */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex-1">
              <strong>👥 Contacts</strong>
              <div className="text-xs text-muted-foreground">
                Test de lecture des contacts
              </div>
              {formatResult(results['contacts'])}
            </div>
            <div className="flex items-center space-x-2">
              {getBadge('contacts')}
              <Button 
                size="sm" 
                onClick={testContacts}
                disabled={testing['contacts']}
              >
                Tester
              </Button>
            </div>
          </div>

          <Separator />

          {/* Actions globales */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={testAll}
              className="w-full"
              size="lg"
            >
              🧪 Tester Toutes les Permissions
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setResults({})}
                className="flex-1"
              >
                🗑️ Effacer Résultats
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => nativeManager.forceNativeMode()}
                className="flex-1"
              >
                🔧 Forcer Mode Natif
              </Button>
            </div>
            
            {onClose && (
              <Button 
                variant="secondary" 
                onClick={onClose}
                className="w-full"
              >
                Fermer
              </Button>
            )}
          </div>

          {/* Informations système */}
          <div className="mt-6 p-4 bg-muted rounded text-xs">
            <strong>📋 Informations Système:</strong>
            <div className="mt-2 space-y-1">
              <div><strong>UserAgent:</strong> {navigator.userAgent}</div>
              <div><strong>URL:</strong> {window.location.href}</div>
              <div><strong>Protocol:</strong> {window.location.protocol}</div>
              <div><strong>Capacitor:</strong> {!!(window as any).Capacitor ? 'Disponible' : 'Non disponible'}</div>
              <div><strong>Force Flag:</strong> {!!(window as any).CapacitorForceNative ? 'Activé' : 'Inactif'}</div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};