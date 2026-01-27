import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
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
      requestNotificationPermissions: () => void;
      getContacts: () => void;
      invalidateContactsCache: () => void;
      googleSignIn: () => void;
      googleSignOut: () => void;
    };
    onNativePermissionResult?: (granted: boolean) => void;
    detectedPlatform?: 'ios' | 'android' | 'web';
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

// 🍎 Helper pour détecter iOS
const isIOSPlatform = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

// 🤖 Helper pour détecter Android
const isAndroidPlatform = (): boolean => {
  return Capacitor.getPlatform() === 'android' || !!(window as any).AndroidBridge;
};

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    const initNativeStatus = async () => {
      // Détecter la plateforme
      const currentPlatform = isIOSPlatform() ? 'ios' : isAndroidPlatform() ? 'android' : 'web';
      setPlatform(currentPlatform);
      
      const hasAndroidBridge = !!(window as any).AndroidBridge;
      const forceNative = (window as any).CapacitorForceNative === true;
      const isCapacitorNative = Capacitor.isNativePlatform();
      
      console.log('👥 Init native status - Platform:', currentPlatform, 'AndroidBridge:', hasAndroidBridge, 'ForceNative:', forceNative, 'CapacitorNative:', isCapacitorNative);
      
      if (hasAndroidBridge || forceNative || isCapacitorNative) {
        setIsNative(true);
        checkPermissions();
      } else {
        const native = await nativeManager.ensureNativeStatus();
        setIsNative(native);
        if (native) {
          checkPermissions();
        }
      }
    };
    
    initNativeStatus();

    // Écouter l'événement native ready depuis main.tsx
    const handleNativeReady = (event: any) => {
      console.log('👥 Événement capacitorNativeReady reçu:', event.detail);
      if (event.detail?.isNative) {
        setIsNative(true);
        if (event.detail?.platform) {
          setPlatform(event.detail.platform);
        }
        checkPermissions();
      }
    };

    // Écouter les mises à jour de permissions depuis Android
    const handlePermissionUpdate = (event: any) => {
      console.log('👥 Événement androidPermissionsUpdated reçu:', event.detail);
      if (event.detail?.contacts) {
        const granted = event.detail.contacts === 'granted';
        console.log('👥 Permission contacts mise à jour depuis Android:', granted);
        setHasPermission(granted);
      }
    };

    window.addEventListener('capacitorNativeReady', handleNativeReady);
    window.addEventListener('androidPermissionsUpdated', handlePermissionUpdate);
    
    return () => {
      window.removeEventListener('capacitorNativeReady', handleNativeReady);
      window.removeEventListener('androidPermissionsUpdated', handlePermissionUpdate);
    };
  }, []);

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      const currentPlatform = isIOSPlatform() ? 'ios' : isAndroidPlatform() ? 'android' : 'web';
      
      if (!native && !Capacitor.isNativePlatform()) {
        console.log('👥 Contacts non disponibles en mode web');
        setHasPermission(false);
        return false;
      }
      
      // 🍎 iOS: Utiliser directement le plugin Capacitor
      if (currentPlatform === 'ios') {
        console.log('🍎👥 Vérification permissions contacts iOS via Capacitor');
        try {
          const result = await Contacts.checkPermissions();
          const granted = result.contacts === 'granted';
          console.log('🍎👥 Résultat iOS:', granted ? 'GRANTED ✅' : 'DENIED ❌');
          setHasPermission(granted);
          return granted;
        } catch (error) {
          console.log('🍎👥 Erreur check iOS:', error);
          setHasPermission(false);
          return false;
        }
      }
      
      // 🤖 Android: Lire l'état Android injecté
      console.log('🤖👥 Vérification permissions contacts Android');
      const androidState = window.androidPermissions?.contacts;
      console.log('🤖👥 État Android:', androidState);
      
      const granted = androidState === 'granted';
      console.log('🤖👥 Résultat final:', granted ? 'GRANTED ✅' : 'DENIED ❌');
      
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
      const currentPlatform = isIOSPlatform() ? 'ios' : isAndroidPlatform() ? 'android' : 'web';
      
      if (!native && !Capacitor.isNativePlatform()) {
        console.log('👥 Contacts nécessitent mode natif');
        return false;
      }
      
      // 🍎 iOS: Utiliser directement le plugin Capacitor (déclenche la popup native iOS)
      if (currentPlatform === 'ios') {
        console.log('🍎👥 Demande permissions contacts iOS via Capacitor');
        try {
          const result = await Contacts.requestPermissions();
          const granted = result.contacts === 'granted';
          console.log('🍎👥 Résultat popup iOS:', granted ? 'GRANTED ✅' : 'DENIED ❌');
          setHasPermission(granted);
          return granted;
        } catch (error) {
          console.error('🍎👥 Erreur request iOS:', error);
          setHasPermission(false);
          return false;
        }
      }
      
      // 🤖 Android: Utiliser le bridge Android natif
      console.log('🤖👥 Demande permissions contacts Android');
      
      // Vérifier d'abord si déjà accordé
      const currentState = window.androidPermissions?.contacts;
      if (currentState === 'granted') {
        console.log('🤖👥 Déjà accordé selon Android');
        setHasPermission(true);
        return true;
      }
      
      // Utiliser le bridge Android natif
      if (!window.AndroidBridge) {
        console.error('🤖👥 AndroidBridge non disponible, fallback Capacitor');
        // Fallback Capacitor
        try {
          const result = await Contacts.requestPermissions();
          const granted = result.contacts === 'granted';
          setHasPermission(granted);
          return granted;
        } catch (e) {
          console.error('🤖👥 Fallback Capacitor échoué:', e);
          return false;
        }
      }
      
      return new Promise((resolve) => {
        window.onNativePermissionResult = (granted: boolean) => {
          console.log('🤖👥 Résultat natif reçu:', granted ? 'GRANTED ✅' : 'DENIED ❌');
          setHasPermission(granted);
          
          setTimeout(() => {
            const finalState = window.androidPermissions?.contacts;
            console.log('🤖👥 État final après demande:', finalState);
            setHasPermission(finalState === 'granted');
          }, 500);
          
          resolve(granted);
        };
        
        console.log('🤖👥 Appel du bridge Android...');
        window.AndroidBridge!.requestContactsPermission();
      });
    } catch (error) {
      console.error('👥❌ Erreur request permissions contacts:', error);
      setHasPermission(false);
      return false;
    }
  };

  const loadContacts = async (): Promise<Contact[]> => {
    console.log('👥 DÉBUT CHARGEMENT CONTACTS...');
    const currentPlatform = isIOSPlatform() ? 'ios' : isAndroidPlatform() ? 'android' : 'web';
    
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native && !Capacitor.isNativePlatform()) {
        throw new Error('Contacts disponibles uniquement en mode natif');
      }

      setLoading(true);
      
      // Vérifier permissions
      const hasPerms = await requestPermissions();
      if (!hasPerms) {
        throw new Error('Permission contacts refusée');
      }

      // 🍎 iOS: Utiliser directement le plugin Capacitor
      if (currentPlatform === 'ios') {
        console.log('🍎👥 Chargement contacts iOS via Capacitor');
        try {
          const result = await Contacts.getContacts({
            projection: {
              name: true,
              phones: true,
              emails: true
            }
          });
          
          const formattedContacts: Contact[] = result.contacts
            .filter((contact: any) => contact.name?.display || (contact.phones && contact.phones.length > 0))
            .map((contact: any) => ({
              contactId: contact.contactId,
              displayName: contact.name?.display || 'Contact sans nom',
              phoneNumbers: contact.phones?.map((p: any) => ({ label: p.label, number: p.number })) || [],
              emails: contact.emails?.map((e: any) => ({ label: e.label, address: e.address })) || []
            }));
          
          console.log('🍎👥 Contacts iOS chargés:', formattedContacts.length);
          setContacts(formattedContacts);
          setLoading(false);
          return formattedContacts;
        } catch (error) {
          console.error('🍎👥 Erreur chargement iOS:', error);
          setLoading(false);
          throw error;
        }
      }

      // 🤖 Android: Utiliser le bridge Android
      if (!window.AndroidBridge) {
        // Fallback Capacitor pour Android sans bridge
        console.log('🤖👥 Fallback Capacitor pour Android');
        try {
          const result = await Contacts.getContacts({
            projection: {
              name: true,
              phones: true,
              emails: true
            }
          });
          
          const formattedContacts: Contact[] = result.contacts
            .filter((contact: any) => contact.name?.display || (contact.phones && contact.phones.length > 0))
            .map((contact: any) => ({
              contactId: contact.contactId,
              displayName: contact.name?.display || 'Contact sans nom',
              phoneNumbers: contact.phones?.map((p: any) => ({ label: p.label, number: p.number })) || [],
              emails: contact.emails?.map((e: any) => ({ label: e.label, address: e.address })) || []
            }));
          
          setContacts(formattedContacts);
          setLoading(false);
          return formattedContacts;
        } catch (error) {
          console.error('🤖👥 Fallback Capacitor échoué:', error);
          setLoading(false);
          throw error;
        }
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          setLoading(false);
          reject(new Error('Timeout récupération contacts (30s)'));
        }, 30000);

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

            console.log('🤖👥 Contacts bruts reçus:', contactsData.length || 0);

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

            console.log('🤖👥 Contacts formatés:', formattedContacts.length);
            
            setContacts(formattedContacts);
            setLoading(false);
            resolve(formattedContacts);

          } catch (error) {
            console.error('🤖👥 Erreur parsing contacts:', error);
            setLoading(false);
            reject(error);
          }
        };

        window.addEventListener('contactsLoaded', handleContactsLoaded);
        
        console.log('🤖👥 Appel AndroidBridge.getContacts()...');
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
    platform,
    checkPermissions,
    requestPermissions,
    loadContacts,
    refreshContacts
  };
};