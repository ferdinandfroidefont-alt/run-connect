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
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    prompt: true
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // 🔥 Track if token needs renewal
  const [tokenNeedsRenewal, setTokenNeedsRenewal] = useState(false);
  
  // 🔥 FONCTION HELPER pour réévaluer isNative dynamiquement
  const checkIsNative = () => (window as any).CapacitorForceNative === true || Capacitor.isNativePlatform() || typeof (window as any).AndroidBridge !== 'undefined';
  
  // DÉTECTION NATIVE UNIFIÉE - utilise le même flag que useMultiplatformPermissions
  const isNative = checkIsNative();
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
          
          // Configuration listeners puis enregistrement FCM
          console.log('🔔 [NATIVE] Configuration listeners puis enregistrement FCM...');
          await setupPushListeners();
          await new Promise(resolve => setTimeout(resolve, 100));
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

  // Helper: Vérifier Google Play Services (requis pour FCM sur Android)
  const checkGooglePlayServices = async (): Promise<boolean> => {
    try {
      if (typeof (window as any).AndroidBridge?.hasGooglePlayServices === 'function') {
        const result = (window as any).AndroidBridge.hasGooglePlayServices();
        console.log('🔍 [GPS] Google Play Services:', result ? 'disponibles ✅' : 'NON disponibles ❌');
        return result === true;
      }
      // Si pas de méthode, on assume que c'est dispo
      console.log('🔍 [GPS] Méthode non disponible, assume OK');
      return true;
    } catch (error) {
      console.error('❌ [GPS] Erreur vérification:', error);
      return true;
    }
  };

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
          return false;
        }
      } catch (error) {
        console.error('❌ Erreur permission iOS:', error);
        return false;
      }
    }
    
    // Android : Appel direct AndroidBridge (MÊME CODE QUE useMultiplatformPermissions)
    console.log('🤖 [ANDROID] Demande permission notifications via AndroidBridge...');
    try {
      // @ts-ignore - AndroidBridge natif
      if (typeof window.AndroidBridge?.requestNotificationPermissions === 'function') {
        console.log('✅ [ANDROID] AndroidBridge trouvé, appel requestNotificationPermissions()');
        
        // Créer une Promise pour gérer le callback asynchrone
        const notificationPromise = new Promise<boolean>((resolve) => {
          // Timeout de sécurité
          const timeout = setTimeout(() => {
            console.log('⏱️ [ANDROID] Timeout permission notifications');
            resolve(false);
          }, 30000); // 30 secondes max
          
          // Écouter le résultat
          const handler = (event: any) => {
            clearTimeout(timeout);
            const granted = event.detail?.granted === true;
            console.log('📱 [ANDROID] Résultat popup notifications:', granted ? 'ACCORDÉ ✅' : 'REFUSÉ ❌');
            window.removeEventListener('androidPermissionsUpdated', handler);
            resolve(granted);
          };
          
          window.addEventListener('androidPermissionsUpdated', handler);
        });
        
        // Déclencher la demande de permission (POPUP ANDROID SYSTÈME)
        window.AndroidBridge.requestNotificationPermissions();
        
        // Attendre le résultat
        const granted = await notificationPromise;
        
        if (granted) {
          console.log('✅ [ANDROID] Permission notifications accordée');
          toast({
            title: "Notifications activées !",
            description: "Vous recevrez les notifications de RunConnect"
          });
          return true;
        } else {
          console.log('❌ [ANDROID] Permission notifications refusée');
          return false;
        }
      } else {
        console.error('❌ [ANDROID] AndroidBridge.requestNotificationPermissions non trouvé !');
        return false;
      }
    } catch (error) {
      console.error('❌ [ANDROID] Erreur permission notifications:', error);
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    console.log('🔔 Demande permissions notifications...');
    
    if (!isNative) {
      console.log('❌ Mode web détecté, notifications non supportées');
      return false;
    }
    
    // ✅ Vérifier Google Play Services (requis pour FCM)
    if (Capacitor.getPlatform() === 'android') {
      const hasGPS = await checkGooglePlayServices();
      if (!hasGPS) {
        toast({
          title: "Google Play Services requis",
          description: "Les notifications push nécessitent Google Play Services",
          variant: "destructive"
        });
        return false;
      }
    }
    
    try {
      // 🎯 Vérifier d'abord l'état Android injecté
      const androidState = window.androidPermissions?.notifications;
      
      if (androidState === 'granted') {
        console.log('✅ Notifications déjà accordées selon Android');
        
        // ✅ NOUVEAU: Vérifier si un token existe en base
        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('user_id', user?.id)
          .single();
        
        if (!profile?.push_token) {
          console.log('🔥 Token manquant, enregistrement Firebase...');
          await setupPushListeners();
          await PushNotifications.register();
        }
        
        await checkPermissionStatus();
        
        toast({
          title: "Notifications déjà activées",
          description: "Vos notifications sont déjà configurées"
        });
        return true;
      }
      
      // ✅ MODIFIÉ: Toujours utiliser le plugin Android natif
      console.log('🤖 Demande permission via AndroidBridge...');
      
      if (typeof window.AndroidBridge?.requestNotificationPermissions === 'function') {
        console.log('✅ AndroidBridge trouvé');
        
        // Créer une Promise pour gérer le callback
        const notificationPromise = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            console.log('⏱️ Timeout permission notifications');
            resolve(false);
          }, 30000);
          
          const handler = (event: any) => {
            clearTimeout(timeout);
            const granted = event.detail?.granted === true;
            console.log('📱 Résultat popup notifications:', granted ? 'ACCORDÉ ✅' : 'REFUSÉ ❌');
            window.removeEventListener('androidPermissionsUpdated', handler);
            resolve(granted);
          };
          
          window.addEventListener('androidPermissionsUpdated', handler);
        });
        
        // 🔥 DÉCLENCHER LA POPUP ANDROID
        window.AndroidBridge.requestNotificationPermissions();
        
        // Attendre le résultat
        const granted = await notificationPromise;
        
        if (granted) {
          console.log('✅ Permission accordée, enregistrement FCM...');
          
          // ✅ Setup listeners d'abord
          if (!listenersConfigured()) {
            await setupPushListeners();
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // ✅ CRITIQUE : Appel explicite à register()
          try {
            await PushNotifications.register();
            console.log('✅ [FCM] PushNotifications.register() appelé');
          } catch (error) {
            console.error('❌ [FCM] Erreur lors de register():', error);
          }
          
          // ✅ ATTENDRE LE TOKEN FIREBASE (max 5 secondes)
          const tokenReceived = await new Promise<boolean>((resolve) => {
            let tokenCheckCount = 0;
            const maxChecks = 10; // 10 × 500ms = 5 secondes
            
            const checkToken = async () => {
              tokenCheckCount++;
              
              // Vérifier si un token existe en base
              const { data: profile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('user_id', user?.id)
                .single();
              
              if (profile?.push_token) {
                console.log('✅ Token Firebase confirmé en base:', profile.push_token.substring(0, 30) + '...');
                setToken(profile.push_token);
                resolve(true);
              } else if (tokenCheckCount >= maxChecks) {
                console.warn('⏱️ Timeout: Token Firebase non reçu après 5 secondes');
                resolve(false);
              } else {
                setTimeout(checkToken, 500);
              }
            };
            
            checkToken();
          });
          
          if (tokenReceived) {
            toast({
              title: "Notifications activées !",
              description: "Vous recevrez les notifications de RunConnect"
            });
          } else {
            toast({
              title: "Notifications activées",
              description: "Token Firebase en attente...",
              variant: "default"
            });
          }
          
          return tokenReceived;
        } else {
          console.log('❌ Permission refusée');
          
          toast({
            title: "Permission refusée",
            description: "Activez les notifications dans Paramètres > Applications > RunConnect",
            variant: "destructive"
          });
          return false;
        }
      } else {
        console.error('❌ AndroidBridge non disponible !');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur demande permissions:', error);
      return false;
    }
  };

  // Sauvegarder le token push
  const savePushToken = useCallback(async (pushToken: string) => {
    if (!user) {
      console.log('⏳ [FCM] User non défini, token en attente:', pushToken.substring(0, 30) + '...');
      setPendingToken(pushToken);
      setToken(pushToken);
      return;
    }

    try {
      // Détecter la vraie plateforme (correction WebView Android)
      let platform = Capacitor.getPlatform();
      
      // 🤖 CORRECTION CRITIQUE: Détecter Android WebView explicitement
      if (platform === 'web' && (typeof (window as any).AndroidBridge !== 'undefined' || typeof (window as any).fcmToken !== 'undefined' || typeof (window as any).fcmTokenPlatform !== 'undefined')) {
        platform = 'android';
        console.log('🤖 [FCM] WebView Android détectée, plateforme corrigée: android (était: web)');
      }
      
      // Si window.fcmTokenPlatform existe (injecté par MainActivity), utiliser cette valeur
      if (typeof (window as any).fcmTokenPlatform === 'string') {
        platform = (window as any).fcmTokenPlatform;
        console.log('🤖 [FCM] Plateforme forcée via fcmTokenPlatform:', platform);
      }
      
      const tokenType = platform === 'ios' ? 'APNs' : 'FCM';
      const platformEmoji = platform === 'ios' ? '🍎' : '🤖';
      
      // Vérifier si le token existe déjà en base (éviter doublons)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user.id)
        .single();

      if (existingProfile?.push_token === pushToken) {
        console.log('✅ [FCM] Token déjà sauvegardé');
        setPendingToken(null);
        return;
      }
      
      console.log(`${platformEmoji} [${platform.toUpperCase()}] Sauvegarde token ${tokenType}:`, pushToken.substring(0, 30) + '...', `(plateforme: ${platform})`);
      
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
        toast({
          title: "Erreur sauvegarde",
          description: "Le token n'a pas pu être enregistré. Réessayez.",
          variant: "destructive"
        });
        throw error;
      } else {
        console.log(`✅ [${platform.toUpperCase()}] Token ${tokenType} sauvegardé avec succès dans Supabase (plateforme: ${platform})`);
        setToken(pushToken);
        setIsRegistered(true);
        setPendingToken(null);
      }
    } catch (error) {
      console.error('❌ Exception sauvegarde token:', error);
    }
  }, [user, toast]);

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
      
      // 🔥 CORRECTION: Rafraîchir la session pour obtenir un token valide
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      console.log('🔐 Session rafraîchie:', !!session);
      console.log('🔐 Access token présent:', !!session?.access_token);
      
      if (sessionError || !session) {
        console.error('❌ Erreur refresh session:', sessionError);
        toast({
          title: "Erreur session",
          description: "Impossible de rafraîchir votre session",
          variant: "destructive"
        });
        return;
      }

      if (!session?.access_token) {
        console.error('❌ Pas de token JWT disponible après refresh');
        toast({
          title: "Erreur JWT",
          description: "Impossible d'authentifier la requête",
          variant: "destructive"
        });
        return;
      }
      
      // 🔥 LOGS DÉTAILLÉS pour déboguer la Edge Function
      console.log('🔑 Appel Edge Function avec JWT');
      console.log('📋 Supabase URL:', (supabase as any).supabaseUrl || 'https://dbptgehpknjsoisirviz.supabase.co');
      console.log('📋 Function name: send-push-notification');
      console.log('📋 User ID:', user.id);
      console.log('📋 JWT présent:', !!session.access_token);
      console.log('📋 JWT preview (50 chars):', session.access_token.substring(0, 50) + '...');
      
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          user_id: user.id,
          title: 'Test RunConnect',
          body: 'Vos notifications fonctionnent parfaitement ! 🎉',
          type: 'test',
          data: { test: true }
        }
      });

      // 🔥 LOG DÉTAILLÉ de la réponse
      console.log('📋 Response received:', { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        dataContent: data 
      });

      if (error) {
        console.error('❌ Erreur test notification:', {
          message: error.message,
          status: error.status,
          details: error
        });
        toast({
          title: "Erreur test",
          description: `Impossible d'envoyer la notification de test: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ Test notification envoyé, réponse:', data);
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
      await PushNotifications.addListener('registrationError', async (error) => {
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
        
        // Retry automatique après 5 secondes
        setTimeout(async () => {
          console.log('🔄 [RETRY] Nouvelle tentative enregistrement FCM...');
          try {
            await PushNotifications.register();
          } catch (retryError) {
            console.error('❌ [RETRY] Échec retry:', retryError);
            toast({
              title: "Erreur Firebase",
              description: "Impossible d'obtenir le token. Vérifiez votre connexion.",
              variant: "destructive"
            });
          }
        }, 5000);
        
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

  // 🔥 SAUVEGARDER LE TOKEN EN ATTENTE DÈS QUE USER EST DÉFINI
  useEffect(() => {
    if (user && pendingToken) {
      console.log('✅ [FCM] User maintenant défini, sauvegarde du token en attente');
      savePushToken(pendingToken);
    }
  }, [user, pendingToken, savePushToken]);

  // 🔥 ÉCOUTER LE TOKEN FCM INJECTÉ PAR MAINACTIVITY
  useEffect(() => {
    if (!isNative) return;

    const handleFCMTokenFromNative = (event: any) => {
      const nativeToken = event.detail?.token;
      if (nativeToken) {
        console.log('🔥🔥🔥 [FCM EVENT] Token FCM reçu de MainActivity !');
        console.log('🔥 [FCM EVENT] Token:', nativeToken.substring(0, 30) + '...');
        
        setToken(nativeToken);
        setIsRegistered(true);
        
        // Sauvegarder immédiatement (ou mettre en attente si user pas défini)
        savePushToken(nativeToken);
      }
    };

    window.addEventListener('fcmTokenReady', handleFCMTokenFromNative);
    
    // Vérifier si un token est déjà disponible dans window
    if ((window as any).fcmToken) {
      console.log('🔥 [FCM CHECK] Token déjà disponible dans window.fcmToken');
      const existingToken = (window as any).fcmToken;
      setToken(existingToken);
      setIsRegistered(true);
      savePushToken(existingToken);
    }

    return () => {
      window.removeEventListener('fcmTokenReady', handleFCMTokenFromNative);
    };
  }, [isNative, savePushToken]);

  // 🔥 NOUVEAU: Vérifier l'âge du token et forcer le renouvellement si nécessaire
  useEffect(() => {
    if (!user?.id || !isNative) return;

    const checkTokenAge = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token, push_token_updated_at')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        // Si pas de token, pas de vérification nécessaire
        if (!profile.push_token) {
          console.log('⚠️ [TOKEN AGE] Aucun token en base');
          return;
        }

        // Si pas de date de mise à jour, considérer le token comme ancien
        if (!profile.push_token_updated_at) {
          console.log('⚠️ [TOKEN AGE] Token sans date de mise à jour, considéré comme ancien');
          setTokenNeedsRenewal(true);
          return;
        }

        // Calculer l'âge du token
        const tokenDate = new Date(profile.push_token_updated_at);
        const now = new Date();
        const ageInDays = Math.floor((now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`📅 [TOKEN AGE] Token vieux de ${ageInDays} jours`);

        // Si le token a plus de 60 jours, forcer le renouvellement
        if (ageInDays > 60) {
          console.log('🔄 [TOKEN AGE] Token > 60 jours, renouvellement nécessaire');
          setTokenNeedsRenewal(true);
          
          // Forcer le renouvellement si les permissions sont accordées
          const permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'granted') {
            console.log('✅ [TOKEN AGE] Permissions accordées, lancement renouvellement...');
            try {
              await PushNotifications.register();
              console.log('✅ [TOKEN AGE] PushNotifications.register() appelé pour renouvellement');
              setTokenNeedsRenewal(false);
            } catch (error) {
              console.error('❌ [TOKEN AGE] Erreur lors du renouvellement:', error);
            }
          }
        } else {
          console.log('✅ [TOKEN AGE] Token récent, pas de renouvellement nécessaire');
          setTokenNeedsRenewal(false);
        }
      } catch (error) {
        console.error('❌ [TOKEN AGE] Erreur vérification âge token:', error);
      }
    };

    // Vérifier immédiatement au montage
    checkTokenAge();

    // Revérifier toutes les 24h
    const interval = setInterval(checkTokenAge, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, isNative]);

  // 🆕 Synchronisation token Firebase avec DB au démarrage
  useEffect(() => {
    if (!isNative || !isRegistered || !user) return;

    const syncFirebaseToken = async () => {
      try {
        console.log('🔄 [TOKEN_SYNC] Checking token synchronization...');
        
        // Ajouter un listener pour récupérer le token actuel
        const listener = await PushNotifications.addListener('registration', (token) => {
          console.log('🔄 [TOKEN_SYNC] Current Firebase token:', token.value);
          
          // Comparer avec le token en base
          const checkAndUpdate = async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', user.id)
              .single();
            
            if (profile && profile.push_token !== token.value) {
              console.log('⚠️ [TOKEN_SYNC] Token mismatch detected! Updating...');
              console.log('  DB token:', profile.push_token);
              console.log('  Firebase token:', token.value);
              await savePushToken(token.value);
            } else {
              console.log('✅ [TOKEN_SYNC] Tokens are synchronized');
            }
          };
          
          checkAndUpdate();
        });
        
        // Forcer la récupération du token actuel
        await PushNotifications.register();
        
        // Cleanup
        return () => {
          listener.remove();
        };
      } catch (error) {
        console.error('❌ [TOKEN_SYNC] Error:', error);
      }
    };

    syncFirebaseToken();
  }, [isNative, isRegistered, user, savePushToken]);

  // Configuration au montage
  useEffect(() => {
    if (!user) return;

    const initializePushNotifications = async () => {
      // ✅ Vérifier le statut au montage (SANS auto-register)
      await checkPermissionStatus();

      // Configurer les listeners natifs immédiatement
      if (isNative) {
        await setupPushListeners();
        
        // 🎯 MODIFIÉ: Ne PAS forcer l'enregistrement automatiquement
        try {
          const status = await PushNotifications.checkPermissions();
          console.log('📱 Statut permissions au démarrage:', status);
          
          if (status.receive === 'granted') {
            console.log('✅ Permissions déjà accordées');
            
            // ✅ NOUVEAU: Vérifier si un token existe en base
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', user.id)
              .single();
            
            if (profile?.push_token) {
              console.log('✅ Token existant trouvé:', profile.push_token.substring(0, 20) + '...');
              setToken(profile.push_token);
              setIsRegistered(true);
            } else {
              console.log('⚠️ Permissions OK mais pas de token');
              // ❌ NE PAS appeler PushNotifications.register() automatiquement
              // L'utilisateur doit cliquer explicitement sur "Activer"
              setIsRegistered(false);
            }
          } else {
            console.log('ℹ️ Permissions non accordées');
            setIsRegistered(false);
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

    // 🔥 NOUVEAU: Écouter le retour au premier plan de l'app
    let appStateListener: any;
    if (isNative) {
      import('@capacitor/app').then(({ App }) => {
        appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log('🔄 App revenue au premier plan, re-vérification des permissions...');
            
            try {
              // Re-vérifier le statut des permissions
              const status = await PushNotifications.checkPermissions();
              console.log('📱 Nouveau statut permissions:', status);
              
              if (status.receive === 'granted') {
                console.log('✅ Permissions accordées détectées au retour !');
                
                // Vérifier si on a déjà un token
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('push_token')
                  .eq('user_id', user.id)
                  .single();
                
                if (!profile?.push_token) {
                  console.log('🔥 Pas de token trouvé, enregistrement...');
                  await PushNotifications.register();
                  
                  toast({
                    title: "Notifications activées",
                    description: "Vous recevrez maintenant les alertes de sessions",
                  });
                } else {
                  console.log('✅ Token déjà présent:', profile.push_token.substring(0, 20) + '...');
                  setToken(profile.push_token);
                }
              }
            } catch (error) {
              console.error('❌ Erreur re-vérification permissions:', error);
            }
          }
        });
      });
    }

    return () => {
      window.removeEventListener('androidPermissionsUpdated', handleAndroidPermissionsUpdate);
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [user, isNative, setupPushListeners, checkPermissionStatus, toast]);

  // 🔥 NOUVEAU: Vérification périodique de l'état Android
  useEffect(() => {
    if (!isNative || !user) return;

    // Vérifier toutes les 5 secondes si l'app est active
    const intervalId = setInterval(async () => {
      try {
        // Vérifier l'état réel via Capacitor
        const status = await PushNotifications.checkPermissions();
        
        // Comparer avec l'état actuel
        const currentlyGranted = permissionStatus.granted;
        const actuallyGranted = status.receive === 'granted';
        
        if (currentlyGranted !== actuallyGranted) {
          console.log('🔄 [SYNC] État notifications changé:', {
            avant: currentlyGranted,
            maintenant: actuallyGranted
          });
          
          // Mettre à jour l'état React
          setPermissionStatus({
            granted: actuallyGranted,
            denied: status.receive === 'denied',
            prompt: status.receive === 'prompt'
          });
          
          setIsRegistered(actuallyGranted);
          
          // Si désactivé dans les paramètres, supprimer le token
          if (!actuallyGranted && user?.id) {
            await supabase
              .from('profiles')
              .update({ push_token: null })
              .eq('user_id', user.id);
            
            setToken(null);
            
            toast({
              title: "Notifications désactivées",
              description: "Les notifications ont été désactivées dans les paramètres"
            });
          }
        }
      } catch (error) {
        console.error('❌ Erreur sync notifications:', error);
      }
    }, 5000); // Vérification toutes les 5 secondes

    return () => clearInterval(intervalId);
  }, [isNative, user, permissionStatus.granted, toast]);

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
    forceNativeNotificationCheck, // ✅ Exposer pour usage externe
    tokenNeedsRenewal // 🔥 Expose si le token a besoin d'être renouvelé
  };
};