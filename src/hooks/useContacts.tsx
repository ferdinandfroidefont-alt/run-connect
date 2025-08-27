import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

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
    const checkNativeStatus = async () => {
      // Détection améliorée pour le développement Lovable
      const isCapacitorNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const isLikelyMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasCapacitorAPI = !!(window as any).Capacitor;
      const isLovableDev = window.location.hostname.includes('lovableproject.com') || 
                          window.location.hostname.includes('lovable.app') ||
                          window.location.hostname.includes('localhost') ||
                          window.location.hostname.includes('127.0.0.1');
      
      console.log('🔍 Window hostname:', window.location.hostname);
      console.log('🔍 Window href:', window.location.href);
      
      // Dans l'environnement Lovable, on simule un environnement natif si Capacitor est disponible
      const native = isCapacitorNative || 
                    (hasCapacitorAPI && isLikelyMobile && (platform === 'ios' || platform === 'android')) ||
                    (hasCapacitorAPI && isLovableDev); // Permettre dans l'environnement Lovable pour les tests
      
      console.log('🔍 Capacitor native check:', isCapacitorNative);
      console.log('🔍 Platform:', platform);
      console.log('🔍 User agent suggests mobile:', isLikelyMobile);
      console.log('🔍 Has Capacitor API:', hasCapacitorAPI);
      console.log('🔍 Is Lovable dev environment:', isLovableDev);
      console.log('🔍 Final native detection:', native);
      
      setIsNative(native);
      
      // Vérifier les permissions au démarrage si on est sur mobile
      if (native) {
        try {
          const result = await Contacts.checkPermissions();
          console.log('🔍 Initial contacts permission check:', result);
          setHasPermission(result.contacts === 'granted');
        } catch (error) {
          console.error('Error checking initial contacts permissions:', error);
        }
      }
    };
    
    checkNativeStatus();
  }, []);

  const checkPermissions = async () => {
    if (!isNative) return false;
    
    try {
      const result = await Contacts.checkPermissions();
      const granted = result.contacts === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error checking contacts permissions:', error);
      return false;
    }
  };

  const requestPermissions = async () => {
    console.log('🔍 Requesting contacts permissions...');
    console.log('🔍 isNative:', isNative);
    console.log('🔍 Platform:', Capacitor.getPlatform());
    
    if (!isNative) {
      console.log('❌ Not on native platform');
      return false;
    }
    
    try {
      console.log('🔍 Calling Contacts.requestPermissions()...');
      const result = await Contacts.requestPermissions();
      console.log('🔍 Permission result:', result);
      
      const granted = result.contacts === 'granted';
      setHasPermission(granted);
      console.log('🔍 Permission granted:', granted);
      return granted;
    } catch (error) {
      console.error('❌ Error requesting contacts permissions:', error);
      return false;
    }
  };

  const loadContacts = async () => {
    if (!isNative) return [];
    
    setLoading(true);
    try {
      const hasPermissionNow = hasPermission || await checkPermissions();
      
      if (!hasPermissionNow) {
        const granted = await requestPermissions();
        if (!granted) {
          setLoading(false);
          return [];
        }
      }

      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        }
      });

      const processedContacts = result.contacts.map(contact => ({
        contactId: contact.contactId,
        displayName: contact.name?.display,
        phoneNumbers: contact.phones?.map(phone => ({
          label: phone.label,
          number: phone.number
        })),
        emails: contact.emails?.map(email => ({
          label: email.label,
          address: email.address
        }))
      }));

      setContacts(processedContacts);
      setLoading(false);
      return processedContacts;
    } catch (error) {
      console.error('Error loading contacts:', error);
      setLoading(false);
      return [];
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