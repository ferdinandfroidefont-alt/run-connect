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
    setIsNative(Capacitor.isNativePlatform());
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
    if (!isNative) return false;
    
    try {
      const result = await Contacts.requestPermissions();
      const granted = result.contacts === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting contacts permissions:', error);
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