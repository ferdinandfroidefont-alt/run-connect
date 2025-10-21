import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { nativeManager } from '@/lib/nativeInit';
import { forceContactsPermissions } from '@/lib/forceNativePermissions';
import { MIUIPermissionsFix } from '@/lib/miuiPermissionsFix';

// Interface pour l'état Android injecté et le bridge natif
declare global {
  interface Window {
    androidPermissions?: {
      contacts?: string;
      contactsPermanentlyDenied?: boolean;
      location?: string;
      locationPermanentlyDenied?: boolean;
      camera?: string;
      cameraPermanentlyDenied?: boolean;
      storage?: string;
      storagePermanentlyDenied?: boolean;
      notifications?: string;
      notificationsPermanentlyDenied?: boolean;
      timestamp?: number;
    };
    AndroidBridge?: {
      requestContactsPermission: () => void;
      requestLocationPermission: () => void;
      requestStoragePermission: () => void;
      requestNotificationPermissions: () => void; // ✅ AJOUT SOLUTION 3
      getContacts: () => void; // ✅ Asynchrone, pas de retour direct
      invalidateContactsCache: () => void; // ✅ Nouveau
    };
    onNativePermissionResult?: (granted: boolean) => void;
  }
}

export interface Contact {
  contactId: string;
  displayName?: string;
  phoneNumbers?: Array<{
    label?: string;
    number?: string;
  }>;
  emails?: Array<{
    label?: string;
    address?: string;
  }>;
}

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const initNativeStatus = async () => {
      const native = await nativeManager.ensureNativeStatus();
      setIsNative(native);
      if (native) {
        checkPermissions();
      }
    };
    
    initNativeStatus();

    // Écouter les mises à jour de permissions depuis Android
    const handlePermissionUpdate = (event: any) => {
      console.log('👥 Événement androidPermissionsUpdated reçu:', event.detail);
      if (event.detail?.contacts) {
        const granted = event.detail.contacts === 'granted';
        console.log('👥 Permission contacts mise à jour depuis Android:', granted);
        setHasPermission(granted);
      }
    };

    window.addEventListener('androidPermissionsUpdated', handlePermissionUpdate);
    
    return () => {
      window.removeEventListener('androidPermissionsUpdated', handlePermissionUpdate);
    };
  }, []);

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥 Contacts non disponibles en mode web');
        setHasPermission(false);
        return false;
      }
      
      console.log('👥🔍 Vérification permissions contacts - LECTURE DIRECTE Android');
      
      // ✅ SOLUTION: Lire UNIQUEMENT l'état Android injecté
      const androidState = window.androidPermissions?.contacts;
      console.log('👥 État Android:', androidState);
      
      const granted = androidState === 'granted';
      console.log('👥 Résultat final:', granted ? 'GRANTED ✅' : 'DENIED ❌');
      
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.log('👥❌ Erreur check permissions contacts:', error);
      setHasPermission(false);
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥 Contacts nécessitent mode natif');
        return false;
      }
      
      console.log('👥🔄 Demande permissions contacts - VIA BRIDGE ANDROID NATIF');
      
      // Vérifier d'abord si déjà accordé
      const currentState = window.androidPermissions?.contacts;
      if (currentState === 'granted') {
        console.log('👥✅ Déjà accordé selon Android');
        setHasPermission(true);
        return true;
      }
      
      // ✅ SOLUTION: Utiliser le bridge Android natif
      if (!window.AndroidBridge) {
        console.error('👥❌ AndroidBridge non disponible!');
        return false;
      }
      
      return new Promise((resolve) => {
        // Écouter le résultat de la permission
        window.onNativePermissionResult = (granted: boolean) => {
          console.log('👥 Résultat natif reçu:', granted ? 'GRANTED ✅' : 'DENIED ❌');
          setHasPermission(granted);
          
          // Re-vérifier l'état après 500ms pour être sûr
          setTimeout(() => {
            const finalState = window.androidPermissions?.contacts;
            console.log('👥 État final après demande:', finalState);
            setHasPermission(finalState === 'granted');
          }, 500);
          
          resolve(granted);
        };
        
        // Appeler le bridge natif
        console.log('👥 Appel du bridge Android...');
        window.AndroidBridge.requestContactsPermission();
      });
    } catch (error) {
      console.error('👥❌ Erreur request permissions contacts:', error);
      setHasPermission(false);
      return false;
    }
  };

  const loadContacts = async (): Promise<Contact[]> => {
    console.log('👥 DÉBUT CHARGEMENT CONTACTS...');
    
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        throw new Error('Contacts disponibles uniquement en mode natif');
      }

      setLoading(true);
      
      // Vérifier permissions
      const hasPerms = await requestPermissions();
      if (!hasPerms) {
        throw new Error('Permission contacts refusée');
      }

      // ✅ NOUVELLE APPROCHE: Écouter l'événement asynchrone
      if (!window.AndroidBridge) {
        throw new Error('AndroidBridge non disponible');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          setLoading(false);
          reject(new Error('Timeout récupération contacts (30s)'));
        }, 30000); // 30 secondes max

        // ✅ Écouter le résultat depuis le thread background
        const handleContactsLoaded = (event: any) => {
          clearTimeout(timeout);
          window.removeEventListener('contactsLoaded', handleContactsLoaded);
          
          try {
            const contactsData = JSON.parse(event.detail);
            
            if (contactsData.error) {
              setLoading(false);
              reject(new Error(contactsData.error));
              return;
            }

            console.log('👥 Contacts bruts reçus:', contactsData.length || 0);

            // Formatter contacts
            const formattedContacts: Contact[] = contactsData
              .filter((contact: any) => {
                const hasName = contact.displayName;
                const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
                return hasName || hasPhone;
              })
              .map((contact: any) => ({
                contactId: contact.contactId,
                displayName: contact.displayName || 'Contact sans nom',
                phoneNumbers: contact.phoneNumbers || [],
                emails: contact.emails || []
              }));

            console.log('👥✅ Contacts formatés:', formattedContacts.length);
            
            setContacts(formattedContacts);
            setLoading(false);
            resolve(formattedContacts);

          } catch (error) {
            console.error('👥❌ Erreur parsing contacts:', error);
            setLoading(false);
            reject(error);
          }
        };

        window.addEventListener('contactsLoaded', handleContactsLoaded);
        
        // ✅ Lancer la récupération asynchrone (retour immédiat)
        console.log('👥⚡ Appel AndroidBridge.getContacts() (non-bloquant)...');
        window.AndroidBridge!.getContacts();
      });

    } catch (error) {
      console.error('👥❌ ERREUR CHARGEMENT CONTACTS:', error);
      setLoading(false);
      throw error;
    }
  };

  const refreshContacts = async (): Promise<Contact[]> => {
    console.log('👥🔄 Force refresh contacts (invalidation cache)');
    
    if (window.AndroidBridge) {
      window.AndroidBridge.invalidateContactsCache();
    }
    
    return loadContacts();
  };

  return {
    contacts,
    loading,
    hasPermission,
    isNative,
    checkPermissions,
    requestPermissions,
    loadContacts,
    refreshContacts
  };
};