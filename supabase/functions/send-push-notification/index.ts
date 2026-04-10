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

type JsonRecord = Record<string, unknown>;

function withStack(err: unknown): JsonRecord {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack ?? null };
  }
  return { message: String(err) };
}

function jsonResponse(
  corsHeaders: Record<string, string>,
  status: number,
  body: JsonRecord,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(
  corsHeaders: Record<string, string>,
  status: number,
  code: string,
  message: string,
  extras: JsonRecord = {},
): Response {
  return jsonResponse(corsHeaders, status, {
    success: false,
    code,
    message,
    ...extras,
  });
}

function ok(
  corsHeaders: Record<string, string>,
  body: JsonRecord,
): Response {
  return jsonResponse(corsHeaders, 200, { success: true, ...body });
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
  const traceId = req.headers.get("x-push-trace-id") ?? crypto.randomUUID();
  const debugMode = req.headers.get("x-push-debug") === "1";

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    logStructured("send-push", "entry_http", { trace_id: traceId, method: req.method, debug_mode: debugMode });
    const missingEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FIREBASE_SERVICE_ACCOUNT_JSON"].filter(
      (k) => !Deno.env.get(k),
    );
    if (missingEnv.length > 0) {
      logStructured("send-push", "env_missing", { trace_id: traceId, keys: missingEnv.join(",") });
      return fail(corsHeaders, 500, "env_var_missing", "Variables d'environnement manquantes", {
        trace_id: traceId,
        missing_keys: missingEnv,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    logStructured("send-push", "auth_start", { trace_id: traceId });
    const auth = await authenticatePushRequest(req, supabaseClient, corsHeaders);
    if (!auth.ok) {
      return auth.response;
    }
    logStructured("send-push", "auth_ok", {
      trace_id: traceId,
      mode: auth.mode,
      caller_user: auth.mode === "user" ? logUserRef(auth.callerUserId) : "internal",
    });

    let payload: NotificationPayload;
    try {
      payload = await req.json();
    } catch (e) {
      console.error(`[send-push] invalid_payload_json trace_id=${traceId}`, withStack(e));
      return fail(corsHeaders, 400, "invalid_payload", "Body JSON invalide", { trace_id: traceId });
    }
    const { user_id, title, body, data, type } = payload;
    logStructured("send-push", "payload_received", {
      trace_id: traceId,
      target_user: logUserRef(user_id),
      type: type ?? "default",
      title_len: typeof title === "string" ? title.length : -1,
      body_len: typeof body === "string" ? body.length : -1,
    });

    if (!user_id || !title || !body) {
      return fail(corsHeaders, 400, "invalid_payload", "user_id, title et body sont requis", {
        trace_id: traceId,
      });
    }

    // 1. Firebase service account
    const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      return fail(corsHeaders, 500, "env_var_missing", "Firebase service account non configuré", {
        trace_id: traceId,
        missing_keys: ["FIREBASE_SERVICE_ACCOUNT_JSON"],
      });
    }

    let serviceAccount: FirebaseServiceAccount;
    try {
      serviceAccount = JSON.parse(saJson);
    } catch (e) {
      console.error(`[send-push] service_account_json_invalid trace_id=${traceId}`, withStack(e));
      return fail(corsHeaders, 500, "env_var_missing", "FIREBASE_SERVICE_ACCOUNT_JSON invalide", {
        trace_id: traceId,
      });
    }
    const missingSaFields = ["project_id", "client_email", "private_key"].filter(
      (k) => !(serviceAccount as unknown as Record<string, unknown>)[k],
    );
    if (missingSaFields.length > 0) {
      return fail(corsHeaders, 500, "env_var_missing", "Service account Firebase incomplet", {
        trace_id: traceId,
        missing_keys: missingSaFields,
      });
    }

    // 2. Get profile
    logStructured("send-push", "db_fetch_target_user", { trace_id: traceId, target_user: logUserRef(user_id) });
    const { data: profileRows, error: profileError } = await supabaseClient
      .from('profiles')
      .select('push_token, push_token_platform, push_token_updated_at, notifications_enabled, notif_boost_nearby, notif_message, notif_session_request, notif_follow_request, notif_friend_session, notif_club_invitation, notif_session_accepted, notif_presence_confirmed')
      .eq('user_id', user_id)
      .order('push_token_updated_at', { ascending: false, nullsFirst: false })
      .limit(5);

    if (profileError) {
      console.error(`[send-push] profile_fetch_error trace_id=${traceId}`, {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
      });
      return fail(corsHeaders, 500, "database_error", "Erreur lecture profil cible", {
        trace_id: traceId,
        stage: "PROFILE_FETCH",
        db_code: profileError.code ?? null,
      });
    }
    if (!profileRows || profileRows.length === 0) {
      return fail(corsHeaders, 404, "database_error", "Utilisateur cible non trouvé", {
        trace_id: traceId,
        stage: "PROFILE_FETCH",
      });
    }
    const profile = profileRows[0]!;

    // 3. Check global notifications
    if (!profile.notifications_enabled) {
      return ok(corsHeaders, {
        skipped: true,
        stage: "PREFS_DISABLED",
        code: "notifications_disabled",
        message: "Notifications globales désactivées pour l'utilisateur cible",
        trace_id: traceId,
      });
    }

    // 4. Check per-type preferences
    const prefMap: Record<string, boolean | null> = {
      message: profile.notif_message,
      boost_nearby: profile.notif_boost_nearby,
      session_request: profile.notif_session_request,
      follow_request: profile.notif_follow_request,
      friend_session: profile.notif_friend_session,
      club_invitation: profile.notif_club_invitation,
      session_accepted: profile.notif_session_accepted,
      presence_confirmed: profile.notif_presence_confirmed,
    };

    if (type && type in prefMap && prefMap[type] === false) {
      return ok(corsHeaders, {
        skipped: true,
        stage: "PREFS_DISABLED",
        code: "notifications_disabled",
        message: `Notifications ${type} désactivées`,
        trace_id: traceId,
      });
    }

    // 5. Check push token
    const tokenCandidates = profileRows
      .map((row) => ({
        token: typeof row.push_token === "string" ? row.push_token.trim() : "",
        platform: (row as { push_token_platform?: string | null }).push_token_platform ?? null,
        updatedAt: (row as { push_token_updated_at?: string | null }).push_token_updated_at ?? null,
      }))
      .filter((row) => row.token.length >= 50);
    const iosCandidates = tokenCandidates.filter((c) => c.platform === "ios");
    const selectedToken = (iosCandidates[0] ?? tokenCandidates[0])?.token ?? null;
    logStructured("send-push", "token_selection", {
      trace_id: traceId,
      candidates: tokenCandidates.length,
      ios_candidates: iosCandidates.length,
      selected_len: selectedToken?.length ?? 0,
    });
    if (!selectedToken) {
      return fail(corsHeaders, 404, "missing_token", "Aucun token push valide pour l'utilisateur cible", {
        trace_id: traceId,
        stage: "TOKEN_CHECK",
        candidates: tokenCandidates.length,
      });
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
        return fail(corsHeaders, 500, "database_error", "Erreur création notification", {
          trace_id: traceId,
          stage: "DB_INSERT",
          db_code: notifError.code ?? null,
        });
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
      logStructured("send-push", "provider_dispatch", {
        trace_id: traceId,
        provider: "fcm",
        project_id: serviceAccount.project_id,
        title_len: finalTitle.length,
        body_len: finalBody.length,
        data_keys: data && typeof data === "object" ? Object.keys(data).length : 0,
      });

      const fcmResult = await sendFCMNotification(
        accessToken, serviceAccount.project_id, selectedToken, finalTitle, finalBody, fcmData
      );

      // Handle UNREGISTERED token
      if (typeof fcmResult === 'object' && fcmResult.unregistered) {
        logStructured("send-push", "cleanup_invalid_token", { target_user: logUserRef(user_id) });
        await supabaseClient.from('profiles').update({ push_token: null, push_token_updated_at: null }).eq('user_id', user_id);

        if (notificationId) {
          try {
            await supabaseClient.from('notification_logs').insert({
              notification_id: notificationId, user_id, push_token: selectedToken,
              fcm_success: false, fcm_error: 'UNREGISTERED', fcm_response: { error: 'UNREGISTERED', type }
            });
          } catch (logErr) {
            logException("send-push-notification_log", logErr);
          }
        }

        return fail(corsHeaders, 502, "push_provider_failed", "Token push invalide (UNREGISTERED), nettoyé", {
          trace_id: traceId,
          stage: "FCM_UNREGISTERED",
          token_cleaned: true,
        });
      }

      const fcmSuccess = typeof fcmResult === 'boolean' ? fcmResult : false;

      // Log attempt
      if (notificationId) {
        try {
          await supabaseClient.from('notification_logs').insert({
            notification_id: notificationId, user_id, push_token: selectedToken,
            fcm_success: fcmSuccess, fcm_error: fcmSuccess ? null : 'FCM send failed',
            fcm_response: { type, title: finalTitle }
          });
        } catch (logErr) {
          logException("send-push-notification_log", logErr);
        }
      }

      if (!fcmSuccess) {
        return fail(corsHeaders, 502, "push_provider_failed", "Le provider push a refusé la notification", {
          trace_id: traceId,
          stage: "FCM_FAILED",
        });
      }
      return ok(corsHeaders, {
        fcm_sent: true,
        type,
        stage: "FCM_SEND",
        reason: "OK",
        trace_id: traceId,
      });
    } catch (fcmError) {
      console.error(`[send-push] fcm_handler_exception trace_id=${traceId}`, withStack(fcmError));
      logException("send-push-fcm-handler", fcmError);

      if (notificationId) {
        try {
          await supabaseClient.from('notification_logs').insert({
            notification_id: notificationId, user_id, push_token: selectedToken,
            fcm_success: false, fcm_error: "exception", fcm_response: { type: type ?? "unknown" }
          });
        } catch (logErr) {
          logException("send-push-notification_log", logErr);
        }
      }

      return fail(corsHeaders, 500, "push_provider_failed", "Exception lors de l'appel au provider push", {
        trace_id: traceId,
        stage: "FCM_EXCEPTION",
        debug: debugMode ? { error: withStack(fcmError) } : undefined,
      });
    }

  } catch (error) {
    console.error(`[send-push] general_exception trace_id=${traceId}`, withStack(error));
    logException("send-push-general", error);
    return fail(corsHeaders, 500, "database_error", "Erreur serveur interne", {
      trace_id: traceId,
      stage: "GENERAL_ERROR",
      debug: debugMode ? { error: withStack(error) } : undefined,
    });
  }
});
