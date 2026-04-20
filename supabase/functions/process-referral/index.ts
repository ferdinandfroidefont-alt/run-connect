import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUserJwtCors } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const auth = await requireUserJwtCors(req, supabaseClient as any, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: { referralCode?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const referralCode = body?.referralCode;
  if (!referralCode || typeof referralCode !== "string") {
    return new Response(JSON.stringify({ error: "Referral code is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabaseClient.rpc("process_referral", {
    referral_code_param: referralCode,
    new_user_id: auth.user.id,
  });

  if (error) {
    console.error("process_referral RPC error");
    return new Response(JSON.stringify({ error: "Could not process referral" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      success: data,
      message: data
        ? "Parrainage traité avec succès !"
        : "Code de parrainage invalide ou déjà utilisé",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
