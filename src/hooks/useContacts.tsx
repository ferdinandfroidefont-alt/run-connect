import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { isReallyNative } from '@/lib/nativeDetection';

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
    setIsNative(isReallyNative());
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      console.log('👥 Vérification permissions contacts...');
      const result = await Contacts.checkPermissions();
      console.log('👥 Permissions contacts:', result);
      
      setHasPermission(result.contacts === 'granted');
      return result.contacts === 'granted';
    } catch (error) {
      console.log('👥 ❌ Erreur check permissions contacts:', error);
      return false;
    }
  };

  const requestPermissions = async () => {
    try {
      console.log('👥 Demande permissions contacts...');
      const result = await Contacts.requestPermissions();
      console.log('👥 Résultat demande permissions:', result);
      
      const granted = result.contacts === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.log('👥 ❌ Erreur request permissions contacts:', error);
      return false;
    }
  };

  const loadContacts = async () => {
    const isNative = isReallyNative();
    
    if (!isNative) {
      console.log('👥 ❌ Contacts disponibles uniquement sur mobile');
      throw new Error('Contacts disponibles uniquement sur mobile');
    }

    setLoading(true);
    console.log('👥 DÉBUT CHARGEMENT CONTACTS');

    try {
      // Vérifier et demander les permissions
      const hasPerms = await requestPermissions();
      
      if (!hasPerms) {
        throw new Error('Permission contacts refusée');
      }

      // Charger les contacts
      console.log('👥 Chargement contacts via Capacitor...');
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        }
      });

      console.log('👥 ✅ Contacts chargés:', result.contacts?.length || 0);

      const formattedContacts: Contact[] = (result.contacts || []).map(contact => ({
        contactId: contact.contactId,
        displayName: contact.name?.display || contact.name?.given || contact.name?.family || 'Sans nom',
        phoneNumbers: contact.phones?.map(phone => ({
          label: phone.label,
          number: phone.number
        })),
        emails: contact.emails?.map(email => ({
          label: email.label,
          address: email.address
        }))
      }));

      setContacts(formattedContacts);
      return formattedContacts;

    } catch (error) {
      console.error('👥 ❌ ERREUR CHARGEMENT CONTACTS:', error);
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