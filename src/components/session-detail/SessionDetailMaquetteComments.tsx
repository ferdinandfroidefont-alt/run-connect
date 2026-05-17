import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  getInitials,
  gradientForLetter,
  SessionDetailSectionTitle,
  SESSION_DETAIL_ACTION_BLUE,
} from "@/components/session-detail/SessionDetailMaquetteParts";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  displayName: string;
  letters: string;
};

export function SessionDetailMaquetteComments({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("session_comments")
        .select("id, content, created_at, user_id")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      const userIds = Array.from(new Set((rows || []).map((r) => r.user_id)));
      let profileMap = new Map<
        string,
        { display_name: string | null; username: string | null }
      >();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", userIds);
        profileMap = new Map(
          (profiles || []).map((p) => [
            p.user_id!,
            { display_name: p.display_name, username: p.username },
          ]),
        );
      }

      setComments(
        (rows || []).map((r) => {
          const p = profileMap.get(r.user_id);
          const displayName = p?.display_name || p?.username || "Utilisateur";
          return {
            id: r.id,
            content: r.content,
            created_at: r.created_at,
            displayName,
            letters: getInitials(displayName),
          };
        }),
      );
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const send = async () => {
    const content = input.trim();
    if (!content || !user?.id || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("session_comments").insert({
        session_id: sessionId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
      setInput("");
      await loadComments();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le commentaire.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const countLabel =
    comments.length === 0
      ? "0 avis"
      : comments.length === 1
        ? "1 avis"
        : `${comments.length} avis`;

  return (
    <>
      <SessionDetailSectionTitle
        label="Commentaires"
        right={
          <span className="text-[12px] font-extrabold text-[#8E8E93]">{countLabel}</span>
        }
      />
      <div className="px-4 pb-4">
        <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#8E8E93]" />
            </div>
          ) : comments.length === 0 ? (
            <p className="px-4 py-6 text-center text-[14px] font-medium text-[#8E8E93]">
              Aucun commentaire pour le moment.
            </p>
          ) : (
            comments.map((c, i) => (
              <div key={c.id}>
                {i > 0 ? <div className="ml-[58px] h-[0.5px] bg-[#E5E5EA]" /> : null}
                <div className="flex items-start gap-3 px-4 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-black tracking-[-0.02em] text-white"
                    style={{ background: gradientForLetter(c.letters[0] ?? "?") }}
                  >
                    {c.letters}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="m-0 text-[14px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">
                        {c.displayName}
                      </p>
                      <span className="text-[11.5px] font-semibold text-[#8E8E93]">
                        {formatDistanceToNow(new Date(c.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                    <p className="m-0 mt-0.5 text-[14px] font-medium leading-[1.35] tracking-[-0.01em] text-[#0A0F1F]">
                      {c.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {user ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-[42px] flex-1 items-center rounded-full bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ajouter un commentaire…"
                className="w-full border-0 bg-transparent text-[14px] font-medium text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
              />
            </div>
            <button
              type="button"
              disabled={!input.trim() || sending}
              onClick={() => void send()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40"
              style={{
                background: SESSION_DETAIL_ACTION_BLUE,
                boxShadow: "0 3px 10px rgba(0,122,255,0.3)",
              }}
              aria-label="Envoyer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2.4} />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
