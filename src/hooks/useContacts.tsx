import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { nativeManager } from '@/lib/nativeInit';

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
      
      console.log('👥 Demande permissions contacts...');
      const result = await Contacts.requestPermissions();
      console.log('👥 Résultat demande permissions:', result);
      
      const granted = result.contacts === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.log('👥❌ Erreur request permissions contacts:', error);
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