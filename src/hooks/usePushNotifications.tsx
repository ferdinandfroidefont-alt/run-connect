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
  
  // 🔥 DÉTECTION NATIVE RÉACTIVE (useState pour re-render quand AndroidBridge arrive)
  const [isNative, setIsNative] = useState(() => {
    return (window as any).CapacitorForceNative === true || 
           Capacitor.isNativePlatform() || 
           typeof (window as any).AndroidBridge !== 'undefined';
  });
  
  const isSupported = isNative || ('Notification' in window);
  
  // 🔄 Re-vérifier isNative dynamiquement pendant les 5 premières secondes
  useEffect(() => {
    const recheckNative = () => {
      const nativeNow = (window as any).CapacitorForceNative === true || 
                        Capacitor.isNativePlatform() || 
                        typeof (window as any).AndroidBridge !== 'undefined';
      
      if (nativeNow !== isNative) {
        console.log('🔄 [NATIVE] Détection mise à jour:', isNative, '→', nativeNow);
        setIsNative(nativeNow);
      }
    };

    // Vérifier toutes les 500ms pendant les 5 premières secondes
    const interval = setInterval(recheckNative, 500);
    setTimeout(() => clearInterval(interval), 5000);

    // Écouter l'événement capacitorNativeReady
    window.addEventListener('capacitorNativeReady', recheckNative);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('capacitorNativeReady', recheckNative);
    };
  }, [isNative]);
  
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
          
          // Permission accordée, mais on ne force PAS le register() ici
          
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
          console.log('🔥 [NATIVE CHECK] Aucun token en base - le système l\'enregistrera automatiquement');
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


  const requestPermissions = async (): Promise<boolean> => {
    console.log('🔔 [REQUEST] Vérification permissions notifications...');
    
    if (!isNative) {
      console.log('❌ Mode web détecté, notifications non supportées');
      toast({
        title: "Non supporté",
        description: "Les notifications nécessitent l'application mobile",
        variant: "destructive"
      });
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
      // 🎯 Vérifier l'état Android injecté
      const androidState = window.androidPermissions?.notifications;
      
      if (androidState === 'granted') {
        console.log('✅ [REQUEST] Permissions déjà accordées');
        
        // Vérifier si un token existe en base
        const hasToken = await ensureTokenRegistered();
        
        if (hasToken) {
          toast({
            title: "Notifications activées",
            description: "Vos notifications sont déjà configurées"
          });
        } else {
          toast({
            title: "Notifications activées",
            description: "Token Firebase en cours de génération...",
            variant: "default"
          });
        }
        
        await checkPermissionStatus();
        return true;
      } else {
        console.log('⚠️ [REQUEST] Permissions non accordées');
        console.log('💡 [REQUEST] Les notifications sont demandées automatiquement au démarrage de l\'app');
        
        toast({
          title: "Permission manquante",
          description: "Les notifications sont demandées au démarrage de l'app. Réinstallez l'app si nécessaire.",
          variant: "default"
        });
        
        return false;
      }
    } catch (error) {
      console.error('❌ [REQUEST] Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les permissions",
        variant: "destructive"
      });
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
    if (!user) {
      console.error('❌ [TEST] No user session');
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour tester les notifications",
        variant: "destructive"
      });
      return;
    }

    if (!isNative) {
      console.log('❌ [TEST] Mode web détecté');
      console.log('📱 [TEST] CapacitorForceNative:', (window as any).CapacitorForceNative);
      console.log('📱 [TEST] AndroidBridge:', typeof (window as any).AndroidBridge);
      console.log('📱 [TEST] Platform:', Capacitor.getPlatform());
      
      toast({
        title: "Mode Web détecté",
        description: "Les notifications push nécessitent l'application Android ou iOS",
        variant: "default"
      });
      return;
    }

    // Vérifier si on a un token FCM
    if (!token || token.length < 50) {
      // Diagnostic précis
      try {
        const perms = await PushNotifications.checkPermissions();
        
        if (perms.receive !== 'granted') {
          toast({
            title: "Permissions manquantes",
            description: "Acceptez d'abord la demande de notifications Android au démarrage de l'app",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Token Firebase manquant",
            description: "Firebase n'a pas généré de token. Vérifiez google-services.json et les logs.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('❌ [TEST] Erreur lors de checkPermissions():', error);
        toast({
          title: "Token FCM manquant",
          description: "Le token Firebase n'est pas disponible. Relancez l'app ou vérifiez les logs Firebase.",
          variant: "destructive"
        });
      }
      return;
    }

    try {
      console.log('🧪 [TEST] Sending test notification...');
      
      // Vérifier la session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ [TEST] No JWT token');
        toast({
          title: "Erreur JWT",
          description: "Impossible d'authentifier la requête",
          variant: "destructive"
        });
        return;
      }

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

      if (error) {
        console.error('❌ [TEST] Edge function error:', error);
        
        // Diagnostic plus précis
        if (error.message?.includes('non-2xx')) {
          toast({
            title: "Erreur serveur",
            description: "La fonction d'envoi a échoué. Vérifiez les logs Supabase.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erreur test",
            description: error.message || "Erreur inconnue",
            variant: "destructive"
          });
        }
        return;
      }

      // Vérifier le résultat
      if (data?.web_only) {
        toast({
          title: "Mode Web",
          description: "Les notifications nécessitent l'app Android/iOS installée",
          variant: "default"
        });
      } else if (data?.fcm_sent) {
        toast({
          title: "✅ Notification envoyée !",
          description: "Vérifiez votre barre de notification Android",
        });
      } else {
        toast({
          title: "Notification créée",
          description: "Enregistrée en base mais non envoyée (token invalide ?)",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('❌ [TEST] Exception:', error);
      toast({
        title: "Erreur test",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    }
  }, [user, toast, isNative, token]);

  // Ref pour tracker si les listeners sont configurés
  const listenersConfigured = useCallback(() => {
    return (window as any).__pushListenersConfigured === true;
  }, []);

  // Configuration des listeners (DOIT être appelé AVANT register())
  const setupPushListeners = useCallback(async () => {
    // 🔥 FLAG GLOBAL pour éviter la double configuration
    if (!isNative) {
      console.log('⚠️ [LISTENERS] Mode web, pas de configuration nécessaire');
      return;
    }
    
    if ((window as any).__pushNotificationSystemInitialized) {
      console.log('⚠️ [LISTENERS] Listeners déjà configurés, skip');
      return;
    }

    console.log('🎧 [LISTENERS] Configuration listeners push natifs...');
    
    // 🔥 Demander le token FCM via AndroidBridge si disponible
    if (typeof (window as any).AndroidBridge?.getFCMToken === 'function') {
      console.log('🔥 [PUSH] Demande token FCM via AndroidBridge...');
      try {
        (window as any).AndroidBridge.getFCMToken();
      } catch (error) {
        console.error('❌ [PUSH] Erreur appel AndroidBridge.getFCMToken():', error);
      }
    }
    
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

      // 🔥 FLAG GLOBAL UNIQUE
      (window as any).__pushNotificationSystemInitialized = true;
      (window as any).__pushListenersConfigured = true;
      console.log('✅ [LISTENERS] Listeners push configurés avec succès');
    } catch (error) {
      console.error('❌ [LISTENERS] Erreur configuration listeners:', error);
    }
  }, [isNative, savePushToken, handleNotificationTap, checkPermissionStatus, toast]);

  // Centraliser la logique d'enregistrement du token FCM
  const ensureTokenRegistered = useCallback(async (): Promise<boolean> => {
    // Éviter les appels simultanés
    if ((window as any).__fcmRegistering) {
      console.log('⚠️ [FCM] Enregistrement déjà en cours, skip');
      return false;
    }
    
    try {
      (window as any).__fcmRegistering = true;
      console.log('🔥 [FCM] Vérification token...');
      
      // Vérifier token en base
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user?.id)
        .single();
      
      if (profile?.push_token) {
        console.log('✅ [FCM] Token déjà en base:', profile.push_token.substring(0, 30) + '...');
        setToken(profile.push_token);
        return true;
      }
      
      console.log('🔄 [FCM] Token manquant, appel PushNotifications.register()...');
      
      // Setup listeners si pas déjà fait
      if (!listenersConfigured()) {
        await setupPushListeners();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Appeler register()
      await PushNotifications.register();
      console.log('✅ [FCM] PushNotifications.register() appelé');
      
      // Attendre le token (max 5s)
      const tokenReceived = await new Promise<boolean>((resolve) => {
        let tokenCheckCount = 0;
        const maxChecks = 10; // 10 × 500ms = 5 secondes
        
        const checkToken = async () => {
          tokenCheckCount++;
          
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('user_id', user?.id)
            .single();
          
          if (updatedProfile?.push_token) {
            console.log('✅ [FCM] Token reçu:', updatedProfile.push_token.substring(0, 30) + '...');
            setToken(updatedProfile.push_token);
            resolve(true);
          } else if (tokenCheckCount >= maxChecks) {
            console.warn('⏱️ [FCM] Timeout: Token non reçu après 5 secondes');
            resolve(false);
          } else {
            setTimeout(checkToken, 500);
          }
        };
        
        checkToken();
      });
      
      return tokenReceived;
      
    } finally {
      (window as any).__fcmRegistering = false;
    }
  }, [user, listenersConfigured, setupPushListeners]);


  // 🔥 SAUVEGARDER LE TOKEN EN ATTENTE DÈS QUE USER EST DÉFINI
  useEffect(() => {
    if (user && pendingToken) {
      console.log('✅ [FCM] User maintenant défini, sauvegarde du token en attente');
      savePushToken(pendingToken);
    }
  }, [user, pendingToken, savePushToken]);

  // 🔥 LISTENER POUR fcmTokenReady (dispatché par MainActivity avec retry automatique)
  useEffect(() => {
    if (!isNative) return;

    const handleFcmTokenReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; platform: string; attempt?: number }>;
      const token = customEvent.detail?.token;
      
      if (token && !(window as any).__fcmTokenReceived) {
        const attempt = customEvent.detail?.attempt || 1;
        console.log(`🔥🔥🔥 [FCM_TOKEN_READY] Token reçu (tentative ${attempt}):`, token.substring(0, 30) + '...');
        console.log('📱 [FCM_TOKEN_READY] Plateforme:', customEvent.detail?.platform || 'unknown');
        
        // ✅ CONFIRMER LA RÉCEPTION (arrête le retry côté Android)
        (window as any).__fcmTokenReceived = true;
        console.log('✅ [FCM_TOKEN_READY] Réception confirmée, retry Android arrêté');
        
        setToken(token);
        setIsRegistered(true);
        savePushToken(token);
        
        toast({
          title: "Notifications activées ✅",
          description: `Token reçu après ${attempt} tentative(s)`,
        });
      } else if ((window as any).__fcmTokenReceived) {
        console.log('ℹ️ [FCM_TOKEN_READY] Token déjà reçu, événement ignoré');
      } else {
        console.error('❌ [FCM_TOKEN_READY] Événement reçu mais token manquant !');
      }
    };

  console.log('🎧 [FCM_TOKEN_READY] Installation listener fcmTokenReady...');
  window.addEventListener('fcmTokenReady', handleFcmTokenReady);
  
  // 🔥 NOUVEAU : Signaler à Android que le listener est prêt
  (window as any).__fcmListenerReady = true;
  console.log('✅ [FCM_LISTENER_READY] Signal envoyé à Android - Listener prêt !');

    return () => {
      console.log('🧹 [FCM_TOKEN_READY] Nettoyage du listener fcmTokenReady');
      window.removeEventListener('fcmTokenReady', handleFcmTokenReady);
    };
  }, [isNative, savePushToken, toast]);



  // Configuration au montage
  useEffect(() => {
    if (!user) return;

    const initializePushNotifications = async () => {
      console.log('🚀 [INIT] Initialisation système de notifications...');
      console.log('📱 [INIT] isNative:', isNative);
      console.log('📱 [INIT] CapacitorForceNative:', (window as any).CapacitorForceNative);
      console.log('📱 [INIT] AndroidBridge:', typeof (window as any).AndroidBridge);
      console.log('📱 [INIT] Capacitor.getPlatform():', Capacitor.getPlatform());
      
      // 🔥 VÉRIFIER FLAG GLOBAL
      if ((window as any).__pushNotificationSystemInitialized) {
        console.log('⚠️ [INIT] Système déjà initialisé, skip');
        return;
      }
      
      // ✅ Vérifier le statut au montage (SANS auto-register)
      console.log('1️⃣ [INIT] Vérification du statut des permissions...');
      await checkPermissionStatus();

      // Configurer les listeners natifs immédiatement
      if (isNative) {
        console.log('2️⃣ [INIT] Configuration des listeners...');
        await setupPushListeners();
        
        // 🎯 MODIFIÉ: Ne PAS forcer l'enregistrement automatiquement
        try {
          console.log('3️⃣ [INIT] Vérification des permissions Capacitor...');
          const status = await PushNotifications.checkPermissions();
          console.log('📱 [INIT] Statut permissions:', status.receive);
          
          if (status.receive === 'granted') {
            console.log('✅ [INIT] Permissions déjà accordées');
            
            // ✅ NOUVEAU: Vérifier si un token existe en base
            console.log('4️⃣ [INIT] Vérification du token en base...');
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', user.id)
              .single();
            
            if (profile?.push_token) {
              console.log('✅ [INIT] Token existant trouvé:', profile.push_token.substring(0, 20) + '...');
              setToken(profile.push_token);
              setIsRegistered(true);
            } else {
              console.log('⚠️ [INIT] Permissions OK mais pas de token en base');
              console.log('ℹ️ [INIT] Appel PushNotifications.register() pour obtenir le token...');
              // 🔥 APPELER register() POUR OBTENIR LE TOKEN
              try {
                await PushNotifications.register();
                console.log('✅ [INIT] PushNotifications.register() appelé avec succès');
              } catch (registerError) {
                console.error('❌ [INIT] Erreur lors de register():', registerError);
              }
              setIsRegistered(false);
            }
          } else {
            console.log('ℹ️ [INIT] Permissions non accordées');
            setIsRegistered(false);
          }
          
          console.log('✅ [INIT] Initialisation terminée avec succès');
        } catch (error) {
          console.error('❌ [INIT] Erreur initialisation push:', error);
        }
      } else {
        console.log('ℹ️ [INIT] Mode web, pas de configuration native');
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