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
      // 1. Détection plateforme robuste pour AAB Play Store
      const userAgent = navigator.userAgent;
      const isAndroidApp = userAgent.includes('Android') && !userAgent.includes('Chrome/');
      const isIOSApp = (userAgent.includes('iPhone') || userAgent.includes('iPad')) && !userAgent.includes('Safari');
      const isCapacitorNative = Capacitor.isNativePlatform();
      const isInWebView = userAgent.includes('wv') || 
                         userAgent.includes('Version/') && userAgent.includes('Mobile');
      
      // FORCE ANDROID si UserAgent contient Android, même si Capacitor dit "web"
      const isRealNative = isCapacitorNative || 
                           isAndroidApp || 
                           isIOSApp || 
                           isInWebView ||
                           userAgent.includes('Android');

      console.log('🔍 Test géolocalisation - Plateforme:', {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        userAgent: navigator.userAgent,
        isAndroidApp,
        isIOSApp,
        isInWebView,
        isRealNative
      });

      if (!isRealNative) {
        setGeoTest({
          status: 'error',
          message: 'Mode web détecté - Testez sur un vrai téléphone via l\'AAB Play Store',
          details: { platform: Capacitor.getPlatform() }
        });
        return;
      }

      // 2. Vérifier permissions
      const permissions = await Geolocation.checkPermissions();
      console.log('🔍 Permissions actuelles:', permissions);

      // 3. Demander permissions si nécessaire
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        console.log('📱 Demande permissions...');
        const requestResult = await Geolocation.requestPermissions();
        console.log('📱 Résultat demande:', requestResult);
        
        if (requestResult.location !== 'granted' && requestResult.coarseLocation !== 'granted') {
          setGeoTest({
            status: 'error',
            message: 'Permissions refusées - Ouvrez les paramètres pour autoriser',
            details: { permissions: requestResult }
          });
          return;
        }
      }

      // 4. Tester géolocalisation avec stratégies multiples
      const strategies = [
        { name: 'Ultra-permissive', enableHighAccuracy: false, timeout: 30000, maximumAge: 3600000 },
        { name: 'Rapide', enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
        { name: 'Précise', enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
      ];

      let position = null;
      let successStrategy = null;

      for (const strategy of strategies) {
        try {
          console.log(`🎯 Test stratégie: ${strategy.name}`);
          const coords = await Geolocation.getCurrentPosition(strategy);
          position = coords;
          successStrategy = strategy.name;
          console.log(`✅ Succès ${strategy.name}:`, coords.coords);
          break;
        } catch (strategyError) {
          console.log(`❌ Échec ${strategy.name}:`, strategyError);
        }
      }

      if (position) {
        setGeoTest({
          status: 'success',
          message: `Position obtenue via ${successStrategy}`,
          details: {
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
            accuracy: Math.round(position.coords.accuracy),
            strategy: successStrategy
          }
        });
        toast({
          title: "Géolocalisation OK",
          description: `Position: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        });
      } else {
        setGeoTest({
          status: 'error',
          message: 'Toutes les stratégies ont échoué',
          details: { tried: strategies.length }
        });
      }

    } catch (error) {
      console.error('❌ Erreur test géolocalisation:', error);
      setGeoTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Test Permissions
        </Button>
      </DialogTrigger>
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
            <p className="text-sm font-medium">Plateforme détectée:</p>
            <p className="text-xs text-muted-foreground">
              {Capacitor.getPlatform()} - Native: {Capacitor.isNativePlatform() ? 'Oui' : 'Non'}
            </p>
            <p className="text-xs text-muted-foreground">
              UserAgent: {navigator.userAgent.includes('Android') ? 'Android' : 
                         navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'iOS' : 'Autre'}
            </p>
            <p className="text-xs text-muted-foreground">
              WebView: {navigator.userAgent.includes('wv') || navigator.userAgent.includes('Version/') ? 'Oui' : 'Non'}
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