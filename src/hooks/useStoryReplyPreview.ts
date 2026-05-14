import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export type StoryReplyPreviewResult = {
  storyId: string;
  createdAt: string;
  expiresAt: string;
  sessionId: string | null;
  thumbMediaUrl: string | null;
  thumbMediaType: string | null;
  metaLine: string | null;
};

function compactFrRelative(iso: string | null | undefined): string {
  const d = new Date(iso ?? "");
  if (!isValid(d)) return "";
  try {
    return formatDistanceToNowStrict(d, { addSuffix: true, locale: fr })
      .replace(" environ", "")
      .replace(" secondes", " s")
      .replace(" seconde", " s")
      .replace(" minutes", " min")
      .replace(" minute", " min")
      .replace(" heures", " h")
      .replace(" heure", " h")
      .replace(" jours", " j")
      .replace(" jour", " j");
  } catch {
    return "";
  }
}

async function fetchStoryReplyPreview(params: {
  storyAuthorId: string;
  messageCreatedAt: string;
  sessionId: string | null | undefined;
}): Promise<StoryReplyPreviewResult | null> {
  try {
    const { storyAuthorId, messageCreatedAt, sessionId } = params;

    let story:
      | {
          id: string;
          created_at: string;
          expires_at: string;
          session_id: string | null;
        }
      | null = null;

    if (sessionId) {
      const { data: row } = await supabase
        .from("session_stories")
        .select("id, created_at, expires_at, session_id")
        .eq("session_id", sessionId)
        .eq("author_id", storyAuthorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      story = row;
    }

    if (!story) {
      const { data: rows } = await supabase
        .from("session_stories")
        .select("id, created_at, expires_at, session_id")
        .eq("author_id", storyAuthorId)
        .lte("created_at", messageCreatedAt)
        .gte("expires_at", messageCreatedAt)
        .order("created_at", { ascending: false })
        .limit(1);
      story = rows?.[0] ?? null;
    }

    if (!story) {
      const { data: fallback } = await supabase
        .from("session_stories")
        .select("id, created_at, expires_at, session_id")
        .eq("author_id", storyAuthorId)
        .lte("created_at", messageCreatedAt)
        .order("created_at", { ascending: false })
        .limit(1);
      story = fallback?.[0] ?? null;
    }

    if (!story) return null;

    const { data: mediaRows } = await supabase
      .from("story_media")
      .select("media_url, media_type, created_at")
      .eq("story_id", story.id)
      .order("created_at", { ascending: true });

    const imageFirst = mediaRows?.find((m) => (m.media_type ?? "").toLowerCase() === "image");
    const thumbRow = imageFirst ?? mediaRows?.[0] ?? null;

    let metaLine: string | null = null;
    if (story.session_id) {
      const { data: sess } = await supabase
        .from("sessions")
        .select("title, activity_type, distance_km")
        .eq("id", story.session_id)
        .maybeSingle();
      if (sess) {
        const parts: string[] = [];
        if (sess.title?.trim()) parts.push(sess.title.trim());
        if (typeof sess.distance_km === "number" && Number.isFinite(sess.distance_km)) {
          const d = sess.distance_km;
          const rounded = d >= 10 ? Math.round(d) : Math.round(d * 10) / 10;
          parts.push(`${String(rounded).replace(/\.0$/, "")} km`);
        }
        metaLine = parts.length > 0 ? parts.join(" · ") : null;
      }
    }
    if (!metaLine) {
      metaLine = compactFrRelative(story.created_at) || null;
    }

    return {
      storyId: story.id,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      sessionId: story.session_id,
      thumbMediaUrl: thumbRow?.media_url ?? null,
      thumbMediaType: thumbRow?.media_type ?? null,
      metaLine,
    };
  } catch (e) {
    console.warn("[useStoryReplyPreview] fetchStoryReplyPreview", e);
    return null;
  }
}

export function useStoryReplyPreview(params: {
  messageId: string;
  storyAuthorId: string;
  messageCreatedAt: string;
  sessionId: string | null | undefined;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      "story-reply-preview",
      params.messageId,
      params.storyAuthorId,
      params.sessionId ?? "",
      params.messageCreatedAt,
    ],
    queryFn: () =>
      fetchStoryReplyPreview({
        storyAuthorId: params.storyAuthorId,
        messageCreatedAt: params.messageCreatedAt,
        sessionId: params.sessionId,
      }),
    enabled: params.enabled && !!params.storyAuthorId && !!params.messageCreatedAt,
    staleTime: 5 * 60 * 1000,
  });
}
