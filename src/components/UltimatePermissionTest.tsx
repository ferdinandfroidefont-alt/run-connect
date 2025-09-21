import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Contacts } from '@capacitor-community/contacts';

export const UltimatePermissionTest = () => {
  const [results, setResults] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const updateResult = (test: string, result: any) => {
    setResults(prev => ({ ...prev, [test]: result }));
  };

  const setTestStatus = (test: string, status: boolean) => {
    setTesting(prev => ({ ...prev, [test]: status }));
  };

  // TEST 1: Géolocalisation DIRECT
  const testGeolocationDirect = async () => {
    setTestStatus('geo-direct', true);
    try {
      console.log('🔥 TEST GÉOLOCALISATION DIRECT');
      
      // Étape 1: Vérifier les permissions
      const checkResult = await Geolocation.checkPermissions();
      console.log('🔥 Check permissions:', checkResult);
      
      // Étape 2: Demander les permissions
      const requestResult = await Geolocation.requestPermissions();
      console.log('🔥 Request permissions:', requestResult);
      
      // Étape 3: Obtenir la position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000
      });
      
      console.log('🔥 ✅ Position obtenue:', position);
      
      updateResult('geo-direct', {
        success: true,
        checkResult,
        requestResult,
        position: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      });
      
    } catch (error) {
      console.error('🔥 ❌ Erreur géolocalisation:', error);
      updateResult('geo-direct', {
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
    setTestStatus('geo-direct', false);
  };

  // TEST 2: API Web DIRECT
  const testWebGeolocation = async () => {
    setTestStatus('geo-web', true);
    try {
      console.log('🔥 TEST WEB GÉOLOCALISATION');
      
      if (!navigator.geolocation) {
        throw new Error('Géolocalisation non supportée');
      }
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('🔥 ✅ Position web:', pos);
            resolve(pos);
          },
          (error) => {
            console.error('🔥 ❌ Erreur web:', error);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 300000
          }
        );
      });
      
      updateResult('geo-web', {
        success: true,
        position: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      });
      
    } catch (error) {
      console.error('🔥 ❌ Erreur web géolocalisation:', error);
      updateResult('geo-web', {
        success: false,
        error: error.message,
        code: error.code
      });
    }
    setTestStatus('geo-web', false);
  };

  // TEST 3: Caméra DIRECT
  const testCameraDirect = async () => {
    setTestStatus('camera-direct', true);
    try {
      console.log('🔥 TEST CAMÉRA DIRECT');
      
      // Étape 1: Vérifier les permissions
      const checkResult = await Camera.checkPermissions();
      console.log('🔥 Check camera permissions:', checkResult);
      
      // Étape 2: Demander les permissions
      const requestResult = await Camera.requestPermissions();
      console.log('🔥 Request camera permissions:', requestResult);
      
      // Étape 3: Prendre une photo
      const result = await Camera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      console.log('🔥 ✅ Photo prise:', !!result.dataUrl);
      
      updateResult('camera-direct', {
        success: true,
        checkResult,
        requestResult,
        photoTaken: !!result.dataUrl,
        dataUrl: result.dataUrl ? 'DATA_PRESENT' : 'NO_DATA'
      });
      
    } catch (error) {
      console.error('🔥 ❌ Erreur caméra:', error);
      updateResult('camera-direct', {
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
    setTestStatus('camera-direct', false);
  };

  // TEST 4: Contacts DIRECT
  const testContactsDirect = async () => {
    setTestStatus('contacts-direct', true);
    try {
      console.log('🔥 TEST CONTACTS DIRECT');
      
      // Étape 1: Vérifier les permissions
      const checkResult = await Contacts.checkPermissions();
      console.log('🔥 Check contacts permissions:', checkResult);
      
      // Étape 2: Demander les permissions
      const requestResult = await Contacts.requestPermissions();
      console.log('🔥 Request contacts permissions:', requestResult);
      
      // Étape 3: Charger les contacts
      const contactsResult = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
        }
      });
      
      console.log('🔥 ✅ Contacts chargés:', contactsResult.contacts?.length || 0);
      
      updateResult('contacts-direct', {
        success: true,
        checkResult,
        requestResult,
        contactCount: contactsResult.contacts?.length || 0
      });
      
    } catch (error) {
      console.error('🔥 ❌ Erreur contacts:', error);
      updateResult('contacts-direct', {
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
    setTestStatus('contacts-direct', false);
  };

  const getBadge = (result: any) => {
    if (!result) return <Badge variant="secondary">Non testé</Badge>;
    if (result.success) return <Badge className="bg-green-500">✅ Succès</Badge>;
    return <Badge variant="destructive">❌ Échec</Badge>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>🔥 TEST ULTIMATE PERMISSIONS 🔥</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tests directs des APIs Capacitor sans abstraction
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Géolocalisation Capacitor */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <strong>1. Géolocalisation Capacitor</strong>
              <div className="text-xs text-muted-foreground">
                Test direct de Geolocation.getCurrentPosition()
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getBadge(results['geo-direct'])}
              <Button 
                size="sm" 
                onClick={testGeolocationDirect}
                disabled={testing['geo-direct']}
              >
                {testing['geo-direct'] ? '⏳' : 'Tester'}
              </Button>
            </div>
          </div>

          {/* Géolocalisation Web */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <strong>2. Géolocalisation Web Native</strong>
              <div className="text-xs text-muted-foreground">
                Test direct de navigator.geolocation
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getBadge(results['geo-web'])}
              <Button 
                size="sm" 
                onClick={testWebGeolocation}
                disabled={testing['geo-web']}
              >
                {testing['geo-web'] ? '⏳' : 'Tester'}
              </Button>
            </div>
          </div>

          {/* Caméra */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <strong>3. Caméra Capacitor</strong>
              <div className="text-xs text-muted-foreground">
                Test direct de Camera.getPhoto()
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getBadge(results['camera-direct'])}
              <Button 
                size="sm" 
                onClick={testCameraDirect}
                disabled={testing['camera-direct']}
              >
                {testing['camera-direct'] ? '⏳' : 'Tester'}
              </Button>
            </div>
          </div>

          {/* Contacts */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <strong>4. Contacts Capacitor</strong>
              <div className="text-xs text-muted-foreground">
                Test direct de Contacts.getContacts()
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getBadge(results['contacts-direct'])}
              <Button 
                size="sm" 
                onClick={testContactsDirect}
                disabled={testing['contacts-direct']}
              >
                {testing['contacts-direct'] ? '⏳' : 'Tester'}
              </Button>
            </div>
          </div>

          <Button 
            onClick={() => {
              testGeolocationDirect();
              setTimeout(() => testWebGeolocation(), 1000);
              setTimeout(() => testCameraDirect(), 2000);
              setTimeout(() => testContactsDirect(), 3000);
            }}
            className="w-full"
            size="lg"
          >
            🔥 TESTER TOUTES LES PERMISSIONS 🔥
          </Button>

          {/* Résultats détaillés */}
          {Object.keys(results).length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded text-xs">
              <strong>📋 RÉSULTATS DÉTAILLÉS:</strong>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}

          <Button variant="outline" onClick={() => window.location.reload()}>
            🔄 Fermer et recharger
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};