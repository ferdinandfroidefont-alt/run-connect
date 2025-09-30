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
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👥🔄 App revenue au premier plan - vérification immédiate...');
        
        // Vérification immédiate sans délai
        await checkContactsPermissionsNow();
        
        // Puis vérifications de confirmation avec polling court
        setTimeout(async () => {
          console.log('👥🔄 Vérification de confirmation 500ms...');
          await checkContactsPermissionsNow();
        }, 500);
        
        setTimeout(async () => {
          console.log('👥🔄 Vérification de confirmation 1s...');
          await checkContactsPermissionsNow();
        }, 1000);
        
        setTimeout(async () => {
          console.log('👥🔄 Vérification de confirmation 2s...');
          await checkContactsPermissionsNow();
        }, 2000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Vérifications automatiques programmées toutes les 5s quand pas de permissions
  useEffect(() => {
    if (!state.hasPermission && state.isNative) {
      const interval = setInterval(async () => {
        if (!document.hidden) {
          console.log('👥🔄 Vérification automatique programmée...');
          await checkContactsPermissionsNow();
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [state.hasPermission, state.isNative]);

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

  // Vérification directe sans cache - FORCE la vérification système réelle
  const checkContactsPermissionsNow = async (): Promise<boolean> => {
    try {
      const native = await nativeManager.ensureNativeStatus();
      
      if (!native) {
        console.log('👥 Contacts non disponibles en mode web');
        return false;
      }
      
      console.log('👥🔍 VÉRIFICATION DIRECTE permissions contacts...');
      
      // Double vérification : Capacitor + Plugin natif
      let granted = false;
      
      // 1. Vérification Capacitor
      try {
        const result = await Contacts.checkPermissions();
        console.log('👥🔍 Capacitor result:', result);
        granted = result.contacts === 'granted';
      } catch (error) {
        console.log('👥❌ Erreur Capacitor checkPermissions:', error);
      }
      
      // 2. Vérification plugin Android natif (plus fiable)
      if (!granted && typeof window !== 'undefined' && (window as any).PermissionsPlugin) {
        try {
          const nativeResult = await (window as any).PermissionsPlugin.checkContactsPermissions();
          console.log('👥🔍 Plugin natif result:', nativeResult);
          if (nativeResult && nativeResult.granted) {
            granted = true;
            console.log('👥✅ Plugin natif détecte permissions accordées !');
          }
        } catch (error) {
          console.log('👥❌ Erreur plugin natif checkPermissions:', error);
        }
      }
      
      // Mettre à jour l'état si changement détecté
      if (granted !== state.hasPermission) {
        console.log(`👥🔄 Changement détecté: ${state.hasPermission} -> ${granted}`);
        setState(prev => ({ 
          ...prev, 
          hasPermission: granted,
          lastCheckTime: Date.now()
        }));
        
        if (granted && !state.hasPermission) {
          toast({
            title: "Permissions contacts détectées !",
            description: "L'accès aux contacts est maintenant disponible",
            variant: "default"
          });
        }
      }
      
      return granted;
    } catch (error) {
      console.log('👥❌ Erreur checkContactsPermissionsNow:', error);
      return false;
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    if (state.isChecking) {
      console.log('👥⏳ Vérification déjà en cours...');
      return state.hasPermission;
    }

    try {
      setState(prev => ({ ...prev, isChecking: true }));
      
      const granted = await checkContactsPermissionsNow();
      
      setState(prev => ({ 
        ...prev, 
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
    return await checkContactsPermissionsNow();
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
    // Délais progressifs ultra-adaptés : plus de vérifications, plus rapprochées
    const delays = isMIUI 
      ? [1000, 2000, 3000, 5000, 8000, 12000, 15000] // Redmi Note 9 et MIUI
      : [500, 1000, 2000, 3000, 5000, 8000]; // Autres appareils
    
    console.log('👥⏳ Début vérifications ultra-robustes (MIUI:', isMIUI, ')...');
    
    for (let i = 0; i < delays.length; i++) {
      const delay = delays[i];
      console.log(`👥⏳ Attente ${delay}ms avant tentative ${i + 1}/${delays.length}...`);
      
      // Toast informatif avec plus de détails
      toast({
        title: `Vérification ${i + 1}/${delays.length}...`,
        description: isMIUI 
          ? `MIUI peut prendre jusqu'à 15s (${delay}ms)` 
          : `Détection en cours (${delay}ms)`,
        variant: "default"
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        console.log(`👥🔍 Vérification ultra-robuste ${i + 1}/${delays.length}...`);
        const granted = await checkContactsPermissionsNow();
        
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
    
    console.log('👥😞 Aucune permission détectée après toutes les tentatives ultra-robustes');
    
    // Fallback final : ouvrir les paramètres automatiquement
    toast({
      title: "Ouverture automatique des paramètres",
      description: "Veuillez activer manuellement les permissions contacts",
      variant: "destructive"
    });
    
    setTimeout(() => {
      openDeviceSettings();
    }, 2000);
    
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
        
        // Notification persistante et vérification continue
        toast({
          title: "Paramètres ouverts",
          description: "Retournez à l'app après activation des permissions",
          variant: "default"
        });
        
        // Vérification continue pendant 30s
        let checkCount = 0;
        const maxChecks = 15; // 30 secondes / 2s
        
        const continuousCheck = setInterval(async () => {
          checkCount++;
          console.log(`👥🔄 Vérification continue ${checkCount}/${maxChecks}...`);
          
          const granted = await checkContactsPermissionsNow();
          
          if (granted || checkCount >= maxChecks) {
            clearInterval(continuousCheck);
            
            if (granted) {
              toast({
                title: "Permissions détectées !",
                description: "Merci d'avoir activé les permissions contacts",
                variant: "default"
              });
            }
          }
        }, 2000);
        
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
    checkContactsPermissionsNow,
    recheckPermissions,
    requestPermissions,
    loadContacts,
    openDeviceSettings,
    resetState
  };
};