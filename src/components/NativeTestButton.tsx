import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCamera } from '@/hooks/useCamera';
import { useToast } from '@/hooks/use-toast';
import { detectNativeAndroid } from '@/lib/detectNativeAndroid';
import { MapPin, Camera, Image, Smartphone } from 'lucide-react';

export const NativeTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    isNative: boolean | null;
    geolocation: boolean | null;
    camera: boolean | null;
    gallery: boolean | null;
  }>({
    isNative: null,
    geolocation: null,
    camera: null,
    gallery: null
  });

  const { getCurrentPosition } = useGeolocation();
  const { takePicture, selectFromGallery } = useCamera();
  const { toast } = useToast();

  const runNativeTests = async () => {
    setTesting(true);
    console.log('🧪🧪🧪 DÉBUT DES TESTS NATIFS AVEC LOGGING EXTENSIF');
    
    // LOGGING COMPLET DE L'ENVIRONNEMENT
    console.log('🧪 === ÉTAT DE L\'ENVIRONNEMENT ===');
    console.log('🧪 URL:', window.location.href);
    console.log('🧪 UserAgent:', navigator.userAgent);
    console.log('🧪 Capacitor disponible:', !!(window as any).Capacitor);
    console.log('🧪 ForceAndroidMode:', !!(window as any).ForceAndroidMode);
    console.log('🧪 CapacitorMode:', (window as any).CapacitorMode);
    console.log('🧪 CapacitorIsNative:', (window as any).CapacitorIsNative);
    console.log('🧪 CapacitorAABFixed:', (window as any).CapacitorAABFixed);

    try {
      // Test 1: Détection native avec logging complet
      console.log('🧪 === TEST 1: DÉTECTION NATIVE ===');
      const isNative = detectNativeAndroid();
      setResults(prev => ({ ...prev, isNative }));
      
      toast({
        title: "Test détection native",
        description: isNative ? "✅ Android natif détecté" : "❌ Mode web détecté",
      });

      // Test 2: Géolocalisation
      try {
        const position = await getCurrentPosition();
        const geoSuccess = !!position;
        setResults(prev => ({ ...prev, geolocation: geoSuccess }));
        
        toast({
          title: "Test géolocalisation",
          description: geoSuccess ? "✅ Position obtenue" : "❌ Échec géolocalisation",
        });
      } catch (error) {
        console.error('❌ Erreur géolocalisation:', error);
        setResults(prev => ({ ...prev, geolocation: false }));
        toast({
          title: "Test géolocalisation",
          description: "❌ Échec géolocalisation",
          variant: "destructive"
        });
      }

      // Test 3: Caméra
      try {
        const photo = await takePicture();
        const cameraSuccess = !!photo;
        setResults(prev => ({ ...prev, camera: cameraSuccess }));
        
        toast({
          title: "Test caméra",
          description: cameraSuccess ? "✅ Photo prise" : "❌ Échec caméra",
        });
      } catch (error) {
        console.error('❌ Erreur caméra:', error);
        setResults(prev => ({ ...prev, camera: false }));
        toast({
          title: "Test caméra",
          description: "❌ Échec caméra",
          variant: "destructive"
        });
      }

      // Test 4: Galerie
      try {
        const image = await selectFromGallery();
        const gallerySuccess = !!image;
        setResults(prev => ({ ...prev, gallery: gallerySuccess }));
        
        toast({
          title: "Test galerie",
          description: gallerySuccess ? "✅ Image sélectionnée" : "❌ Échec galerie",
        });
      } catch (error) {
        console.error('❌ Erreur galerie:', error);
        setResults(prev => ({ ...prev, gallery: false }));
        toast({
          title: "Test galerie",
          description: "❌ Échec galerie",
          variant: "destructive"
        });
      }

      console.log('🧪 TESTS NATIFS TERMINÉS');
      
    } catch (error) {
      console.error('❌ Erreur globale tests:', error);
      toast({
        title: "Erreur tests",
        description: "Erreur lors des tests natifs",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getBadge = (result: boolean | null) => {
    if (result === null) return <Badge variant="secondary">Non testé</Badge>;
    return result ? 
      <Badge variant="default" className="bg-green-500">✅ OK</Badge> : 
      <Badge variant="destructive">❌ Échec</Badge>;
  };

  // FORCER l'affichage avec différents modes
  const urlParams = new URLSearchParams(window.location.search);
  const forceShow = urlParams.has('test') || urlParams.has('debug') || urlParams.has('forceAndroid');
  const isNativeDetected = detectNativeAndroid();
  
  console.log('🧪 NATIVE TEST BUTTON - Vérification affichage:');
  console.log('🧪 - Force show (URL):', forceShow);
  console.log('🧪 - Native detected:', isNativeDetected);
  console.log('🧪 - Affichage final:', forceShow || isNativeDetected);
  
  // Afficher si détection native OU si forcé via URL OU toujours en mode test
  const shouldShow = forceShow || isNativeDetected || true; // TOUJOURS afficher pour debug
  
  if (!shouldShow) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5" />
          Tests Natifs Android
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Détection native
            </span>
            {getBadge(results.isNative)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Géolocalisation
            </span>
            {getBadge(results.geolocation)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Caméra
            </span>
            {getBadge(results.camera)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Galerie
            </span>
            {getBadge(results.gallery)}
          </div>
        </div>

        <Button 
          onClick={runNativeTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? "Tests en cours..." : "🧪 Lancer Tests"}
        </Button>
      </CardContent>
    </Card>
  );
};