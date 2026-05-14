import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MainTopHeader } from "@/components/layout/MainTopHeader";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { FeedCard } from "@/components/feed/FeedCard";
import { fetchFeedSessionForDiscussion, SessionDiscussionView } from "@/components/feed/SessionDiscussionView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FeedSession } from "@/hooks/useFeed";
import { firstMapPointFromRouteCoordinates, pickSessionCoordinate, type MapCoord } from "@/lib/geoUtils";
import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";

const PARIS_FALLBACK: MapCoord = { lat: 48.8566, lng: 2.3522 };
const ACTION_BLUE_MAQUETTE = "#007AFF";

const SESSION_SELECT =
  "id, title, scheduled_at, activity_type, location_name, location_lat, location_lng, route_id, current_participants, max_participants, description, organizer_id, created_at, calculated_level";

type RawPastSession = {
  id: string;
  title: string;
  scheduled_at: string;
  activity_type: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  route_id: string | null;
  current_participants: number | null;
  max_participants: number | null;
  description: string | null;
  organizer_id: string;
  created_at: string;
  calculated_level?: number | null;
};

interface MeProfile {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/** Enrichit les lignes `sessions` comme le feed (organisateur, coords route, likes, commentaires). */
async function enrichPastSessionsToFeed(sessionsIn: RawPastSession[], viewerUserId: string): Promise<FeedSession[]> {
  if (sessionsIn.length === 0) return [];

  const routeIds = [...new Set(sessionsIn.map((s) => s.route_id).filter(Boolean))] as string[];
  const routeAnchorById = new Map<string, { lat: number; lng: number }>();
  if (routeIds.length > 0) {
    const { data: routes } = await supabase.from("routes").select("id, coordinates").in("id", routeIds);
    for (const r of routes || []) {
      const pt = firstMapPointFromRouteCoordinates(r.coordinates);
      if (pt) routeAnchorById.set(r.id, pt);
    }
  }

  const organizerIds = [...new Set(sessionsIn.map((s) => s.organizer_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", organizerIds);

  const sessionIds = sessionsIn.map((s) => s.id);

  const [{ data: likes }, { data: userLikes }, { data: comments }] = await Promise.all([
    supabase.from("session_likes").select("session_id").in("session_id", sessionIds),
    supabase.from("session_likes").select("session_id").in("session_id", sessionIds).eq("user_id", viewerUserId),
    supabase
      .from("session_comments")
      .select("id, session_id, content, created_at, user_id")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false }),
  ]);

  const commenterIds = comments ? [...new Set(comments.map((c) => c.user_id))] : [];
  const { data: commentProfiles } =
    commenterIds.length > 0
      ? await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", commenterIds)
      : { data: [] };

  return sessionsIn.map((session) => {
    const organizer = profiles?.find((p) => p.user_id === session.organizer_id);
    const sessionLikes = likes?.filter((l) => l.session_id === session.id).length || 0;
    const isLiked = userLikes?.some((l) => l.session_id === session.id) || false;
    const sessionComments = comments?.filter((c) => c.session_id === session.id) || [];
    const anchor = session.route_id ? routeAnchorById.get(session.route_id) : undefined;

    return {
      id: session.id,
      title: session.title,
      activity_type: session.activity_type || "course",
      location_name: session.location_name || "",
      location_lat: pickSessionCoordinate(session.location_lat, anchor?.lat ?? PARIS_FALLBACK.lat),
      location_lng: pickSessionCoordinate(session.location_lng, anchor?.lng ?? PARIS_FALLBACK.lng),
      scheduled_at: session.scheduled_at,
      max_participants: session.max_participants,
      current_participants: session.current_participants ?? 0,
      description: session.description,
      created_at: session.created_at,
      calculated_level: session.calculated_level != null ? Number(session.calculated_level) : undefined,
      organizer: organizer
        ? {
            user_id: organizer.user_id,
            username: organizer.username || "user",
            display_name: organizer.display_name || organizer.username || "Utilisateur",
            avatar_url: organizer.avatar_url || "",
          }
        : {
            user_id: session.organizer_id,
            username: "user",
            display_name: "Utilisateur",
            avatar_url: "",
          },
      likes_count: sessionLikes,
      comments_count: sessionComments.length,
      is_liked: isLiked,
      latest_comments: sessionComments.slice(0, 2).map((comment) => {
        const commenter = commentProfiles?.find((p) => p.user_id === comment.user_id);
        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user: {
            username: commenter?.username || "user",
            avatar_url: commenter?.avatar_url || "",
          },
        };
      }),
    };
  });
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
  const [totalSessionsCreated, setTotalSessionsCreated] = useState(0);
  const [showReliabilityDetail, setShowReliabilityDetail] = useState(false);
  const [feedSessions, setFeedSessions] = useState<FeedSession[]>([]);
  const [subjectProfile, setSubjectProfile] = useState<MeProfile | null>(null);

  const [discussionSessionId, setDiscussionSessionId] = useState<string | null>(null);
  const [discussionSessionOverride, setDiscussionSessionOverride] = useState<FeedSession | null>(null);
  const [discussionSessionFetching, setDiscussionSessionFetching] = useState(false);
  const [selectedSessionDialog, setSelectedSessionDialog] = useState<Record<string, unknown> | null>(null);

  const subjectUserId = routeUserId ?? user?.id ?? null;
  const viewingOther = Boolean(user && routeUserId && routeUserId !== user.id);

  const addCommentForFeed = useCallback(
    async (sessionId: string, content: string) => {
      if (!user || !content.trim()) return;
      try {
        const { data: newComment, error } = await supabase
          .from("session_comments")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            content: content.trim(),
          })
          .select()
          .single();
        if (error) throw error;
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("user_id", user.id)
          .single();

        setFeedSessions((prev) =>
          prev.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  comments_count: item.comments_count + 1,
                  latest_comments: [
                    {
                      id: newComment.id,
                      content: newComment.content,
                      created_at: newComment.created_at,
                      user: {
                        username: profile?.username || "user",
                        avatar_url: profile?.avatar_url || "",
                      },
                    },
                    ...item.latest_comments,
                  ].slice(0, 2),
                }
              : item,
          ),
        );
        toast.success("Commentaire ajouté");
      } catch (e) {
        console.error("Error adding comment:", e);
        toast.error("Erreur lors de l'ajout du commentaire");
      }
    },
    [user],
  );

  const likeSession = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      try {
        await supabase.from("session_likes").insert({ session_id: sessionId, user_id: user.id });
        setFeedSessions((prev) =>
          prev.map((item) =>
            item.id === sessionId ? { ...item, is_liked: true, likes_count: item.likes_count + 1 } : item,
          ),
        );
      } catch (e) {
        console.error("Error liking session:", e);
      }
    },
    [user],
  );

  const unlikeSession = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      try {
        await supabase.from("session_likes").delete().eq("session_id", sessionId).eq("user_id", user.id);
        setFeedSessions((prev) =>
          prev.map((item) =>
            item.id === sessionId ? { ...item, is_liked: false, likes_count: Math.max(0, item.likes_count - 1) } : item,
          ),
        );
      } catch (e) {
        console.error("Error unliking session:", e);
      }
    },
    [user],
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

      const { count: createdCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", subjectUserId);
      setTotalSessionsCreated(createdCount ?? 0);

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
      const nowMs = Date.now();

      const [{ data: organizedRows }, { data: participationRows }] = await Promise.all([
        supabase
          .from("sessions")
          .select(SESSION_SELECT)
          .eq("organizer_id", subjectUserId)
          .lt("scheduled_at", nowIso)
          .order("scheduled_at", { ascending: false })
          .limit(800),
        supabase
          .from("session_participants")
          .select(`sessions (${SESSION_SELECT})`)
          .eq("user_id", subjectUserId)
          .limit(800),
      ]);

      const organized = (organizedRows || []) as RawPastSession[];
      const joined: RawPastSession[] = [];
      for (const row of participationRows || []) {
        const sess = row.sessions as RawPastSession | RawPastSession[] | null;
        const s = Array.isArray(sess) ? sess[0] : sess;
        if (!s?.id) continue;
        if (new Date(s.scheduled_at).getTime() >= nowMs) continue;
        joined.push(s);
      }

      const byId = new Map<string, RawPastSession>();
      for (const s of [...organized, ...joined]) {
        if (!byId.has(s.id)) byId.set(s.id, s);
      }
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
      );

      const feed = await enrichPastSessionsToFeed(merged, user.id);
      setFeedSessions(feed);
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

  const totalDiscussionComments = useMemo(
    () => feedSessions.reduce((acc, s) => acc + s.comments_count, 0),
    [feedSessions],
  );

  useEffect(() => {
    if (!discussionSessionId) {
      setDiscussionSessionOverride(null);
      setDiscussionSessionFetching(false);
      return;
    }
    if (!user) return;

    const inList = feedSessions.some((s) => s.id === discussionSessionId);
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
  }, [discussionSessionId, user, feedSessions]);

  const discussionSession = useMemo(() => {
    if (!discussionSessionId) return null;
    const fromList = feedSessions.find((s) => s.id === discussionSessionId);
    if (fromList) return fromList;
    if (discussionSessionOverride?.id === discussionSessionId) return discussionSessionOverride;
    return null;
  }, [discussionSessionId, feedSessions, discussionSessionOverride]);

  const waitingForDiscussionResolve =
    Boolean(discussionSessionId) && !discussionSession && (loading || discussionSessionFetching);

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
        onAddComment={addCommentForFeed}
      />
    );
  }

  const openDetailsFromFeed = (s: FeedSession) => {
    setSelectedSessionDialog({
      ...s,
      session_type: s.activity_type,
      intensity: "moderate",
      organizer_id: s.organizer.user_id,
      location_lat: s.location_lat,
      location_lng: s.location_lng,
      location_name: s.location_name,
      max_participants: s.max_participants,
      current_participants: s.current_participants,
      description: s.description,
      profiles: {
        username: s.organizer.username,
        display_name: s.organizer.display_name,
        avatar_url: s.organizer.avatar_url || undefined,
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
        <div className="mx-auto w-full max-w-2xl pb-[calc(1.5rem+var(--safe-area-bottom))] pt-3.5">
          <div className="mb-3.5 px-4">
            <button
              type="button"
              onClick={() => setShowReliabilityDetail(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06] active:bg-[#F8F8F8]"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] text-[12px] font-bold"
                style={{
                  borderColor: ACTION_BLUE_MAQUETTE,
                  color: ACTION_BLUE_MAQUETTE,
                }}
              >
                {Math.round(Math.max(0, Math.min(100, reliabilityRate)))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold text-[#0A0F1F]">Mes séances</p>
                <p className="text-[12px] text-[#8E8E93]">
                  {totalSessionsCompleted}/{totalSessionsJoined} confirmées · Fiabilité{" "}
                  {Math.round(Math.max(0, Math.min(100, reliabilityRate)))}%
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between px-5">
            <h2 className="text-[22px] font-bold tracking-tight text-foreground">Toutes les séances</h2>
            <p className="text-[13px] text-muted-foreground">{totalDiscussionComments} commentaires</p>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3.5 px-ios-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden bg-white">
                  <div className="flex items-center gap-2.5 border-b border-border/40 p-4">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                  <div className="h-24 animate-pulse bg-muted/40" />
                  <div className="h-32 animate-pulse bg-muted/60" />
                </div>
              ))}
            </div>
          ) : feedSessions.length === 0 ? (
            <div className="mx-4 rounded-2xl border border-border bg-white p-6 text-center text-[14px] text-muted-foreground">
              Aucune séance passée pour le moment.
            </div>
          ) : (
            <div className="sm:mx-auto sm:max-w-2xl">
              {feedSessions.map((session, index) => (
                <FeedCard
                  key={session.id}
                  session={session}
                  index={index}
                  onLike={likeSession}
                  onUnlike={unlikeSession}
                  onAddComment={addCommentForFeed}
                  onJoinSession={(sessionId) => navigate("/", { state: { openSessionId: sessionId } })}
                  onOpenDetails={(s) => openDetailsFromFeed(s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <SessionDetailsDialog
        session={selectedSessionDialog as never}
        onClose={() => setSelectedSessionDialog(null)}
        onSessionUpdated={() => void loadData()}
      />

      <ReliabilityDetailsDialog
        open={showReliabilityDetail}
        onOpenChange={setShowReliabilityDetail}
        reliabilityRate={reliabilityRate}
        totalSessionsCreated={totalSessionsCreated}
        totalSessionsJoined={totalSessionsJoined}
        totalSessionsCompleted={totalSessionsCompleted}
        totalSessionsAbsent={totalSessionsAbsent}
        reliabilitySubjectUserId={subjectUserId}
      />
    </div>
  );
}
