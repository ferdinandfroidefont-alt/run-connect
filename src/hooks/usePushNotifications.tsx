import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';
import { isReallyNative } from '@/lib/nativeDetection';

// Always log push-critical events (needed for iOS prod debugging via Safari/Xcode)
const log = (...args: any[]) => console.log('[PUSH]', ...args);
const logError = (...args: any[]) => console.error('[PUSH]', ...args);

const SUPABASE_URL = 'https://dbptgehpknjsoisirviz.supabase.co';

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
      logError('checkPermissionStatus error:', e);
    }
  }, [isNative]);

  /** Detect platform — prioritize iOS detection */
  const detectPlatform = useCallback((): string => {
    const capPlatform = Capacitor.getPlatform();
    // iOS first — no ambiguity
    if (capPlatform === 'ios') return 'ios';
    // Android detection
    if (capPlatform === 'android') return 'android';
    if ((window as any).AndroidBridge || (window as any).fcmToken) return 'android';
    if (typeof (window as any).fcmTokenPlatform === 'string') return (window as any).fcmTokenPlatform;
    return capPlatform;
  }, []);

  /** Save token via edge function (bypasses RLS) */
  const saveTokenViaEdgeFunction = useCallback(async (pushToken: string, userId: string, platform: string): Promise<boolean> => {
    try {
      log('Saving token via edge function, platform:', platform);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/save-push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, token: pushToken, platform })
      });
      if (response.ok) {
        log('✅ Token saved via edge function');
        return true;
      }
      const errBody = await response.text();
      logError('Edge function save failed:', response.status, errBody);
      return false;
    } catch (e) {
      logError('Edge function fetch error:', e);
      return false;
    }
  }, []);

  /** Save token to DB — with retry if profile doesn't exist yet */
  const savePushToken = useCallback(async (pushToken: string): Promise<boolean> => {
    if (!user) {
      log('No user, storing token in memory');
      setToken(pushToken);
      return false;
    }

    // Verify Supabase session is ready
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session?.user) {
      log('Session not ready, deferring save');
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
        log('Profile not found yet, keeping token in memory for retry');
        setToken(pushToken);
        return false;
      }

      if (existing.push_token === pushToken) {
        log('Token already saved');
        setToken(pushToken);
        setIsRegistered(true);
        return true;
      }

      const platform = detectPlatform();
      log('Saving token via Supabase client, platform:', platform);

      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: pushToken,
          push_token_platform: platform,
          push_token_updated_at: new Date().toISOString(),
          notifications_enabled: true
        })
        .eq('user_id', user.id);

      if (error) {
        logError('Save token error (client):', error.code, error.message);
        // Fallback: try edge function
        log('Trying edge function fallback...');
        const edgeSaved = await saveTokenViaEdgeFunction(pushToken, user.id, platform);
        if (edgeSaved) {
          setToken(pushToken);
          setIsRegistered(true);
          return true;
        }
        setToken(pushToken);
        return false;
      }

      log('✅ Token saved successfully via client');
      setToken(pushToken);
      setIsRegistered(true);

      // Save user_id for Android native
      if ((window as any).AndroidBridge?.saveUserIdForFCM) {
        try { (window as any).AndroidBridge.saveUserIdForFCM(user.id); } catch {}
      }
      return true;
    } catch (e) {
      logError('Exception saving token:', e);
      setToken(pushToken);
      return false;
    }
  }, [user, detectPlatform, saveTokenViaEdgeFunction]);

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

    log('Setting up listeners...');

    // Request token via AndroidBridge if available
    if ((window as any).AndroidBridge?.getFCMToken) {
      try { (window as any).AndroidBridge.getFCMToken(); } catch {}
    }

    try {
      await PushNotifications.addListener('registration', async (t) => {
        log('📱 Registration token received, length:', t.value?.length);
        if (t.value) {
          setToken(t.value);
          setIsRegistered(true);
          const saved = await savePushToken(t.value);

          // Fallback: if save failed or token not in DB after 3s, use edge function
          if (!saved && user) {
            setTimeout(async () => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('push_token')
                  .eq('user_id', user.id)
                  .maybeSingle();

                if (!profile?.push_token || profile.push_token !== t.value) {
                  log('⚠️ Token not in DB after 3s, using edge function fallback');
                  const platform = detectPlatform();
                  await saveTokenViaEdgeFunction(t.value, user.id, platform);
                }
              } catch (e) {
                logError('Fallback check error:', e);
              }
            }, 3000);
          }
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        logError('❌ Registration error:', JSON.stringify(error));
        setIsRegistered(false);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        log('Notification received:', notification.title);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        handleNotificationTap(notification.notification);
      });

      (window as any).__pushNotificationSystemInitialized = true;
      log('✅ Listeners configured');
    } catch (e) {
      logError('Listener setup error:', e);
    }
  }, [isNative, savePushToken, handleNotificationTap, user, detectPlatform, saveTokenViaEdgeFunction]);

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
        log('🍎 Requesting iOS permissions...');
        const result = await PushNotifications.requestPermissions();
        const granted = result.receive === 'granted';
        log('🍎 iOS permission result:', result.receive);
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
        logError('iOS permission error:', e);
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

      let dbToken = profile?.push_token;

      // If no token in DB, try to recover from memory and save via edge function
      if (!dbToken || dbToken.length < 50) {
        const memoryToken = token || (window as any).fcmToken || (window as any).__fcmTokenBuffer;
        
        if (memoryToken && typeof memoryToken === 'string' && memoryToken.length > 50) {
          console.log('[PUSH TEST] Token found in memory, saving via edge function...');
          const platform = detectPlatform();
          const saved = await saveTokenViaEdgeFunction(memoryToken, user.id, platform);
          if (saved) {
            dbToken = memoryToken;
          }
        }

        if (!dbToken || dbToken.length < 50) {
          toast({ 
            title: "Aucun token enregistré", 
            description: `user_id: ${user.id?.substring(0, 8)}... — token: ${dbToken ? dbToken.substring(0, 10) + '...' : 'null'}`, 
            variant: "destructive" 
          });
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Session expirée", description: "Reconnectez-vous", variant: "destructive" });
        return;
      }

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
  }, [user, toast, token, detectPlatform, saveTokenViaEdgeFunction]);

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
        // IMPORTANT: setup listeners FIRST, then register
        await setupPushListeners();

        // Small delay to ensure listeners are fully attached before register()
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
          const status = await PushNotifications.checkPermissions();
          const platform = Capacitor.getPlatform();
          log('Permission status:', status.receive, '| Platform:', platform);
          
          if (status.receive === 'granted') {
            const { data: profile } = await supabase.from('profiles').select('push_token').eq('user_id', user.id).single();
            if (profile?.push_token) {
              log('Token already in DB, syncing');
              setToken(profile.push_token);
              setIsRegistered(true);
            } else {
              log('No token in DB, calling register()...');
              await PushNotifications.register();
              log('register() called successfully');

              // iOS retry: if no token received after 5s, retry register()
              if (platform === 'ios') {
                setTimeout(async () => {
                  try {
                    const { data: checkProfile } = await supabase
                      .from('profiles')
                      .select('push_token')
                      .eq('user_id', user.id)
                      .maybeSingle();

                    if (!checkProfile?.push_token) {
                      log('⚠️ iOS: No token after 5s, retrying register()...');
                      await PushNotifications.register();
                    }
                  } catch (e) {
                    logError('iOS retry error:', e);
                  }
                }, 5000);
              }
            }
          } else if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
            log('Requesting permissions...');
            const permResult = await PushNotifications.requestPermissions();
            log('Permission result:', permResult.receive);
            if (permResult.receive === 'granted') {
              log('Permissions granted, registering...');
              await PushNotifications.register();
            }
          }
        } catch (e) {
          logError('Init error:', e);
        }
      }
    };

    init();
  }, [user, isNative, setupPushListeners, checkPermissionStatus]);

  // ─── useEffect #2: TOKEN RETRY (persistent, for new users) ──

  useEffect(() => {
    if (!user) return;
    if (isRegistered) return;

    let attempts = 0;
    const maxAttempts = 12;

    const tryRecover = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.push_token) {
          log('Token already in DB, syncing state');
          setToken(profile.push_token);
          setIsRegistered(true);
          return true;
        }
      } catch {}

      const pendingToken = token || (window as any).fcmToken || (window as any).__fcmTokenBuffer;
      if (pendingToken && typeof pendingToken === 'string' && pendingToken.length > 50) {
        log('Retry saving token, attempt', attempts + 1);
        const saved = await savePushToken(pendingToken);
        if (saved) return true;
      }
      return false;
    };

    tryRecover();

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
  }, [user, isRegistered, savePushToken, token]);

  // ─── useEffect #3: fcmTokenReady listener ────────────────

  useEffect(() => {
    const handleFcmTokenReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; platform: string; attempt?: number }>;
      const t = customEvent.detail?.token;

      if (t && !(window as any).__fcmTokenReceived) {
        log('fcmTokenReady received — forcing native mode');
        (window as any).__fcmTokenReceived = true;
        setIsNative(true);
        setToken(t);
        setIsRegistered(true);
        savePushToken(t);
      }
    };

    window.addEventListener('fcmTokenReady', handleFcmTokenReady);
    (window as any).__fcmListenerReady = true;
    document.dispatchEvent(new CustomEvent('ReactListenerReady'));

    const existingToken = (window as any).fcmToken || (window as any).__fcmTokenBuffer;
    if (existingToken && typeof existingToken === 'string' && existingToken.length > 50 && !(window as any).__fcmTokenReceived) {
      log('window.fcmToken/buffer already present at mount, saving...');
      (window as any).__fcmTokenReceived = true;
      setIsNative(true);
      setToken(existingToken);
      setIsRegistered(true);
      savePushToken(existingToken);
    }

    return () => {
      window.removeEventListener('fcmTokenReady', handleFcmTokenReady);
    };
  }, [savePushToken]);

  // ─── useEffect #4: App resume ────────────────────────────

  useEffect(() => {
    if (!user || !isNative) return;

    let appStateListener: any;

    import('@capacitor/app').then(({ App }) => {
      appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) return;
        log('App resumed, checking token...');

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
          logError('Resume check error:', e);
        }
      });
    }).catch((err) => {
      console.warn('⚠️ @capacitor/app import failed (non-fatal):', err);
    });

    return () => {
      if (appStateListener) appStateListener.remove();
    };
  }, [user, isNative]);

  // ─── Native detection polling (first 15s) ─────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      const native = isReallyNative();
      if (native !== isNative) setIsNative(native);
    }, 500);
    const timeout = setTimeout(() => clearInterval(interval), 15000);

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
