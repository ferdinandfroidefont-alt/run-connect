import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FeedSession } from "@/hooks/useFeed";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/components/feed/FeedSessionTile";

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

  useEffect(() => {
    setBottomNavSuppressed("activities-discussion", true);
    return () => setBottomNavSuppressed("activities-discussion", false);
  }, [setBottomNavSuppressed]);

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await supabase.from("session_participants").select("user_id").eq("session_id", session.id);
      const ids = Array.from(new Set([session.organizer.user_id, ...(rows || []).map((r) => r.user_id)]));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", ids);
      const map = new Map((profiles || []).map((p) => [p.user_id, p]));
      const participantsData: DiscussionParticipant[] = ids.map((id) => {
        const p = map.get(id);
        return {
          user_id: id,
          username: p?.username || "user",
          display_name: p?.display_name || p?.username || "Utilisateur",
          avatar_url: p?.avatar_url || null,
        };
      });
      setParticipants(participantsData);

      const { data: commentsRows } = await supabase
        .from("session_comments")
        .select("id, content, created_at, user_id")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false });
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
    };
    void load();
  }, [session.id, session.organizer.user_id]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    await onAddComment(session.id, content);
    setInput("");
    const { data } = await supabase
      .from("session_comments")
      .select("id, content, created_at, user_id")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false });
    setComments(
      (data || []).map((c) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user: { username: "Utilisateur", avatar_url: null },
      })),
    );
    setSending(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f5f7]">
      <div className="shrink-0 border-b border-[#e0e0e0] bg-white pt-[var(--safe-area-top)]">
        <div className="flex h-11 items-center px-4">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[17px] text-[#0066cc]">
            <ChevronLeft className="h-5 w-5" />
            Retour
          </button>
          <p className="flex-1 pr-8 text-center text-[17px] font-semibold">Discussion</p>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto px-4 pb-36">
        <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5">
          <p className="mb-3 text-[14px] font-semibold text-[#333]">{participants.length} participants</p>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {participants.map((p, i) => (
              <div key={p.user_id} className="w-[60px] shrink-0 text-center">
                <Avatar className="mx-auto h-14 w-14">
                  <AvatarImage src={p.avatar_url || ""} />
                  <AvatarFallback className={cn("text-white", i === 0 ? "bg-[#ff9500]" : "bg-[#8E8E93]")}>
                    {initials(p.display_name || p.username)}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-1 truncate text-[12px]">{(p.display_name || p.username).split(" ")[0]}</p>
                {i === 0 ? <p className="text-[10px] text-[#0066cc]">ORGA</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5">
          <h2 className="mb-2 text-[21px] font-semibold">{session.title}</h2>
          <p className="text-[14px] text-[#7a7a7a]">
            {session.organizer.display_name || session.organizer.username} ·{" "}
            {format(new Date(session.scheduled_at), "EEEE d MMM", { locale: fr })}
          </p>
        </div>

        <p className="px-1 pt-2 text-[14px] font-semibold text-[#333]">{comments.length} commentaires</p>
        {comments.map((c) => (
          <div key={c.id} className="rounded-[18px] border border-[#e0e0e0] bg-white p-4">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={c.user.avatar_url || ""} />
                <AvatarFallback>{initials(c.user.username)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="truncate text-[14px] font-semibold">{c.user.username}</span>
                  <span className="text-[12px] text-[#7a7a7a]">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-[14px]">{c.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 border-t border-[#e0e0e0] bg-white/95 px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="mb-1 text-[12px] text-[#7a7a7a]">Visible sur Toutes les publications</div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ajouter un commentaire"
            className="h-11 flex-1 rounded-full border border-[#e0e0e0] px-4 text-[17px] outline-none"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="text-[17px] text-[#0066cc] disabled:text-[#ccc]"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
