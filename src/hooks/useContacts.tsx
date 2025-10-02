import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { nativeManager } from '@/lib/nativeInit';
import { forceContactsPermissions } from '@/lib/forceNativePermissions';
import { MIUIPermissionsFix } from '@/lib/miuiPermissionsFix';

// Interface pour l'état Android injecté
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
      
      console.log('👥🔍 Vérification permissions contacts...');
      
      // 1. PRIORITÉ: Vérifier l'état Android injecté
      const androidState = (window as any).androidPermissions?.contacts;
      console.log('👥 État Android injecté:', androidState);
      
      // 2. FALLBACK: Vérifier via Capacitor plugin
      let capacitorState = 'prompt';
      try {
        const result = await Contacts.checkPermissions();
        capacitorState = result.contacts || 'prompt';
        console.log('👥 État Capacitor plugin:', capacitorState);
      } catch (error) {
        console.log('👥⚠️ Plugin Capacitor non disponible:', error);
      }
      
      // 3. LOGIQUE DE DÉCISION: Android a toujours priorité
      let finalGranted = false;
      
      if (androidState === 'granted') {
        console.log('👥✅ Android dit GRANTED - on fait confiance à Android');
        finalGranted = true;
      } else if (androidState === 'denied') {
        console.log('👥❌ Android dit DENIED - permission refusée');
        finalGranted = false;
      } else {
        // Si pas d'injection Android, utiliser Capacitor
        console.log('👥 Pas d\'injection Android, utilisation Capacitor:', capacitorState);
        finalGranted = capacitorState === 'granted';
      }
      
      // Log de divergence pour debug
      if (androidState && capacitorState !== androidState) {
        console.warn('👥⚠️ DIVERGENCE DÉTECTÉE:', {
          android: androidState,
          capacitor: capacitorState,
          decision: finalGranted ? 'GRANTED' : 'DENIED'
        });
      }
      
      setHasPermission(finalGranted);
      return finalGranted;
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
      
      console.log('👥🔄 Demande permissions contacts...');
      
      // Vérifier d'abord si déjà accordé via Android
      const androidState = (window as any).androidPermissions?.contacts;
      if (androidState === 'granted') {
        console.log('👥✅ Déjà accordé selon Android, pas besoin de redemander');
        setHasPermission(true);
        return true;
      }
      
      // Demander via Capacitor
      console.log('👥 Demande via Capacitor plugin...');
      const result = await Contacts.requestPermissions();
      const capacitorGranted = result.contacts === 'granted';
      
      console.log('👥 Résultat Capacitor:', capacitorGranted);
      
      // Vérification croisée immédiate avec Android
      setTimeout(() => {
        const newAndroidState = (window as any).androidPermissions?.contacts;
        console.log('👥 État Android après demande:', newAndroidState);
        
        if (newAndroidState === 'granted') {
          console.log('👥✅ Android confirme GRANTED');
          setHasPermission(true);
        } else if (newAndroidState === 'denied') {
          console.log('👥❌ Android confirme DENIED');
          setHasPermission(false);
        } else {
          // Si Android ne répond pas, utiliser Capacitor
          setHasPermission(capacitorGranted);
        }
      }, 300);
      
      return capacitorGranted;
    } catch (error) {
      console.error('👥❌ Erreur request permissions contacts:', error);
      setHasPermission(false);
      return false;
    }
  };

  const loadContacts = async (): Promise<Contact[]> => {
    console.log('👥 DÉBUT CHARGEMENT CONTACTS...');
    
    try {
      // Vérifier mode natif
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        throw new Error('Contacts disponibles uniquement en mode natif');
      }

      setLoading(true);
      
      // Demander permissions
      const hasPerms = await requestPermissions();
      
      if (!hasPerms) {
        throw new Error('Permission contacts refusée');
      }

      // Charger contacts
      console.log('👥 Chargement via Capacitor Contacts...');
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        }
      });

      console.log('👥 Contacts bruts reçus:', result.contacts?.length || 0);

      // Formatter contacts
      const formattedContacts: Contact[] = (result.contacts || [])
        .filter(contact => {
          // Filtrer contacts avec au moins un nom ou téléphone
          const hasName = contact.name?.display || contact.name?.given || contact.name?.family;
          const hasPhone = contact.phones && contact.phones.length > 0;
          return hasName || hasPhone;
        })
        .map(contact => ({
          contactId: contact.contactId,
          displayName: contact.name?.display || 
                      `${contact.name?.given || ''} ${contact.name?.family || ''}`.trim() || 
                      'Contact sans nom',
          phoneNumbers: contact.phones?.map(phone => ({
            label: phone.label || 'Téléphone',
            number: phone.number
          })) || [],
          emails: contact.emails?.map(email => ({
            label: email.label || 'Email',
            address: email.address
          })) || []
        }))
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

      console.log('👥✅ Contacts formatés:', formattedContacts.length);
      
      setContacts(formattedContacts);
      return formattedContacts;

    } catch (error) {
      console.error('👥❌ ERREUR CHARGEMENT CONTACTS:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    contacts,
    loading,
    hasPermission,
    isNative,
    checkPermissions,
    requestPermissions,
    loadContacts
  };
};