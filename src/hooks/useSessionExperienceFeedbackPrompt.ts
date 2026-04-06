import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { SessionFeedbackTarget } from "@/components/SessionExperienceFeedbackDialog";

const OPEN_DELAY_MS = 3200;

function isSkippedLocal(sessionId: string): boolean {
  try {
    return localStorage.getItem(`session_experience_feedback_skipped_${sessionId}`) === "1";
  } catch {
    return false;
  }
}

export function useSessionExperienceFeedbackPrompt(enabled: boolean, userId: string | undefined) {
  const location = useLocation();
  const [pending, setPending] = useState<SessionFeedbackTarget | null>(null);

  const fetchPending = useCallback(async () => {
    if (!userId) {
      setPending(null);
      return;
    }

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: parts, error: pErr } = await supabase
      .from("session_participants")
      .select("session_id")
      .eq("user_id", userId);

    if (pErr || !parts?.length) {
      setPending(null);
      return;
    }

    const sessionIds = [...new Set(parts.map((p) => p.session_id))];

    const { data: sessions, error: sErr } = await supabase
      .from("sessions")
      .select("id, title, scheduled_at, organizer_id")
      .in("id", sessionIds)
      .lt("scheduled_at", cutoff)
      .neq("organizer_id", userId)
      .order("scheduled_at", { ascending: false })
      .limit(8);

    if (sErr || !sessions?.length) {
      setPending(null);
      return;
    }

    const { data: existing } = await supabase
      .from("session_participant_feedback")
      .select("session_id")
      .eq("participant_user_id", userId)
      .in(
        "session_id",
        sessions.map((s) => s.id)
      );

    const done = new Set((existing || []).map((r) => r.session_id));

    for (const s of sessions) {
      if (done.has(s.id)) continue;
      if (isSkippedLocal(s.id)) continue;
      setPending({
        sessionId: s.id,
        title: s.title,
        scheduledAt: s.scheduled_at,
        organizerId: s.organizer_id,
      });
      return;
    }

    setPending(null);
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const t = window.setTimeout(() => {
      void fetchPending();
    }, OPEN_DELAY_MS);

    return () => window.clearTimeout(t);
  }, [enabled, userId, fetchPending, location.pathname]);

  const afterSubmit = useCallback(() => {
    setPending(null);
    void fetchPending();
  }, [fetchPending]);

  return { pending, setPending, afterSubmit, fetchPending };
}
