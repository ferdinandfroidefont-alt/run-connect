import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, Users, Smartphone } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCamera } from '@/hooks/useCamera';
import { useContacts } from '@/hooks/useContacts';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

export const PermissionTestDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>({});
  
  const { getCurrentPosition, checkPermissions: checkGeoPermissions } = useGeolocation();
  const { selectFromGallery, checkPermissions: checkCameraPermissions } = useCamera();
  const { loadContacts, checkPermissions: checkContactPermissions } = useContacts();
  const { toast } = useToast();

  const runGeolocationTest = async () => {
    try {
      setTestResults(prev => ({ ...prev, geo: 'testing...' }));
      
      // Check permissions first
      const permissions = await checkGeoPermissions();
      console.log('🔍 Geolocation permissions:', permissions);
      
      // Try to get position
      const position = await getCurrentPosition();
      console.log('🎯 Position obtained:', position);
      
      setTestResults(prev => ({ 
        ...prev, 
        geo: { 
          success: true, 
          permissions, 
          position,
          platform: Capacitor.getPlatform()
        }
      }));
      
      toast({
        title: "Géolocalisation",
        description: "✅ Test réussi - Position obtenue",
      });
    } catch (error) {
      console.error('❌ Geo test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        geo: { 
          success: false, 
          error: error.message,
          platform: Capacitor.getPlatform()
        }
      }));
      
      toast({
        title: "Géolocalisation",
        description: `❌ Échec: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const runCameraTest = async () => {
    try {
      setTestResults(prev => ({ ...prev, camera: 'testing...' }));
      
      // Check permissions first
      const permissions = await checkCameraPermissions();
      console.log('🔍 Camera permissions:', permissions);
      
      // Try to access gallery
      const file = await selectFromGallery();
      console.log('📸 File selected:', file);
      
      setTestResults(prev => ({ 
        ...prev, 
        camera: { 
          success: true, 
          permissions, 
          fileSelected: !!file,
          fileName: file?.name,
          fileSize: file?.size,
          platform: Capacitor.getPlatform()
        }
      }));
      
      toast({
        title: "Galerie",
        description: file ? "✅ Test réussi - Fichier sélectionné" : "⚠️ Aucun fichier sélectionné",
      });
    } catch (error) {
      console.error('❌ Camera test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        camera: { 
          success: false, 
          error: error.message,
          platform: Capacitor.getPlatform()
        }
      }));
      
      toast({
        title: "Galerie",
        description: `❌ Échec: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const runContactsTest = async () => {
    try {
      setTestResults(prev => ({ ...prev, contacts: 'testing...' }));
      
      // Check permissions first
      const permissions = await checkContactPermissions();
      console.log('🔍 Contacts permissions:', permissions);
      
      // Try to load contacts
      await loadContacts();
      
      setTestResults(prev => ({ 
        ...prev, 
        contacts: { 
          success: true, 
          permissions,
          platform: Capacitor.getPlatform()
        }
      }));
      
      toast({
        title: "Contacts",
        description: "✅ Test réussi - Contacts chargés",
      });
    } catch (error) {
      console.error('❌ Contacts test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        contacts: { 
          success: false, 
          error: error.message,
          platform: Capacitor.getPlatform()
        }
      }));
      
      toast({
        title: "Contacts",
        description: `❌ Échec: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (result: any) => {
    if (result === 'testing...') return <Badge variant="secondary">Test en cours...</Badge>;
    if (!result) return <Badge variant="outline">Non testé</Badge>;
    if (result.success) return <Badge variant="default">✅ Succès</Badge>;
    return <Badge variant="destructive">❌ Échec</Badge>;
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline" 
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Smartphone className="h-4 w-4 mr-2" />
        Test Permissions
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Test des Permissions
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Fermer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Plateforme: <strong>{Capacitor.getPlatform()}</strong></p>
            <p>Natif: <strong>{Capacitor.isNativePlatform() ? 'Oui' : 'Non'}</strong></p>
          </div>

          {/* Géolocalisation */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Géolocalisation</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(testResults.geo)}
              <Button size="sm" onClick={runGeolocationTest}>
                Tester
              </Button>
            </div>
          </div>

          {/* Galerie */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>Galerie</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(testResults.camera)}
              <Button size="sm" onClick={runCameraTest}>
                Tester
              </Button>
            </div>
          </div>

          {/* Contacts */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Contacts</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(testResults.contacts)}
              <Button size="sm" onClick={runContactsTest}>
                Tester
              </Button>
            </div>
          </div>

          {/* Résultats détaillés */}
          {Object.keys(testResults).length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded text-xs">
              <strong>Résultats détaillés:</strong>
              <pre className="mt-2 overflow-x-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}

          <Button 
            onClick={() => {
              runGeolocationTest();
              runCameraTest();
              runContactsTest();
            }}
            className="w-full"
          >
            Tester toutes les permissions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};