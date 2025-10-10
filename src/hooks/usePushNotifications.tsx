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
  
  // Détection de la plateforme iOS
  const isIOS = () => {
    return Capacitor.getPlatform() === 'ios';
  };

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
          
          // 🔥 SI permission accordée, vérifier si un token existe en base
          if (granted && user?.id) {
            setTimeout(async () => {
              try {
                // Vérifier dans la base si un token existe déjà
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('push_token')
                  .eq('user_id', user.id)
                  .single();

                if (!profile?.push_token) {
                  console.log('🔥 [NOTIF CHECK] Aucun token en base, enregistrement Firebase...');
                  await PushNotifications.register();
                  console.log('✅ [NOTIF CHECK] PushNotifications.register() appelé avec succès');
                } else {
                  console.log('✅ [NOTIF CHECK] Token déjà présent en base:', profile.push_token.substring(0, 30) + '...');
                  setToken(profile.push_token); // Synchroniser l'état React
                }
              } catch (error) {
                console.error('❌ [NOTIF CHECK] Erreur lors du check token:', error);
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

  // 🔥 Vérification NATIVE forcée (pas seulement l'état injecté)
  const forceNativeNotificationCheck = useCallback(async () => {
    if (!isNative || !user?.id) return;

    try {
      // ✅ Appel NATIF direct à Capacitor (ignore window.androidPermissions)
      const nativeStatus = await PushNotifications.checkPermissions();
      const nativeGranted = nativeStatus.receive === 'granted';

      console.log('🔍 [NATIVE CHECK] PushNotifications.checkPermissions():', nativeStatus.receive);

      // Si la permission native est accordée
      if (nativeGranted) {
        console.log('✅ [NATIVE CHECK] Permission Android détectée: granted');

        // Vérifier si un token existe déjà en base
        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('user_id', user.id)
          .single();

        if (!profile?.push_token) {
          console.log('🔥 [NATIVE CHECK] Aucun token en base, enregistrement Firebase...');
          
          // ✅ FORCER l'enregistrement Firebase pour obtenir le token FCM
          await PushNotifications.register();
          console.log('✅ [NATIVE CHECK] PushNotifications.register() appelé');
        } else {
          console.log('✅ [NATIVE CHECK] Token déjà présent en base:', profile.push_token.substring(0, 30) + '...');
          setToken(profile.push_token);
        }

        // Mettre à jour l'état React
        setPermissionStatus({
          granted: true,
          denied: false,
          prompt: false
        });
        setIsRegistered(true);
      } else {
        console.log('⚠️ [NATIVE CHECK] Permission non accordée:', nativeStatus.receive);
        
        setPermissionStatus({
          granted: false,
          denied: nativeStatus.receive === 'denied',
          prompt: nativeStatus.receive === 'prompt'
        });
        setIsRegistered(false);
      }
    } catch (error) {
      console.error('❌ [NATIVE CHECK] Erreur vérification native:', error);
    }
  }, [isNative, user]);

  // Plugin natif (Android et iOS) avec compatibilité toutes versions
  const requestNativeNotifications = async (): Promise<boolean> => {
    const platform = Capacitor.getPlatform();
    console.log(`🔔 Demande permissions notifications ${platform}...`);
    
    // iOS : demande native directe via PushNotifications
    if (platform === 'ios') {
      console.log('📱 iOS détecté : demande permission native Apple');
      try {
        const permResult = await PushNotifications.requestPermissions();
        
        if (permResult.receive === 'granted') {
          console.log('✅ Permission iOS accordée');
          await PushNotifications.register();
          console.log('✅ PushNotifications.register() appelé (iOS)');
          
          // Attendre 1 seconde pour laisser Firebase générer le token
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Vérifier si un token a été généré et sauvegardé
          if (user?.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', user.id)
              .single();

            if (profile?.push_token) {
              console.log('✅ Token FCM confirmé en base:', profile.push_token.substring(0, 30) + '...');
            } else {
              console.warn('⚠️ PushNotifications.register() appelé mais aucun token en base après 1s');
              console.warn('⚠️ Vérifiez les logs Firebase dans les logs iOS');
            }
          }
          
          toast({
            title: "Notifications activées !",
            description: "Vous recevrez les notifications de RunConnect"
          });
          return true;
        } else {
          console.warn('❌ Permission iOS refusée');
          toast({
            title: "Notifications désactivées",
            description: "Activez-les dans Réglages > RunConnect > Notifications",
            variant: "destructive",
          });
          return false;
        }
      } catch (error) {
        console.error('❌ Erreur permission iOS:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'activer les notifications",
          variant: "destructive",
        });
        return false;
      }
    }
    
    // Android : logique existante avec PermissionsPlugin
    try {
      // 🔥 FORCER la popup système Android via le plugin natif
      if ((window as any).PermissionsPlugin?.requestNotificationPermissions) {
        console.log('🔔 🔥 FORCE popup système via PermissionsPlugin.requestNotificationPermissions()');
        const result = await (window as any).PermissionsPlugin.requestNotificationPermissions();
        console.log('🔔 ✅ Résultat popup système Android:', result);
        
        // Si accordé, enregistrer immédiatement pour obtenir le token FCM
        if (result) {
          console.log('🔥 Permission accordée, enregistrement Firebase immédiat...');
          await PushNotifications.register();
          console.log('✅ PushNotifications.register() appelé après popup');
          
          // Attendre 1 seconde pour laisser Firebase générer le token
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Vérifier si un token a été généré et sauvegardé
          if (user?.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', user.id)
              .single();

            if (profile?.push_token) {
              console.log('✅ Token FCM confirmé en base:', profile.push_token.substring(0, 30) + '...');
            } else {
              console.warn('⚠️ PushNotifications.register() appelé mais aucun token en base après 1s');
              console.warn('⚠️ Vérifiez les logs Firebase dans adb logcat | grep -E "(FCM|Firebase|RunConnect)"');
            }
          }
        }
        
        return result;
      }
      
      // Fallback Capacitor standard (si le plugin natif n'existe pas)
      console.warn('⚠️ PermissionsPlugin.requestNotificationPermissions() introuvable, fallback Capacitor');
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive === 'granted') {
        console.log('🔥 Permission Capacitor accordée, enregistrement Firebase...');
        await PushNotifications.register();
      }
      
      return result.receive === 'granted';
    } catch (error) {
      console.error('❌ Erreur demande permissions Android:', error);
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
        
        // STRATÉGIE 1: Plugin natif personnalisé (toutes versions)
        if (androidVersionInt > 0) {
          console.log('🤖 Tentative plugin natif personnalisé...');
          success = await requestNativeNotifications();
          
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
      const platform = Capacitor.getPlatform();
      const tokenType = platform === 'ios' ? 'APNs' : 'FCM';
      const platformEmoji = platform === 'ios' ? '🍎' : '🤖';
      
      console.log(`${platformEmoji} [${platform.toUpperCase()}] Sauvegarde token ${tokenType}:`, pushToken.substring(0, 30) + '...');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: pushToken,
          push_token_platform: platform,
          notifications_enabled: true 
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error(`❌ [${platform.toUpperCase()}] Erreur sauvegarde token ${tokenType}:`, error);
      } else {
        console.log(`✅ [${platform.toUpperCase()}] Token ${tokenType} sauvegardé avec succès dans Supabase (plateforme: ${platform})`);
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
      await PushNotifications.addListener('registration', async (token) => {
        console.log('🔥🔥🔥 [REGISTRATION] Token FCM reçu !');
        console.log('✅ [REGISTRATION] Token FCM value:', token.value);
        console.log('📱 [REGISTRATION] Token complet:', JSON.stringify(token));
        
        if (token.value) {
          console.log('🔥 [REGISTRATION] Token valide, mise à jour de l\'état React...');
          setToken(token.value);
          setIsRegistered(true);
          
          console.log('💾 [REGISTRATION] Sauvegarde token push en base...');
          await savePushToken(token.value);
          console.log('✅ [REGISTRATION] Token sauvegardé avec succès');
          
          await checkPermissionStatus();
          console.log('✅ [REGISTRATION] Statut mis à jour - isRegistered: true');
        } else {
          console.error('❌ [REGISTRATION] Token reçu mais valeur vide !', token);
        }
      });

      // Erreur d'enregistrement
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('🔥🔥🔥 [FIREBASE ERROR] Erreur enregistrement FCM:', error);
        console.error('🔥 [FIREBASE ERROR] Détails:', JSON.stringify(error));
        
        // Suggestions de debug selon le type d'erreur
        if (error.error?.includes('SERVICE_NOT_AVAILABLE')) {
          console.error('❌ Firebase Cloud Messaging non disponible');
          console.error('💡 Vérifiez que google-services.json est bien configuré');
        } else if (error.error?.includes('INVALID_SENDER')) {
          console.error('❌ Sender ID Firebase invalide');
          console.error('💡 Vérifiez le fichier google-services.json');
        } else if (error.error?.includes('TOO_MANY_REGISTRATIONS')) {
          console.error('❌ Trop de tentatives d\'enregistrement');
          console.error('💡 Réinstallez l\'app ou videz le cache');
        } else {
          console.error('❌ Erreur FCM inconnue - vérifiez adb logcat pour plus de détails');
        }
        
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
        // Après avoir vérifié le statut, vérifier si un token existe en base
        const androidState = window.androidPermissions?.notifications;
        if (androidState === 'granted' && user?.id) {
          setTimeout(async () => {
            try {
              // Vérifier dans la base si un token existe déjà
              const { data: profile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('user_id', user.id)
                .single();

              if (!profile?.push_token) {
                console.log('🔥 [EVENT] Aucun token en base après onResume, enregistrement Firebase...');
                await PushNotifications.register();
                console.log('✅ [EVENT] PushNotifications.register() appelé après onResume');
              } else {
                console.log('✅ [EVENT] Token déjà présent en base après onResume:', profile.push_token.substring(0, 30) + '...');
                setToken(profile.push_token); // Synchroniser l'état React
              }
            } catch (error) {
              console.error('❌ [EVENT] Erreur register après onResume:', error);
            }
          }, 500);
        }
      });
    };

    window.addEventListener('androidPermissionsUpdated', handleAndroidPermissionsUpdate);

    // 🔥 Vérification NATIVE forcée toutes les 2 secondes
    const nativeCheckInterval = setInterval(() => {
      console.log('🔄 [INTERVAL] Vérification native forcée...');
      forceNativeNotificationCheck();
    }, 2000); // 2 secondes comme pour les contacts

    return () => {
      clearInterval(nativeCheckInterval);
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
    checkPermissionStatus,
    forceNativeNotificationCheck // ✅ Exposer pour usage externe
  };
};