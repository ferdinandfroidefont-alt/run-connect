import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const webUrl =
    Deno.env.get("RUNCONNECT_WEB_PROFILE_URL") ?? "https://runconnect.app/profile";
  const deepLinkUrl = "app.runconnect://auth/instagram/success";

  if (oauthError) {
    const msg = escapeHtml(oauthError);
    return htmlUtf8(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Instagram</title></head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 48px 24px;">
          <h1>Connexion Instagram</h1>
          <p>Une erreur s&rsquo;est produite lors de l&rsquo;autorisation.</p>
          <p style="color:#666;font-size:14px;">${msg}</p>
          <script>
            setTimeout(function () {
              if (window.opener) { window.close(); }
              else { window.location.href = ${JSON.stringify(webUrl)}; }
            }, 2500);
          </script>
        </body></html>`,
    );
  }

  if (!code || !state) {
    return htmlUtf8(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Instagram</title></head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 48px 24px;">
          <h1>Connexion Instagram</h1>
          <p>Param&egrave;tres manquants dans la r&eacute;ponse d&rsquo;Instagram.</p>
          <script>
            setTimeout(function () {
              if (window.opener) { window.close(); }
              else { window.location.href = ${JSON.stringify(webUrl)}; }
            }, 2500);
          </script>
        </body></html>`,
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const instagramClientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    const instagramClientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET");

    if (!instagramClientId || !instagramClientSecret) {
      throw new Error("Instagram credentials not configured");
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/instagram-callback`;

    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: instagramClientId,
        client_secret: instagramClientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      await tokenResponse.text().catch(() => "");
      logHttpUpstream("instagram-callback", tokenResponse.status, "token_exchange");
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`,
    );

    if (!userResponse.ok) {
      await userResponse.text().catch(() => "");
      logHttpUpstream("instagram-callback", userResponse.status, "user_info");
      throw new Error("Failed to get user info from Instagram");
    }

    const userData = await userResponse.json();

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        instagram_connected: true,
        instagram_verified_at: new Date().toISOString(),
        instagram_user_id: userData.id,
        instagram_access_token: tokenData.access_token,
        instagram_username: userData.username,
      })
      .eq("user_id", state);

    if (updateError) {
      logDbError("instagram-callback", updateError);
      throw updateError;
    }

    logStructured("instagram-callback", "profile_updated", { user: logUserRef(state) });

    const userAgent = req.headers.get("user-agent") || "";
    const isNative = userAgent.includes("RunConnect") ||
      userAgent.includes("wv") ||
      userAgent.includes("Android");

    logStructured("instagram-callback", "client_hint", { is_native: isNative, ua_len: userAgent.length });

    if (isNative) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: deepLinkUrl,
        },
      });
    }

    return htmlUtf8(
      `<!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Instagram connect&eacute;</title>
        </head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 48px 24px; background: linear-gradient(160deg, #f58529 0%, #dd2a7b 35%, #8134af 70%, #515bd4 100%); color: #fff;">
          <div style="background: rgba(255,255,255,0.12); padding: 28px; border-radius: 16px; max-width: 400px; margin: 0 auto;">
            <h2 style="margin: 0 0 12px 0;">Instagram connect&eacute;</h2>
            <p style="margin: 0; opacity: 0.95;">Retour &agrave; RunConnect&hellip;</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'instagram_auth_success' }, '*');
              setTimeout(function () { window.close(); }, 400);
            } else {
              window.location.href = ${JSON.stringify(webUrl)};
            }
          </script>
        </body>
      </html>`,
    );
  } catch (error) {
    logException("instagram-callback", error);
    return htmlUtf8(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Instagram</title></head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 48px 24px;">
          <h1>Connexion Instagram</h1>
          <p>Une erreur s&rsquo;est produite. R&eacute;essaie plus tard.</p>
          <script>
            setTimeout(function () {
              if (window.opener) { window.close(); }
              else { window.location.href = ${JSON.stringify(webUrl)}; }
            }, 3000);
          </script>
        </body></html>`,
    );
  }
});
