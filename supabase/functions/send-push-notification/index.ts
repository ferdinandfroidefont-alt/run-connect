import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  logException,
  logStructured,
  logUserRef,
  summarizeFcmErrorBody,
  summarizeGoogleApiError,
} from "../_shared/secureLog.ts";

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  data?: any;
  type?: string;
}

/** Comparaison constante du secret interne (mitigation timing attacks). */
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

type PushAuthResult =
  | { ok: true; mode: "internal" }
  | { ok: true; mode: "user"; callerUserId: string }
  | { ok: false; response: Response };

type SupabaseAuthAdmin = {
  auth: {
    getUser: (jwt: string) => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
};

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// ─── Firebase access token cache (50min TTL) ─────────────
let cachedAccessToken: string | null = null;
let cachedTokenExpiry: number = 0;

async function createFirebaseJWT(sa: FirebaseServiceAccount): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const b64url = (obj: any): string => {
    const b64 = btoa(JSON.stringify(obj));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const message = `${b64url(header)}.${b64url(payload)}`;

  const pem = sa.private_key
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(message));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${message}.${sigB64}`;
}

async function getFirebaseAccessToken(sa: FirebaseServiceAccount): Promise<string> {
  // Return cached token if still valid (50min margin)
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
    logStructured("send-push", "firebase_oauth_cached", {});
    return cachedAccessToken;
  }

  logStructured("send-push", "firebase_oauth_refresh", {});
  const jwt = await createFirebaseJWT(sa);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await response.json();
  if (!response.ok) {
    console.error(
      `[send-push] firebase_oauth status=${response.status} summary=${summarizeGoogleApiError(tokenData)}`,
    );
    throw new Error("Token request failed");
  }

  cachedAccessToken = tokenData.access_token;
  // Cache for 50 minutes (token valid for 60min)
  cachedTokenExpiry = Date.now() + 50 * 60 * 1000;
  logStructured("send-push", "firebase_oauth_ok", {});

  return cachedAccessToken!;
}

async function sendFCMNotification(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: any,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<boolean | { unregistered: boolean; token: string }> {
  try {
    const fcmPayload = {
      message: {
        token,
        notification: { title, body },
        data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#007AFF',
            sound: 'default',
            channel_id: 'runconnect_channel'
          }
        },
        apns: {
          payload: {
            aps: { alert: { title, body }, sound: 'default', badge: 1 }
          }
        }
      }
    };

    logStructured("send-push", "fcm_send", { project_id: projectId, device_token_len: token.length });

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fcmPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(
        `[send-push] fcm_failed status=${response.status} summary=${summarizeFcmErrorBody(responseData)}`,
      );

      // UNREGISTERED or INVALID_ARGUMENT token → clean up
      const errorCode = responseData?.error?.details?.[0]?.errorCode;
      if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
        logStructured("send-push", "fcm_token_cleanup", { code: String(errorCode) });
        return { unregistered: true, token };
      }

      // Retry on transient errors
      if (retryCount < maxRetries && (response.status >= 500 || response.status === 429)) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        logStructured("send-push", "fcm_retry", { delay_ms: delay, attempt: retryCount + 1, max: maxRetries });
        await new Promise(r => setTimeout(r, delay));
        return sendFCMNotification(accessToken, projectId, token, title, body, data, retryCount + 1, maxRetries);
      }

      return false;
    }

    logStructured("send-push", "fcm_sent", { name_len: typeof responseData?.name === "string" ? responseData.name.length : 0 });
    return true;
  } catch (error) {
    logException("send-push-fcm", error);
    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise(r => setTimeout(r, delay));
      return sendFCMNotification(accessToken, projectId, token, title, body, data, retryCount + 1, maxRetries);
    }
    return false;
  }
}

function unauthorized(corsHeaders: Record<string, string>, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ error: "Unauthorized", code, message }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

/**
 * Auth production :
 * 1) x-internal-push-secret === INTERNAL_PUSH_INVOKE_SECRET → appels serveur uniquement (pg_net, cron) — ne jamais mettre ce secret dans le frontend.
 * 2) Sinon Authorization: Bearer <JWT utilisateur> valide via auth.getUser().
 */
async function authenticatePushRequest(
  req: Request,
  supabaseAdmin: SupabaseAuthAdmin,
  corsHeaders: Record<string, string>,
): Promise<PushAuthResult> {
  const configuredInternal = Deno.env.get("INTERNAL_PUSH_INVOKE_SECRET");
  const providedInternal = req.headers.get("x-internal-push-secret") ?? "";

  if (configuredInternal && providedInternal && timingSafeEqualString(providedInternal, configuredInternal)) {
    logStructured("send-push", "auth_internal", {});
    return { ok: true, mode: "internal" };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: unauthorized(
        corsHeaders,
        "missing_bearer",
        "Authorization Bearer requis (session utilisateur) ou en-tête serveur x-internal-push-secret.",
      ),
    };
  }

  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return {
      ok: false,
      response: unauthorized(corsHeaders, "empty_bearer", "Jeton Bearer vide."),
    };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !user) {
    console.warn("[send-push] auth=user rejected: invalid or expired JWT");
    return {
      ok: false,
      response: unauthorized(
        corsHeaders,
        "invalid_session",
        "Session invalide ou expirée. Reconnectez-vous.",
      ),
    };
  }

  logStructured("send-push", "auth_user", { user: logUserRef(user.id) });
  return { ok: true, mode: "user", callerUserId: user.id };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const auth = await authenticatePushRequest(req, supabaseClient, corsHeaders);
    if (!auth.ok) {
      return auth.response;
    }

    const { user_id, title, body, data, type }: NotificationPayload = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'user_id, title et body sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStructured("send-push", "entry", {
      target_user: logUserRef(user_id),
      type: type ?? "default",
      title_len: typeof title === "string" ? title.length : 0,
    });

    // 1. Firebase service account
    const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      return new Response(
        JSON.stringify({ error: 'Firebase service account not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let serviceAccount: FirebaseServiceAccount;
    try {
      serviceAccount = JSON.parse(saJson);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid Firebase service account JSON' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('push_token, notifications_enabled, notif_message, notif_session_request, notif_follow_request, notif_friend_session, notif_club_invitation, notif_session_accepted, notif_presence_confirmed')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé', stage: 'PROFILE_FETCH', push_token: null }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check global notifications
    if (!profile.notifications_enabled) {
      return new Response(
        JSON.stringify({ message: 'Notifications désactivées', skipped: true, stage: 'PREFS_DISABLED', push_token: profile.push_token }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check per-type preferences
    const prefMap: Record<string, boolean | null> = {
      message: profile.notif_message,
      session_request: profile.notif_session_request,
      follow_request: profile.notif_follow_request,
      friend_session: profile.notif_friend_session,
      club_invitation: profile.notif_club_invitation,
      session_accepted: profile.notif_session_accepted,
      presence_confirmed: profile.notif_presence_confirmed,
    };

    if (type && type in prefMap && prefMap[type] === false) {
      return new Response(
        JSON.stringify({ message: `Notifications ${type} désactivées`, skipped: true, stage: 'PREFS_DISABLED', push_token: profile.push_token }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Check push token
    if (!profile.push_token || profile.push_token.length < 50) {
      return new Response(
        JSON.stringify({ success: false, message: 'Pas de token FCM', web_only: true, stage: 'TOKEN_CHECK', push_token: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Create notification record
    // Skip DB insert for types handled by DB triggers to avoid duplicates
    const triggerHandledTypes = ['follow_request', 'follow_accepted', 'follow_back', 'follower_removed'];
    const skipDbInsert = triggerHandledTypes.includes(type || '');
    
    let notificationId: string | null = null;
    
    if (!skipDbInsert) {
      const { data: notifData, error: notifError } = await supabaseClient
        .from('notifications')
        .insert({ user_id, title, message: body, type: type || 'info', data: data || {} })
        .select('id')
        .single();

      if (notifError) {
        return new Response(
          JSON.stringify({ error: 'Erreur création notification', stage: 'DB_INSERT', push_token: profile.push_token }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      notificationId = notifData?.id ?? null;
    } else {
      logStructured("send-push", "db_skip_insert_trigger", { type: type ?? "" });
    }

    // notificationId already set above

    // 7. Customize content by type
    let finalTitle = title;
    let finalBody = body;
    const fcmData = { ...data, type: type || 'info' };

    if (type && data) {
      switch (type) {
        case 'message':
          finalTitle = 'Nouveau message';
          finalBody = `${data.sender_name || 'Quelqu\'un'} vous a envoyé un message`;
          if (data.message_preview) finalBody += `: ${data.message_preview.substring(0, 50)}`;
          break;
        case 'friend_session':
          finalTitle = 'Session d\'ami créée';
          finalBody = `${data.organizer_name || 'Un ami'} a créé: ${data.session_title || 'Session'}`;
          break;
        case 'follow_request':
          finalTitle = 'Demande de suivi';
          finalBody = `${data.follower_name || 'Quelqu\'un'} souhaite vous suivre`;
          break;
        case 'session_request':
          finalTitle = 'Demande de participation';
          finalBody = `${data.requester_name || 'Quelqu\'un'} souhaite rejoindre votre session`;
          break;
        case 'club_invitation':
          finalTitle = 'Invitation à un club';
          finalBody = `${data.inviter_name || 'Quelqu\'un'} vous invite à rejoindre "${data.club_name || 'un club'}"`;
          break;
        case 'session_accepted':
          finalTitle = 'Session acceptée';
          finalBody = `${data.participant_name || 'Quelqu\'un'} a rejoint: ${data.session_title || 'Session'}`;
          break;
        case 'presence_confirmed':
          finalTitle = 'Présence confirmée';
          finalBody = `${data.organizer_name || 'L\'organisateur'} a confirmé votre présence`;
          break;
      }
    }

    // 8. Send FCM
    try {
      const accessToken = await getFirebaseAccessToken(serviceAccount);
      logStructured("send-push", "fcm_dispatch", { title_len: finalTitle.length, channel: "runconnect_channel" });

      const fcmResult = await sendFCMNotification(
        accessToken, serviceAccount.project_id, profile.push_token, finalTitle, finalBody, fcmData
      );

      // Handle UNREGISTERED token
      if (typeof fcmResult === 'object' && fcmResult.unregistered) {
        logStructured("send-push", "cleanup_invalid_token", { target_user: logUserRef(user_id) });
        await supabaseClient.from('profiles').update({ push_token: null, push_token_updated_at: null }).eq('user_id', user_id);

        if (notificationId) {
          try {
            await supabaseClient.from('notification_logs').insert({
              notification_id: notificationId, user_id, push_token: profile.push_token,
              fcm_success: false, fcm_error: 'UNREGISTERED', fcm_response: { error: 'UNREGISTERED', type }
            });
          } catch (logErr) {
            logException("send-push-notification_log", logErr);
          }
        }

        return new Response(
          JSON.stringify({ success: false, message: 'Token invalide, nettoyé', token_cleaned: true, stage: 'FCM_UNREGISTERED', push_token: profile.push_token }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fcmSuccess = typeof fcmResult === 'boolean' ? fcmResult : false;

      // Log attempt
      if (notificationId) {
        try {
          await supabaseClient.from('notification_logs').insert({
            notification_id: notificationId, user_id, push_token: profile.push_token,
            fcm_success: fcmSuccess, fcm_error: fcmSuccess ? null : 'FCM send failed',
            fcm_response: { type, title: finalTitle }
          });
        } catch (logErr) {
          logException("send-push-notification_log", logErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true, fcm_sent: fcmSuccess, type, stage: fcmSuccess ? 'FCM_SEND' : 'FCM_FAILED',
          reason: fcmSuccess ? 'OK' : 'FCM send failed', push_token: profile.push_token
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fcmError) {
      logException("send-push-fcm-handler", fcmError);

      if (notificationId) {
        try {
          await supabaseClient.from('notification_logs').insert({
            notification_id: notificationId, user_id, push_token: profile.push_token,
            fcm_success: false, fcm_error: "exception", fcm_response: { type: type ?? "unknown" }
          });
        } catch (logErr) {
          logException("send-push-notification_log", logErr);
        }
      }

      return new Response(
        JSON.stringify({ success: true, fcm_sent: false, fcm_error: "exception", stage: 'FCM_EXCEPTION', push_token: profile.push_token }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    logException("send-push-general", error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne', stage: 'GENERAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
