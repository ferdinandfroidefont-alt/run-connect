import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { logDbError, logException, logHttpUpstream, logStructured, logUserRef } from "../_shared/secureLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const htmlUtf8 = (body: string) =>
  new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    logStructured("garmin-callback", "request", {
      has_code: !!code,
      user: state ? logUserRef(state) : "—",
      oauth_error: !!error,
    });

    if (error || !code || !state) {
      return htmlUtf8(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Garmin</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Erreur de connexion Garmin</h1>
        <p>Une erreur s'est produite pendant l'authentification.</p>
        <script>setTimeout(() => window.close(), 2500);</script>
      </body></html>`);
    }

    const tokenUrl = Deno.env.get("GARMIN_OAUTH_TOKEN_URL");
    const clientId = Deno.env.get("GARMIN_CLIENT_ID");
    const clientSecret = Deno.env.get("GARMIN_CLIENT_SECRET");
    if (!tokenUrl || !clientId || !clientSecret) {
      throw new Error("Garmin token exchange is not configured");
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/garmin-callback`;
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      logHttpUpstream("garmin-callback", tokenResponse.status, "token_exchange");
      throw new Error("Failed to exchange Garmin code");
    }

    const tokenData = await tokenResponse.json();
    const garminUserId =
      tokenData?.user_id?.toString?.() ||
      tokenData?.athlete_id?.toString?.() ||
      tokenData?.sub?.toString?.() ||
      null;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        garmin_connected: true,
        garmin_user_id: garminUserId,
        garmin_access_token: tokenData?.access_token ?? null,
        garmin_refresh_token: tokenData?.refresh_token ?? null,
        garmin_token_expires_at: tokenData?.expires_in
          ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
          : null,
        garmin_verified_at: new Date().toISOString(),
      })
      .eq("user_id", state);

    if (updateError) {
      logDbError("garmin-callback", updateError);
      throw updateError;
    }

    logStructured("garmin-callback", "profile_updated", { user: logUserRef(state) });

    const userAgent = req.headers.get("user-agent") || "";
    const isNative = userAgent.includes("RunConnect") || userAgent.includes("wv") || userAgent.includes("Android");
    if (isNative) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: "runconnect://profile",
        },
      });
    }

    return htmlUtf8(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Garmin connecté</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white;">
        <div style="max-width: 420px; margin: 0 auto;">
          <div style="font-size: 44px; color: #4ade80; margin-bottom: 12px;">&#10003;</div>
          <h2 style="margin: 0 0 12px 0;">Garmin connecté</h2>
          <p style="opacity: 0.85;">Retour à RunConnect...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'garmin_auth_success' }, '*');
            setTimeout(() => window.close(), 500);
          } else {
            window.location.href = 'https://run-connect.lovable.app/profile';
          }
        </script>
      </body></html>`);
  } catch (error) {
    logException("garmin-callback", error);
    return htmlUtf8(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Garmin</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Connexion Garmin échouée</h1>
        <p>Réessaie dans quelques minutes.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body></html>`);
  }
});
