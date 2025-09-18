import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { androidPermissions } from '@/lib/androidPermissions';
import { useToast } from '@/hooks/use-toast';

export const ForceAndroidPermissions = () => {
  const [pluginStatus, setPluginStatus] = useState<'checking' | 'available' | 'missing'>('checking');
  const [permissionResults, setPermissionResults] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    checkPluginStatus();
  }, []);

  const checkPluginStatus = () => {
    console.log('🔥 VÉRIFICATION PLUGIN STATUS:');
    console.log('🔥 - window.PermissionsPlugin:', !!window.PermissionsPlugin);
    console.log('🔥 - Capacitor:', (window as any).Capacitor);
    console.log('🔥 - androidPermissions.isAndroid():', androidPermissions.isAndroid());
    
    if (window.PermissionsPlugin) {
      setPluginStatus('available');
      toast({
        title: "Plugin détecté ✅",
        description: "PermissionsPlugin est disponible"
      });
    } else {
      setPluginStatus('missing');
      toast({
        title: "Plugin manquant ❌", 
        description: "PermissionsPlugin non disponible",
        variant: "destructive"
      });
      
      // Tenter de forcer l'initialisation
      setTimeout(() => {
        checkPluginStatus();
      }, 2000);
    }
  };

  const testAllPermissions = async () => {
    console.log('🔥 TEST TOUTES LES PERMISSIONS');
    const results: any = {};
    
    try {
      // Test géolocalisation
      console.log('🔥 Test géolocalisation...');
      results.location = await androidPermissions.forceRequestLocationPermissions();
      
      // Test caméra  
      console.log('🔥 Test caméra...');
      results.camera = await androidPermissions.forceRequestCameraPermissions();
      
      // Test contacts
      console.log('🔥 Test contacts...');
      results.contacts = await androidPermissions.forceRequestContactsPermissions();
      
      // Test notifications
      console.log('🔥 Test notifications...');
      results.notifications = await androidPermissions.requestNotificationPermissions();
      
      setPermissionResults(results);
      
      toast({
        title: "Tests terminés",
        description: `Résultats: ${Object.keys(results).filter(k => results[k]).length} permissions accordées`
      });
      
    } catch (error) {
      console.error('🔥 Erreur test permissions:', error);
      toast({
        title: "Erreur test permissions",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    }
  };

  const openSettings = async () => {
    const success = await androidPermissions.openAppSettings();
    if (success) {
      toast({
        title: "Paramètres ouverts",
        description: "Vous pouvez maintenant activer les permissions"
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir les paramètres",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🔥 Force Android Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <div>Plugin Status: 
            <span className={`ml-2 font-bold ${
              pluginStatus === 'available' ? 'text-green-600' : 
              pluginStatus === 'missing' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {pluginStatus === 'available' ? '✅ Disponible' :
               pluginStatus === 'missing' ? '❌ Manquant' : '⏳ Vérification...'}
            </span>
          </div>
          
          <div>Android détecté: 
            <span className={`ml-2 font-bold ${androidPermissions.isAndroid() ? 'text-green-600' : 'text-red-600'}`}>
              {androidPermissions.isAndroid() ? '✅ Oui' : '❌ Non'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testAllPermissions}
            disabled={pluginStatus !== 'available'}
            className="w-full"
          >
            🔥 FORCER TOUTES LES PERMISSIONS
          </Button>
          
          <Button 
            onClick={openSettings}
            disabled={pluginStatus !== 'available'}
            variant="outline" 
            className="w-full"
          >
            ⚙️ Ouvrir Paramètres App
          </Button>
          
          <Button 
            onClick={checkPluginStatus}
            variant="secondary" 
            className="w-full"
          >
            🔄 Recharger Plugin
          </Button>
        </div>

        {Object.keys(permissionResults).length > 0 && (
          <div className="text-xs bg-gray-100 p-3 rounded">
            <div className="font-bold mb-2">Résultats des permissions:</div>
            {Object.entries(permissionResults).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span>{key}:</span>
                <span className={value ? 'text-green-600' : 'text-red-600'}>
                  {value ? '✅' : '❌'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};