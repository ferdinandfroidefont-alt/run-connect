import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeed, type FeedSession } from "@/hooks/useFeed";
import { useDiscoverFeed, type DiscoverSession } from "@/hooks/useDiscoverFeed";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { FeedEmptyState } from "@/components/feed/FeedEmptyState";
import { DiscoverEmptyState } from "@/components/feed/DiscoverEmptyState";
import { DiscoverFilters } from "@/components/feed/DiscoverFilters";
import { MiniMapPreview } from "@/components/feed/MiniMapPreview";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FeedMode = "friends" | "discover";

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toneHexForActivity(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel"))
    return "#ff375f";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf")) return "#5ac8fa";
  if (t.includes("trail") || t.includes("rando") || t.includes("marche") || t.includes("walk")) return "#34c759";
  return "#0066cc";
}

function sessionLikelyLive(scheduledAt: string) {
  const start = new Date(scheduledAt).getTime();
  const now = Date.now();
  const end = start + 3 * 60 * 60 * 1000;
  return now >= start && now <= end;
}

function shortLocation(name: string | null | undefined) {
  if (!name?.trim()) return "";
  const cut = name.split(/[,·]/)[0]?.trim();
  return cut || name;
}

function FeedMaquetteTile({
  who,
  when,
  title,
  tone,
  live,
  actionLabel,
  commentLabel,
  locationLat,
  locationLng,
  avatarUrl,
  activityType,
  onCardPress,
  onActionPress,
  onCommentPress,
}: {
  who: string;
  when: string;
  title: string;
  tone: string;
  live: boolean;
  actionLabel: string;
  commentLabel?: string;
  locationLat: number;
  locationLng: number;
  avatarUrl?: string | null;
  activityType?: string;
  onCardPress: () => void;
  onActionPress: (e: React.MouseEvent) => void;
  onCommentPress?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardPress}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardPress();
        }
      }}
      className="w-full min-w-0 cursor-pointer overflow-hidden rounded-[18px] bg-card text-left shadow-none outline-none ring-0 active:scale-[0.99] dark:bg-card"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="flex items-center gap-2.5 p-3.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ background: tone }}
        >
          {initials(who)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-tight tracking-[-0.4px] text-foreground">{who}</div>
          <div
            className={cn(
              "text-[13px] leading-snug",
              live ? "font-medium text-[#34c759]" : "text-muted-foreground",
            )}
          >
            {when}
          </div>
        </div>
        {live && <span className="h-2 w-2 shrink-0 rounded-full bg-[#34c759]" aria-hidden />}
      </div>

      <div className="relative h-[130px] w-full overflow-hidden">
        <MiniMapPreview
          lat={locationLat}
          lng={locationLng}
          onOpenSession={onCardPress}
          avatarUrl={avatarUrl}
          activityType={activityType}
          showHint={false}
          className="h-full w-full"
        />
      </div>

      <div
        className="flex items-center justify-between border-t p-3.5"
        style={{ borderColor: "rgba(60, 60, 67, 0.12)" }}
      >
        <div className="min-w-0 flex-1 pr-3 text-[15px] font-semibold leading-snug text-foreground">{title}</div>
        <div className="shrink-0 flex items-center gap-2">
          {onCommentPress ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCommentPress(e);
              }}
              className="h-9 shrink-0 rounded-full border border-border bg-transparent px-[16px] text-[15px] font-normal tracking-[-0.3px] text-foreground active:scale-95"
            >
              {commentLabel || "Commenter"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActionPress(e);
            }}
            className="h-9 shrink-0 rounded-full bg-primary px-[18px] text-[15px] font-normal tracking-[-0.3px] text-primary-foreground active:scale-95"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscussionView({
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

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await supabase
        .from("session_participants")
        .select("user_id")
        .eq("session_id", session.id);
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f5f7]">
      <div className="flex h-11 items-center px-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[17px] text-[#0066cc]">
          <ChevronLeft className="h-5 w-5" />
          Retour
        </button>
        <p className="flex-1 pr-8 text-center text-[17px] font-semibold">Discussion</p>
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
            {session.organizer.display_name || session.organizer.username} · {format(new Date(session.scheduled_at), "EEEE d MMM", { locale: fr })}
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

      <div className="absolute bottom-0 left-0 right-0 border-t border-[#e0e0e0] bg-white/95 px-4 pb-7 pt-3">
        <div className="mb-1 text-[12px] text-[#7a7a7a]">Visible sur Toutes les publications</div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ajouter un commentaire"
            className="h-11 flex-1 rounded-full border border-[#e0e0e0] px-4 text-[17px] outline-none"
          />
          <button type="button" onClick={() => void send()} disabled={!input.trim() || sending} className="text-[17px] text-[#0066cc] disabled:text-[#ccc]">
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedActivitiesMaquette() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<FeedMode>("friends");
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [selectedFriendsSession, setSelectedFriendsSession] = useState<Record<string, unknown> | null>(null);
  const [selectedDiscoverSession, setSelectedDiscoverSession] = useState<Record<string, unknown> | null>(null);
  const [discussionSessionId, setDiscussionSessionId] = useState<string | null>(null);

  const { feedItems, loading: friendsLoading, hasMore, loadMore, refresh: refreshFriends, addComment } = useFeed();

  const {
    sessions: discoverSessions,
    loading: discoverLoading,
    hasLocation,
    maxDistance,
    setMaxDistance,
    selectedActivities,
    toggleActivity,
    toggleAllActivities,
    joinSession,
    refresh: refreshDiscover,
    resetFilters,
  } = useDiscoverFeed();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { count, error } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id)
        .eq("status", "accepted");
      if (!error) setFriendCount(count ?? 0);
    })();
  }, [user?.id]);

  useEffect(() => {
    const st = location.state as { openFeedCommentSessionId?: string } | null;
    if (!st?.openFeedCommentSessionId) return;
    setMode("friends");
    setDiscussionSessionId(st.openFeedCommentSessionId);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (mode !== "friends") return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !friendsLoading) loadMore();
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, friendsLoading, loadMore, mode]);

  const discussionSession = useMemo(
    () => (discussionSessionId ? feedItems.find((s) => s.id === discussionSessionId) || null : null),
    [feedItems, discussionSessionId],
  );

  const loading = mode === "friends" ? friendsLoading : discoverLoading;

  const renderFriendsWhen = useCallback((s: FeedSession) => {
    const d = new Date(s.scheduled_at);
    if (sessionLikelyLive(s.scheduled_at)) return "EN COURS · live";
    return `programme · ${format(d, "HH:mm", { locale: fr })}`;
  }, []);

  const renderDiscoverWhen = useCallback((s: DiscoverSession) => {
    const d = new Date(s.scheduled_at);
    if (sessionLikelyLive(s.scheduled_at)) return "EN COURS · live";
    const h = d.getHours();
    if (h >= 17) return `programme · ce soir ${format(d, "HH")}h`;
    return `programme · ${format(d, "HH:mm", { locale: fr })}`;
  }, []);

  const handleJoinFromFeed = useCallback(
    (sessionId: string) => {
      navigate("/", { state: { openSessionId: sessionId } });
    },
    [navigate],
  );

  const friendLabel = useMemo(() => {
    const n = friendCount ?? 0;
    return `Amis · ${n}`;
  }, [friendCount]);

  if (discussionSession) {
    return (
      <DiscussionView
        session={discussionSession}
        onBack={() => setDiscussionSessionId(null)}
        onAddComment={addComment}
      />
    );
  }

  return (
    <IosFixedPageHeaderShell
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
      headerWrapperClassName="shrink-0"
      contentScroll
      scrollClassName="min-h-0 bg-secondary"
      header={
        <div className="min-w-0 bg-secondary pt-[var(--safe-area-top)]">
          <IosPageHeaderBar
            className="py-1.5"
            leadingBack={{ onClick: () => navigate(-1), label: "Retour" }}
            title="Activités"
            titleClassName="text-[17px] text-primary"
          />
          <div className="flex gap-1.5 px-4 pb-1">
            <button
              type="button"
              onClick={() => setMode("friends")}
              className={cn(
                "h-9 shrink-0 rounded-full px-[18px] text-[15px] font-normal tracking-[-0.3px] transition-transform active:scale-95",
                mode === "friends"
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary bg-transparent text-primary",
              )}
            >
              {friendLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode("discover")}
              className={cn(
                "h-9 shrink-0 rounded-full px-[18px] text-[15px] font-normal tracking-[-0.3px] transition-transform active:scale-95",
                mode === "discover"
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary bg-transparent text-primary",
              )}
            >
              Découvrir
            </button>
          </div>
          {mode === "discover" ? (
            <div className="px-4 pb-2 pt-1">
              <DiscoverFilters
                maxDistance={maxDistance}
                setMaxDistance={setMaxDistance}
                selectedActivities={selectedActivities}
                toggleActivity={toggleActivity}
                toggleAllActivities={toggleAllActivities}
              />
            </div>
          ) : null}
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
        <div className="box-border w-full max-w-full space-y-3.5 px-4 pb-[6.5rem] pt-3.5" data-tutorial="tutorial-feed">
          {mode === "friends" && loading && feedItems.length === 0 ? (
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
          ) : mode === "friends" && feedItems.length === 0 ? (
            <div className="mx-auto max-w-md py-6">
              <FeedEmptyState />
            </div>
          ) : mode === "friends" ? (
            <>
              {feedItems.map((s) => {
                const who = s.organizer.display_name || s.organizer.username;
                const loc = shortLocation(s.location_name);
                const title = loc ? `${s.title} · ${loc}` : s.title;
                const live = sessionLikelyLive(s.scheduled_at);
                const tone = toneHexForActivity(s.activity_type);
                return (
                  <div key={s.id} className="space-y-0">
                    <FeedMaquetteTile
                      who={who}
                      when={renderFriendsWhen(s)}
                      title={title}
                      tone={tone}
                      live={live}
                      actionLabel={live ? "Suivre" : "Rejoindre"}
                      commentLabel="Commenter"
                      locationLat={s.location_lat}
                      locationLng={s.location_lng}
                      avatarUrl={s.organizer.avatar_url || undefined}
                      activityType={s.activity_type}
                      onCardPress={() =>
                        setSelectedFriendsSession({
                          ...s,
                          session_type: s.activity_type,
                          intensity: "moderate",
                          organizer_id: s.organizer.user_id,
                          profiles: {
                            username: s.organizer.username,
                            display_name: s.organizer.display_name,
                            avatar_url: s.organizer.avatar_url || undefined,
                          },
                        })
                      }
                      onActionPress={() => handleJoinFromFeed(s.id)}
                      onCommentPress={() => setDiscussionSessionId(s.id)}
                    />
                  </div>
                );
              })}
              {hasMore ? (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                feedItems.length > 0 && (
                  <p className="py-6 text-center text-[13px] text-muted-foreground">Vous êtes à jour !</p>
                )
              )}
            </>
          ) : loading && discoverSessions.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : discoverSessions.length === 0 ? (
            <div className="mx-auto max-w-md py-4">
              <DiscoverEmptyState
                hasLocation={hasLocation}
                onResetFilters={() => {
                  resetFilters();
                  void refreshDiscover();
                }}
              />
            </div>
          ) : (
            discoverSessions.map((s) => {
              const who = s.organizer.display_name || s.organizer.username;
              const loc = shortLocation(s.location_name);
              const title = loc ? `${s.title} · ${loc}` : s.title;
              const live = sessionLikelyLive(s.scheduled_at);
              const tone = toneHexForActivity(s.activity_type);
              return (
                <FeedMaquetteTile
                  key={s.id}
                  who={who}
                  when={renderDiscoverWhen(s)}
                  title={title}
                  tone={tone}
                  live={live}
                  actionLabel={live ? "Suivre" : "Rejoindre"}
                  locationLat={s.location_lat}
                  locationLng={s.location_lng}
                  avatarUrl={s.organizer.avatar_url || undefined}
                  activityType={s.activity_type}
                  onCardPress={() =>
                    setSelectedDiscoverSession({
                      ...s,
                      session_type: s.activity_type,
                      profiles: {
                        username: s.organizer.username,
                        display_name: s.organizer.display_name,
                        avatar_url: s.organizer.avatar_url || undefined,
                      },
                    })
                  }
                  onActionPress={() => {
                    void joinSession(s);
                  }}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      <SessionDetailsDialog
        session={selectedDiscoverSession as any}
        onClose={() => setSelectedDiscoverSession(null)}
        onSessionUpdated={() => void refreshDiscover()}
      />

      <SessionDetailsDialog
        session={selectedFriendsSession as any}
        onClose={() => setSelectedFriendsSession(null)}
        onSessionUpdated={() => void refreshFriends()}
      />
    </IosFixedPageHeaderShell>
  );
}
