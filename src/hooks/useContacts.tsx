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
      // Détection renforcée pour l'environnement Lovable
      const isCapacitorNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const isLikelyMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasCapacitorAPI = !!(window as any).Capacitor;
      
      // Détection complète de l'environnement Lovable
      const hostname = window.location.hostname;
      const isLovableDev = hostname.includes('sandbox.lovable.dev') || 
                          hostname.includes('lovableproject.com') || 
                          hostname.includes('lovable.app') ||
                          hostname.includes('localhost') ||
                          hostname.includes('127.0.0.1');
      
      console.log('🔍 Full hostname:', hostname);
      console.log('🔍 Capacitor native check:', isCapacitorNative);
      console.log('🔍 Platform:', platform);
      console.log('🔍 User agent suggests mobile:', isLikelyMobile);
      console.log('🔍 Has Capacitor API:', hasCapacitorAPI);
      console.log('🔍 Is Lovable dev environment:', isLovableDev);
      
      // Activation simplifiée : si Capacitor est disponible, on active les contacts
      const native = hasCapacitorAPI; // Simple : si Capacitor est là, on peut utiliser les contacts
      
      console.log('🔍 Final native detection:', native);
      
      setIsNative(native);
      
      // Vérifier les permissions au démarrage si on est considéré comme natif
      if (native) {
        try {
          const result = await Contacts.checkPermissions();
          console.log('🔍 Initial contacts permission check:', result);
          setHasPermission(result.contacts === 'granted');
        } catch (error) {
          console.error('❌ Error checking initial contacts permissions:', error);
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
      console.error('❌ Error checking contacts permissions:', error);
      return false;
    }
  };

  const requestPermissions = async () => {
    console.log('🔍 Requesting contacts permissions...');
    console.log('🔍 isNative:', isNative);
    console.log('🔍 Platform:', Capacitor.getPlatform());
    console.log('🔍 hasAndroidBridge:', !!(window as any).AndroidContacts);
    
    // Priority 1: Android native bridge
    if ((window as any).AndroidContacts) {
      console.log('🔍 Using Android contacts bridge...');
      
      try {
        const hasPermission = (window as any).AndroidContacts.hasContactsPermission();
        console.log('🔍 Android contacts permission:', hasPermission);
        
        setHasPermission(hasPermission);
        return hasPermission;
      } catch (error) {
        console.error('❌ Android contacts bridge error:', error);
      }
    }
    
    // Priority 2: Capacitor if available
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
    setLoading(true);
    
    try {
      // Priority 1: Android native bridge
      if ((window as any).AndroidContacts) {
        console.log('🔍 Loading contacts via Android bridge...');
        
        const hasPermissionNow = (window as any).AndroidContacts.hasContactsPermission();
        
        if (!hasPermissionNow) {
          console.log('❌ No contacts permission via Android bridge');
          setLoading(false);
          return [];
        }
        
        const contactsJson = (window as any).AndroidContacts.getContacts();
        const androidContacts = JSON.parse(contactsJson);
        
        const processedContacts = androidContacts.map((contact: any) => ({
          contactId: contact.contactId,
          displayName: contact.displayName,
          phoneNumbers: contact.phoneNumber ? [{
            label: 'mobile',
            number: contact.phoneNumber
          }] : [],
          emails: []
        }));
        
        console.log('🔍 Loaded', processedContacts.length, 'contacts via Android bridge');
        setContacts(processedContacts);
        setLoading(false);
        return processedContacts;
      }
      
      // Priority 2: Capacitor fallback
      if (!isNative) {
        setLoading(false);
        return [];
      }
      
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
      console.error('❌ Error loading contacts:', error);
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