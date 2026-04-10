import { useState, useEffect, useCallback, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';
import { isReallyNative, getPlatform as getNativePlatform } from '@/lib/nativeDetection';
import { androidPermissions } from '@/lib/androidPermissions';
import { requireSupabaseAnonKey, requireSupabaseUrl } from '@/lib/supabaseEnv';

const log = (...args: any[]) => console.log('[PUSH]', ...args);
const logError = (...args: any[]) => console.error('[PUSH]', ...args);

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

/** 
 * Check if token is a raw APNs hex token — NOT a valid FCM token.
 * Apple says APNs tokens are variable length (don't hardcode 64).
 * FCM tokens always contain non-hex chars like : _ -
 * APNs tokens are pure hex, typically 64 chars but can be 32-128.
 */
const isApnsHexToken = (t: string): boolean => {
  if (t.length < 32 || t.length > 200) return false;
  // If token is ALL hex chars, it's likely APNs (FCM tokens always contain non-hex chars)
  return /^[A-Fa-f0-9]+$/.test(t) && t.length <= 128;
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
    if (typeof (window as any).fcmTokenPlatform === 'string') return (window as any).fcmTokenPlatform;
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
    if ((window as any).AndroidBridge) return 'android';
    return capPlatform;
  }, []);

  /** Save token via edge function WITH Authorization header */
  const saveTokenViaEdgeFunction = useCallback(async (pushToken: string, userId: string, platform: string): Promise<boolean> => {
    const traceId = (window as any).__fcmTraceId || String(Date.now());
    try {
      log('[SAVE-EF] Calling save-push-token edge function traceId=' + traceId + ' platform=' + platform + ' tokenLen=' + pushToken.length);
      updateDebug({ saveAttempted: true, traceId });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        logError('[SAVE-EF] No access_token available');
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

      const response = await fetch(`${requireSupabaseUrl()}/functions/v1/save-push-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: userId, token: pushToken, platform, trace_id: traceId })
      });

      const bodyText = await response.text();
      let bodyJson: any = null;
      try { bodyJson = JSON.parse(bodyText); } catch {}

      log('[SAVE-EF] Response status=' + response.status + ' body=' + bodyText);
      updateDebug({ saveResponse: { status: response.status, body: bodyJson || bodyText } });

      if (response.ok) {
        log('[SAVE-EF] ✅ Token saved via edge function');
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
      logError('[SAVE-EF] Edge function failed:', response.status, bodyText);
      updateDebug({ lastError: `save-push-token ${response.status}: ${bodyText.substring(0, 200)}` });
      return false;
    } catch (e: any) {
      logError('[SAVE-EF] Exception:', e);
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

  /** Save token — iOS ONLY uses edge function (has APNs hex guard), Android uses client */
  const savePushToken = useCallback(async (pushToken: string, overrideUserId?: string): Promise<boolean> => {
    const platform = detectPlatform();

    // ── iOS: REJECT raw APNs hex tokens on the frontend ──
    if (platform === 'ios' && isApnsHexToken(pushToken)) {
      log('[SAVE] 🍎 BLOCKED: APNs hex-64 token on iOS — waiting for real FCM token via fcmTokenReady');
      updateDebug({ apnsHexDetected: true, lastError: 'APNs hex token blocked, waiting for FCM' });
      pendingTokenRef.current = pushToken;
      (window as any).__pendingApnsToken = pushToken;
      return false;
    }

    // ── Resolve userId: prefer override, then React state, then fresh session ──
    let resolvedUserId = overrideUserId || user?.id || null;

    if (!resolvedUserId) {
      log('[SAVE] No user in React state, trying getSession()...');
      try {
        const { data: sess } = await supabase.auth.getSession();
        resolvedUserId = sess?.session?.user?.id || null;
        if (resolvedUserId) {
          log('[SAVE] ✅ Got userId from getSession(): ' + resolvedUserId.substring(0, 8));
        }
      } catch (e) {
        logError('[SAVE] getSession() failed:', e);
      }
    }

    if (!resolvedUserId) {
      log('[SAVE] No user anywhere, storing token pending');
      setToken(pushToken);
      pendingTokenRef.current = pushToken;
      (window as any).__pendingPushToken = pushToken;
      return false;
    }

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (!existing) {
        log('[SAVE] Profile not found, keeping token pending');
        setToken(pushToken);
        pendingTokenRef.current = pushToken;
        return false;
      }

      if (existing.push_token === pushToken) {
        log('[SAVE] Token already saved (identical)');
        setToken(pushToken);
        pendingTokenRef.current = null;
        setIsRegistered(true);
        updateDebug({ selectedFinalToken: pushToken.substring(0, 20) + '...', backendProfilePushToken: pushToken });
        return true;
      }

      // ── iOS: always use edge function (server-side APNs guard) ──
      if (platform === 'ios') {
        log('[SAVE] 🍎 iOS: saving via edge function only (server-side validation)');
        const edgeSaved = await saveTokenViaEdgeFunction(pushToken, resolvedUserId, platform);
        if (edgeSaved) {
          setToken(pushToken);
          pendingTokenRef.current = null;
          setIsRegistered(true);
          updateDebug({ selectedFinalToken: pushToken.substring(0, 20) + '...' });
          return true;
        }
        setToken(pushToken);
        pendingTokenRef.current = pushToken;
        return false;
      }

      // ── Android/Web: save via Supabase client (faster) ──
      log('[SAVE] Saving via Supabase client, platform=' + platform);
      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: pushToken,
          push_token_platform: platform,
          push_token_updated_at: new Date().toISOString(),
          notifications_enabled: true
        })
        .eq('user_id', resolvedUserId);

      if (error) {
        logError('[SAVE] Client save error:', error.code, error.message);
        log('[SAVE] Trying edge function fallback...');
        const edgeSaved = await saveTokenViaEdgeFunction(pushToken, resolvedUserId, platform);
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
        try { (window as any).AndroidBridge.saveUserIdForFCM(resolvedUserId); } catch {}
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
    const raw = data?.actionData ?? data?.data ?? data ?? {};
    const actionData: Record<string, string | undefined> =
      raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, string | undefined>) : {};
    const type = actionData.type;
    const conversationId = actionData.conversation_id;
    switch (type) {
      case 'message':
        navigate(conversationId ? `/messages?conversation=${conversationId}` : '/messages');
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

        const platform = detectPlatform();

        // ── iOS: APNs hex token must NOT be saved ──
        if (platform === 'ios' && isApnsHexToken(receivedToken)) {
          log('[EVENT] 🍎 APNs hex-64 detected on iOS — NOT saving. Waiting for fcmTokenReady bridge event.');
          updateDebug({ apnsHexDetected: true });
          // Store raw APNs token for debug but don't save to DB
          (window as any).__pendingApnsToken = receivedToken;
          return; // ← Critical: do NOT call savePushToken
        }

        // ── Android/Web: save immediately ──
        log('[EVENT] ✅ Token received (non-APNs), saving... length=' + receivedToken.length);
        updateDebug({ fcmTokenLength: receivedToken.length, selectedFinalToken: receivedToken.substring(0, 20) + '...' });
        setToken(receivedToken);
        pendingTokenRef.current = receivedToken;
        (window as any).__pendingPushToken = receivedToken;
        setIsRegistered(true);

        const saved = await savePushToken(receivedToken);
        if (!saved && user) {
          log('[EVENT] Direct save failed, edge function fallback');
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

    const capPlatform = Capacitor.getPlatform();
    const nativePlatform = getNativePlatform();
    /** Capacitor peut renvoyer "web" dans le WKWebView alors que l’app est iOS native. */
    const isIosEnv =
      capPlatform === 'ios' ||
      nativePlatform === 'ios' ||
      (isNative && !androidPermissions.isAndroid() && /iPhone|iPad|iPod/i.test(navigator.userAgent));

    updateDebug({ permissionRequested: true });
    log('[PERM] capPlatform=', capPlatform, 'nativePlatform=', nativePlatform, 'isIosEnv=', isIosEnv);

    if (isIosEnv) {
      try {
        log('[PERM] 🍎 Requesting iOS permissions (Capacitor PushNotifications)...');
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
          const denied = result.receive === 'denied';
          setPermissionStatus({
            granted: false,
            denied,
            prompt: !denied && result.receive === 'prompt',
          });
          toast({
            title: "Notifications désactivées",
            description: denied
              ? "Réglages iOS → RunConnect → Notifications"
              : "Répondez à la demande système ou activez les notifications dans les réglages iOS.",
            variant: "destructive",
          });
        }
        return granted;
      } catch (e: any) {
        logError('[PERM] iOS error:', e);
        updateDebug({ lastError: 'permission error: ' + e.message });
        toast({
          title: "Erreur notifications",
          description: e?.message || "Impossible de demander les notifications sur iOS.",
          variant: "destructive",
        });
        return false;
      }
    }

    const androidBridgeState = (window as any).androidPermissions?.notifications;
    if (androidBridgeState === 'granted') {
      await checkPermissionStatus();
      try {
        await PushNotifications.register();
      } catch (e) {
        logError('[ANDROID] register() after bridge granted:', e);
      }
      return true;
    }

    const isAndroidEnv =
      capPlatform === 'android' ||
      nativePlatform === 'android' ||
      androidPermissions.isAndroid();

    if (isAndroidEnv) {
      try {
        log('[PERM] 🤖 Requesting Android push permissions (Capacitor PushNotifications)...');
        const result = await PushNotifications.requestPermissions();
        log('[PERM] 🤖 Capacitor result:', result.receive);
        updateDebug({ permissionResult: result.receive });
        let granted = result.receive === 'granted';

        if (!granted && typeof window !== 'undefined' && window.PermissionsPlugin?.requestNotificationPermissions) {
          log('[PERM] 🤖 Capacitor not granted, trying PermissionsPlugin...');
          const pluginResult = await androidPermissions.requestNotificationPermissions();
          if (pluginResult.granted) {
            granted = true;
          } else if (pluginResult.advice) {
            toast({ title: "Notifications", description: pluginResult.advice, variant: "destructive" });
          }
        }

        if (granted) {
          log('[REGISTER] Android PushNotifications.register()...');
          updateDebug({ registerCalled: true });
          await PushNotifications.register();
          setPermissionStatus({ granted: true, denied: false, prompt: false });
          setIsRegistered(true);
          return true;
        }

        setPermissionStatus({
          granted: false,
          denied: result.receive === 'denied',
          prompt: result.receive === 'prompt',
        });
        toast({
          title: "Notifications désactivées",
          description: "Autorisez les notifications dans les paramètres Android (RunConnect → Notifications).",
          variant: "destructive",
        });
        return false;
      } catch (e: any) {
        logError('[PERM] Android error:', e);
        updateDebug({ lastError: 'permission error: ' + (e?.message || String(e)) });
        toast({
          title: "Erreur",
          description: e?.message || "Impossible de demander les notifications.",
          variant: "destructive",
        });
        return false;
      }
    }

    toast({
      title: "Environnement non reconnu",
      description: "Ouvrez les paramètres système pour activer les notifications RunConnect.",
      variant: "destructive",
    });
    return false;
  };

  // ─── TEST NOTIFICATION ───────────────────────────────────

  const testNotification = useCallback(async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }

    try {
      const debugMode = typeof window !== "undefined" && localStorage.getItem("push_debug_mode") === "1";
      if (debugMode) {
        console.log("[PUSH][TEST][DEBUG] starting test", {
          userId: user.id,
          pushDebug,
          permissionStatus,
        });
      }
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

        if (memoryToken && typeof memoryToken === 'string' && memoryToken.length > 50 && !isApnsHexToken(memoryToken)) {
          log('[TEST] Token in memory, saving via edge function...');
          const platform = detectPlatform();
          const saved = await saveTokenViaEdgeFunction(memoryToken, user.id, platform);
          if (saved) dbToken = memoryToken;
        }

        if (!dbToken || dbToken.length < 50) {
          const isIosApnsMismatch = pushDebug.apnsHexDetected && !pushDebug.fcmTokenEventReceived;
          toast({
            title: isIosApnsMismatch ? "Token FCM non reçu" : "Aucun token enregistré",
            description: isIosApnsMismatch
              ? "APNs OK mais Firebase ne renvoie pas de token FCM. Vérifiez que le GoogleService-Info.plist correspond au bundle ID com.ferdi.runconnect"
              : `user_id: ${user.id?.substring(0, 8)}... — token: ${dbToken ? dbToken.substring(0, 10) + '...' : 'null'}`,
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

      const traceId = String(Date.now());
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: requireSupabaseAnonKey(),
        Authorization: `Bearer ${session.access_token}`,
        "x-push-trace-id": traceId,
      };
      if (debugMode) {
        headers["x-push-debug"] = "1";
      }

      const response = await fetch(`${requireSupabaseUrl()}/functions/v1/send-push-notification`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: user.id,
          title: 'Test RunConnect',
          body: 'Vos notifications fonctionnent parfaitement ! 🎉',
          type: 'test',
          data: { test: true }
        }),
      });

      const raw = await response.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = { message: raw };
      }
      if (!response.ok) {
        const msg = data?.message || data?.error || data?.code || `HTTP ${response.status}`;
        console.error("[PUSH][TEST] non-2xx", { status: response.status, traceId, data });
        toast({
          title: "Erreur push",
          description: `${msg}${data?.trace_id ? ` (trace: ${data.trace_id})` : ""}`,
          variant: "destructive",
        });
        return;
      }

      if (data?.fcm_sent) {
        toast({ title: "✅ Notification envoyée !", description: "Vérifiez votre barre de notification" });
      } else if (data?.token_cleaned) {
        toast({ title: "Token invalide nettoyé", description: "Redémarrez l'app pour régénérer le token push", variant: "destructive" });
      } else {
        const stage = data?.stage || 'unknown';
        const reason = data?.message || data?.reason || data?.code || '';
        console.warn("[PUSH][TEST] non-fcm response", data);
        toast({ title: "Notification non envoyée", description: `${reason} (${stage})`, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Une erreur est survenue", variant: "destructive" });
    }
  }, [user, toast, token, detectPlatform, saveTokenViaEdgeFunction, pushDebug, permissionStatus]);

  // ─── useEffect #1: INIT ──────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const isIosEnv =
      Capacitor.getPlatform() === 'ios' ||
      getNativePlatform() === 'ios' ||
      /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const init = async () => {
      await checkPermissionStatus();

      if (isNative) {
        await setupPushListeners();
        await new Promise(resolve => setTimeout(resolve, 300));

        // On iOS, the AppDelegate already called registerForRemoteNotifications() at launch
        // and may have injected a cached FCM token. Check for it first.
        if (isIosEnv) {
          const bridgedToken = (window as any).fcmToken || (window as any).__fcmTokenBuffer;
          if (bridgedToken && typeof bridgedToken === 'string' && bridgedToken.length > 50 && !isApnsHexToken(bridgedToken)) {
            log('[INIT] 🍎 Found pre-injected FCM token from AppDelegate, length=' + bridgedToken.length);
            setToken(bridgedToken);
            pendingTokenRef.current = bridgedToken;
            setIsRegistered(true);
            updateDebug({ fcmTokenEventReceived: true, fcmTokenLength: bridgedToken.length, selectedFinalToken: bridgedToken.substring(0, 20) + '...' });
            savePushToken(bridgedToken);
            return;
          }
        }

        try {
          const status = await PushNotifications.checkPermissions();
          const platform = Capacitor.getPlatform();
          log('[INIT] Permission:', status.receive, '| Platform:', platform, '| isIosEnv:', isIosEnv);
          updateDebug({ permissionResult: status.receive });

          if (status.receive === 'granted') {
            const { data: profile } = await supabase.from('profiles').select('push_token').eq('user_id', user.id).maybeSingle();
            if (profile?.push_token && !isApnsHexToken(profile.push_token)) {
              log('[INIT] Valid token already in DB, length=' + profile.push_token.length);
              setToken(profile.push_token);
              setIsRegistered(true);
              updateDebug({ backendProfilePushToken: profile.push_token, selectedFinalToken: profile.push_token.substring(0, 20) + '...' });
            } else {
              log('[INIT] No valid token in DB, calling register()...');
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

          // CRITICAL: If Capacitor plugin failed, still try to register on iOS
          // The AppDelegate handles this natively, but we force a second attempt via Capacitor
          if (isIosEnv) {
            log('[INIT] 🍎 Capacitor check failed, forcing register() on iOS...');
            try {
              updateDebug({ registerCalled: true });
              await PushNotifications.register();
            } catch (e2: any) {
              logError('[INIT] iOS fallback register() also failed:', e2);
            }
          }
        }
      }
    };

    init();
  }, [user, isNative, setupPushListeners, checkPermissionStatus, updateDebug, savePushToken]);

  // ─── useEffect #2: PENDING TOKEN SAVE (with delayed retry) ────────────────────

  useEffect(() => {
    if (!user) return;

    const tryPending = () => {
      const pending = pendingTokenRef.current || (window as any).__pendingPushToken;
      if (pending && typeof pending === 'string' && pending.length > 50 && !isApnsHexToken(pending)) {
        log('[PENDING] User available + valid pending token found');
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
    };

    // Immediate attempt
    tryPending();

    // Delayed retry after 2s to catch tokens that arrived during auth restoration
    const retryTimer = setTimeout(tryPending, 2000);
    return () => clearTimeout(retryTimer);
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

        if (profile?.push_token && !isApnsHexToken(profile.push_token)) {
          setToken(profile.push_token);
          setIsRegistered(true);
          updateDebug({ backendProfilePushToken: profile.push_token });
          return true;
        }
      } catch {}

      const pendingToken = token || pendingTokenRef.current || (window as any).fcmToken || (window as any).__fcmTokenBuffer || (window as any).__pendingPushToken;
      if (pendingToken && typeof pendingToken === 'string' && pendingToken.length > 50 && !isApnsHexToken(pendingToken)) {
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
    const isIosEnv = Capacitor.getPlatform() === 'ios' || /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isIosEnv) return;

    const maxRetries = 3;
    const retryInterval = 8000;

    const retryTimer = setInterval(async () => {
      // Stop retrying if we have a valid (non-APNs) token
      const currentToken = token || pendingTokenRef.current;
      if (currentToken && !isApnsHexToken(currentToken)) {
        log('[IOS-RETRY] Valid FCM token acquired, stopping');
        clearInterval(retryTimer);
        return;
      }

      iosRetryCountRef.current += 1;
      if (iosRetryCountRef.current > maxRetries) {
        logError('[IOS-RETRY] Max retries reached (' + maxRetries + '). No FCM token received.');
        updateDebug({ lastError: 'iOS max retries reached, no FCM token received. Check Firebase init in AppDelegate.' });
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

  // ─── useEffect #5: fcmTokenReady + userAuthenticatedWithFCMToken listeners ────
  // IMPORTANT: This effect has NO dependency on `user` so the listener is always active,
  // even before auth resolves. Tokens are buffered and saved as soon as a userId is available.

  useEffect(() => {
    /** Save FCM token with dynamic user resolution (bypasses stale closure) */
    const saveTokenDynamic = async (fcmToken: string, knownUserId?: string) => {
      let userId = knownUserId || null;
      if (!userId) {
        try {
          const { data: sess } = await supabase.auth.getSession();
          userId = sess?.session?.user?.id || null;
        } catch {}
      }

      if (userId) {
        log('[DYNAMIC-SAVE] Saving token for userId=' + userId.substring(0, 8) + '...');
        await savePushToken(fcmToken, userId);
      } else {
        log('[DYNAMIC-SAVE] No user found, storing as pending');
        pendingTokenRef.current = fcmToken;
        (window as any).__pendingPushToken = fcmToken;
      }
    };

    const handleFcmTokenReady = async (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; platform: string; traceId?: string }>;
      const t = customEvent.detail?.token;
      const traceId = customEvent.detail?.traceId || (window as any).__fcmTraceId || null;

      log('[EVENT] 🍎 fcmTokenReady received length=' + (t?.length || 0) + ' traceId=' + traceId);
      updateDebug({ fcmTokenEventReceived: true, fcmTokenLength: t?.length || null, traceId });

      if (t && t.length > 50) {
        if (isApnsHexToken(t)) {
          logError('[EVENT] fcmTokenReady received APNs hex token — Firebase may not be initialized.');
          updateDebug({ lastError: 'fcmTokenReady got APNs hex — Firebase not initialized?' });
          return;
        }

        log('[EVENT] fcmTokenReady — ✅ VALID FCM token, saving as final token');
        setIsNative(true);
        setToken(t);
        pendingTokenRef.current = t;
        (window as any).__pendingPushToken = t;
        setIsRegistered(true);
        updateDebug({ selectedFinalToken: t.substring(0, 20) + '...' });
        await saveTokenDynamic(t);
      }
    };

    const handleAuthWithToken = async (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string; userId: string }>;
      const { token: fcmToken, userId } = customEvent.detail || {};

      log('[EVENT] 🔥 userAuthenticatedWithFCMToken received userId=' + userId?.substring(0, 8) + ' tokenLen=' + fcmToken?.length);

      if (fcmToken && userId && fcmToken.length > 50 && !isApnsHexToken(fcmToken)) {
        setToken(fcmToken);
        pendingTokenRef.current = fcmToken;
        setIsRegistered(true);
        updateDebug({ selectedFinalToken: fcmToken.substring(0, 20) + '...' });
        await saveTokenDynamic(fcmToken, userId);
      }
    };

    window.addEventListener('fcmTokenReady', handleFcmTokenReady);
    window.addEventListener('userAuthenticatedWithFCMToken', handleAuthWithToken);
    (window as any).__fcmListenerReady = true;
    document.dispatchEvent(new CustomEvent('ReactListenerReady'));

    const existingToken = (window as any).fcmToken || (window as any).__fcmTokenBuffer;
    if (existingToken && typeof existingToken === 'string' && existingToken.length > 50 && !isApnsHexToken(existingToken)) {
      log('[EVENT] window.fcmToken already present at mount, length=' + existingToken.length);
      setIsNative(true);
      setToken(existingToken);
      pendingTokenRef.current = existingToken;
      setIsRegistered(true);
      updateDebug({ fcmTokenEventReceived: true, fcmTokenLength: existingToken.length, selectedFinalToken: existingToken.substring(0, 20) + '...' });
      saveTokenDynamic(existingToken);
    }

    const isIosEnv = Capacitor.getPlatform() === 'ios' || /iPhone|iPad|iPod/i.test(navigator.userAgent);
    let iosPollingInterval: ReturnType<typeof setInterval> | null = null;
    let pageshowHandler: (() => void) | null = null;

    if (isIosEnv) {
      // Poll window.fcmToken every 2s for 60s — catches tokens injected
      // by the AppDelegate at launch, on resume, or via MessagingDelegate
      let pollCount = 0;
      const maxPolls = 30; // 2s * 30 = 60s
      iosPollingInterval = setInterval(async () => {
        pollCount++;
        const currentToken = pendingTokenRef.current;
        if (currentToken && !isApnsHexToken(currentToken)) {
          log('[IOS-POLL] Valid token already acquired, stopping');
          if (iosPollingInterval) clearInterval(iosPollingInterval);
          return;
        }

        const bufferedToken = (window as any).fcmToken || (window as any).__fcmTokenBuffer;
        if (bufferedToken && typeof bufferedToken === 'string' && bufferedToken.length > 50 && !isApnsHexToken(bufferedToken)) {
          log('[IOS-POLL] FCM token found on window at poll #' + pollCount + ', saving...');
          setIsNative(true);
          setToken(bufferedToken);
          pendingTokenRef.current = bufferedToken;
          setIsRegistered(true);
          updateDebug({ fcmTokenEventReceived: true, fcmTokenLength: bufferedToken.length, selectedFinalToken: bufferedToken.substring(0, 20) + '...' });
          await saveTokenDynamic(bufferedToken);
          if (iosPollingInterval) clearInterval(iosPollingInterval);
          return;
        }

        // At 10s and 30s, try re-registering to trigger the native flow again
        if (pollCount === 5 || pollCount === 15) {
          log('[IOS-POLL] No token at poll #' + pollCount + ', re-calling register()...');
          try {
            await PushNotifications.register();
          } catch (e: any) {
            logError('[IOS-POLL] register() error:', e);
          }
        }

        if (pollCount >= maxPolls) {
          logError('[IOS-POLL] No FCM token after 60s of polling');
          updateDebug({ lastError: 'iOS: no FCM token after 60s. Check Firebase config (GoogleService-Info.plist, APNs key in Firebase Console).' });
          if (iosPollingInterval) clearInterval(iosPollingInterval);
        }
      }, 2000);

      pageshowHandler = () => {
        const buffered = (window as any).fcmToken || (window as any).__fcmTokenBuffer;
        if (buffered && typeof buffered === 'string' && buffered.length > 50 && !isApnsHexToken(buffered)) {
          log('[PAGESHOW] FCM token found after page restore');
          setToken(buffered);
          pendingTokenRef.current = buffered;
          setIsRegistered(true);
          saveTokenDynamic(buffered);
        }
      };
      window.addEventListener('pageshow', pageshowHandler);
    }

    return () => {
      window.removeEventListener('fcmTokenReady', handleFcmTokenReady);
      window.removeEventListener('userAuthenticatedWithFCMToken', handleAuthWithToken);
      if (iosPollingInterval) clearInterval(iosPollingInterval);
      if (pageshowHandler) window.removeEventListener('pageshow', pageshowHandler);
    };
  }, [savePushToken, updateDebug]);

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

            if (profile?.push_token && !isApnsHexToken(profile.push_token)) {
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
