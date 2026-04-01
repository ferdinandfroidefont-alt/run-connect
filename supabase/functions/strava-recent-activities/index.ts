import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("strava_access_token, strava_connected")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile error:", profileError);
      return new Response(JSON.stringify({ error: "Database error", activities: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile?.strava_connected || !profile?.strava_access_token) {
      return new Response(JSON.stringify({ error: "Strava not connected", activities: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let afterDays = 35;
    try {
      const body = req.method === "POST" ? await req.json() : {};
      if (typeof body?.afterDays === "number" && body.afterDays > 0 && body.afterDays <= 90) {
        afterDays = Math.floor(body.afterDays);
      }
    } catch {
      // ignore invalid body
    }

    const afterSec = Math.floor(Date.now() / 1000) - afterDays * 24 * 3600;
    const perPage = 50;

    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterSec}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${profile.strava_access_token}`,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Strava activities error:", res.status, text);
      return new Response(
        JSON.stringify({
          error: "Strava API error",
          activities: [],
          detail: res.status === 401 ? "token_expired" : "upstream",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const raw = (await res.json()) as Array<{
      id: number;
      name: string;
      sport_type?: string;
      type?: string;
      start_date: string;
      distance: number;
      moving_time: number;
      map?: { summary_polyline?: string };
      start_latlng?: number[] | null;
    }>;

    const activities = (raw || []).map((a) => {
      const ll = a.start_latlng;
      const startLat = Array.isArray(ll) && ll.length >= 2 ? Number(ll[0]) : undefined;
      const startLng = Array.isArray(ll) && ll.length >= 2 ? Number(ll[1]) : undefined;
      return {
        id: a.id,
        name: a.name,
        sportType: a.sport_type || a.type || "Workout",
        startDate: a.start_date,
        distanceM: typeof a.distance === "number" ? a.distance : 0,
        movingTimeSec: typeof a.moving_time === "number" ? a.moving_time : 0,
        startLat: Number.isFinite(startLat) ? startLat : undefined,
        startLng: Number.isFinite(startLng) ? startLng : undefined,
        polyline: a.map?.summary_polyline || undefined,
      };
    });

    return new Response(JSON.stringify({ activities }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("strava-recent-activities:", e);
    return new Response(JSON.stringify({ error: "Internal error", activities: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
