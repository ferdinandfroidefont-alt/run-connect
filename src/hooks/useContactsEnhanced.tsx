import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { nativeManager } from '@/lib/nativeInit';
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

interface ContactsState {
  contacts: Contact[];
  loading: boolean;
  hasPermission: boolean;
  isNative: boolean;
  deviceInfo: any;
  error?: string;
}

export const useContactsEnhanced = () => {
  const [state, setState] = useState<ContactsState>({
    contacts: [],
    loading: false,
    hasPermission: false,
    isNative: false,
    deviceInfo: null
  });

  useEffect(() => {
    initializeContactsSystem();
  }, []);

  const initializeContactsSystem = async () => {
    console.log('👥🔧 Enhanced: Initialisation système contacts...');
    
    try {
      // Detect native status
      const native = await nativeManager.ensureNativeStatus();
      
      // Get device info if available
      let deviceInfo = null;
      if (native && typeof window !== 'undefined' && (window as any).PermissionsPlugin) {
        try {
          deviceInfo = await (window as any).PermissionsPlugin.getDeviceInfo();
          console.log('👥🔧 Enhanced: Device info:', deviceInfo);
        } catch (error) {
          console.log('👥🔧 Enhanced: Device info non disponible:', error);
        }
      }

      // Initialize MIUI fix if needed
      if (deviceInfo?.isMIUI || deviceInfo?.manufacturer?.toLowerCase().includes('xiaomi')) {
        console.log('👥🔧 Enhanced: Initialisation MIUI fix...');
        await MIUIPermissionsFix.initialize();
      }

      setState(prev => ({
        ...prev,
        isNative: native,
        deviceInfo
      }));

      // Check initial permissions
      if (native) {
        const hasPerms = await checkPermissions();
        setState(prev => ({ ...prev, hasPermission: hasPerms }));
      }

    } catch (error) {
      console.error('👥🔧 Enhanced: Erreur initialisation:', error);
      setState(prev => ({ ...prev, error: `Erreur initialisation: ${error}` }));
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥🔧 Enhanced: Contacts non disponibles en mode web');
        setState(prev => ({ ...prev, hasPermission: false }));
        return false;
      }
      
      console.log('👥🔧 Enhanced: Vérification permissions contacts...');
      const result = await Contacts.checkPermissions();
      console.log('👥🔧 Enhanced: Permissions contacts:', result);
      
      const granted = result.contacts === 'granted';
      setState(prev => ({ ...prev, hasPermission: granted }));
      return granted;
    } catch (error) {
      console.log('👥🔧 Enhanced: Erreur check permissions contacts:', error);
      setState(prev => ({ ...prev, hasPermission: false, error: `Erreur permissions: ${error}` }));
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥🔧 Enhanced: Contacts nécessitent mode natif');
        setState(prev => ({ ...prev, error: 'Mode natif requis' }));
        return false;
      }

      setState(prev => ({ ...prev, loading: true, error: undefined }));

      // Use enhanced permission strategy based on device
      const deviceInfo = state.deviceInfo;
      let granted = false;

      if (deviceInfo?.isMIUI || deviceInfo?.manufacturer?.toLowerCase().includes('xiaomi')) {
        console.log('👥🔧 Enhanced: Utilisation stratégie MIUI pour contacts...');
        granted = await MIUIPermissionsFix.requestContactsWithMIUIFallback();
      } else if (typeof window !== 'undefined' && (window as any).PermissionsPlugin?.forceRequestContactsPermissions) {
        console.log('👥🔧 Enhanced: Utilisation plugin natif pour contacts...');
        try {
          granted = await (window as any).PermissionsPlugin.forceRequestContactsPermissions();
        } catch (pluginError) {
          console.log('👥🔧 Enhanced: Plugin natif échoué, fallback Capacitor:', pluginError);
          const result = await Contacts.requestPermissions();
          granted = result.contacts === 'granted';
        }
      } else {
        console.log('👥🔧 Enhanced: Utilisation Capacitor standard pour contacts...');
        const result = await Contacts.requestPermissions();
        granted = result.contacts === 'granted';
      }
      
      setState(prev => ({ 
        ...prev, 
        hasPermission: granted,
        loading: false,
        error: granted ? undefined : 'Permissions refusées'
      }));
      
      return granted;
    } catch (error) {
      console.log('👥🔧 Enhanced: Erreur request permissions contacts:', error);
      setState(prev => ({ 
        ...prev, 
        hasPermission: false, 
        loading: false,
        error: `Erreur demande permissions: ${error}`
      }));
      return false;
    }
  };

  const loadContacts = async (): Promise<Contact[]> => {
    console.log('👥🔧 Enhanced: DÉBUT CHARGEMENT CONTACTS...');
    
    try {
      // Vérifier mode natif
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        throw new Error('Contacts disponibles uniquement en mode natif');
      }

      setState(prev => ({ ...prev, loading: true, error: undefined }));
      
      // Demander permissions avec stratégie améliorée
      const hasPerms = await requestPermissions();
      
      if (!hasPerms) {
        throw new Error('Permission contacts refusée');
      }

      // Charger contacts avec retry sur erreur
      console.log('👥🔧 Enhanced: Chargement via Capacitor Contacts...');
      
      let result;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          result = await Contacts.getContacts({
            projection: {
              name: true,
              phones: true,
              emails: true,
            }
          });
          break;
        } catch (loadError) {
          attempts++;
          console.log(`👥🔧 Enhanced: Tentative ${attempts}/${maxAttempts} échouée:`, loadError);
          
          if (attempts >= maxAttempts) {
            throw loadError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('👥🔧 Enhanced: Contacts bruts reçus:', result?.contacts?.length || 0);

      // Formatter contacts
      const formattedContacts: Contact[] = (result?.contacts || [])
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

      console.log('👥🔧 Enhanced: Contacts formatés:', formattedContacts.length);
      
      setState(prev => ({ 
        ...prev, 
        contacts: formattedContacts,
        loading: false
      }));
      
      return formattedContacts;

    } catch (error) {
      console.error('👥🔧 Enhanced: ERREUR CHARGEMENT CONTACTS:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: `Erreur chargement: ${error}`
      }));
      throw error;
    }
  };

  const openDeviceSettings = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).PermissionsPlugin) {
        await (window as any).PermissionsPlugin.openAppSettings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('👥🔧 Enhanced: Erreur ouverture paramètres:', error);
      return false;
    }
  };

  const forceRefresh = async () => {
    console.log('👥🔧 Enhanced: Force refresh...');
    setState(prev => ({ 
      ...prev, 
      contacts: [],
      hasPermission: false,
      error: undefined
    }));
    
    await initializeContactsSystem();
  };

  return {
    ...state,
    checkPermissions,
    requestPermissions,
    loadContacts,
    openDeviceSettings,
    forceRefresh
  };
};