import { useState } from 'react';
import { useGeolocation } from './useGeolocation';
import { useCamera } from './useCamera';
import { useContacts } from './useContacts';
import { usePushNotifications } from './usePushNotifications';
import { useToast } from './use-toast';

export interface PermissionStatus {
  granted: boolean;
  tested: boolean;
  error?: string;
}

export interface AllPermissions {
  location: PermissionStatus;
  camera: PermissionStatus;
  contacts: PermissionStatus;
  notifications: PermissionStatus;
}

export const usePermissions = () => {
  const [testing, setTesting] = useState(false);
  const [permissions, setPermissions] = useState<AllPermissions>({
    location: { granted: false, tested: false },
    camera: { granted: false, tested: false },
    contacts: { granted: false, tested: false },
    notifications: { granted: false, tested: false }
  });

  const { getCurrentPosition } = useGeolocation();
  const { takePicture } = useCamera();
  const { loadContacts } = useContacts();
  const { requestPermissions: requestNotifications } = usePushNotifications();
  const { toast } = useToast();

  const testLocationPermission = async (): Promise<boolean> => {
    console.log('🧪 Test permission géolocalisation...');
    
    try {
      setPermissions(prev => ({
        ...prev,
        location: { granted: false, tested: false }
      }));

      const position = await getCurrentPosition();
      const granted = !!position;
      
      setPermissions(prev => ({
        ...prev,
        location: { granted, tested: true }
      }));

      return granted;
    } catch (error) {
      console.error('❌ Test géolocalisation échoué:', error);
      
      setPermissions(prev => ({
        ...prev,
        location: { 
          granted: false, 
          tested: true, 
          error: error instanceof Error ? error.message : 'Erreur géolocalisation'
        }
      }));

      return false;
    }
  };

  const testCameraPermission = async (): Promise<boolean> => {
    console.log('🧪 Test permission caméra...');
    
    try {
      setPermissions(prev => ({
        ...prev,
        camera: { granted: false, tested: false }
      }));

      const file = await takePicture();
      const granted = !!file;
      
      setPermissions(prev => ({
        ...prev,
        camera: { granted, tested: true }
      }));

      return granted;
    } catch (error) {
      console.error('❌ Test caméra échoué:', error);
      
      setPermissions(prev => ({
        ...prev,
        camera: { 
          granted: false, 
          tested: true, 
          error: error instanceof Error ? error.message : 'Erreur caméra'
        }
      }));

      return false;
    }
  };

  const testContactsPermission = async (): Promise<boolean> => {
    console.log('🧪 Test permission contacts...');
    
    try {
      setPermissions(prev => ({
        ...prev,
        contacts: { granted: false, tested: false }
      }));

      const contacts = await loadContacts();
      const granted = contacts.length > 0;
      
      setPermissions(prev => ({
        ...prev,
        contacts: { granted, tested: true }
      }));

      return granted;
    } catch (error) {
      console.error('❌ Test contacts échoué:', error);
      
      setPermissions(prev => ({
        ...prev,
        contacts: { 
          granted: false, 
          tested: true, 
          error: error instanceof Error ? error.message : 'Erreur contacts'
        }
      }));

      return false;
    }
  };

  const testNotificationsPermission = async (): Promise<boolean> => {
    console.log('🧪 Test permission notifications...');
    
    try {
      setPermissions(prev => ({
        ...prev,
        notifications: { granted: false, tested: false }
      }));

      const granted = await requestNotifications();
      
      setPermissions(prev => ({
        ...prev,
        notifications: { granted, tested: true }
      }));

      return granted;
    } catch (error) {
      console.error('❌ Test notifications échoué:', error);
      
      setPermissions(prev => ({
        ...prev,
        notifications: { 
          granted: false, 
          tested: true, 
          error: error instanceof Error ? error.message : 'Erreur notifications'
        }
      }));

      return false;
    }
  };

  const testAllPermissions = async () => {
    if (testing) return;
    
    setTesting(true);
    console.log('🧪 DÉBUT TEST TOUTES PERMISSIONS...');
    
    try {
      const results = await Promise.allSettled([
        testLocationPermission(),
        testCameraPermission(),
        testContactsPermission(),
        testNotificationsPermission()
      ]);

      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;

      toast({
        title: `Test terminé`,
        description: `${successCount}/4 permissions accordées`,
        variant: successCount >= 3 ? "default" : "destructive"
      });

      console.log('🧪✅ Test permissions terminé:', successCount, '/4');
      
    } catch (error) {
      console.error('🧪❌ Erreur test global:', error);
      
      toast({
        title: "Erreur test permissions",
        description: "Impossible de tester toutes les permissions",
        variant: "destructive"
      });
      
    } finally {
      setTesting(false);
    }
  };

  const resetPermissions = () => {
    setPermissions({
      location: { granted: false, tested: false },
      camera: { granted: false, tested: false },
      contacts: { granted: false, tested: false },
      notifications: { granted: false, tested: false }
    });
  };

  const getPermissionSummary = () => {
    const tested = Object.values(permissions).filter(p => p.tested).length;
    const granted = Object.values(permissions).filter(p => p.granted).length;
    
    return {
      tested,
      granted,
      total: 4,
      percentage: tested > 0 ? Math.round((granted / tested) * 100) : 0
    };
  };

  return {
    permissions,
    testing,
    testLocationPermission,
    testCameraPermission,
    testContactsPermission,
    testNotificationsPermission,
    testAllPermissions,
    resetPermissions,
    getPermissionSummary
  };
};