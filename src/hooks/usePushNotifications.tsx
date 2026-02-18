import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';
import { isReallyNative } from '@/lib/nativeDetection';

// Debug logger — silent in production
const DEBUG = import.meta.env.DEV;
const log = (...args: any[]) => { if (DEBUG) console.log(...args); };
const logError = (...args: any[]) => console.error(...args);

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

  const [isNative, setIsNative] = useState(isReallyNative);
  const isSupported = isNative || ('Notification' in window);

  // ─── HELPERS ─────────────────────────────────────────────

  const checkPermissionStatus = useCallback(async () => {
    try {
      if (isNative) {
        const androidState = (window as any).androidPermissions?.notifications;
        if (androidState) {
          const granted = androidState === 'granted';
          setPermissionStatus({ granted, denied: !granted, prompt: false });
          setIsRegistered(granted);
          return;
        }
        const status = await PushNotifications.checkPermissions();
        const granted = status.receive === 'granted';
        const denied = status.receive === 'denied';
        setPermissionStatus({ granted, denied, prompt: !granted && !denied });
        setIsRegistered(granted);
      } else if ('Notification' in window) {
        const p = Notification.permission;
        setPermissionStatus({ granted: p === 'granted', denied: p === 'denied', prompt: p === 'default' });
        setIsRegistered(p === 'granted');
      }
    } catch (e) {
      logError('[PUSH] checkPermissionStatus error:', e);
    }
  }, [isNative]);

  /** Save token to DB — with retry if profile doesn't exist yet */
  const savePushToken = useCallback(async (pushToken: string): Promise<boolean> => {
    if (!user) {
      log('[PUSH] No user, storing token in memory');
      setToken(pushToken);
      return false;
    }

    // Verify Supabase session is ready
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session?.user) {
      log('[PUSH] Session not ready, deferring save');
      setToken(pushToken);
      return false;
    }

    try {
      // Skip if already saved
      const { data: existing } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user.id)
        .maybeSingle();

      // Profile doesn't exist yet — keep token in memory, signal retry needed
      if (!existing) {
        log('[PUSH] Profile not found yet, keeping token in memory for retry');
        setToken(pushToken);
        return false;
      }

      if (existing.push_token === pushToken) {
        log('[PUSH] Token already saved');
        setToken(pushToken);
        setIsRegistered(true);
        return true;
      }

      // Detect platform
      let platform = Capacitor.getPlatform();
      if (platform === 'web' && ((window as any).AndroidBridge || (window as any).fcmToken)) {
        platform = 'android';
      }
      if (typeof (window as any).fcmTokenPlatform === 'string') {
        platform = (window as any).fcmTokenPlatform;
      }

      const { error, count } = await supabase
        .from('profiles')
        .update({
          push_token: pushToken,
          push_token_platform: platform,
          push_token_updated_at: new Date().toISOString(),
          notifications_enabled: true
        })
        .eq('user_id', user.id);

      if (error) {
        logError('[PUSH] Save token error:', error.code, error.message);
        setToken(pushToken);
        return false;
      }

      log('[PUSH] Token saved successfully');
      setToken(pushToken);
      setIsRegistered(true);

      // Save user_id for Android native
      if ((window as any).AndroidBridge?.saveUserIdForFCM) {
        try { (window as any).AndroidBridge.saveUserIdForFCM(user.id); } catch {}
      }
      return true;
    } catch (e) {
      logError('[PUSH] Exception saving token:', e);
      setToken(pushToken);
      return false;
    }
  }, [user]);

  // ─── NOTIFICATION TAP ────────────────────────────────────

  const handleNotificationTap = useCallback((data: any) => {
    const actionData = data?.actionData || data?.data || {};
    switch (actionData.type) {
      case 'message':
        navigate(actionData.conversation_id ? `/messages?conversation=${actionData.conversation_id}` : '/messages');
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
    }
  }, [navigate]);

  // ─── SETUP LISTENERS (once) ──────────────────────────────

  const setupPushListeners = useCallback(async () => {
    if (!isNative || (window as any).__pushNotificationSystemInitialized) return;

    log('[PUSH] Setting up listeners...');

    // Request token via AndroidBridge if available
    if ((window as any).AndroidBridge?.getFCMToken) {
      try { (window as any).AndroidBridge.getFCMToken(); } catch {}
    }

    try {
      await PushNotifications.addListener('registration', async (t) => {
        log('[PUSH] Registration token received');
        if (t.value) {
          setToken(t.value);
          setIsRegistered(true);
          await savePushToken(t.value);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        logError('[PUSH] Registration error:', error);
        setIsRegistered(false);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        log('[PUSH] Notification received:', notification.title);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        handleNotificationTap(notification.notification);
      });

      (window as any).__pushNotificationSystemInitialized = true;
      log('[PUSH] Listeners configured');
    } catch (e) {
      logError('[PUSH] Listener setup error:', e);
    }
  }, [isNative, savePushToken, handleNotificationTap]);

  // ─── REQUEST PERMISSIONS ─────────────────────────────────

  const requestPermissions = async (): Promise<boolean> => {
    if (!isNative) {
      toast({ title: "Non supporté", description: "Les notifications nécessitent l'application mobile", variant: "destructive" });
      return false;
    }

    const platform = Capacitor.getPlatform();

    // iOS
    if (platform === 'ios') {
      try {
        const result = await PushNotifications.requestPermissions();
        const granted = result.receive === 'granted';
        if (granted) {
          await PushNotifications.register();
          setPermissionStatus({ granted: true, denied: false, prompt: false });
          setIsRegistered(true);
        } else {
          setPermissionStatus({ granted: false, denied: true, prompt: false });
          toast({ title: "Notifications désactivées", description: "Activez les notifications dans les réglages iOS", variant: "destructive" });
        }
        return granted;
      } catch (e) {
        logError('[PUSH] iOS permission error:', e);
        return false;
      }
    }

    // Android
    const androidState = (window as any).androidPermissions?.notifications;
    if (androidState === 'granted') {
      await checkPermissionStatus();
      return true;
    }

    toast({ title: "Permission manquante", description: "Les notifications sont demandées au démarrage de l'app.", variant: "destructive" });
    return false;
  };

  // ─── TEST NOTIFICATION ───────────────────────────────────

  const testNotification = useCallback(async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }

    try {
      // 1. Récupérer le token directement depuis la DB (fiable)
      console.log('[PUSH TEST] Fetching token for user:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[PUSH TEST] Profile result:', { profile, error: profileError });

      if (profileError) {
        toast({ title: "Erreur DB", description: profileError.message, variant: "destructive" });
        return;
      }

      const dbToken = profile?.push_token;
      if (!dbToken || dbToken.length < 50) {
        toast({ 
          title: "Aucun token enregistré", 
          description: `user_id: ${user.id?.substring(0, 8)}... — token: ${dbToken ? dbToken.substring(0, 10) + '...' : 'null'}`, 
          variant: "destructive" 
        });
        return;
      }

      // 2. Vérifier la session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Session expirée", description: "Reconnectez-vous", variant: "destructive" });
        return;
      }

      // 3. Appeler l'edge function
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          user_id: user.id,
          title: 'Test RunConnect',
          body: 'Vos notifications fonctionnent parfaitement ! 🎉',
          type: 'test',
          data: { test: true }
        }
      });

      if (error) {
        toast({ title: "Erreur serveur", description: "Vérifiez les logs Supabase", variant: "destructive" });
        return;
      }

      if (data?.fcm_sent) {
        toast({ title: "✅ Notification envoyée !", description: "Vérifiez votre barre de notification" });
      } else if (data?.web_only) {
        toast({ title: "Token web", description: "Le token enregistré n'est pas un token mobile" });
      } else {
        toast({ title: "Notification créée", description: "Enregistrée mais non envoyée (token invalide ?)" });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Une erreur est survenue", variant: "destructive" });
    }
  }, [user, toast]);

  // ─── useEffect #1: INIT (once per user) ──────────────────

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      if ((window as any).__pushNotificationSystemInitialized) {
        // Already initialized, just sync state from DB
        try {
          const { data: profile } = await supabase.from('profiles').select('push_token').eq('user_id', user.id).single();
          if (profile?.push_token) {
            setToken(profile.push_token);
            setIsRegistered(true);
          }
        } catch {}
        return;
      }

      await checkPermissionStatus();

      if (isNative) {
        await setupPushListeners();

        try {
          const status = await PushNotifications.checkPermissions();
          if (status.receive === 'granted') {
            const { data: profile } = await supabase.from('profiles').select('push_token').eq('user_id', user.id).single();
            if (profile?.push_token) {
              setToken(profile.push_token);
              setIsRegistered(true);
            } else {
              await PushNotifications.register();
            }
          }
        } catch (e) {
          logError('[PUSH] Init error:', e);
        }
      }
    };

    init();
  }, [user, isNative, setupPushListeners, checkPermissionStatus]);

  // ─── useEffect #2: TOKEN RETRY (persistent, for new users) ──

  useEffect(() => {
    if (!user || !isNative) return;
    if (isRegistered) return; // Already saved, no need to retry

    let attempts = 0;
    const maxAttempts = 12; // 12 x 10s = 2 minutes

    const tryRecover = async () => {
      // Check DB first
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.push_token) {
          log('[PUSH] Token already in DB, syncing state');
          setToken(profile.push_token);
          setIsRegistered(true);
          return true;
        }
      } catch {}

      // Try saving from window.fcmToken or local state
      const pendingToken = token || (window as any).fcmToken;
      if (pendingToken && typeof pendingToken === 'string' && pendingToken.length > 50) {
        log('[PUSH] Retry saving token, attempt', attempts + 1);
        const saved = await savePushToken(pendingToken);
        if (saved) return true;
      }
      return false;
    };

    // Immediate attempt
    tryRecover();

    // Then retry every 10s for up to 2 minutes
    const interval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        return;
      }
      const done = await tryRecover();
      if (done) clearInterval(interval);
    }, 10000);

    return () => clearInterval(interval);
  }, [user, isNative, isRegistered, savePushToken, token]);

  // ─── useEffect #3: fcmTokenReady listener ────────────────

  useEffect(() => {
    if (!isNative) return;

    const handleFcmTokenReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; platform: string; attempt?: number }>;
      const t = customEvent.detail?.token;

      if (t && !(window as any).__fcmTokenReceived) {
        log('[PUSH] fcmTokenReady received');
        (window as any).__fcmTokenReceived = true;
        setToken(t);
        setIsRegistered(true);
        savePushToken(t);
      }
    };

    window.addEventListener('fcmTokenReady', handleFcmTokenReady);
    (window as any).__fcmListenerReady = true;
    document.dispatchEvent(new CustomEvent('ReactListenerReady'));

    // Check if window.fcmToken was already injected before React mounted
    const existingToken = (window as any).fcmToken;
    if (existingToken && typeof existingToken === 'string' && existingToken.length > 50 && !(window as any).__fcmTokenReceived) {
      log('[PUSH] window.fcmToken already present at mount, saving...');
      (window as any).__fcmTokenReceived = true;
      setToken(existingToken);
      setIsRegistered(true);
      savePushToken(existingToken);
    }

    return () => {
      window.removeEventListener('fcmTokenReady', handleFcmTokenReady);
    };
  }, [isNative, savePushToken]);

  // ─── useEffect #4: App resume ────────────────────────────

  useEffect(() => {
    if (!user || !isNative) return;

    let appStateListener: any;

    import('@capacitor/app').then(({ App }) => {
      appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) return;
        log('[PUSH] App resumed, checking token...');

        try {
          const status = await PushNotifications.checkPermissions();
          if (status.receive === 'granted') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', user.id)
              .single();

            if (profile?.push_token) {
              setToken(profile.push_token);
              setIsRegistered(true);
            } else {
              await PushNotifications.register();
            }
          }
        } catch (e) {
          logError('[PUSH] Resume check error:', e);
        }
      });
    }).catch((err) => {
      console.warn('⚠️ @capacitor/app import failed (non-fatal):', err);
    });

    return () => {
      if (appStateListener) appStateListener.remove();
    };
  }, [user, isNative]);

  // ─── Native detection polling (first 5s) ─────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      const native = isReallyNative();
      if (native !== isNative) setIsNative(native);
    }, 500);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isNative]);

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
    forceNativeNotificationCheck: checkPermissionStatus,
    tokenNeedsRenewal: false,
    tokenSaving: false
  };
};
