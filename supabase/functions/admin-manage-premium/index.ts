import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const callerEmail = claimsData.claims.email;
    if (callerEmail !== "ferdinand.froidefont@gmail.com") {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const { action } = body;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // ─── GRANT PREMIUM ───
    if (action === "grant") {
      const { target_user_id, target_email, duration_days } = body;
      if (!target_user_id || !duration_days || !target_email) {
        return json({ error: "Missing fields" }, 400);
      }
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + duration_days);

      const { error: subError } = await admin.from("subscribers").upsert(
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
        return json({ error: subError.message }, 500);
      }

      await admin.from("profiles").update({ is_premium: true }).eq("user_id", target_user_id);

      return json({ success: true, subscription_end: subscriptionEnd.toISOString() });
    }

    // ─── REVOKE PREMIUM ───
    if (action === "revoke") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      await admin.from("subscribers").update({
        subscribed: false,
        subscription_status: "inactive",
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", target_user_id);

      await admin.from("profiles").update({ is_premium: false }).eq("user_id", target_user_id);

      return json({ success: true });
    }

    // ─── GET USER DETAILS (auth email + full profile + stats + badges + subscriber) ───
    if (action === "get_user_details") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      // Get auth user (email, created_at, banned)
      const { data: authData, error: authErr } = await admin.auth.admin.getUserById(target_user_id);
      
      let authInfo = null;
      if (!authErr && authData?.user) {
        authInfo = {
          email: authData.user.email,
          created_at: authData.user.created_at,
          last_sign_in_at: authData.user.last_sign_in_at,
          banned_until: authData.user.banned_until,
          phone: authData.user.phone,
        };
      }

      // Get profile
      const { data: profile } = await admin.from("profiles").select("*").eq("user_id", target_user_id).maybeSingle();

      // Get subscriber info
      const { data: subscriber } = await admin.from("subscribers").select("*").eq("user_id", target_user_id).maybeSingle();

      // Get scores
      const { data: scores } = await admin.from("user_scores").select("*").eq("user_id", target_user_id).maybeSingle();

      // Get stats
      const { data: stats } = await admin.from("user_stats").select("*").eq("user_id", target_user_id).maybeSingle();

      // Get badges
      const { data: badges } = await admin.from("user_badges").select("*").eq("user_id", target_user_id);

      // Get sessions created count
      const { count: sessionsCreated } = await admin.from("sessions").select("id", { count: "exact", head: true }).eq("organizer_id", target_user_id);

      // Get sessions joined count
      const { count: sessionsJoined } = await admin.from("session_participants").select("id", { count: "exact", head: true }).eq("user_id", target_user_id);

      // Get followers / following counts
      const { count: followersCount } = await admin.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", target_user_id).eq("status", "accepted");
      const { count: followingCount } = await admin.from("user_follows").select("id", { count: "exact", head: true }).eq("follower_id", target_user_id).eq("status", "accepted");

      return json({
        auth: authInfo,
        profile,
        subscriber,
        scores,
        stats,
        badges: badges || [],
        sessionsCreated: sessionsCreated || 0,
        sessionsJoined: sessionsJoined || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      });
    }

    // ─── RESET TUTORIAL ───
    if (action === "reset_tutorial") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      const { error } = await admin.from("profiles").update({
        tutorial_completed: false,
        onboarding_completed: false,
        welcome_video_seen: false,
      }).eq("user_id", target_user_id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ─── RESET PASSWORD ───
    if (action === "reset_password") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(target_user_id);
      if (authErr || !authUser?.user?.email) return json({ error: "User not found or no email" }, 404);

      const { error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: authUser.user.email,
      });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, email: authUser.user.email });
    }

    // ─── BAN USER ───
    if (action === "ban_user") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      const { error } = await admin.auth.admin.updateUserById(target_user_id, {
        ban_duration: "876000h", // ~100 years
      });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ─── UNBAN USER ───
    if (action === "unban_user") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      const { error } = await admin.auth.admin.updateUserById(target_user_id, {
        ban_duration: "none",
      });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ─── DELETE USER ───
    if (action === "delete_user") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      // Delete profile first
      await admin.from("profiles").delete().eq("user_id", target_user_id);
      await admin.from("subscribers").delete().eq("user_id", target_user_id);
      await admin.from("user_scores").delete().eq("user_id", target_user_id);
      await admin.from("user_stats").delete().eq("user_id", target_user_id);
      await admin.from("user_badges").delete().eq("user_id", target_user_id);
      await admin.from("notifications").delete().eq("user_id", target_user_id);

      const { error } = await admin.auth.admin.deleteUser(target_user_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ─── UPDATE PROFILE ───
    if (action === "update_profile") {
      const { target_user_id, updates } = body;
      if (!target_user_id || !updates) return json({ error: "Missing fields" }, 400);

      // Only allow safe fields
      const allowed = ["username", "display_name", "bio", "avatar_url", "age"];
      const safe: Record<string, unknown> = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) safe[k] = updates[k];
      }

      const { error } = await admin.from("profiles").update(safe).eq("user_id", target_user_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ─── PURGE NOTIFICATIONS ───
    if (action === "purge_notifications") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      const { error } = await admin.from("notifications").delete().eq("user_id", target_user_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ─── RESET SCORE ───
    if (action === "reset_score") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);

      await admin.from("user_scores").update({
        total_points: 0,
        weekly_points: 0,
        seasonal_points: 0,
        updated_at: new Date().toISOString(),
      }).eq("user_id", target_user_id);

      return json({ success: true });
    }

    // ─── GET GLOBAL STATS ───
    if (action === "get_stats") {
      const { count: totalUsers } = await admin.from("profiles").select("id", { count: "exact", head: true });
      const { count: premiumUsers } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true);
      const { count: totalSessions } = await admin.from("sessions").select("id", { count: "exact", head: true });
      const { count: totalMessages } = await admin.from("messages").select("id", { count: "exact", head: true });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: sessionsThisWeek } = await admin.from("sessions").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString());

      const { count: activeUsers } = await admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen", weekAgo.toISOString());

      const { count: totalClubs } = await admin.from("conversations").select("id", { count: "exact", head: true }).eq("is_group", true);

      const { count: totalSubscribers } = await admin.from("subscribers").select("id", { count: "exact", head: true }).eq("subscribed", true);

      return json({
        totalUsers: totalUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalSessions: totalSessions || 0,
        sessionsThisWeek: sessionsThisWeek || 0,
        totalMessages: totalMessages || 0,
        activeUsers: activeUsers || 0,
        totalClubs: totalClubs || 0,
        totalSubscribers: totalSubscribers || 0,
      });
    }

    // ─── GET REPORTS ───
    if (action === "get_reports") {
      // Use audit_log for reports or blocked_users as a proxy
      const { data: recentAudit } = await admin
        .from("audit_log")
        .select("*")
        .eq("action", "report_user")
        .order("timestamp", { ascending: false })
        .limit(50);

      return json({ reports: recentAudit || [] });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error.message }, 500);
  }
});
