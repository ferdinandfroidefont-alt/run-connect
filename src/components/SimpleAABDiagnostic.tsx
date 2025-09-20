import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface DiagnosticInfo {
  platform: string;
  isNative: boolean;
  capacitorAvailable: boolean;
  permissionsPluginAvailable: boolean;
  geolocationWorks: boolean | null;
  galleryWorks: boolean | null;
}

export const SimpleAABDiagnostic = () => {
  const [info, setInfo] = useState<DiagnosticInfo>({
    platform: 'unknown',
    isNative: false,
    capacitorAvailable: false,
    permissionsPluginAvailable: false,
    geolocationWorks: null,
    galleryWorks: null
  });
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    const capacitorAvailable = !!(window as any).Capacitor;
    const permissionsPluginAvailable = !!(window as any).PermissionsPlugin;

    setInfo({
      platform,
      isNative,
      capacitorAvailable,
      permissionsPluginAvailable,
      geolocationWorks: null,
      galleryWorks: null
    });

    console.log('🔥 DIAGNOSTIC AAB:', {
      platform,
      isNative,
      capacitorAvailable,
      permissionsPluginAvailable,
      userAgent: navigator.userAgent
    });
  }, []);

  const testStandardGeolocation = async () => {
    console.log('🔥 TEST GÉOLOCALISATION STANDARD');
    try {
      // Test direct Capacitor
      const permissions = await Geolocation.requestPermissions();
      console.log('🔥 Permissions Capacitor:', permissions);
      
      if (permissions.location === 'granted') {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        console.log('🔥 Position Capacitor obtenue:', position);
        return true;
      }
      
      // Fallback Web
      console.log('🔥 Fallback vers Web API');
      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('🔥 Position Web obtenue:', position);
            resolve(true);
          },
          (error) => {
            console.log('🔥 Erreur Web:', error);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    } catch (error) {
      console.log('🔥 Erreur géolocalisation:', error);
      return false;
    }
  };

  const testStandardGallery = async () => {
    console.log('🔥 TEST GALERIE STANDARD');
    try {
      // Test direct Capacitor
      const image = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 90
      });
      console.log('🔥 Image Capacitor obtenue:', !!image);
      return true;
    } catch (error) {
      console.log('🔥 Erreur galerie Capacitor:', error);
      
      // Fallback Web
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.click();
        console.log('🔥 Fallback Web input créé');
        return true;
      } catch (webError) {
        console.log('🔥 Erreur Web input:', webError);
        return false;
      }
    }
  };

  const runTests = async () => {
    setTesting(true);
    toast({ title: "🔥 Test des APIs standard en cours..." });
    
    const geolocationResult = await testStandardGeolocation();
    const galleryResult = await testStandardGallery();
    
    setInfo(prev => ({
      ...prev,
      geolocationWorks: geolocationResult,
      galleryWorks: galleryResult
    }));
    
    toast({
      title: "Tests terminés",
      description: `Géolocalisation: ${geolocationResult ? '✅' : '❌'} | Galerie: ${galleryResult ? '✅' : '❌'}`
    });
    
    setTesting(false);
  };

  const getBadge = (status: boolean | null) => {
    if (status === null) return <Badge variant="secondary">Non testé</Badge>;
    return status ? <Badge variant="default">✅ OK</Badge> : <Badge variant="destructive">❌ Échec</Badge>;
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">🔥 Diagnostic AAB Play Store</h3>
      
      <div className="space-y-2 text-sm">
        <div>Plateforme: <Badge>{info.platform}</Badge></div>
        <div>Native: {getBadge(info.isNative)}</div>
        <div>Capacitor: {getBadge(info.capacitorAvailable)}</div>
        <div>PermissionsPlugin: {getBadge(info.permissionsPluginAvailable)}</div>
        <div>Géolocalisation standard: {getBadge(info.geolocationWorks)}</div>
        <div>Galerie standard: {getBadge(info.galleryWorks)}</div>
      </div>
      
      <Button 
        onClick={runTests} 
        disabled={testing}
        className="w-full"
      >
        {testing ? "Test en cours..." : "🔥 Tester APIs Standard"}
      </Button>
    </Card>
  );
};