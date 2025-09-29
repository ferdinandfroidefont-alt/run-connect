import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { nativeManager } from '@/lib/nativeInit';
import { forceContactsPermissions } from '@/lib/forceNativePermissions';
import { MIUIPermissionsFix } from '@/lib/miuiPermissionsFix';

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
  }, []);

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥 Contacts non disponibles en mode web');
        setHasPermission(false);
        return false;
      }
      
      console.log('👥 Vérification permissions contacts...');
      const result = await Contacts.checkPermissions();
      console.log('👥 Permissions contacts:', result);
      
      const granted = result.contacts === 'granted';
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
      
      console.log('👥🔄 DEMANDE PERMISSIONS CONTACTS AVEC DÉTECTION POST-AUTORISATION...');
      
      let granted = false;

      // Détection du type d'appareil via UserAgent (plus fiable)
      const userAgent = navigator.userAgent.toLowerCase();
      const isMIUI = userAgent.includes('miui') || userAgent.includes('xiaomi') || userAgent.includes('redmi');
      
      console.log('👥 Type d\'appareil détecté - MIUI:', isMIUI);

      if (isMIUI) {
        console.log('👥 Stratégie MIUI pour contacts avec retry amélioré...');
        try {
          // Essayer d'abord la méthode standard puis fallback MIUI
          const result = await Contacts.requestPermissions();
          granted = result.contacts === 'granted';
          
          if (!granted) {
            console.log('👥 Standard failed, trying MIUI fallback...');
            granted = await MIUIPermissionsFix.requestContactsWithMIUIFallback();
          }
        } catch (miuiError) {
          console.log('👥 MIUI strategy failed:', miuiError);
          // Dernier fallback : permissions natives forcées
          try {
            granted = await forceContactsPermissions();
          } catch (forceError) {
            console.log('👥 Force permissions failed:', forceError);
            granted = false;
          }
        }
      } else {
        console.log('👥 Stratégie standard pour contacts...');
        try {
          // Standard Capacitor first
          const result = await Contacts.requestPermissions();
          granted = result.contacts === 'granted';
          
          if (!granted) {
            console.log('👥 Standard failed, trying enhanced permissions...');
            granted = await forceContactsPermissions();
          }
        } catch (standardError) {
          console.log('👥 Standard strategy failed:', standardError);
          try {
            granted = await forceContactsPermissions();
          } catch (forceError) {
            console.log('👥 Force permissions failed:', forceError);
            granted = false;
          }
        }
      }
      
      console.log('👥🔄 Résultat initial permissions contacts:', granted);
      
      // ✨ AMÉLIORATION : Vérifications post-autorisation avec retry progressif
      if (!granted) {
        console.log('👥🔄 Permission refusée, tentative de détection retardée...');
        granted = await performDelayedPermissionCheck(isMIUI);
      }
      
      setHasPermission(granted);
      
      // Vérification finale avec délai adapté au type d'appareil
      const finalDelayMs = isMIUI ? 3000 : 1500;
      setTimeout(async () => {
        console.log('👥🔄 Vérification finale permissions après', finalDelayMs, 'ms...');
        const finalCheck = await checkPermissions();
        console.log('👥✅ Vérification finale permissions:', finalCheck);
        
        if (finalCheck && !granted) {
          console.log('👥🎉 Permissions détectées lors de la vérification finale !');
          setHasPermission(true);
        }
      }, finalDelayMs);
      
      return granted;
    } catch (error) {
      console.error('👥❌ Erreur globale request permissions contacts:', error);
      setHasPermission(false);
      return false;
    }
  };

  // ✨ Nouvelle fonction : Vérification retardée des permissions
  const performDelayedPermissionCheck = async (isMIUI: boolean): Promise<boolean> => {
    const delays = isMIUI ? [2000, 5000, 8000] : [1000, 3000, 5000];
    const maxAttempts = delays.length;
    
    console.log('👥⏳ Début vérifications retardées (MIUI:', isMIUI, ')...');
    
    for (let i = 0; i < maxAttempts; i++) {
      const delay = delays[i];
      console.log(`👥⏳ Attente ${delay}ms avant tentative ${i + 1}/${maxAttempts}...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        console.log(`👥🔍 Vérification retardée ${i + 1}/${maxAttempts}...`);
        const result = await Contacts.checkPermissions();
        const granted = result.contacts === 'granted';
        
        console.log(`👥🔍 Résultat tentative ${i + 1}:`, granted);
        
        if (granted) {
          console.log('👥🎉 Permissions détectées lors de la vérification retardée !');
          return true;
        }
      } catch (error) {
        console.log(`👥❌ Erreur vérification retardée ${i + 1}:`, error);
      }
    }
    
    console.log('👥😞 Aucune permission détectée après toutes les tentatives retardées');
    return false;
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