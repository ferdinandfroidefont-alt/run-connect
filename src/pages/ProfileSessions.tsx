import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainTopHeader } from "@/components/layout/MainTopHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight } from "lucide-react";

interface PastSession {
  id: string;
  title: string;
  scheduled_at: string;
  activity_type: string | null;
  location_name: string | null;
  current_participants: number | null;
}

interface SessionComment {
  id: string;
  session_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  reviewer_avatar: string | null;
}

export default function ProfileSessions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reliabilityRate, setReliabilityRate] = useState(0);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
  const [totalSessionsAbsent, setTotalSessionsAbsent] = useState(0);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [commentsBySession, setCommentsBySession] = useState<Record<string, SessionComment[]>>({});

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: stats } = await supabase
        .from("user_stats")
        .select("reliability_rate, total_sessions_joined, total_sessions_completed, total_sessions_absent")
        .eq("user_id", user.id)
        .single();

      setReliabilityRate(Math.max(0, Math.min(100, Number(stats?.reliability_rate) || 0)));
      setTotalSessionsJoined(stats?.total_sessions_joined || 0);
      setTotalSessionsCompleted(stats?.total_sessions_completed || 0);
      setTotalSessionsAbsent(stats?.total_sessions_absent || 0);

      const nowIso = new Date().toISOString();
      const { data: pastSessions } = await supabase
        .from("sessions")
        .select("id, title, scheduled_at, activity_type, location_name, current_participants")
        .eq("organizer_id", user.id)
        .lt("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: false })
        .limit(20);

      const cleanSessions = (pastSessions || []) as PastSession[];
      setSessions(cleanSessions);

      if (cleanSessions.length === 0) {
        setCommentsBySession({});
        return;
      }

      const sessionIds = cleanSessions.map((s) => s.id);
      const { data: ratings } = await supabase
        .from("session_ratings")
        .select("id, session_id, reviewer_id, rating, comment")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false });

      const cleanRatings = (ratings || []) as Array<{
        id: string;
        session_id: string;
        reviewer_id: string;
        rating: number;
        comment: string | null;
      }>;

      const reviewerIds = Array.from(new Set(cleanRatings.map((r) => r.reviewer_id)));
      const { data: reviewers } = reviewerIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .in("user_id", reviewerIds)
        : { data: [] };

      const profileByUserId = new Map(
        (reviewers || []).map((p) => [p.user_id, { name: p.display_name || p.username || "Participant", avatar: p.avatar_url }]),
      );

      const grouped: Record<string, SessionComment[]> = {};
      for (const rating of cleanRatings) {
        const reviewer = profileByUserId.get(rating.reviewer_id);
        const item: SessionComment = {
          id: rating.id,
          session_id: rating.session_id,
          reviewer_id: rating.reviewer_id,
          rating: Number(rating.rating) || 0,
          comment: rating.comment,
          reviewer_name: reviewer?.name || "Participant",
          reviewer_avatar: reviewer?.avatar || null,
        };
        if (!grouped[rating.session_id]) grouped[rating.session_id] = [];
        grouped[rating.session_id].push(item);
      }
      setCommentsBySession(grouped);
    } finally {
      setLoading(false);
    }
  };

  const ringRadius = 19;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (Math.max(0, Math.min(100, reliabilityRate)) / 100) * ringCircumference;

  const totalComments = useMemo(
    () => Object.values(commentsBySession).reduce((acc, arr) => acc + arr.length, 0),
    [commentsBySession],
  );

  const tagFromRating = (rating: number) => {
    if (rating >= 4.8) return { label: "Excellent", className: "bg-primary/10 text-primary" };
    if (rating >= 4.2) return { label: "À l'heure", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
    return { label: "En retard", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400" };
  };

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-secondary">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
        <div className="pointer-events-auto">
          <MainTopHeader title="Séances" disableScrollCollapse />
        </div>
      </div>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto bg-secondary" style={{ paddingTop: "calc(var(--safe-area-top) + 96px)" }}>
        <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pb-[calc(1.5rem+var(--safe-area-bottom))]">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 46 46" className="h-full w-full -rotate-90">
                  <circle cx="23" cy="23" r={ringRadius} fill="none" stroke="rgba(10,132,255,0.12)" strokeWidth="5" />
                  <circle
                    cx="23"
                    cy="23"
                    r={ringRadius}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-foreground">
                  {Math.round(reliabilityRate)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold text-foreground">Fiabilité</p>
                <p className="text-[13px] text-muted-foreground">
                  Calculé sur les confirmations de présence de tes séances passées.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 text-center">
              <div>
                <p className="text-[19px] font-semibold text-foreground">{totalSessionsCompleted}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Présent</p>
              </div>
              <div>
                <p className="text-[19px] font-semibold text-foreground">{totalSessionsJoined}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Inscrit</p>
              </div>
              <div>
                <p className="text-[19px] font-semibold text-foreground">{totalSessionsAbsent}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Absent</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 pt-2">
            <h2 className="text-[22px] font-bold tracking-tight text-foreground">Toutes les séances</h2>
            <p className="text-[13px] text-muted-foreground">{totalComments} commentaires</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-40 animate-pulse rounded-2xl bg-white/70" />
              <div className="h-40 animate-pulse rounded-2xl bg-white/70" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-6 text-center text-[14px] text-muted-foreground">
              Aucune séance passée pour le moment.
            </div>
          ) : (
            sessions.map((session) => {
              const dateLabel = new Date(session.scheduled_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const comments = commentsBySession[session.id] || [];
              return (
                <div key={session.id} className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-foreground">{session.title}</p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {dateLabel} · {session.current_participants || 0} participants
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/my-sessions`)}
                      className="inline-flex h-7 items-center gap-0.5 rounded-full border border-border px-2 text-[12px] text-muted-foreground"
                    >
                      Voir
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="border-t border-border pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[13px] font-medium text-muted-foreground">Retours des participants</p>
                      <p className="text-[13px] text-primary">{comments.length}</p>
                    </div>
                    {comments.length === 0 ? (
                      <p className="text-[13px] text-muted-foreground">Aucun commentaire pour cette séance.</p>
                    ) : (
                      <div className="space-y-2">
                        {comments.slice(0, 4).map((comment) => {
                          const tag = tagFromRating(comment.rating);
                          return (
                            <div key={comment.id} className="flex gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={comment.reviewer_avatar || undefined} />
                                <AvatarFallback>{comment.reviewer_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-[13px] font-semibold text-foreground">{comment.reviewer_name}</p>
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tag.className}`}>
                                    {tag.label}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[13px] text-foreground/90">
                                  {comment.comment?.trim() || "Aucun commentaire écrit."}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
