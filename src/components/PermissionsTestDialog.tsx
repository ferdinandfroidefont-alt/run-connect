import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { Settings, MapPin, Camera as CameraIcon, Smartphone } from 'lucide-react';
import { openLocationSettings } from '@/lib/native';
import { useToast } from '@/hooks/use-toast';
import { 
  forceGeolocationPermissions, 
  forceGetPosition, 
  forceCameraPermissions, 
  forceOpenGallery,
  isRealAndroidDevice
} from '@/lib/forceNativePermissions';

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
  details?: any;
}

export const PermissionsTestDialog = () => {
  const [open, setOpen] = useState(false);
  const [geoTest, setGeoTest] = useState<TestResult>({ status: 'idle' });
  const [cameraTest, setCameraTest] = useState<TestResult>({ status: 'idle' });
  const { toast } = useToast();

  const testGeolocation = async () => {
    setGeoTest({ status: 'testing' });
    
    try {
      console.log('🔥 TEST FORCE - BYPASS detection, direct Capacitor');

      // FORCER permissions directement sans vérifier Android
      console.log('🔥 FORCE permissions géolocalisation directement...');
      try {
        await forceGeolocationPermissions();
        console.log('🔥 Permissions FORCÉES avec succès');
      } catch (permError) {
        console.error('🔥 Erreur permissions forcées:', permError);
        setGeoTest({
          status: 'error',
          message: 'Permissions géolocalisation refusées - Activez dans Paramètres',
          details: { permissionError: String(permError) }
        });
        return;
      }

      // FORCER position directement
      console.log('🔥 FORCE position directement...');
      const position = await forceGetPosition();
      
      setGeoTest({
        status: 'success',
        message: `Position FORCÉE obtenue (méthode ${(position as any).method || 'unknown'})`,
        details: {
          lat: (position as any).lat?.toFixed(6),
          lng: (position as any).lng?.toFixed(6),
          accuracy: Math.round((position as any).accuracy || 0),
          method: (position as any).method
        }
      });
      
      toast({
        title: "Géolocalisation FORCÉE OK ✅",
        description: `Position: ${(position as any).lat?.toFixed(4)}, ${(position as any).lng?.toFixed(4)}`,
      });

    } catch (error) {
      console.error('🔥 Erreur FORCE géolocalisation:', error);
      setGeoTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur FORCE géolocalisation',
        details: { error: String(error) }
      });
    }
  };

  const testCamera = async () => {
    setCameraTest({ status: 'testing' });
    
    try {
      // 1. Vérifier permissions caméra
      const permissions = await Camera.checkPermissions();
      console.log('📷 Permissions caméra actuelles:', permissions);

      // 2. Demander permissions si nécessaire
      if (permissions.camera !== 'granted' || permissions.photos !== 'granted') {
        console.log('📷 Demande permissions caméra...');
        const requestResult = await Camera.requestPermissions();
        console.log('📷 Résultat demande caméra:', requestResult);
        
        if (requestResult.camera !== 'granted' && requestResult.photos !== 'granted') {
          setCameraTest({
            status: 'error',
            message: 'Permissions caméra refusées',
            details: { permissions: requestResult }
          });
          return;
        }
      }

      // 3. Tester accès galerie
      console.log('📷 Test accès galerie...');
      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 90,
        correctOrientation: true,
        saveToGallery: false,
        allowEditing: false
      });

      if (photo && (photo.webPath || photo.path)) {
        setCameraTest({
          status: 'success',
          message: 'Accès galerie réussi',
          details: {
            format: photo.format,
            path: photo.webPath || photo.path
          }
        });
        toast({
          title: "Galerie OK",
          description: "Photo sélectionnée avec succès",
        });
      } else {
        setCameraTest({
          status: 'error',
          message: 'Photo non récupérée',
          details: { photo }
        });
      }

    } catch (error) {
      console.error('❌ Erreur test caméra:', error);
      setCameraTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur accès galerie',
        details: { error: String(error) }
      });
    }
  };

  const getStatusBadge = (result: TestResult) => {
    switch (result.status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">✅ Succès</Badge>;
      case 'error':
        return <Badge variant="destructive">❌ Échec</Badge>;
      case 'testing':
        return <Badge variant="outline">⏳ Test...</Badge>;
      default:
        return <Badge variant="secondary">⚪ Non testé</Badge>;
    }
  };

  const testAll = async () => {
    await testGeolocation();
    await testCamera();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Test Permissions Natives
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Info plateforme */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium">🔥 FORCE Capacitor Direct:</p>
            <p className="text-xs text-muted-foreground">
              Platform: {Capacitor.getPlatform()} - Native: {Capacitor.isNativePlatform() ? 'Oui' : 'Non'}
            </p>
            <p className="text-xs text-muted-foreground">
              Mode: FORCE BYPASS - Capacitor direct sans vérification
            </p>
            <p className="text-xs text-muted-foreground">
              UserAgent: {navigator.userAgent.slice(0, 50)}...
            </p>
          </div>

          {/* Test Géolocalisation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Géolocalisation</span>
              </div>
              {getStatusBadge(geoTest)}
            </div>
            
            <Button
              onClick={testGeolocation}
              disabled={geoTest.status === 'testing'}
              className="w-full"
              size="sm"
            >
              {geoTest.status === 'testing' ? 'Test en cours...' : 'Tester Géolocalisation'}
            </Button>
            
            {geoTest.message && (
              <div className="text-xs p-2 bg-muted rounded">
                <p className="font-medium">{geoTest.message}</p>
                {geoTest.details && (
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(geoTest.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
            
            {geoTest.status === 'error' && (
              <Button
                onClick={openLocationSettings}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Settings className="h-4 w-4" />
                Ouvrir Paramètres
              </Button>
            )}
          </div>

          {/* Test Caméra */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CameraIcon className="h-4 w-4" />
                <span className="font-medium">Galerie</span>
              </div>
              {getStatusBadge(cameraTest)}
            </div>
            
            <Button
              onClick={testCamera}
              disabled={cameraTest.status === 'testing'}
              className="w-full"
              size="sm"
            >
              {cameraTest.status === 'testing' ? 'Test en cours...' : 'Tester Galerie'}
            </Button>
            
            {cameraTest.message && (
              <div className="text-xs p-2 bg-muted rounded">
                <p className="font-medium">{cameraTest.message}</p>
                {cameraTest.details && (
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(cameraTest.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Test All */}
          <Button
            onClick={testAll}
            disabled={geoTest.status === 'testing' || cameraTest.status === 'testing'}
            className="w-full"
            variant="secondary"
          >
            Tester Tout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};