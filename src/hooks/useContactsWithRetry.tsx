import { useState, useEffect } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { nativeManager } from '@/lib/nativeInit';
import { forceContactsPermissions } from '@/lib/forceNativePermissions';
import { MIUIPermissionsFix } from '@/lib/miuiPermissionsFix';
import { useToast } from './use-toast';

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
  isChecking: boolean;
  lastCheckTime: number;
  retryCount: number;
}

export const useContactsWithRetry = () => {
  const { toast } = useToast();
  const [state, setState] = useState<ContactsState>({
    contacts: [],
    loading: false,
    hasPermission: false,
    isNative: false,
    isChecking: false,
    lastCheckTime: 0,
    retryCount: 0
  });

  useEffect(() => {
    initializeContacts();
    
    // Écouter le retour au premier plan de l'application
    const handleVisibilityChange = () => {
      if (!document.hidden && state.isNative) {
        console.log('👥🔄 App revenue au premier plan - vérification permissions...');
        recheckPermissions();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const initializeContacts = async () => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      setState(prev => ({ ...prev, isNative: native }));
      
      if (native) {
        await checkPermissions();
      }
    } catch (error) {
      console.error('👥❌ Erreur initialisation contacts:', error);
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    if (state.isChecking) {
      console.log('👥⏳ Vérification déjà en cours...');
      return state.hasPermission;
    }

    try {
      setState(prev => ({ ...prev, isChecking: true }));
      
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥 Contacts non disponibles en mode web');
        setState(prev => ({ 
          ...prev, 
          hasPermission: false, 
          isChecking: false,
          lastCheckTime: Date.now()
        }));
        return false;
      }
      
      console.log('👥🔍 Vérification permissions contacts...');
      const result = await Contacts.checkPermissions();
      console.log('👥🔍 Permissions contacts:', result);
      
      const granted = result.contacts === 'granted';
      setState(prev => ({ 
        ...prev, 
        hasPermission: granted, 
        isChecking: false,
        lastCheckTime: Date.now()
      }));
      
      return granted;
    } catch (error) {
      console.log('👥❌ Erreur check permissions contacts:', error);
      setState(prev => ({ 
        ...prev, 
        hasPermission: false, 
        isChecking: false,
        lastCheckTime: Date.now()
      }));
      return false;
    }
  };

  const recheckPermissions = async (): Promise<boolean> => {
    console.log('👥🔄 Re-vérification permissions contacts...');
    
    // Éviter les vérifications trop fréquentes
    const timeSinceLastCheck = Date.now() - state.lastCheckTime;
    if (timeSinceLastCheck < 2000) {
      console.log('👥⏳ Vérification trop récente, ignorée');
      return state.hasPermission;
    }
    
    const granted = await checkPermissions();
    
    if (granted && !state.hasPermission) {
      toast({
        title: "Permissions contacts détectées !",
        description: "L'accès aux contacts est maintenant disponible",
        variant: "default"
      });
    }
    
    return granted;
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥 Contacts nécessitent mode natif');
        toast({
          title: "Mode natif requis",
          description: "Les contacts ne sont disponibles qu'en mode natif",
          variant: "destructive"
        });
        return false;
      }
      
      setState(prev => ({ ...prev, loading: true, retryCount: prev.retryCount + 1 }));
      
      // Afficher un toast de vérification en cours
      toast({
        title: "Vérification en cours...",
        description: "Demande d'accès aux contacts",
        variant: "default"
      });
      
      console.log('👥🔄 DEMANDE PERMISSIONS CONTACTS AVEC DÉTECTION AMÉLIORÉE...');
      
      let granted = false;
      const userAgent = navigator.userAgent.toLowerCase();
      const isMIUI = userAgent.includes('miui') || userAgent.includes('xiaomi') || userAgent.includes('redmi');
      
      console.log('👥 Type d\'appareil détecté - MIUI:', isMIUI);

      // Stratégie de demande selon le type d'appareil
      if (isMIUI) {
        granted = await requestWithMIUIStrategy();
      } else {
        granted = await requestWithStandardStrategy();
      }
      
      console.log('👥🔄 Résultat initial permissions contacts:', granted);
      
      // Système de retry progressif amélioré
      if (!granted) {
        console.log('👥🔄 Permission non accordée, tentatives de détection retardée...');
        granted = await performEnhancedDelayedCheck(isMIUI);
      }
      
      setState(prev => ({ 
        ...prev, 
        hasPermission: granted, 
        loading: false,
        lastCheckTime: Date.now()
      }));
      
      // Toast de résultat
      if (granted) {
        toast({
          title: "Permissions accordées !",
          description: "L'accès aux contacts est maintenant disponible",
          variant: "default"
        });
      } else {
        toast({
          title: "Permissions non accordées",
          description: isMIUI 
            ? "Veuillez activer manuellement dans Paramètres > Apps > RunConnect > Autorisations > Contacts"
            : "Veuillez accorder l'accès aux contacts dans les paramètres",
          variant: "destructive"
        });
      }
      
      return granted;
    } catch (error) {
      console.error('👥❌ Erreur globale request permissions contacts:', error);
      setState(prev => ({ ...prev, hasPermission: false, loading: false }));
      
      toast({
        title: "Erreur permissions",
        description: "Impossible de demander l'accès aux contacts",
        variant: "destructive"
      });
      
      return false;
    }
  };

  const requestWithMIUIStrategy = async (): Promise<boolean> => {
    console.log('👥 Stratégie MIUI pour contacts avec retry amélioré...');
    
    try {
      // Essayer d'abord la méthode standard
      const result = await Contacts.requestPermissions();
      let granted = result.contacts === 'granted';
      
      if (!granted) {
        console.log('👥 Standard failed, trying MIUI fallback...');
        granted = await MIUIPermissionsFix.requestContactsWithMIUIFallback();
      }
      
      if (!granted) {
        console.log('👥 MIUI fallback failed, trying force permissions...');
        granted = await forceContactsPermissions();
      }
      
      return granted;
    } catch (error) {
      console.log('👥 MIUI strategy failed:', error);
      return false;
    }
  };

  const requestWithStandardStrategy = async (): Promise<boolean> => {
    console.log('👥 Stratégie standard pour contacts...');
    
    try {
      // Standard Capacitor first
      const result = await Contacts.requestPermissions();
      let granted = result.contacts === 'granted';
      
      if (!granted) {
        console.log('👥 Standard failed, trying enhanced permissions...');
        granted = await forceContactsPermissions();
      }
      
      return granted;
    } catch (error) {
      console.log('👥 Standard strategy failed:', error);
      return false;
    }
  };

  const performEnhancedDelayedCheck = async (isMIUI: boolean): Promise<boolean> => {
    // Délais progressifs adaptés au type d'appareil
    const delays = isMIUI ? [2000, 5000, 10000] : [1000, 3000, 6000];
    const maxAttempts = delays.length;
    
    console.log('👥⏳ Début vérifications retardées améliorées (MIUI:', isMIUI, ')...');
    
    for (let i = 0; i < maxAttempts; i++) {
      const delay = delays[i];
      console.log(`👥⏳ Attente ${delay}ms avant tentative ${i + 1}/${maxAttempts}...`);
      
      // Toast informatif pour les longs délais
      if (delay >= 5000) {
        toast({
          title: `Vérification en cours... (${i + 1}/${maxAttempts})`,
          description: "Les appareils MIUI peuvent prendre plus de temps",
          variant: "default"
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        console.log(`👥🔍 Vérification retardée améliorée ${i + 1}/${maxAttempts}...`);
        const result = await Contacts.checkPermissions();
        const granted = result.contacts === 'granted';
        
        console.log(`👥🔍 Résultat tentative ${i + 1}:`, granted);
        
        if (granted) {
          console.log('👥🎉 Permissions détectées lors de la vérification retardée !');
          toast({
            title: "Permissions détectées !",
            description: "L'accès aux contacts est maintenant disponible",
            variant: "default"
          });
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
    console.log('👥 DÉBUT CHARGEMENT CONTACTS AVEC RETRY...');
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Vérifier/demander permissions
      const hasPerms = await requestPermissions();
      
      if (!hasPerms) {
        throw new Error('Permission contacts refusée');
      }

      // Charger contacts avec retry
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
      
      setState(prev => ({ ...prev, contacts: formattedContacts, loading: false }));
      return formattedContacts;

    } catch (error) {
      console.error('👥❌ ERREUR CHARGEMENT CONTACTS:', error);
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const openDeviceSettings = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).PermissionsPlugin) {
        await (window as any).PermissionsPlugin.openAppSettings();
        
        // Programmer une vérification après retour des paramètres
        setTimeout(() => {
          console.log('👥🔄 Vérification automatique après retour des paramètres...');
          recheckPermissions();
        }, 3000);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('👥❌ Erreur ouverture paramètres:', error);
      return false;
    }
  };

  const resetState = () => {
    setState(prev => ({
      ...prev,
      contacts: [],
      hasPermission: false,
      retryCount: 0,
      lastCheckTime: 0
    }));
  };

  return {
    ...state,
    checkPermissions,
    recheckPermissions,
    requestPermissions,
    loadContacts,
    openDeviceSettings,
    resetState
  };
};