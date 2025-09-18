import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { androidPermissions } from '@/lib/androidPermissions';

export const ForcePermissionsButton = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    location?: boolean;
    camera?: boolean;
    contacts?: boolean;
  }>({});
  const { toast } = useToast();

  const testAllPermissions = async () => {
    if (!androidPermissions.isAndroid()) {
      toast({
        title: "Android uniquement",
        description: "Ce test fonctionne uniquement sur Android natif",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    const newResults: typeof results = {};

    try {
      // Test géolocalisation
      console.log('🔥 Test permissions géolocalisation...');
      newResults.location = await androidPermissions.forceRequestLocationPermissions();
      
      // Test caméra
      console.log('🔥 Test permissions caméra...');
      newResults.camera = await androidPermissions.forceRequestCameraPermissions();
      
      // Test contacts
      console.log('🔥 Test permissions contacts...');
      newResults.contacts = await androidPermissions.forceRequestContactsPermissions();

      setResults(newResults);

      const allGranted = Object.values(newResults).every(Boolean);
      
      toast({
        title: allGranted ? "✅ Toutes les permissions accordées!" : "⚠️ Certaines permissions manquent",
        description: allGranted 
          ? "Vérifiez maintenant Paramètres > Apps > RunConnect"
          : "Ouvrez les paramètres pour autoriser manuellement"
      });

    } catch (error) {
      console.error('🔥 Erreur test permissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de tester les permissions",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const openSettings = async () => {
    try {
      await androidPermissions.openAppSettings();
      toast({
        title: "Paramètres ouverts",
        description: "Autorisez les permissions dans Paramètres"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir les paramètres",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (granted?: boolean) => {
    if (granted === undefined) return <Badge variant="secondary">Non testé</Badge>;
    return granted 
      ? <Badge variant="default" className="bg-green-500">✅ Accordée</Badge>
      : <Badge variant="destructive">❌ Refusée</Badge>;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">🔥 Test Permissions Android FORCÉ</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span>Géolocalisation:</span>
          {getStatusBadge(results.location)}
        </div>
        <div className="flex justify-between items-center">
          <span>Caméra/Galerie:</span>
          {getStatusBadge(results.camera)}
        </div>
        <div className="flex justify-between items-center">
          <span>Contacts:</span>
          {getStatusBadge(results.contacts)}
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={testAllPermissions}
          disabled={testing || !androidPermissions.isAndroid()}
          className="flex-1"
        >
          {testing ? "🔥 Test en cours..." : "🔥 FORCER TOUTES les permissions"}
        </Button>
        
        <Button
          variant="outline"
          onClick={openSettings}
          disabled={!androidPermissions.isAndroid()}
        >
          ⚙️ Paramètres
        </Button>
      </div>

      {!androidPermissions.isAndroid() && (
        <p className="text-sm text-muted-foreground">
          ⚠️ Ce composant fonctionne uniquement sur Android natif
        </p>
      )}
    </div>
  );
};