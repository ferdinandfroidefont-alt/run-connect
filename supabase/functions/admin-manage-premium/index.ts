import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerEmail = claimsData.claims.email;
    if (callerEmail !== "ferdinand.froidefont@gmail.com") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, target_user_id, duration_days, target_email } = await req.json();

    // Use service role client to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "grant") {
      if (!target_user_id || !duration_days || !target_email) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + duration_days);

      // Upsert subscribers
      const { error: subError } = await adminClient
        .from("subscribers")
        .upsert(
          {
            user_id: target_user_id,
            email: target_email,
            subscribed: true,
            subscription_status: "active",
            subscription_tier: "creator_gift",
            subscription_end: subscriptionEnd.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (subError) {
        console.error("Subscriber upsert error:", subError);
        return new Response(JSON.stringify({ error: subError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile
      const { error: profError } = await adminClient
        .from("profiles")
        .update({ is_premium: true })
        .eq("user_id", target_user_id);

      if (profError) {
        console.error("Profile update error:", profError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscription_end: subscriptionEnd.toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "revoke") {
      if (!target_user_id) {
        return new Response(JSON.stringify({ error: "Missing target_user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: subError } = await adminClient
        .from("subscribers")
        .update({
          subscribed: false,
          subscription_status: "inactive",
          subscription_tier: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", target_user_id);

      if (subError) {
        console.error("Subscriber update error:", subError);
      }

      const { error: profError } = await adminClient
        .from("profiles")
        .update({ is_premium: false })
        .eq("user_id", target_user_id);

      if (profError) {
        console.error("Profile update error:", profError);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
