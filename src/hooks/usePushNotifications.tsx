import { useState, useEffect, useCallback, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';
import { isReallyNative } from '@/lib/nativeDetection';

const log = (...args: any[]) => console.log('[PUSH]', ...args);
const logError = (...args: any[]) => console.error('[PUSH]', ...args);

const SUPABASE_URL = 'https://dbptgehpknjsoisirviz.supabase.co';

interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface PushDebugState {
  permissionRequested: boolean;
  permissionResult: string | null;
  registerCalled: boolean;
  registrationEventReceived: boolean;
  apnsHexDetected: boolean;
  fcmTokenEventReceived: boolean;
  fcmTokenLength: number | null;
  selectedFinalToken: string | null;
  saveAttempted: boolean;
  saveResponse: { status: number; body: any } | null;
  backendProfilePushToken: string | null;
  lastError: string | null;
  traceId: string | null;
  timestamp: string;
}

const initialDebug: PushDebugState = {
  permissionRequested: false,
  permissionResult: null,
  registerCalled: false,
  registrationEventReceived: false,
  apnsHexDetected: false,
  fcmTokenEventReceived: false,
  fcmTokenLength: null,
  selectedFinalToken: null,
  saveAttempted: false,
  saveResponse: null,
  backendProfilePushToken: null,
  lastError: null,
  traceId: null,
  timestamp: new Date().toISOString(),
};

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    prompt: true
  });
  const [pushDebug, setPushDebug] = useState<PushDebugState>(initialDebug);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isNative, setIsNative] = useState(isReallyNative);
  const isSupported = isNative || ('Notification' in window);

  const pendingTokenRef = useRef<string | null>(null);
  const listenersSetupRef = useRef(false);
  const iosRetryCountRef = useRef(0);

  const updateDebug = useCallback((partial: Partial<PushDebugState>) => {
    setPushDebug(prev => ({ ...prev, ...partial, timestamp: new Date().toISOString() }));
  }, []);

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

  const detectPlatform = useCallback((): string => {
    const capPlatform = Capacitor.getPlatform();
    if (capPlatform === 'ios') return 'ios';
    if (capPlatform === 'android') return 'android';
    if ((window as any).AndroidBridge || (window as any).fcmToken) return 'android';
    if (typeof (window as any).fcmTokenPlatform === 'string') return (window as any).fcmTokenPlatform;
    return capPlatform;
  }, []);


  /** Save token via edge function WITH Authorization header */
  const saveTokenViaEdgeFunction = useCallback(async (pushToken: string, userId: string, platform: string): Promise<boolean> => {
    const traceId = (window as any).__fcmTraceId || String(Date.now());
    try {
      log('[SAVE] Calling save-push-token edge function traceId=' + traceId);
      updateDebug({ saveAttempted: true, traceId });

      // Get JWT for Authorization
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        logError('[SAVE] No access_token available');
        updateDebug({ lastError: 'No access_token for save-push-token' });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-push-trace-id': traceId,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicHRnZWhwa25qc29pc2lydml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjIxNDUsImV4cCI6MjA3MDIzODE0NX0.D1uw0ui_auBAi-dvodv6j2a9x3lvMnY69cDa9Wupjcs',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/save-push-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: userId, token: pushToken, platform, trace_id: traceId })
      });

      const bodyText = await response.text();
      let bodyJson: any = null;
      try { bodyJson = JSON.parse(bodyText); } catch {}

      log('[SAVE] Response status=' + response.status + ' body=' + bodyText);
      updateDebug({ saveResponse: { status: response.status, body: bodyJson || bodyText } });

      if (response.ok) {
        log('[SAVE] ✅ Token saved via edge function');
        // Verify by reading back
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('user_id', userId)
              .maybeSingle();
            const dbToken = profile?.push_token;
            log('[VERIFY] profiles.push_token length=' + (dbToken?.length || 0) + ' prefix=' + (dbToken?.substring(0, 10) || 'null'));
            updateDebug({ backendProfilePushToken: dbToken || null });
          } catch (e) {
            logError('[VERIFY] Error reading profile:', e);
          }
        }, 2000);
        return true;
      }
      logError('[SAVE] Edge function failed:', response.status, bodyText);
      updateDebug({ lastError: `save-push-token ${response.status}: ${bodyText.substring(0, 200)}` });
      return false;
    } catch (e: any) {
      logError('[SAVE] Exception:', e);
      updateDebug({ lastError: e.message });
      return false;
    }
  }, [updateDebug]);

  /** Refresh debug state from backend */
  const refreshDebugFromBackend = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token, push_token_platform, push_token_updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      updateDebug({ backendProfilePushToken: profile?.push_token || null });
      log('[DEBUG] Backend push_token length=' + (profile?.push_token?.length || 0));
    } catch (e: any) {
      logError('[DEBUG] refresh error:', e);
    }
  }, [user, updateDebug]);

  /** Save token to DB */
  const savePushToken = useCallback(async (pushToken: string): Promise<boolean> => {
    const platform = detectPlatform();
    // No longer filtering APNs tokens on frontend — backend handles validation

    if (!user) {
      log('[SAVE] No user, storing token pending');
      setToken(pushToken);
      pendingTokenRef.current = pushToken;
      (window as any).__pendingPushToken = pushToken;
      return false;
    }

    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session?.user) {
      log('[SAVE] Session not ready, deferring');
      setToken(pushToken);
      pendingTokenRef.current = pushToken;
      (window as any).__pendingPushToken = pushToken;
      return false;
    }

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        log('[SAVE] Profile not found, keeping token pending');
        setToken(pushToken);
        pendingTokenRef.current = pushToken;
        return false;
      }

      if (existing.push_token === pushToken) {
        log('[SAVE] Token already saved');
        setToken(pushToken);
        pendingTokenRef.current = null;
        setIsRegistered(true);
        updateDebug({ selectedFinalToken: pushToken.substring(0, 20) + '...', backendProfilePushToken: pushToken });
        return true;
      }

      log('[SAVE] Saving via Supabase client, platform=' + platform);
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
        logError('[SAVE] Client save error:', error.code, error.message);
        log('[SAVE] Trying edge function fallback...');
        const edgeSaved = await saveTokenViaEdgeFunction(pushToken, user.id, platform);
        if (edgeSaved) {
          setToken(pushToken);
          pendingTokenRef.current = null;
          setIsRegistered(true);
          return true;
        }
        setToken(pushToken);
        pendingTokenRef.current = pushToken;
        return false;
      }

      log('[SAVE] ✅ Token saved via client');
      setToken(pushToken);
      pendingTokenRef.current = null;
      setIsRegistered(true);
      updateDebug({ selectedFinalToken: pushToken.substring(0, 20) + '...' });

      if ((window as any).AndroidBridge?.saveUserIdForFCM) {
        try { (window as any).AndroidBridge.saveUserIdForFCM(user.id); } catch {}
      }
      return true;
    } catch (e: any) {
      logError('[SAVE] Exception:', e);
      updateDebug({ lastError: e.message });
      setToken(pushToken);
      pendingTokenRef.current = pushToken;
      return false;
    }
  }, [user, detectPlatform, saveTokenViaEdgeFunction, updateDebug]);

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

  // ─── SETUP LISTENERS ────────────────────────────────────

  const setupPushListeners = useCallback(async () => {
    if (!isNative || listenersSetupRef.current) return;

    log('[SETUP] Setting up listeners...');

    if ((window as any).AndroidBridge?.getFCMToken) {
      try { (window as any).AndroidBridge.getFCMToken(); } catch {}
    }

    try {
      await PushNotifications.addListener('registration', async (t) => {
        const receivedToken = t.value;
        log('[EVENT] registration received length=' + (receivedToken?.length || 0));
        updateDebug({ registrationEventReceived: true });

        if (!receivedToken) return;

        // Accept ALL tokens (including APNs hex-64) — backend will validate
        const isHex64 = /^[A-Fa-f0-9]{64}$/.test(receivedToken);
        if (isHex64) {
          log('[EVENT] 🍎 APNs hex token detected (64 chars) — saving anyway, FCM will overwrite later');
          updateDebug({ apnsHexDetected: true });
        }

        log('[EVENT] ✅ Token received, saving... length=' + receivedToken.length);
        updateDebug({ fcmTokenLength: receivedToken.length, selectedFinalToken: receivedToken.substring(0, 20) + '...' });
        setToken(receivedToken);
        pendingTokenRef.current = receivedToken;
        (window as any).__pendingPushToken = receivedToken;
        setIsRegistered(true);

        const saved = await savePushToken(receivedToken);
        if (!saved && user) {
          log('[EVENT] Direct save failed, edge function fallback');
          const platform = detectPlatform();
          const edgeSaved = await saveTokenViaEdgeFunction(receivedToken, user.id, platform);
          if (edgeSaved) {
            pendingTokenRef.current = null;
          }
        }

        if (user) {
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('push_token')
                .eq('user_id', user.id)
                .maybeSingle();

              if (!profile?.push_token || profile.push_token !== receivedToken) {
                log('[EVENT] Token not in DB after 3s, edge function fallback');
                const platform = detectPlatform();
                await saveTokenViaEdgeFunction(receivedToken, user.id, platform);
                pendingTokenRef.current = null;
              }
            } catch (e) {
              logError('[EVENT] Fallback check error:', e);
            }
          }, 3000);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        logError('[EVENT] ❌ Registration error:', JSON.stringify(error));
        updateDebug({ lastError: 'registrationError: ' + JSON.stringify(error) });
        setIsRegistered(false);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        log('[EVENT] Notification received:', notification.title);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        handleNotificationTap(notification.notification);
      });

      listenersSetupRef.current = true;
      log('[SETUP] ✅ Listeners configured');
    } catch (e) {
      logError('[SETUP] Error:', e);
    }
  }, [isNative, savePushToken, handleNotificationTap, user, detectPlatform, saveTokenViaEdgeFunction, updateDebug]);

  // ─── REQUEST PERMISSIONS ─────────────────────────────────

  const requestPermissions = async (): Promise<boolean> => {
    if (!isNative) {
      toast({ title: "Non supporté", description: "Les notifications nécessitent l'application mobile", variant: "destructive" });
      return false;
    }

    const platform = Capacitor.getPlatform();
    updateDebug({ permissionRequested: true });

    if (platform === 'ios') {
      try {
        log('[PERM] 🍎 Requesting iOS permissions...');
        const result = await PushNotifications.requestPermissions();
        log('[PERM] 🍎 iOS permission result:', result.receive);
        updateDebug({ permissionResult: result.receive });
        const granted = result.receive === 'granted';
        if (granted) {
          log('[REGISTER] Calling register()...');
          updateDebug({ registerCalled: true });
          await PushNotifications.register();
          log('[REGISTER] register() called successfully');
          setPermissionStatus({ granted: true, denied: false, prompt: false });
          setIsRegistered(true);
        } else {
          setPermissionStatus({ granted: false, denied: true, prompt: false });
          toast({ title: "Notifications désactivées", description: "Activez les notifications dans les réglages iOS", variant: "destructive" });
        }
        return granted;
      } catch (e: any) {
        logError('[PERM] iOS error:', e);
        updateDebug({ lastError: 'permission error: ' + e.message });
        return false;
      }
    }

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
      log('[TEST] Fetching token for user:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        toast({ title: "Erreur DB", description: profileError.message, variant: "destructive" });
        return;
      }

      let dbToken = profile?.push_token;

      if (!dbToken || dbToken.length < 50) {
        const memoryToken = token || pendingTokenRef.current || (window as any).fcmToken || (window as any).__fcmTokenBuffer || (window as any).__pendingPushToken;

        if (memoryToken && typeof memoryToken === 'string' && memoryToken.length > 50) {
          log('[TEST] Token in memory, saving via edge function...');
          const platform = detectPlatform();
          const saved = await saveTokenViaEdgeFunction(memoryToken, user.id, platform);
          if (saved) dbToken = memoryToken;
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
      } else if (data?.token_cleaned) {
        toast({ title: "Token invalide nettoyé", description: "Redémarrez l'app pour régénérer le token push", variant: "destructive" });
      } else {
        const stage = data?.stage || 'unknown';
        const reason = data?.reason || '';
        toast({ title: "Notification créée", description: `Non envoyée en push (${stage}: ${reason})`, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Une erreur est survenue", variant: "destructive" });
    }
  }, [user, toast, token, detectPlatform, saveTokenViaEdgeFunction]);

  // ─── useEffect #1: INIT ──────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      await checkPermissionStatus();

      if (isNative) {
        await setupPushListeners();
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
          const status = await PushNotifications.checkPermissions();
          const platform = Capacitor.getPlatform();
          log('[INIT] Permission:', status.receive, '| Platform:', platform);
          updateDebug({ permissionResult: status.receive });

          if (status.receive === 'granted') {
            const { data: profile } = await supabase.from('profiles').select('push_token').eq('user_id', user.id).maybeSingle();
            if (profile?.push_token) {
              log('[INIT] Token already in DB');
              setToken(profile.push_token);
              setIsRegistered(true);
              updateDebug({ backendProfilePushToken: profile.push_token, selectedFinalToken: profile.push_token.substring(0, 20) + '...' });
            } else {
              log('[INIT] No token in DB, calling register()...');
              updateDebug({ registerCalled: true });
              await PushNotifications.register();
              log('[INIT] register() called');
            }
          } else if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
            log('[INIT] Requesting permissions...');
            updateDebug({ permissionRequested: true });
            const permResult = await PushNotifications.requestPermissions();
            log('[INIT] Permission result:', permResult.receive);
            updateDebug({ permissionResult: permResult.receive });
            if (permResult.receive === 'granted') {
              updateDebug({ registerCalled: true });
              await PushNotifications.register();
            }
          }
        } catch (e: any) {
          logError('[INIT] Error:', e);
          updateDebug({ lastError: 'init: ' + e.message });
        }
      }
    };

    init();
  }, [user, isNative, setupPushListeners, checkPermissionStatus, updateDebug]);

  // ─── useEffect #2: PENDING TOKEN SAVE ────────────────────

  useEffect(() => {
    if (!user) return;

    const pending = pendingTokenRef.current || (window as any).__pendingPushToken;
    if (pending && typeof pending === 'string' && pending.length > 50) {
      log('[PENDING] User available + pending token found');
      savePushToken(pending).then(saved => {
        if (saved) {
          pendingTokenRef.current = null;
          (window as any).__pendingPushToken = null;
        } else {
          const platform = detectPlatform();
          saveTokenViaEdgeFunction(pending, user.id, platform).then(edgeSaved => {
            if (edgeSaved) {
              pendingTokenRef.current = null;
              (window as any).__pendingPushToken = null;
              setIsRegistered(true);
            }
          });
        }
      });
    }
  }, [user, savePushToken, detectPlatform, saveTokenViaEdgeFunction]);

  // ─── useEffect #3: TOKEN RETRY ───────────────────────────

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
          setToken(profile.push_token);
          setIsRegistered(true);
          updateDebug({ backendProfilePushToken: profile.push_token });
          return true;
        }
      } catch {}

      const pendingToken = token || pendingTokenRef.current || (window as any).fcmToken || (window as any).__fcmTokenBuffer || (window as any).__pendingPushToken;
      if (pendingToken && typeof pendingToken === 'string' && pendingToken.length > 50) {
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
  }, [user, isRegistered, savePushToken, token, updateDebug]);

  // ─── useEffect #4: iOS RETRY register() ──────────────────

  useEffect(() => {
    if (!user || !isNative) return;
    const platform = Capacitor.getPlatform();
    if (platform !== 'ios') return;

    const maxRetries = 3;
    const retryInterval = 8000;

    const retryTimer = setInterval(async () => {
      if (token || pendingTokenRef.current) {
        log('[IOS-RETRY] Token acquired, stopping');
        clearInterval(retryTimer);
        return;
      }

      iosRetryCountRef.current += 1;
      if (iosRetryCountRef.current > maxRetries) {
        logError('[IOS-RETRY] Max retries reached (' + maxRetries + '). Token still null.');
        updateDebug({ lastError: 'iOS max retries reached, no FCM token received' });
        clearInterval(retryTimer);
        return;
      }

      try {
        const status = await PushNotifications.checkPermissions();
        if (status.receive === 'granted') {
          log(`[IOS-RETRY] register() attempt ${iosRetryCountRef.current}/${maxRetries}`);
          updateDebug({ registerCalled: true });
          await PushNotifications.register();
        } else {
          clearInterval(retryTimer);
        }
      } catch (e: any) {
        logError('[IOS-RETRY] Error:', e);
      }
    }, retryInterval);

    return () => clearInterval(retryTimer);
  }, [user, isNative, token, updateDebug]);

  // ─── useEffect #5: fcmTokenReady listener ────────────────

  useEffect(() => {
    const handleFcmTokenReady = async (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; platform: string; traceId?: string }>;
      const t = customEvent.detail?.token;
      const traceId = customEvent.detail?.traceId || (window as any).__fcmTraceId || null;

      log('[EVENT] fcmTokenReady received length=' + (t?.length || 0) + ' traceId=' + traceId);
      updateDebug({ fcmTokenEventReceived: true, fcmTokenLength: t?.length || null, traceId });

      if (t && t.length > 50) {
        // Always process if token is different from current
        if (t === token && isRegistered) {
          log('[EVENT] fcmTokenReady same as current token, skipping');
          return;
        }

        log('[EVENT] fcmTokenReady — processing new FCM token');
        setIsNative(true);
        setToken(t);
        pendingTokenRef.current = t;
        (window as any).__pendingPushToken = t;
        setIsRegistered(true);
        updateDebug({ selectedFinalToken: t.substring(0, 20) + '...' });
        await savePushToken(t);
      }
    };

    window.addEventListener('fcmTokenReady', handleFcmTokenReady);
    (window as any).__fcmListenerReady = true;
    document.dispatchEvent(new CustomEvent('ReactListenerReady'));

    const existingToken = (window as any).fcmToken || (window as any).__fcmTokenBuffer;
    if (existingToken && typeof existingToken === 'string' && existingToken.length > 50) {
      log('[EVENT] window.fcmToken already present at mount, length=' + existingToken.length);
      setIsNative(true);
      setToken(existingToken);
      pendingTokenRef.current = existingToken;
      setIsRegistered(true);
      updateDebug({ fcmTokenEventReceived: true, fcmTokenLength: existingToken.length, selectedFinalToken: existingToken.substring(0, 20) + '...' });
      savePushToken(existingToken);
    }

    // Fallback: if no fcmTokenReady after 15s on iOS, log warning
    const platform = Capacitor.getPlatform();
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (platform === 'ios') {
      fallbackTimer = setTimeout(() => {
        if (!token && !pendingTokenRef.current) {
          logError('[FALLBACK] ⚠️ No fcmTokenReady received after 15s on iOS');
          updateDebug({ lastError: 'No fcmTokenReady after 15s on iOS' });
        }
      }, 15000);
    }

    return () => {
      window.removeEventListener('fcmTokenReady', handleFcmTokenReady);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [savePushToken, updateDebug, token, isRegistered]);

  // ─── useEffect #6: App resume ────────────────────────────

  useEffect(() => {
    if (!user || !isNative) return;

    let appStateListener: any;

    import('@capacitor/app').then(({ App }) => {
      appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) return;
        log('[RESUME] App resumed, checking token...');

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
          logError('[RESUME] Error:', e);
        }
      });
    }).catch((err) => {
      console.warn('⚠️ @capacitor/app import failed:', err);
    });

    return () => {
      if (appStateListener) appStateListener.remove();
    };
  }, [user, isNative]);

  // ─── Native detection polling ─────────────────────────────

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
    tokenSaving: false,
    pushDebug,
    refreshDebugFromBackend,
  };
};
