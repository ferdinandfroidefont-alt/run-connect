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
  
  // 🔥 NIVEAU 8: Track if token is being saved to database
  const [tokenSaving, setTokenSaving] = useState(false);
  
  // 🔥 DÉTECTION NATIVE RÉACTIVE (useState pour re-render quand AndroidBridge arrive)
  const [isNative, setIsNative] = useState(() => {
    return (window as any).CapacitorForceNative === true || 
           Capacitor.isNativePlatform() || 
           typeof (window as any).AndroidBridge !== 'undefined';
  });
  
  const isSupported = isNative || ('Notification' in window);
  
  // 🔥 HELPER: Re-vérifier isNative en temps réel
  const recheckNativeNow = useCallback(() => {
    const nativeNow = (window as any).CapacitorForceNative === true || 
                      Capacitor.isNativePlatform() || 
                      typeof (window as any).AndroidBridge !== 'undefined';
    
    if (nativeNow !== isNative) {
      console.log('🔄 [NATIVE] Détection mise à jour:', isNative, '→', nativeNow);
      setIsNative(nativeNow);
    }
    return nativeNow;
  }, [isNative]);

  // 🔄 Re-vérifier isNative dynamiquement pendant les 10 premières secondes + listeners permanents
  useEffect(() => {
    // Vérifier toutes les 500ms pendant les 10 premières secondes (augmenté de 5s)
    const interval = setInterval(recheckNativeNow, 500);
    setTimeout(() => clearInterval(interval), 10000);

    // Écouter l'événement capacitorNativeReady
    window.addEventListener('capacitorNativeReady', recheckNativeNow);
    
    // 🔥 NOUVEAU: Listener PERMANENT pour androidPermissionsUpdated
    const handleAndroidUpdate = () => {
      console.log('🔄 [NATIVE] Événement androidPermissionsUpdated reçu');
      recheckNativeNow();
    };
    window.addEventListener('androidPermissionsUpdated', handleAndroidUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('capacitorNativeReady', recheckNativeNow);
      window.removeEventListener('androidPermissionsUpdated', handleAndroidUpdate);
    };
  }, [recheckNativeNow]);
  
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
    
    // 🔥 RE-VÉRIFICATION IMMÉDIATE avant d'agir
    const isCurrentlyNative = recheckNativeNow();
    const currentPlatform = Capacitor.getPlatform();
    
    if (!isCurrentlyNative) {
      console.log('❌ Mode web détecté, notifications non supportées');
      console.log('📱 [REQUEST] CapacitorForceNative:', (window as any).CapacitorForceNative);
      console.log('📱 [REQUEST] AndroidBridge:', typeof (window as any).AndroidBridge);
      toast({
        title: "Non supporté",
        description: "Les notifications nécessitent l'application mobile",
        variant: "destructive"
      });
      return false;
    }
    
    // 🍎 iOS: Utiliser directement Capacitor PushNotifications (déclenche la popup native iOS)
    if (currentPlatform === 'ios') {
      console.log('🍎🔔 [REQUEST] Demande permissions notifications iOS via Capacitor');
      try {
        const permResult = await PushNotifications.requestPermissions();
        const granted = permResult.receive === 'granted';
        
        console.log('🍎🔔 [REQUEST] Résultat popup iOS:', granted ? 'GRANTED ✅' : 'DENIED ❌');
        
        if (granted) {
          // Enregistrer pour recevoir les notifications
          await PushNotifications.register();
          
          setPermissionStatus({
            granted: true,
            denied: false,
            prompt: false
          });
          setIsRegistered(true);
          
          toast({
            title: "Notifications activées",
            description: "Vous recevrez les notifications de RunConnect"
          });
        } else {
          setPermissionStatus({
            granted: false,
            denied: true,
            prompt: false
          });
          
          toast({
            title: "Notifications désactivées",
            description: "Activez les notifications dans les réglages iOS",
            variant: "destructive"
          });
        }
        
        return granted;
      } catch (error) {
        console.error('🍎🔔 [REQUEST] Erreur iOS:', error);
        toast({
          title: "Erreur",
          description: "Impossible de configurer les notifications",
          variant: "destructive"
        });
        return false;
      }
    }
    
    // 🤖 Android: Logique existante
    // ✅ Vérifier Google Play Services (requis pour FCM)
    if (currentPlatform === 'android') {
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
        console.log('🤖✅ [REQUEST] Permissions déjà accordées');
        
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
        console.log('🤖⚠️ [REQUEST] Permissions non accordées');
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
    console.log('💾 [SAVE] savePushToken appelé');
    console.log('💾 [SAVE] user:', user ? user.id : 'undefined');
    console.log('💾 [SAVE] pushToken:', pushToken.substring(0, 30) + '...');
    
    if (!user) {
      console.log('⏳ [SAVE_TOKEN] User non défini, token en attente:', pushToken.substring(0, 30) + '...');
      console.log('📊 [SAVE_TOKEN] État actuel - user:', user ? 'exists' : 'null', '| pendingToken:', pendingToken ? 'exists' : 'null');
      setPendingToken(pushToken);
      setToken(pushToken);
      return;
    }

    // 🔥 NIVEAU 23: Logs détaillés avant UPDATE
    console.log('💾 [SAVE_TOKEN] ========== DÉBUT SAUVEGARDE TOKEN ==========');
    console.log('💾 [SAVE_TOKEN] user.id:', user.id);
    console.log('💾 [SAVE_TOKEN] token:', pushToken.substring(0, 40) + '...');
    console.log('💾 [SAVE_TOKEN] token longueur:', pushToken.length);

    // 🔥 NIVEAU 25: Vérifier que la session Supabase est prête
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData?.session?.user) {
      console.error('❌ [SAVE_TOKEN] Session Supabase non disponible !');
      console.error('❌ [SAVE_TOKEN] sessionError:', sessionError);
      console.error('❌ [SAVE_TOKEN] session:', sessionData?.session ? 'exists' : 'null');
      
      // Retry après 2 secondes
      console.log('⏳ [SAVE_TOKEN] Retry dans 2s (attente session Supabase)...');
      setTimeout(() => {
        console.log('🔁 [SAVE_TOKEN_RETRY] Nouvelle tentative après délai session...');
        savePushToken(pushToken);
      }, 2000);
      return;
    }

    console.log('✅ [SAVE_TOKEN] Session Supabase confirmée, auth.uid():', sessionData.session.user.id);

    // 🔥 NIVEAU 8: Signaler début de sauvegarde
    setTokenSaving(true);

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
      
      console.log('💾 [SAVE_TOKEN] UPDATE envoyé, attente réponse...');
      
      if (error) {
        console.error(`❌ [SAVE_TOKEN] ========== ERREUR UPDATE SUPABASE ==========`);
        console.error(`❌ [SAVE_TOKEN] Error code:`, error.code);
        console.error(`❌ [SAVE_TOKEN] Error message:`, error.message);
        console.error(`❌ [SAVE_TOKEN] Error details:`, error.details);
        console.error(`❌ [SAVE_TOKEN] Error hint:`, error.hint);
        
        // 🔥 NIVEAU 25: Si erreur RLS, afficher un message clair
        if (error.code === '42501' || error.message.includes('row-level security')) {
          console.error(`❌ [SAVE_TOKEN] ⚠️ ERREUR RLS: auth.uid() ne correspond pas à user_id`);
          console.error(`❌ [SAVE_TOKEN] Cela signifie que la session Supabase n'est pas encore prête`);
          
          toast({
            title: "Session non prête",
            description: "Retry automatique dans 2s...",
          });
          
          // Retry après 2 secondes
          setTimeout(() => {
            console.log('🔁 [SAVE_TOKEN_RLS_RETRY] Retry après erreur RLS...');
            savePushToken(pushToken);
          }, 2000);
          return;
        }
        
        toast({
          title: "Erreur sauvegarde",
          description: `${error.message} (code: ${error.code})`,
          variant: "destructive"
        });
        throw error;
      }
      
      console.log('✅ [SAVE_TOKEN] UPDATE réussi (pas d\'erreur retournée)');

      console.log('✅ [SAVE_TOKEN] UPDATE réussi, vérification en cours...');
      
      // 🔥 NIVEAU 8: VÉRIFICATION - Token vraiment dans la base ?
      const { data: verification } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user.id)
        .single();
      
      if (verification?.push_token === pushToken) {
        console.log('✅✅✅ [FCM] Token CONFIRMÉ dans la base !');
        setToken(pushToken);
        setIsRegistered(true);
        setPendingToken(null);
        
        // 🆕 NIVEAU 11 : Sauvegarder user_id dans SharedPreferences pour Android natif
        if ((window as any).AndroidBridge) {
          try {
            (window as any).AndroidBridge.saveUserIdForFCM(user.id);
            console.log('✅ [FCM] user_id sauvegardé pour Android natif');
          } catch (e) {
            console.error('❌ [FCM] Erreur sauvegarde user_id:', e);
          }
        }
      } else {
        console.error('❌ [FCM] ERREUR: Token pas trouvé dans la base après update !');
        setToken('');
        setIsRegistered(false);
        throw new Error('Token non sauvegardé');
      }
    } catch (error) {
      console.error('❌ Exception sauvegarde token:', error);
      setToken('');
      setIsRegistered(false);
    } finally {
      // 🔥 NIVEAU 8: Signaler fin de sauvegarde
      setTokenSaving(false);
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
      
      case 'challenge_almost_done':
      case 'challenge_completed':
      case 'challenge_reminder':
        navigate('/leaderboard');
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

    // 🔥 NIVEAU 8: Vérifier si sauvegarde en cours
    if (tokenSaving) {
      toast({
        title: "Sauvegarde en cours...",
        description: "Le token est en cours de sauvegarde. Réessayez dans 2 secondes.",
        variant: "default"
      });
      return;
    }

    // 🔥 AMÉLIORATION: Détection native multi-critères robuste
    const nativeIndicators = {
      capacitorForceNative: (window as any).CapacitorForceNative === true,
      androidBridge: typeof (window as any).AndroidBridge !== 'undefined',
      fcmToken: typeof (window as any).fcmToken === 'string' && (window as any).fcmToken.length > 50,
      capacitorNative: Capacitor.isNativePlatform(),
      protocolNative: window.location.protocol === 'file:' || window.location.protocol === 'capacitor:',
      webViewUserAgent: /Android.*wv|WebView/i.test(navigator.userAgent)
    };
    
    const nativeScore = Object.values(nativeIndicators).filter(Boolean).length;
    const isCurrentlyNative = nativeScore >= 1 || nativeIndicators.fcmToken || nativeIndicators.androidBridge;
    
    console.log('🔍 [TEST] Détection native multi-critères:', nativeIndicators);
    console.log('🔍 [TEST] Score natif:', nativeScore, '/ 6, isNative:', isCurrentlyNative);
    
    if (!isCurrentlyNative) {
      console.log('❌ [TEST] Mode web détecté - aucun indicateur natif trouvé');
      
      toast({
        title: "Mode Web détecté",
        description: "Installez l'app Android pour recevoir les notifications push",
        variant: "default"
      });
      return;
    }

    // 🔥 NIVEAU 8: Vérifier window.fcmToken ET variable d'état
    const fcmToken = (window as any).fcmToken || token;
    
    // Vérifier si on a un token FCM
    if (!fcmToken || fcmToken.length < 50) {
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

    // 🔥 FIX: Vérifier session Supabase AVANT la requête + fallback token mémoire
    let tokenToUse = fcmToken;
    
    try {
      console.log('🔍 [TEST] Vérification token - user.id:', user.id);
      console.log('🔍 [TEST] window.fcmToken disponible:', !!(window as any).fcmToken);
      
      // 1. Vérifier/rafraîchir la session Supabase d'abord
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck?.session?.user) {
        console.log('⚠️ [TEST] Session non synchronisée, refresh...');
        await supabase.auth.refreshSession();
        await new Promise(r => setTimeout(r, 500));
      }
      
      // 2. Requête avec maybeSingle pour éviter erreur si pas de résultat
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('🔍 [TEST] Résultat requête Supabase:', {
        profile,
        error: profileError,
        userId: user.id,
        hasToken: !!profile?.push_token
      });
      
      // 3. Si erreur RLS (42501) ou pas de résultat, utiliser token mémoire comme fallback
      if (profileError) {
        console.warn('⚠️ [TEST] Erreur Supabase (RLS?):', profileError.code, profileError.message);
        
        if (fcmToken && fcmToken.length > 50) {
          console.log('✅ [TEST] Fallback sur token mémoire:', fcmToken.substring(0, 30) + '...');
          tokenToUse = fcmToken;
        } else {
          toast({
            title: "Erreur session",
            description: "Session désynchronisée. Relancez l'app.",
            variant: "destructive"
          });
          return;
        }
      } else if (!profile?.push_token) {
        // Pas de token en base mais on a un token mémoire
        if (fcmToken && fcmToken.length > 50) {
          console.log('⚠️ [TEST] Token absent en base, utilisation du token mémoire');
          tokenToUse = fcmToken;
          
          // Sauvegarder le token en arrière-plan (sans bloquer)
          savePushToken(fcmToken).catch(err => {
            console.warn('⚠️ [TEST] Sauvegarde token en arrière-plan échouée:', err);
          });
        } else {
          console.error('❌ [TEST] Aucun token disponible (ni base, ni mémoire)');
          toast({
            title: "Token non disponible",
            description: "Relancez l'app pour générer un nouveau token",
            variant: "destructive"
          });
          return;
        }
      } else {
        console.log('✅ [TEST] Token confirmé dans la base:', profile.push_token.substring(0, 30) + '...');
        tokenToUse = profile.push_token;
      }
      
    } catch (error: any) {
      console.error('❌ [TEST] Erreur vérification token:', error);
      
      // Fallback sur token mémoire même en cas d'exception
      if (fcmToken && fcmToken.length > 50) {
        console.log('✅ [TEST] Fallback exception sur token mémoire');
        tokenToUse = fcmToken;
      } else {
        toast({
          title: "Erreur vérification",
          description: error?.message || "Impossible de vérifier le token",
          variant: "destructive"
        });
        return;
      }
    }
    
    console.log('✅ [TEST] Token final utilisé:', tokenToUse?.substring(0, 30) + '...');

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
  }, [user, toast, recheckNativeNow, token, savePushToken]);

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

  // 🔥 NIVEAU 21 : Sauvegarder le token après connexion
  useEffect(() => {
    const handleUserAuthenticated = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; userId: string }>;
      const { token, userId } = customEvent.detail;
      
      console.log('🔥 [USER_AUTH] Utilisateur authentifié avec token FCM en attente');
      console.log('🔥 [USER_AUTH] User ID:', userId);
      console.log('🔥 [USER_AUTH] Token:', token.substring(0, 30) + '...');
      
      if (user && user.id === userId) {
        console.log('✅ [USER_AUTH] Sauvegarde du token immédiatement...');
        savePushToken(token);
      } else {
        console.log('⏳ [USER_AUTH] User pas encore synchronisé, réessai dans 1s...');
        setTimeout(() => {
          if (user) {
            console.log('✅ [USER_AUTH] User maintenant disponible, sauvegarde du token...');
            savePushToken(token);
          }
        }, 1000);
      }
    };
    
    window.addEventListener('userAuthenticatedWithFCMToken', handleUserAuthenticated);
    
    return () => {
      window.removeEventListener('userAuthenticatedWithFCMToken', handleUserAuthenticated);
    };
  }, [user, savePushToken]);

  // 🔥 NIVEAU 23 : Récupération garantie du token FCM même si l'événement est manqué
  useEffect(() => {
    if (!user || !isNative) return;

    const ensureFCMTokenSaved = async () => {
      console.log('🔍 [ENSURE_FCM] Vérification token FCM...');
      
      // 1. Vérifier si un token existe déjà en base
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token, push_token_platform')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.push_token) {
          console.log('✅ [ENSURE_FCM] Token déjà en base:', profile.push_token.substring(0, 30) + '...');
          setToken(profile.push_token);
          setIsRegistered(true);
          return;
        }
        
        console.log('⚠️ [ENSURE_FCM] Pas de token en base, vérification window.fcmToken...');
        
        // 2. Si pas de token en base, vérifier window.fcmToken
        const windowToken = (window as any).fcmToken;
        if (windowToken && typeof windowToken === 'string' && windowToken.length > 50) {
          console.log('🔥 [ENSURE_FCM] Token trouvé dans window.fcmToken !');
          console.log('🔥 [ENSURE_FCM] Token:', windowToken.substring(0, 30) + '...');
          console.log('📱 [ENSURE_FCM] Plateforme:', (window as any).fcmTokenPlatform || 'android');
          
          // 3. Sauvegarder immédiatement
          await savePushToken(windowToken);
          
          toast({
            title: "Token FCM récupéré ✅",
            description: "Notifications activées avec succès",
          });
        } else {
          console.log('⏳ [ENSURE_FCM] window.fcmToken pas encore disponible, retry dans 2s...');
          
          // 4. Retry après 2 secondes (Firebase peut être lent)
          setTimeout(async () => {
            const retryToken = (window as any).fcmToken;
            if (retryToken && typeof retryToken === 'string' && retryToken.length > 50) {
              console.log('🔥 [ENSURE_FCM_RETRY] Token trouvé au retry !');
              await savePushToken(retryToken);
              
              toast({
                title: "Token FCM récupéré ✅",
                description: "Notifications activées (retry réussi)",
              });
            } else {
              console.log('❌ [ENSURE_FCM_RETRY] Toujours pas de token, vérifier Firebase/Play Services');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('❌ [ENSURE_FCM] Erreur:', error);
      }
    };
    
    // 🔥 NIVEAU 25: Exécuter 3 secondes après que user soit disponible (attendre session Supabase)
    const timer = setTimeout(ensureFCMTokenSaved, 3000);
    
    return () => clearTimeout(timer);
  }, [user, isNative, savePushToken, toast]);

  // 🔥 LISTENER POUR fcmTokenReady (dispatché par MainActivity avec retry automatique)
  useEffect(() => {
    if (!isNative) return;

    const handleFcmTokenReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; platform: string; attempt?: number }>;
      const token = customEvent.detail?.token;
      
      if (token && !(window as any).__fcmTokenReceived) {
        const attempt = customEvent.detail?.attempt || 1;
        console.log(`🔥🔥🔥 [FCM_TOKEN_READY] Token reçu (tentative ${attempt}):`, token.substring(0, 30) + '...');
        console.log('👤 [FCM_TOKEN_READY] user:', user ? user.id : 'undefined');
        console.log('📱 [FCM_TOKEN_READY] Plateforme:', customEvent.detail?.platform || 'unknown');
        
        // ✅ NIVEAU 7 : Diagnostic après réception événement
        setTimeout(() => {
          const fcmToken = (window as any).fcmToken;
          if (!fcmToken) {
            console.error('❌ [DIAGNOSTIC] window.fcmToken est vide 1s après fcmTokenReady !');
            console.log('🔁 [DIAGNOSTIC] Tentative récupération via AndroidBridge...');
            
            // Tenter de récupérer via AndroidBridge
            if ((window as any).AndroidBridge?.getFCMToken) {
              const bridgeToken = (window as any).AndroidBridge.getFCMToken();
              console.log('📱 [DIAGNOSTIC] AndroidBridge.getFCMToken() retourne:', bridgeToken?.substring(0, 30));
            }
          } else {
            console.log('✅ [DIAGNOSTIC] window.fcmToken existe:', fcmToken.substring(0, 30) + '...');
          }
        }, 1000);
        
        // ✅ CONFIRMER LA RÉCEPTION (arrête le retry côté Android)
        (window as any).__fcmTokenReceived = true;
        console.log('✅ [FCM_TOKEN_READY] Réception confirmée, retry Android arrêté');
        
        setToken(token);
        setIsRegistered(true);
        savePushToken(token);
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
  
  // ✅ Dispatch événement pour confirmation
  document.dispatchEvent(new CustomEvent('ReactListenerReady'));
  
  // 🔥 DIAGNOSTIC : Vérifier les erreurs FCM injectées par Android
  setTimeout(() => {
    const fcmError = (window as any).fcmError;
    const fcmErrorCode = (window as any).fcmErrorCode;
    const fcmErrorMessage = (window as any).fcmErrorMessage;
    const fcmErrorDetails = (window as any).fcmErrorDetails;
    
    if (fcmError) {
      console.error('🚨 [FCM_DIAGNOSTIC] Erreur détectée:', fcmError);
      
      let errorTitle = "Erreur notifications";
      let errorDescription = "Impossible d'initialiser les notifications push.";
      
      if (fcmError === 'PLAY_SERVICES_UNAVAILABLE') {
        errorTitle = "Google Play Services manquant";
        errorDescription = `Code erreur: ${fcmErrorCode}. FCM nécessite Google Play Services.`;
      } else if (fcmError === 'FIREBASE_INIT_FAILED') {
        errorTitle = "Erreur initialisation Firebase";
        errorDescription = fcmErrorMessage || "Erreur inconnue lors de l'initialisation.";
      } else if (fcmError === 'FIREBASE_TOKEN_FAILED') {
        errorTitle = "Échec récupération token";
        errorDescription = fcmErrorDetails || "Firebase n'a pas pu générer le token.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 10000
      });
    }
  }, 3000); // Vérifier après 3 secondes (laisser le temps à Android d'injecter l'erreur)

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
    tokenNeedsRenewal, // 🔥 Expose si le token a besoin d'être renouvelé
    tokenSaving // 🔥 NIVEAU 8: Exposer l'état de sauvegarde
  };
};