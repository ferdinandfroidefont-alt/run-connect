import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUserJwtCors } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const auth = await requireUserJwtCors(req, supabase as any, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: { referralCode?: string; newUserId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const referralCode = body?.referralCode?.trim().toUpperCase();
  const newUserId = body?.newUserId;

  if (!referralCode || !newUserId) {
    return new Response(JSON.stringify({ error: "Missing referral code or user ID" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (newUserId !== auth.user.id) {
    return new Response(JSON.stringify({ error: "User ID does not match session" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: referrerId, error: resolveError } = await supabase.rpc("resolve_referrer_id", {
    referral_code_param: referralCode,
  });

  if (resolveError) {
    console.error("resolve_referrer_id error");
  }

  const { data: processed, error } = await supabase.rpc("process_referral", {
    referral_code_param: referralCode,
    new_user_id: newUserId,
  });

  if (error) {
    console.error("process_referral RPC error on signup");
    return new Response(JSON.stringify({ error: "Failed to process referral" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!processed) {
    return new Response(JSON.stringify({ error: "Invalid or already used referral code" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (referrerId) {
    const { error: challengeError } = await supabase.rpc("increment_challenge_progress", {
      p_user_id: referrerId,
      p_validation_type: "refer_friend",
      p_increment: 1,
    });

    if (challengeError) {
      console.error("Error validating refer_friend challenge");
    }
  }

  return new Response(JSON.stringify({ success: true, referrerId: referrerId ?? null }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
