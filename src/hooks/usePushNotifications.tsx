import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';

interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    prompt: true
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // DÉTECTION NATIVE CORRECTE - pas de faux positifs
  const isNative = Capacitor.isNativePlatform();
  const isSupported = isNative || ('Notification' in window);

  // Vérifier le statut des permissions (PRIORITÉ ANDROID INJECTÉ)
  const checkPermissionStatus = useCallback(async () => {
    try {
      if (isNative) {
        // 🎯 PRIORITÉ 1: Vérifier l'état Android injecté (source de vérité)
        const androidState = window.androidPermissions?.notifications;
        
        if (androidState) {
          console.log('🤖 État Android injecté détecté:', androidState);
          const granted = androidState === 'granted';
          
          setPermissionStatus({
            granted,
            denied: !granted,
            prompt: false
          });
          setIsRegistered(granted);
          
          // 🔥 SI permission accordée mais pas encore de token, forcer l'enregistrement
          if (granted && !token) {
            console.log('🔥 [NOTIF CHECK] Permission granted, forcing PushNotifications.register()...');
            setTimeout(async () => {
              try {
                await PushNotifications.register();
                console.log('✅ [NOTIF CHECK] PushNotifications.register() appelé avec succès');
              } catch (error) {
                console.error('❌ [NOTIF CHECK] Erreur lors de PushNotifications.register():', error);
              }
            }, 500); // 500ms delay pour laisser les listeners se mettre en place
          }
          
          // Cross-vérification avec Capacitor pour logger les divergences
          try {
            const capacitorStatus = await PushNotifications.checkPermissions();
            if (capacitorStatus.receive !== (granted ? 'granted' : 'denied')) {
              console.warn('⚠️ DIVERGENCE notifications - Android:', androidState, 'vs Capacitor:', capacitorStatus.receive);
            }
          } catch (e) {
            console.log('⚠️ Capacitor check échoué, on garde état Android');
          }
          
          return;
        }
        
        // 🔄 FALLBACK: Utiliser Capacitor si pas d'injection Android
        console.log('🔄 Fallback Capacitor pour vérification notifications');
        const status = await PushNotifications.checkPermissions();
        const granted = status.receive === 'granted';
        const denied = status.receive === 'denied';
        
        setPermissionStatus({
          granted,
          denied,
          prompt: !granted && !denied
        });
        
        setIsRegistered(granted);
      } else if ('Notification' in window) {
        const permission = Notification.permission;
        const granted = permission === 'granted';
        const denied = permission === 'denied';
        
        setPermissionStatus({
          granted,
          denied,
          prompt: permission === 'default'
        });
        
        setIsRegistered(granted);
      }
    } catch (error) {
      console.error('❌ Erreur vérification permissions:', error);
    }
  }, [isNative]);

  // Plugin Android avec compatibilité toutes versions
  const requestAndroidNotifications = async (): Promise<boolean> => {
    try {
      console.log('🤖 Demande permissions Android via plugin...');
      
      // Détecter la version Android
      const androidVersion = navigator.userAgent.match(/Android (\d+)/)?.[1];
      const androidVersionInt = androidVersion ? parseInt(androidVersion) : 0;
      console.log('📱 Version Android détectée:', androidVersionInt);
      
      // Utiliser le plugin personnalisé si disponible
      const plugin = (window as any).CapacitorCustomPlugins?.PermissionsPlugin;
      if (plugin) {
        const result = await plugin.requestNotificationPermissions();
        console.log('📱 Résultat plugin Android:', result);
        
        if (result.granted) {
          // Test notification pour vérifier que ça marche vraiment
          try {
            await plugin.showLocalNotification({
              title: "RunConnect",
              body: "Notifications activées avec succès ! 🎉"
            });
            console.log('✅ Notification test réussie');
          } catch (notifError) {
            console.log('⚠️ Test notification échoué mais permissions accordées');
          }
          
          return true;
        } else {
          console.log('❌ Permissions Android refusées via plugin');
          return false;
        }
      } else {
        console.log('⚠️ Plugin Android non disponible - fallback Capacitor');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur plugin Android:', error);
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    console.log('🔔 Demande permissions notifications...');
    
    try {
      if (isNative) {
        console.log('📱 Mode natif détecté');
        
        // 🎯 Vérifier d'abord l'état Android injecté
        const androidState = window.androidPermissions?.notifications;
        if (androidState === 'granted') {
          console.log('✅ Notifications déjà accordées selon Android');
          await checkPermissionStatus();
          toast({
            title: "Notifications déjà activées",
            description: "Vos notifications sont déjà configurées"
          });
          return true;
        }
        
        // Détecter la version Android pour choisir la stratégie
        const androidVersion = navigator.userAgent.match(/Android (\d+)/)?.[1];
        const androidVersionInt = androidVersion ? parseInt(androidVersion) : 0;
        console.log('📱 Version Android:', androidVersionInt);
        
        let success = false;
        
        // STRATÉGIE 1: Plugin Android personnalisé (toutes versions)
        if (androidVersionInt > 0) {
          console.log('🤖 Tentative plugin Android personnalisé...');
          success = await requestAndroidNotifications();
          
          if (success) {
            console.log('✅ Plugin Android personnalisé réussi');
            
            // 🔄 Attendre la mise à jour de l'état Android
            await new Promise(resolve => setTimeout(resolve, 300));
            await checkPermissionStatus();
            
            // Cross-vérifier avec l'état Android injecté
            const finalAndroidState = window.androidPermissions?.notifications;
            if (finalAndroidState === 'granted') {
              console.log('✅ État Android confirmé: granted');
            } else {
              console.warn('⚠️ État Android non mis à jour, mais plugin dit succès');
            }
            
            toast({
              title: "Notifications activées !",
              description: `Compatibilité Android ${androidVersionInt} confirmée`
            });
            return true;
          }
        }
        
        // STRATÉGIE 2: Capacitor standard (fallback universel)
        console.log('🔄 Fallback Capacitor standard...');
        const permission = await PushNotifications.requestPermissions();
        console.log('📱 Résultat Capacitor:', permission);
        
        if (permission.receive === 'granted') {
          console.log('✅ Capacitor standard réussi');
          
          // 🎯 CRITIQUE: Configurer les listeners AVANT register()
          await setupPushListeners();
          
          // Enregistrement push pour recevoir le token
          try {
            await PushNotifications.register();
            console.log('✅ Enregistrement push demandé');
            
            // 🔄 FALLBACK: Si pas de token après 5s, vérifier et forcer si besoin
            setTimeout(async () => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('push_token')
                  .eq('user_id', user?.id)
                  .single();
                
                if (!profile?.push_token) {
                  console.warn('⚠️ Aucun token enregistré après 5s, forcer récupération');
                  await PushNotifications.register();
                } else {
                  console.log('✅ Token déjà enregistré:', profile.push_token.substring(0, 20) + '...');
                }
              } catch (e) {
                console.error('Erreur fallback token:', e);
              }
            }, 5000);
          } catch (regError) {
            console.log('⚠️ Enregistrement push échoué mais permissions OK');
          }
          
          // 🔄 Attendre la mise à jour de l'état Android
          await new Promise(resolve => setTimeout(resolve, 300));
          await checkPermissionStatus();
          
          toast({
            title: "Notifications activées !",
            description: "Méthode Capacitor standard utilisée"
          });
          return true;
        } else {
          console.log('❌ Capacitor standard refusé:', permission.receive);
          await checkPermissionStatus();
          
          // Message adapté selon la version Android
          let advice = "Activez les notifications dans Paramètres > Applications > RunConnect";
          if (androidVersionInt >= 13) {
            advice += " > Notifications";
          } else if (androidVersionInt >= 8) {
            advice += " > Notifications d'apps";
          }
          
          toast({
            title: "Permission refusée",
            description: advice,
            variant: "destructive"
          });
          return false;
        }
      } else if ('Notification' in window) {
        // STRATÉGIE WEB (navigateurs)
        console.log('🌐 Mode web détecté');
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          console.log('✅ Web notifications accordées');
          await checkPermissionStatus();
          
          // Test notification web
          try {
            new Notification('RunConnect', {
              body: 'Notifications web activées ! 🎉',
              icon: '/favicon.png'
            });
          } catch (webNotifError) {
            console.log('⚠️ Test notification web échoué');
          }
          
          toast({
            title: "Notifications activées !",
            description: "Mode navigateur web"
          });
          return true;
        } else {
          console.log('❌ Web notifications refusées');
          await checkPermissionStatus();
          toast({
            title: "Permission refusée",
            description: "Activez les notifications dans les paramètres du navigateur",
            variant: "destructive"
          });
          return false;
        }
      } else {
        console.log('❌ Notifications non supportées sur cette plateforme');
        toast({
          title: "Non supporté",
          description: "Les notifications ne sont pas disponibles sur cet appareil",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('🔔❌ ERREUR PERMISSIONS:', error);
      
      // En cas d'erreur totale, donner des conseils génériques
      const advice = isNative 
        ? "Allez dans Paramètres > Applications > RunConnect > Notifications et activez toutes les notifications"
        : "Vérifiez les paramètres de notification de votre navigateur";
        
      toast({
        title: "Erreur technique",
        description: advice,
        variant: "destructive"
      });
      return false;
    }
  };

  // Sauvegarder le token push
  const savePushToken = useCallback(async (pushToken: string) => {
    if (!user) return;

    try {
      console.log('💾 Sauvegarde token push...');
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: pushToken,
          notifications_enabled: true 
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ Erreur sauvegarde token:', error);
      } else {
        console.log('✅ Token sauvegardé');
        setToken(pushToken);
      }
    } catch (error) {
      console.error('❌ Exception sauvegarde token:', error);
    }
  }, [user]);

  // Gestion des clics sur notification
  const handleNotificationTap = useCallback((data: any) => {
    console.log('👆 Notification cliquée:', data);
    
    try {
      const actionData = data?.actionData || data?.data || {};
      
      switch (actionData.type) {
        case 'message':
          if (actionData.conversation_id) {
            navigate(`/messages?conversation=${actionData.conversation_id}`);
          } else {
            navigate('/messages');
          }
          break;
        case 'follow_request':
          navigate('/profile');
          break;
        case 'session_request':
          navigate('/');
          break;
        default:
          console.log('Type notification inconnu:', actionData.type);
      }
    } catch (error) {
      console.error('❌ Erreur gestion clic notification:', error);
    }
  }, [navigate]);

  // Test de notification
  const testNotification = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🧪 Test notification...');
      
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Test RunConnect',
          body: 'Vos notifications fonctionnent parfaitement ! 🎉',
          type: 'test',
          data: { test: true }
        }
      });

      if (error) {
        console.error('❌ Erreur test notification:', error);
        toast({
          title: "Erreur test",
          description: "Impossible d'envoyer la notification de test",
          variant: "destructive"
        });
      } else {
        console.log('✅ Test notification envoyé');
        toast({
          title: "Test envoyé",
          description: "Notification de test envoyée avec succès!"
        });
      }
    } catch (error) {
      console.error('❌ Exception test notification:', error);
    }
  }, [user, toast]);

  // Ref pour tracker si les listeners sont configurés
  const listenersConfigured = useCallback(() => {
    return (window as any).__pushListenersConfigured === true;
  }, []);

  // Configuration des listeners (DOIT être appelé AVANT register())
  const setupPushListeners = useCallback(async () => {
    if (!isNative || (window as any).__pushListenersConfigured) {
      return;
    }

    console.log('🎧 Configuration listeners push natifs...');
    
    try {
      // Succès d'enregistrement
      await PushNotifications.addListener('registration', (token) => {
        console.log('✅ Token FCM reçu:', token.value);
        setToken(token.value);
        setIsRegistered(true);
        savePushToken(token.value);
        checkPermissionStatus();
      });

      // Erreur d'enregistrement
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Erreur enregistrement push:', error);
        setIsRegistered(false);
        checkPermissionStatus();
      });

      // Notification reçue
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📱 Notification reçue:', notification);
        
        toast({
          title: notification.title || "Nouvelle notification",
          description: notification.body || "",
        });
      });

      // Notification cliquée
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('👆 Notification action:', notification);
        handleNotificationTap(notification.notification);
      });

      (window as any).__pushListenersConfigured = true;
      console.log('✅ Listeners push configurés');
    } catch (error) {
      console.error('❌ Erreur configuration listeners:', error);
    }
  }, [isNative, savePushToken, handleNotificationTap, checkPermissionStatus, toast]);

  // Configuration au montage
  useEffect(() => {
    if (!user) return;

    const initializePushNotifications = async () => {
      // Vérifier le statut au montage
      await checkPermissionStatus();

      // Configurer les listeners natifs immédiatement
      if (isNative) {
        await setupPushListeners();
        
        // 🎯 CRITIQUE: Vérifier si permissions déjà accordées
        try {
          const status = await PushNotifications.checkPermissions();
          console.log('📱 Statut permissions au démarrage:', status);
          
          if (status.receive === 'granted') {
            console.log('✅ Permissions déjà accordées, enregistrement token...');
            
            // 🔥 FORCER l'enregistrement pour récupérer le token
            await PushNotifications.register();
            console.log('✅ Enregistrement forcé effectué');
            
            // Vérifier si on a déjà un token en base
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', user.id)
              .single();
            
            if (profile?.push_token) {
              console.log('✅ Token existant trouvé:', profile.push_token.substring(0, 20) + '...');
              setToken(profile.push_token);
            } else {
              console.log('⚠️ Aucun token en base, attente listener registration...');
            }
          } else {
            console.log('ℹ️ Permissions non accordées, attente demande utilisateur');
          }
        } catch (error) {
          console.error('❌ Erreur initialisation push:', error);
        }
      }
    };

    initializePushNotifications();

    // 🎧 Écouter les mises à jour des permissions Android
    const handleAndroidPermissionsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔔 [EVENT] androidPermissionsUpdated détecté, rechargement du statut...');
      checkPermissionStatus().then(() => {
        // Après avoir vérifié le statut, forcer l'enregistrement si nécessaire
        const androidState = window.androidPermissions?.notifications;
        if (androidState === 'granted' && !token) {
          console.log('🔥 [EVENT] Permission granted via onResume, forcing register...');
          setTimeout(async () => {
            try {
              await PushNotifications.register();
              console.log('✅ [EVENT] PushNotifications.register() appelé après onResume');
            } catch (error) {
              console.error('❌ [EVENT] Erreur register après onResume:', error);
            }
          }, 500);
        }
      });
    };

    window.addEventListener('androidPermissionsUpdated', handleAndroidPermissionsUpdate);

    // Periodic check for permission changes
    const interval = setInterval(() => {
      checkPermissionStatus();
    }, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('androidPermissionsUpdated', handleAndroidPermissionsUpdate);
    };
  }, [user, isNative, setupPushListeners, checkPermissionStatus]);

  return {
    isRegistered,
    token,
    permissionStatus,
    requestPermissions,
    testNotification,
    isNative,
    isSupported,
    setupPushListeners,
    checkPermissionStatus // Exposer pour forcer le recheck
  };
};