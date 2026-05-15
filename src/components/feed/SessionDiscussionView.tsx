import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FeedSession } from "@/hooks/useFeed";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/feed/FeedSessionTile";
import { firstMapPointFromRouteCoordinates, pickSessionCoordinate } from "@/lib/geoUtils";

const PARIS_LAT = 48.8566;
const PARIS_LNG = 2.3522;

/** Aligné maquette RunConnect (14).jsx — DiscussionSheet */
const ACTION_BLUE = "#007AFF";
const DISCUSSION_BG = "#F2F2F7";
const TEXT_PRIMARY = "#0A0F1F";
const TEXT_MUTED = "#8E8E93";
const BORDER_SEP = "#E5E5EA";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";
const SEND_DISABLED = "#C7C7CC";

/** Charge une séance pour la vue discussion (hors fil amis : ex. organisateur / Mes séances). */
export async function fetchFeedSessionForDiscussion(sessionId: string): Promise<FeedSession | null> {
  const { data: sessionRow, error } = await supabase
    .from("sessions")
    .select(`
      id,
      title,
      activity_type,
      location_name,
      location_lat,
      location_lng,
      route_id,
      scheduled_at,
      max_participants,
      current_participants,
      description,
      created_at,
      organizer_id
    `)
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !sessionRow) return null;

  let routeAnchor: ReturnType<typeof firstMapPointFromRouteCoordinates> = null;
  if (sessionRow.route_id) {
    const { data: route } = await supabase
      .from("routes")
      .select("coordinates")
      .eq("id", sessionRow.route_id)
      .maybeSingle();
    routeAnchor = firstMapPointFromRouteCoordinates(route?.coordinates);
  }

  const location_lat = pickSessionCoordinate(sessionRow.location_lat, routeAnchor?.lat ?? PARIS_LAT);
  const location_lng = pickSessionCoordinate(sessionRow.location_lng, routeAnchor?.lng ?? PARIS_LNG);

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url")
    .eq("user_id", sessionRow.organizer_id)
    .maybeSingle();

  const organizer = profile ?? {
    user_id: sessionRow.organizer_id,
    username: "user",
    display_name: "Utilisateur",
    avatar_url: "",
  };

  return {
    ...sessionRow,
    location_lat,
    location_lng,
    organizer: {
      user_id: organizer.user_id,
      username: organizer.username,
      display_name: organizer.display_name,
      avatar_url: organizer.avatar_url ?? "",
    },
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    latest_comments: [],
  };
}

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type DiscussionComment = {
  id: string;
  content: string;
  created_at: string;
  user: { username: string; avatar_url: string | null };
};

type DiscussionParticipant = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export function SessionDiscussionView({
  session,
  onBack,
  onAddComment,
}: {
  session: FeedSession;
  onBack: () => void;
  onAddComment: (sessionId: string, content: string) => Promise<void> | void;
}) {
  const [participants, setParticipants] = useState<DiscussionParticipant[]>([]);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { setBottomNavSuppressed } = useAppContext();

  const loadDiscussion = useCallback(async () => {
    const { data: rows } = await supabase.from("session_participants").select("user_id").eq("session_id", session.id);
    const participantIds = Array.from(new Set([session.organizer.user_id, ...(rows || []).map((r) => r.user_id)]));

    const { data: commentsRows } = await supabase
      .from("session_comments")
      .select("id, content, created_at, user_id")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false });

    const commentAuthorIds = (commentsRows || []).map((c) => c.user_id);
    const allProfileIds = Array.from(new Set([...participantIds, ...commentAuthorIds]));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", allProfileIds);

    const map = new Map((profiles || []).map((p) => [p.user_id, p as ProfileRow]));

    const participantsData: DiscussionParticipant[] = participantIds.map((id) => {
      const p = map.get(id);
      return {
        user_id: id,
        username: p?.username || "user",
        display_name: p?.display_name || p?.username || "Utilisateur",
        avatar_url: p?.avatar_url || null,
      };
    });
    setParticipants(participantsData);

    const discussionComments: DiscussionComment[] = (commentsRows || []).map((c) => {
      const p = map.get(c.user_id);
      return {
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user: { username: p?.display_name || p?.username || "Utilisateur", avatar_url: p?.avatar_url || null },
      };
    });
    setComments(discussionComments);
  }, [session.id, session.organizer.user_id]);

  useEffect(() => {
    setBottomNavSuppressed("activities-discussion", true);
    return () => setBottomNavSuppressed("activities-discussion", false);
  }, [setBottomNavSuppressed]);

  useEffect(() => {
    void loadDiscussion();
  }, [loadDiscussion]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onAddComment(session.id, content);
      setInput("");
      await loadDiscussion();
    } finally {
      setSending(false);
    }
  };

  const sessionSubtitle = `${session.organizer.display_name || session.organizer.username} · ${format(
    new Date(session.scheduled_at),
    "d MMM · HH:mm",
    { locale: fr },
  )}`;

  const isOrganizer = (userId: string) => userId === session.organizer.user_id;

  return (
    <div
      className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
      style={{ background: DISCUSSION_BG }}
    >
      {/* HEADER — maquette */}
      <div
        className="shrink-0 px-4 pb-3 pt-[max(12px,var(--safe-area-top))]"
        style={{ background: "white", borderBottom: `1px solid ${BORDER_SEP}` }}
      >
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="flex flex-shrink-0 items-center gap-0">
            <ChevronLeft className="h-6 w-6" strokeWidth={2.6} style={{ color: ACTION_BLUE }} />
            <span className="text-[17px] font-semibold" style={{ color: ACTION_BLUE }}>
              Retour
            </span>
          </button>
          <p className="min-w-0 flex-1 truncate px-1 text-center text-[17px] font-bold" style={{ color: TEXT_PRIMARY }}>
            Discussion
          </p>
          <div className="w-9 flex-shrink-0" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4" style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Card participants */}
        <div className="p-4" style={{ background: "white", borderRadius: 18, boxShadow: CARD_SHADOW }}>
          <p
            className="m-0 text-[17px] font-extrabold tracking-tight"
            style={{ color: TEXT_PRIMARY, letterSpacing: "-0.01em" }}
          >
            {participants.length} participant{participants.length > 1 ? "s" : ""}
          </p>

          {participants.length === 1 ? (
            <div className="mt-3 flex flex-col items-center" style={{ width: "100%" }}>
              <div className="flex flex-col items-center" style={{ width: 76 }}>
                <Avatar className="h-16 w-16 border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                  <AvatarImage src={participants[0].avatar_url || ""} />
                  <AvatarFallback
                    className="text-[24px] font-extrabold text-white"
                    style={{ background: isOrganizer(participants[0].user_id) ? ACTION_BLUE : "#8E8E93" }}
                  >
                    {initials(participants[0].display_name || participants[0].username)}
                  </AvatarFallback>
                </Avatar>
                <p
                  className="mt-2 max-w-[220px] truncate text-center text-[15px] font-extrabold tracking-tight"
                  style={{ color: TEXT_PRIMARY, letterSpacing: "-0.01em" }}
                >
                  {participants[0].display_name || participants[0].username}
                </p>
                {isOrganizer(participants[0].user_id) ? (
                  <p
                    className="mt-0.5 text-[12px] font-extrabold"
                    style={{ color: ACTION_BLUE, letterSpacing: "0.1em" }}
                  >
                    ORGA
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 pt-3">
              {participants.map((p) => (
                <div key={p.user_id} className="w-[76px] shrink-0 text-center">
                  <Avatar className="mx-auto h-14 w-14 border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <AvatarImage src={p.avatar_url || ""} />
                    <AvatarFallback
                      className="text-[14px] font-extrabold text-white"
                      style={{ background: isOrganizer(p.user_id) ? ACTION_BLUE : "#8E8E93" }}
                    >
                      {initials(p.display_name || p.username)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-1 truncate text-[12px] font-medium" style={{ color: TEXT_PRIMARY }}>
                    {(p.display_name || p.username).split(" ")[0]}
                  </p>
                  {isOrganizer(p.user_id) ? (
                    <p className="text-[10px] font-extrabold" style={{ color: ACTION_BLUE, letterSpacing: "0.08em" }}>
                      ORGA
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card info séance */}
        <div className="mt-3 p-4" style={{ background: "white", borderRadius: 18, boxShadow: CARD_SHADOW }}>
          <h2
            className="m-0 font-black leading-[1.15] tracking-tight"
            style={{
              color: TEXT_PRIMARY,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.03em",
            }}
          >
            {session.title}
          </h2>
          <p className="mb-0 mt-2 text-[15px]" style={{ color: TEXT_MUTED }}>
            {sessionSubtitle}
          </p>
        </div>

        {/* Liste commentaires */}
        <p
          className="m-0 mb-3 mt-[18px] text-[16px] font-extrabold tracking-tight"
          style={{ color: TEXT_PRIMARY, letterSpacing: "-0.01em" }}
        >
          {comments.length} commentaire{comments.length > 1 ? "s" : ""}
        </p>

        {comments.length > 0 && (
          <div className="space-y-2.5">
            {comments.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 p-3"
                style={{
                  background: "white",
                  borderRadius: 14,
                  boxShadow: CARD_SHADOW,
                }}
              >
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={c.user.avatar_url || ""} className="object-cover" />
                  <AvatarFallback
                    className="text-[14px] font-extrabold text-white"
                    style={{ background: ACTION_BLUE }}
                  >
                    {initials(c.user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p
                      className="m-0 truncate text-[14px] font-extrabold tracking-tight"
                      style={{ color: TEXT_PRIMARY, letterSpacing: "-0.01em" }}
                    >
                      {c.user.username}
                    </p>
                    <p className="m-0 shrink-0 text-[12px]" style={{ color: TEXT_MUTED }}>
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <p
                    className="m-0 mt-[3px] whitespace-pre-wrap break-words text-[15px] leading-[1.35]"
                    style={{ color: TEXT_PRIMARY }}
                  >
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER INPUT — maquette */}
      <div
        className="absolute bottom-0 left-0 right-0 flex-shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
        style={{ background: "white", borderTop: `1px solid ${BORDER_SEP}` }}
      >
        <p className="mb-2 mt-1 text-[13px]" style={{ color: TEXT_MUTED }}>
          Visible sur Toutes les publications
        </p>
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 items-center rounded-full border px-4 py-[10px]"
            style={{ borderColor: BORDER_SEP, background: "white" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ajouter un commentaire"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
              style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: 500 }}
              disabled={sending}
            />
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 px-2 py-2 transition-transform active:scale-[0.96]"
          >
            <span
              className="text-[16px] font-bold tracking-tight"
              style={{
                color: input.trim() && !sending ? ACTION_BLUE : SEND_DISABLED,
                letterSpacing: "-0.01em",
              }}
            >
              Envoyer
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
