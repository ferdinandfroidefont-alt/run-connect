import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUserJwtCors } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logException } from "../_shared/secureLog.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const auth = await requireUserJwtCors(req, supabaseAdmin, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const clientId = Deno.env.get("GARMIN_CLIENT_ID");
    const authorizeBase = Deno.env.get("GARMIN_OAUTH_AUTHORIZE_URL");
    if (!clientId || !authorizeBase) {
      throw new Error("Garmin OAuth is not configured");
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/garmin-callback`;
    const scope = Deno.env.get("GARMIN_OAUTH_SCOPES") || "read,write";
    const state = auth.user.id;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      state,
    });

    const authUrl = `${authorizeBase}?${params.toString()}`;

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logException("garmin-connect", error);
    return new Response(JSON.stringify({ error: "garmin_connect_failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
