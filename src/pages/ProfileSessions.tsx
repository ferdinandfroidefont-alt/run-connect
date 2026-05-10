import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MainTopHeader } from "@/components/layout/MainTopHeader";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import {
  FeedSessionTile,
  sessionLikelyLive,
  shortLocation,
  toneHexForActivity,
} from "@/components/feed/FeedSessionTile";
import { fetchFeedSessionForDiscussion, SessionDiscussionView } from "@/components/feed/SessionDiscussionView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FeedSession } from "@/hooks/useFeed";
import { toast } from "sonner";

const PARIS_FALLBACK = { lat: 48.8566, lng: 2.3522 };

/** Évite `Number(null) === 0` qui cassait les mini-cartes quand lat/lng absents en base. */
function pickSessionCoord(value: number | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

interface PastSession {
  id: string;
  title: string;
  scheduled_at: string;
  activity_type: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  current_participants: number | null;
  max_participants: number | null;
  description: string | null;
  organizer_id: string;
  created_at: string;
}

interface MeProfile {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function ProfileSessions() {
  const { user } = useAuth();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reliabilityRate, setReliabilityRate] = useState(0);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
  const [totalSessionsAbsent, setTotalSessionsAbsent] = useState(0);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [subjectProfile, setSubjectProfile] = useState<MeProfile | null>(null);
  const [commentCountBySession, setCommentCountBySession] = useState<Record<string, number>>({});

  const [discussionSessionId, setDiscussionSessionId] = useState<string | null>(null);
  const [discussionSessionOverride, setDiscussionSessionOverride] = useState<FeedSession | null>(null);
  const [discussionSessionFetching, setDiscussionSessionFetching] = useState(false);
  const [selectedSessionDialog, setSelectedSessionDialog] = useState<Record<string, unknown> | null>(null);

  const subjectUserId = routeUserId ?? user?.id ?? null;
  const viewingOther = Boolean(user && routeUserId && routeUserId !== user.id);

  const bumpCommentCount = useCallback((sessionId: string) => {
    setCommentCountBySession((prev) => ({
      ...prev,
      [sessionId]: (prev[sessionId] ?? 0) + 1,
    }));
  }, []);

  const addDiscussionComment = useCallback(
    async (sessionId: string, content: string) => {
      if (!user || !content.trim()) return;
      try {
        const { error } = await supabase.from("session_comments").insert({
          session_id: sessionId,
          user_id: user.id,
          content: content.trim(),
        });
        if (error) throw error;
        bumpCommentCount(sessionId);
        toast.success("Commentaire ajouté");
      } catch (e) {
        console.error("Error adding comment:", e);
        toast.error("Erreur lors de l'ajout du commentaire");
      }
    },
    [user, bumpCommentCount],
  );

  const loadData = useCallback(async () => {
    if (!user || !subjectUserId) return;
    setLoading(true);
    try {
      const { data: stats } = await supabase
        .from("user_stats")
        .select("reliability_rate, total_sessions_joined, total_sessions_completed, total_sessions_absent")
        .eq("user_id", subjectUserId)
        .maybeSingle();

      setReliabilityRate(Math.max(0, Math.min(100, Number(stats?.reliability_rate) || 0)));
      setTotalSessionsJoined(stats?.total_sessions_joined || 0);
      setTotalSessionsCompleted(stats?.total_sessions_completed || 0);
      setTotalSessionsAbsent(stats?.total_sessions_absent || 0);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", subjectUserId)
        .maybeSingle();

      setSubjectProfile({
        username: profileRow?.username || "user",
        display_name: profileRow?.display_name || profileRow?.username || "Utilisateur",
        avatar_url: profileRow?.avatar_url ?? null,
      });

      const nowIso = new Date().toISOString();
      const { data: pastSessions } = await supabase
        .from("sessions")
        .select(
          "id, title, scheduled_at, activity_type, location_name, location_lat, location_lng, current_participants, max_participants, description, organizer_id, created_at",
        )
        .eq("organizer_id", subjectUserId)
        .lt("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: false })
        .limit(20);

      const cleanSessions = (pastSessions || []) as PastSession[];
      setSessions(cleanSessions);

      if (cleanSessions.length === 0) {
        setCommentCountBySession({});
        return;
      }

      const sessionIds = cleanSessions.map((s) => s.id);
      const { data: commentRows } = await supabase.from("session_comments").select("session_id").in("session_id", sessionIds);

      const counts: Record<string, number> = {};
      for (const row of commentRows || []) {
        const sid = row.session_id as string;
        counts[sid] = (counts[sid] ?? 0) + 1;
      }
      setCommentCountBySession(counts);
    } finally {
      setLoading(false);
    }
  }, [user, subjectUserId]);

  useEffect(() => {
    if (!user) return;
    if (routeUserId && routeUserId === user.id) {
      navigate("/profile/sessions", { replace: true });
      return;
    }
    void loadData();
  }, [user, routeUserId, navigate, loadData]);

  const ringRadius = 19;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (Math.max(0, Math.min(100, reliabilityRate)) / 100) * ringCircumference;

  const totalDiscussionComments = useMemo(
    () => Object.values(commentCountBySession).reduce((acc, n) => acc + n, 0),
    [commentCountBySession],
  );

  useEffect(() => {
    if (!discussionSessionId) {
      setDiscussionSessionOverride(null);
      setDiscussionSessionFetching(false);
      return;
    }
    if (!user) return;

    const inList = sessions.some((s) => s.id === discussionSessionId);
    if (inList) {
      setDiscussionSessionOverride(null);
      setDiscussionSessionFetching(false);
      return;
    }

    let cancelled = false;
    setDiscussionSessionFetching(true);
    void (async () => {
      const loaded = await fetchFeedSessionForDiscussion(discussionSessionId);
      if (cancelled) return;
      setDiscussionSessionFetching(false);
      if (!loaded) {
        toast.error("Impossible d'ouvrir la discussion de cette séance.");
        setDiscussionSessionId(null);
        setDiscussionSessionOverride(null);
        return;
      }
      setDiscussionSessionOverride(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [discussionSessionId, user, sessions]);

  const discussionSession = useMemo(() => {
    if (!discussionSessionId || !subjectProfile) return null;
    const fromList = sessions.find((s) => s.id === discussionSessionId);
    if (fromList) {
      const lat = pickSessionCoord(fromList.location_lat, PARIS_FALLBACK.lat);
      const lng = pickSessionCoord(fromList.location_lng, PARIS_FALLBACK.lng);
      const session: FeedSession = {
        id: fromList.id,
        title: fromList.title,
        activity_type: fromList.activity_type || "course",
        location_name: fromList.location_name || "",
        location_lat: lat,
        location_lng: lng,
        scheduled_at: fromList.scheduled_at,
        max_participants: fromList.max_participants,
        current_participants: fromList.current_participants ?? 0,
        description: fromList.description,
        created_at: fromList.created_at,
        organizer: {
          user_id: fromList.organizer_id,
          username: subjectProfile.username || "user",
          display_name: subjectProfile.display_name || subjectProfile.username || "Utilisateur",
          avatar_url: subjectProfile.avatar_url || "",
        },
        likes_count: 0,
        comments_count: commentCountBySession[fromList.id] ?? 0,
        is_liked: false,
        latest_comments: [],
      };
      return session;
    }
    if (discussionSessionOverride?.id === discussionSessionId) return discussionSessionOverride;
    return null;
  }, [discussionSessionId, sessions, subjectProfile, discussionSessionOverride, commentCountBySession]);

  const waitingForDiscussionResolve =
    Boolean(discussionSessionId) && !discussionSession && (loading || discussionSessionFetching);

  const reliabilityBlurb = viewingOther
    ? "Indicateur calculé à partir des séances où cette personne s’est inscrite et a confirmé sa présence."
    : "Calculé sur les confirmations de présence de tes séances passées.";

  const headerBack =
    viewingOther ? (
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted"
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5 shrink-0" />
      </button>
    ) : undefined;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (discussionSessionId && waitingForDiscussionResolve) {
    return (
      <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-secondary">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
          <div className="pointer-events-auto">
            <MainTopHeader title="Séances" left={headerBack} disableScrollCollapse />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 pb-[calc(env(safe-area-inset-bottom,0)+24px)] pt-[calc(env(safe-area-inset-top,0px)+96px)]">
          <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
          <p className="text-center text-ios-subheadline text-muted-foreground">Ouverture de la discussion…</p>
        </div>
      </div>
    );
  }

  if (discussionSession) {
    return (
      <SessionDiscussionView
        session={discussionSession}
        onBack={() => {
          setDiscussionSessionId(null);
          setDiscussionSessionOverride(null);
        }}
        onAddComment={addDiscussionComment}
      />
    );
  }

  const whoLabel = viewingOther
    ? subjectProfile?.display_name || subjectProfile?.username || "Sportif"
    : subjectProfile?.display_name || subjectProfile?.username || "Moi";

  const openDetailsForSession = (s: PastSession) => {
    if (!user || !subjectProfile) return;
    const lat = pickSessionCoord(s.location_lat, PARIS_FALLBACK.lat);
    const lng = pickSessionCoord(s.location_lng, PARIS_FALLBACK.lng);
    setSelectedSessionDialog({
      ...s,
      session_type: s.activity_type || "course",
      intensity: "moderate",
      organizer_id: s.organizer_id,
      location_lat: lat,
      location_lng: lng,
      location_name: s.location_name || "",
      max_participants: s.max_participants ?? 0,
      current_participants: s.current_participants ?? 0,
      description: s.description ?? "",
      profiles: {
        username: subjectProfile.username,
        display_name: subjectProfile.display_name,
        avatar_url: subjectProfile.avatar_url || undefined,
      },
    });
  };

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-secondary">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
        <div className="pointer-events-auto">
          <MainTopHeader
            title="Séances"
            subtitle={viewingOther ? subjectProfile?.display_name || subjectProfile?.username : undefined}
            left={headerBack}
            disableScrollCollapse
          />
        </div>
      </div>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto bg-secondary" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 96px)" }}>
        <div className="mx-auto w-full max-w-2xl space-y-3.5 px-4 pb-[calc(1.5rem+var(--safe-area-bottom))] pt-3.5">
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
                <p className="text-[13px] text-muted-foreground">{reliabilityBlurb}</p>
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
            <p className="text-[13px] text-muted-foreground">{totalDiscussionComments} commentaires</p>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-[18px] bg-card p-0 dark:bg-card">
                  <div className="flex items-center gap-2.5 p-3.5">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                  <div className="h-[130px] animate-pulse bg-muted/60" />
                  <div className="flex items-center justify-between border-t border-border/50 p-3.5">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
                    <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-6 text-center text-[14px] text-muted-foreground">
              Aucune séance passée pour le moment.
            </div>
          ) : (
            sessions.map((session) => {
              const live = sessionLikelyLive(session.scheduled_at);
              const loc = shortLocation(session.location_name);
              const title = loc ? `${session.title} · ${loc}` : session.title;
              const tone = toneHexForActivity(session.activity_type || "");
              const whenPast = format(new Date(session.scheduled_at), "d MMM yyyy · HH:mm", { locale: fr });
              const when = live ? "EN COURS · live" : whenPast;
              const lat = pickSessionCoord(session.location_lat, PARIS_FALLBACK.lat);
              const lng = pickSessionCoord(session.location_lng, PARIS_FALLBACK.lng);
              const nComments = commentCountBySession[session.id] ?? 0;
              const commentLabel = nComments > 0 ? `Commenter (${nComments})` : "Commenter";

              return (
                <FeedSessionTile
                  key={session.id}
                  who={whoLabel}
                  when={when}
                  title={title}
                  tone={tone}
                  live={live}
                  actionLabel="Voir"
                  commentLabel={commentLabel}
                  locationLat={lat}
                  locationLng={lng}
                  avatarUrl={subjectProfile?.avatar_url}
                  activityType={session.activity_type || undefined}
                  onCardPress={() => openDetailsForSession(session)}
                  onCommentPress={() => setDiscussionSessionId(session.id)}
                  onActionPress={() => openDetailsForSession(session)}
                />
              );
            })
          )}
        </div>
      </div>

      <SessionDetailsDialog
        session={selectedSessionDialog as any}
        onClose={() => setSelectedSessionDialog(null)}
        onSessionUpdated={() => void loadData()}
      />
    </div>
  );
}
