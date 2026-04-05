import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";

/** Lundi 00:00 UTC de la semaine ISO contenant `d`. */
function utcStartOfWeekMonday(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!requireCron(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const thisWeekMon = utcStartOfWeekMonday(now);
    const recapStart = new Date(thisWeekMon);
    recapStart.setUTCDate(recapStart.getUTCDate() - 7);
    const recapEnd = new Date(thisWeekMon);

    const { data: sessions, error: sErr } = await supabase
      .from("coaching_sessions")
      .select("id, coach_id, club_id, title, scheduled_at")
      .gte("scheduled_at", recapStart.toISOString())
      .lt("scheduled_at", recapEnd.toISOString());

    if (sErr) throw sErr;
    if (!sessions?.length) {
      return new Response(JSON.stringify({ success: true, message: "No sessions in recap window", notified: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionIds = sessions.map((s) => s.id);
    const sessionById = new Map(sessions.map((s) => [s.id, s]));

    const { data: parts, error: pErr } = await supabase
      .from("coaching_participations")
      .select("coaching_session_id, user_id, status")
      .in("coaching_session_id", sessionIds);

    if (pErr) throw pErr;

    type Agg = {
      coachId: string;
      clubId: string;
      sessions: number;
      totalParts: number;
      completed: number;
      pendingLate: number;
    };

    const map = new Map<string, Agg>();

    for (const s of sessions) {
      const k = `${s.coach_id}:${s.club_id}`;
      if (!map.has(k)) {
        map.set(k, {
          coachId: s.coach_id,
          clubId: s.club_id,
          sessions: 0,
          totalParts: 0,
          completed: 0,
          pendingLate: 0,
        });
      }
      map.get(k)!.sessions++;
    }

    const recapEndMs = recapEnd.getTime();

    for (const p of parts || []) {
      const s = sessionById.get(p.coaching_session_id);
      if (!s) continue;
      const k = `${s.coach_id}:${s.club_id}`;
      const a = map.get(k);
      if (!a) continue;
      a.totalParts++;
      if (p.status === "completed") a.completed++;
      const sessMs = new Date(s.scheduled_at).getTime();
      if (sessMs < recapEndMs && p.status !== "completed" && (p.status === "sent" || p.status === "scheduled")) {
        a.pendingLate++;
      }
    }

    let notified = 0;
    let errors = 0;

    for (const agg of map.values()) {
      if (agg.sessions === 0) continue;
      const pct = agg.totalParts > 0 ? Math.round((agg.completed / agg.totalParts) * 100) : 0;
      const body =
        `${agg.completed}/${agg.totalParts} validations (${pct}%) · ${agg.sessions} séance${agg.sessions > 1 ? "s" : ""}` +
        (agg.pendingLate > 0 ? ` · ${agg.pendingLate} en retard` : "");

      const { error: invErr } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: agg.coachId,
          title: "📊 Récap coaching (semaine passée)",
          body,
          type: "coaching_weekly_recap",
          data: { club_id: agg.clubId, week_start: recapStart.toISOString() },
        },
      });

      if (invErr) errors++;
      else notified++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recapStart: recapStart.toISOString(),
        recapEnd: recapEnd.toISOString(),
        groups: map.size,
        notified,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
