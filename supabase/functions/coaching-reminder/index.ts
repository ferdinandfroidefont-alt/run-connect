import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";

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
  const pem = sa.private_key.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(message));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${message}.${sigB64}`;
}

async function getFirebaseAccessToken(sa: FirebaseServiceAccount): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
    return cachedAccessToken;
  }

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
  if (!response.ok) throw new Error(`Token request failed: ${JSON.stringify(tokenData)}`);

  cachedAccessToken = tokenData.access_token;
  cachedTokenExpiry = Date.now() + 50 * 60 * 1000;
  return cachedAccessToken!;
}

async function sendFCM(accessToken: string, projectId: string, token: string, title: string, body: string): Promise<boolean> {
  try {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { type: 'coaching_reminder' },
          android: { priority: 'high', notification: { icon: 'ic_notification', color: '#007AFF', sound: 'default', channel_id: 'runconnect_channel' } },
          apns: { payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } } },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('FCM failed:', response.status, JSON.stringify(err));
      return false;
    }
    return true;
  } catch (e) {
    console.error('FCM exception:', e);
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!requireCron(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    tomorrowStart.setUTCHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setUTCHours(23, 59, 59, 999);

    const { data: sessions, error: sessErr } = await supabaseClient
      .from('coaching_sessions')
      .select('id, title, scheduled_at')
      .gte('scheduled_at', tomorrowStart.toISOString())
      .lte('scheduled_at', tomorrowEnd.toISOString());

    if (sessErr) throw sessErr;
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      return new Response(JSON.stringify({ error: 'Firebase not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const sa: FirebaseServiceAccount = JSON.parse(saJson);
    const accessToken = await getFirebaseAccessToken(sa);

    let totalSent = 0;

    for (const session of sessions) {
      const { data: participations } = await supabaseClient
        .from('coaching_participations')
        .select('user_id')
        .eq('coaching_session_id', session.id)
        .in('status', ['sent', 'scheduled']);

      if (!participations || participations.length === 0) continue;

      const userIds = participations.map(p => p.user_id);

      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('user_id, push_token, notifications_enabled')
        .in('user_id', userIds)
        .eq('notifications_enabled', true)
        .not('push_token', 'is', null);

      if (!profiles || profiles.length === 0) continue;

      const sessionTime = new Date(session.scheduled_at);
      const timeStr = `${sessionTime.getUTCHours().toString().padStart(2, '0')}h${sessionTime.getUTCMinutes().toString().padStart(2, '0')}`;
      const title = '📋 Rappel coaching';
      const body = `Demain : ${session.title} à ${timeStr}`;

      for (const profile of profiles) {
        if (!profile.push_token || profile.push_token.length < 50) continue;
        const ok = await sendFCM(accessToken, sa.project_id, profile.push_token, title, body);
        if (ok) totalSent++;
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
