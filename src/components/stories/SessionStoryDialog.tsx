import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { X, Heart, MoreHorizontal, Eye, Trash2, Share2, MessageCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { buildPreferredProfileShareLink } from "@/lib/appLinks";
import { cn } from "@/lib/utils";

type StoryItem = {
  id: string;
  author_id: string;
  session_id: string | null;
  created_at: string;
  expires_at: string;
  session?: {
    title: string;
    activity_type: string;
    location_name: string;
    scheduled_at: string;
  } | null;
  media?: {
    media_url: string;
    media_type: "image" | "video" | "boomerang";
  } | null;
};

type ViewerItem = {
  viewer_id: string;
  created_at: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type LikeRow = {
  user_id: string;
  created_at: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

interface SessionStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string | null;
  viewerUserId: string | null;
  storyId?: string | null;
  onOpenFeed?: (sessionId: string) => void;
  stackNested?: boolean;
}

const IMAGE_DURATION_MS = 5500;
const LONG_PRESS_MS = 380;
const SWIPE_CLOSE_PX = 110;
const TAP_EDGE = 0.32;

export function SessionStoryDialog({
  open,
  onOpenChange,
  authorId,
  viewerUserId,
  storyId = null,
  onOpenFeed,
  stackNested = false,
}: SessionStoryDialogProps) {
  const { toast } = useToast();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [authorProfile, setAuthorProfile] = useState<{
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewers, setViewers] = useState<ViewerItem[]>([]);
  const [likers, setLikers] = useState<LikeRow[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef = useRef<{ t: number; x: number; y: number; longFired: boolean } | null>(null);
  const swipeRef = useRef<{ y0: number } | null>(null);
  const progressRaf = useRef<number | null>(null);

  const current = stories[index];
  const isOwnStory = !!current && current.author_id === viewerUserId;

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i < stories.length - 1) return i + 1;
      onOpenChange(false);
      return i;
    });
    setStoryProgress(0);
  }, [stories.length, onOpenChange]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setStoryProgress(0);
  }, []);

  useEffect(() => {
    if (!open || (!authorId && !storyId)) return;
    void (async () => {
      let query = (supabase as any)
        .from("session_stories")
        .select("id, author_id, session_id, created_at, expires_at");
      if (storyId) {
        query = query.eq("id", storyId);
      } else {
        query = query.eq("author_id", authorId).gt("expires_at", new Date().toISOString());
      }
      const { data } = await query.order("created_at", { ascending: true });

      const storiesData = (data ?? []) as StoryItem[];
      if (storiesData.length === 0) {
        setStories([]);
        return;
      }

      const sessionIds = storiesData.map((s) => s.session_id).filter((id): id is string => !!id);
      const [{ data: sessions }, { data: medias }] = await Promise.all([
        sessionIds.length
          ? supabase
              .from("sessions")
              .select("id, title, activity_type, location_name, scheduled_at")
              .in("id", sessionIds)
          : Promise.resolve({ data: [] as { id: string; title: string; activity_type: string; location_name: string; scheduled_at: string }[] }),
        (supabase as any)
          .from("story_media")
          .select("story_id, media_url, media_type")
          .in("story_id", storiesData.map((s) => s.id)),
      ]);

      const byId = new Map((sessions ?? []).map((s) => [s.id, s]));
      const mediaByStoryId = new Map(
        ((medias ?? []) as Array<{ story_id: string; media_url: string; media_type: "image" | "video" | "boomerang" }>).map((m) => [
          m.story_id,
          { media_url: m.media_url, media_type: m.media_type },
        ])
      );
      setStories(
        storiesData.map((s) => ({
          ...s,
          session: s.session_id ? ((byId.get(s.session_id) as StoryItem["session"]) ?? null) : null,
          media: mediaByStoryId.get(s.id) ?? null,
        }))
      );
      setIndex(0);

      const aid = storiesData[0]?.author_id;
      if (aid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("user_id", aid)
          .maybeSingle();
        setAuthorProfile(prof ?? null);
      } else {
        setAuthorProfile(null);
      }
    })();
  }, [open, authorId, storyId]);

  useEffect(() => {
    if (!open || !current || !viewerUserId) return;
    void (supabase as any).from("session_story_views").upsert(
      { story_id: current.id, viewer_id: viewerUserId },
      { onConflict: "story_id,viewer_id" }
    );
  }, [open, current?.id, viewerUserId]);

  useEffect(() => {
    if (!open || !current?.id || !viewerUserId) return;
    void (async () => {
      const [{ count }, { data: mine }] = await Promise.all([
        (supabase as any)
          .from("session_story_likes")
          .select("*", { count: "exact", head: true })
          .eq("story_id", current.id),
        (supabase as any)
          .from("session_story_likes")
          .select("id")
          .eq("story_id", current.id)
          .eq("user_id", viewerUserId)
          .maybeSingle(),
      ]);
      setLikesCount(count ?? 0);
      setLikedByMe(!!mine);
    })();
  }, [open, current?.id, viewerUserId]);

  useEffect(() => {
    if (!open || !current || !isOwnStory) {
      setViewers([]);
      return;
    }
    void (async () => {
      const { data: views } = await (supabase as any)
        .from("session_story_views")
        .select("viewer_id, created_at")
        .eq("story_id", current.id)
        .order("created_at", { ascending: false });
      const rows = (views ?? []) as Array<{ viewer_id: string; created_at: string }>;
      if (rows.length === 0) {
        setViewers([]);
        return;
      }
      const ids = [...new Set(rows.map((v) => v.viewer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", ids);
      const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      setViewers(
        rows.map((row) => ({
          ...row,
          profile: (pMap.get(row.viewer_id) as ViewerItem["profile"]) ?? null,
        }))
      );
    })();
  }, [open, current?.id, isOwnStory]);

  const loadLikers = useCallback(async () => {
    if (!current?.id || !isOwnStory) {
      setLikers([]);
      return;
    }
    const { data: likes } = await (supabase as any)
      .from("session_story_likes")
      .select("user_id, created_at")
      .eq("story_id", current.id)
      .order("created_at", { ascending: false });
    const rows = (likes ?? []) as Array<{ user_id: string; created_at: string }>;
    if (rows.length === 0) {
      setLikers([]);
      return;
    }
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", ids);
    const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    setLikers(
      rows.map((row) => ({
        ...row,
        profile: (pMap.get(row.user_id) as LikeRow["profile"]) ?? null,
      }))
    );
  }, [current?.id, isOwnStory]);

  useEffect(() => {
    if (actionsOpen && isOwnStory) void loadLikers();
  }, [actionsOpen, isOwnStory, loadLikers]);

  const isLinearVideo = current?.media?.media_type === "video";
  const isBoomerang = current?.media?.media_type === "boomerang";

  useEffect(() => {
    if (!open || !current || stories.length === 0) return;

    if (isPaused) {
      if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
      progressRaf.current = null;
      return;
    }

    if (current.media && isLinearVideo) {
      const v = videoRef.current;
      if (!v) return;
      const tick = () => {
        if (isPaused) return;
        const dur = v.duration;
        if (dur && Number.isFinite(dur) && dur > 0) {
          setStoryProgress(Math.min(100, (v.currentTime / dur) * 100));
        }
        if (v.ended) {
          goNext();
          return;
        }
        progressRaf.current = requestAnimationFrame(tick);
      };
      progressRaf.current = requestAnimationFrame(tick);
      return () => {
        if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
      };
    }

    const durationMs = IMAGE_DURATION_MS;
    const start = performance.now();
    const tick = () => {
      if (isPaused) return;
      const elapsed = performance.now() - start;
      const p = Math.min(100, (elapsed / durationMs) * 100);
      setStoryProgress(p);
      if (p >= 100) {
        goNext();
        return;
      }
      progressRaf.current = requestAnimationFrame(tick);
    };
    progressRaf.current = requestAnimationFrame(tick);
    return () => {
      if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
    };
  }, [open, current?.id, current?.media, isLinearVideo, isPaused, stories.length, goNext]);

  useEffect(() => {
    setStoryProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    }
  }, [index, current?.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !current?.media) return;
    if (current.media.media_type !== "video" && current.media.media_type !== "boomerang") return;
    if (isPaused) v.pause();
    else void v.play().catch(() => {});
  }, [isPaused, current?.id, current?.media]);

  const toggleLike = async () => {
    if (!current?.id || !viewerUserId) return;
    if (likedByMe) {
      await (supabase as any)
        .from("session_story_likes")
        .delete()
        .eq("story_id", current.id)
        .eq("user_id", viewerUserId);
      setLikedByMe(false);
      setLikesCount((c) => Math.max(0, c - 1));
    } else {
      await (supabase as any).from("session_story_likes").insert({
        story_id: current.id,
        user_id: viewerUserId,
      });
      setLikedByMe(true);
      setLikesCount((c) => c + 1);
    }
  };

  const sendReplyAsMessage = async () => {
    if (!current || !viewerUserId || !replyText.trim() || viewerUserId === current.author_id) return;
    const text = replyText.trim();
    const { data: areFriends } = await supabase.rpc("are_users_friends", {
      user1_id: viewerUserId,
      user2_id: current.author_id,
    });
    if (!areFriends) {
      toast({
        title: "Impossible d'envoyer",
        description: "Vous devez etre amis pour repondre en message prive.",
        variant: "destructive",
      });
      return;
    }

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${viewerUserId},participant_2.eq.${current.author_id}),and(participant_1.eq.${current.author_id},participant_2.eq.${viewerUserId})`
      )
      .eq("is_group", false)
      .maybeSingle();

    let conversationId = existing?.id;
    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({ participant_1: viewerUserId, participant_2: current.author_id })
        .select("id")
        .single();
      if (convError || !newConv) {
        toast({ title: "Erreur", description: "Impossible de creer la conversation.", variant: "destructive" });
        return;
      }
      conversationId = newConv.id;
    }

    const message = `Reponse a ta story: ${text}`;
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: viewerUserId,
      content: message,
      message_type: "text",
      ...(current.session_id ? { session_id: current.session_id } : {}),
    });
    if (msgError) {
      toast({ title: "Erreur", description: "Envoi du message impossible.", variant: "destructive" });
      return;
    }
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    setReplyText("");
    toast({ title: "Envoye", description: "Reponse envoyee en conversation." });
  };

  const deleteStory = async () => {
    if (!current?.id) return;
    const deletedId = current.id;
    const idxAtDelete = index;
    const { error } = await (supabase as any).from("session_stories").delete().eq("id", deletedId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    const nextStories = stories.filter((s) => s.id !== deletedId);
    setStories(nextStories);
    setDeleteOpen(false);
    setActionsOpen(false);
    if (nextStories.length === 0) onOpenChange(false);
    else setIndex(Math.min(idxAtDelete, nextStories.length - 1));
    toast({ title: "Story supprimee" });
  };

  const shareStory = async () => {
    const un = authorProfile?.username?.trim();
    const url = un
      ? buildPreferredProfileShareLink({ username: un })
      : typeof window !== "undefined"
        ? window.location.origin
        : "";
    const title = authorProfile?.display_name || authorProfile?.username || "RunConnect";
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Story — ${title}`,
          text: `Story de ${title} sur RunConnect`,
          url: url || undefined,
        });
      } else if (url) {
        await navigator.clipboard.writeText(url);
        toast({ title: "Lien copie" });
      }
    } catch {
      /* annulation share */
    }
  };

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (actionsOpen || deleteOpen) return;
    pressRef.current = { t: Date.now(), x: e.clientX, y: e.clientY, longFired: false };
    longPressTimer.current = setTimeout(() => {
      setIsPaused(true);
      if (pressRef.current) pressRef.current.longFired = true;
    }, LONG_PRESS_MS);
  };

  const endPress = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const p = pressRef.current;
    pressRef.current = null;
    if (!p || actionsOpen) return;
    if (p.longFired) {
      setIsPaused(false);
      return;
    }
    const dt = Date.now() - p.t;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dt > 450 || Math.abs(dx) > 20 || Math.abs(dy) > 20) return;
    const w = typeof window !== "undefined" ? window.innerWidth : 400;
    if (e.clientX < w * TAP_EDGE) goPrev();
    else if (e.clientX > w * (1 - TAP_EDGE)) goNext();
  };

  const onTouchStartSwipe = (e: React.TouchEvent) => {
    if (actionsOpen) return;
    swipeRef.current = { y0: e.touches[0].clientY };
  };

  const onTouchEndSwipe = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || actionsOpen) return;
    const y = e.changedTouches[0].clientY;
    if (y - s.y0 > SWIPE_CLOSE_PX) onOpenChange(false);
  };

  const displayName = authorProfile?.display_name?.trim() || authorProfile?.username || "Membre";

  const sheetZ = stackNested ? "z-[160]" : "z-[145]";

  useEffect(() => {
    if (!open) {
      setActionsOpen(false);
      setIsPaused(false);
    }
  }, [open]);

  const metaLine = useMemo(() => {
    if (!current?.session) return null;
    const parts: string[] = [];
    if (current.session.location_name) parts.push(current.session.location_name);
    if (current.session.scheduled_at) {
      parts.push(format(new Date(current.session.scheduled_at), "d MMM · HH:mm", { locale: fr }));
    }
    return parts.join(" · ");
  }, [current?.session]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          stackNested={stackNested}
          fullScreen
          hideCloseButton
          overlayClassName={cn("!bg-black", stackNested && "!z-[130]")}
          className={cn(
            "!max-w-none !w-screen !h-[100dvh] max-h-[100dvh] rounded-none border-0 bg-black p-0 shadow-none",
            "flex flex-col overflow-hidden text-white",
            stackNested && "!z-[130]"
          )}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Stories</DialogTitle>
          {!current ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/60">Aucune story active.</div>
          ) : (
            <>
              {/* Progress */}
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex gap-0.5 px-2 pt-[max(env(safe-area-inset-top),10px)]">
                {stories.map((story, i) => (
                  <div key={story.id} className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full bg-white transition-[width] duration-75 ease-linear"
                      style={{
                        width: i < index ? "100%" : i > index ? "0%" : `${storyProgress}%`,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center gap-2.5 px-3 pt-[calc(max(env(safe-area-inset-top),10px)+14px)]">
                <Avatar className="pointer-events-none h-9 w-9 shrink-0 border border-white/20">
                  <AvatarImage src={authorProfile?.avatar_url ?? ""} className="object-cover" />
                  <AvatarFallback className="bg-white/10 text-xs text-white">
                    {(authorProfile?.username ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="pointer-events-none min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight">{displayName}</p>
                  <p className="truncate text-[11px] text-white/55">
                    {format(new Date(current.created_at), "HH:mm", { locale: fr })}
                  </p>
                </div>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity active:opacity-60"
                    aria-label="Fermer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </DialogClose>
              </div>

              {/* Media + gestures */}
              <div
                className="relative min-h-0 flex-1 bg-black"
                onTouchStart={onTouchStartSwipe}
                onTouchEnd={onTouchEndSwipe}
              >
                <div
                  className="absolute inset-0 z-10"
                  onPointerDown={onPointerDownCapture}
                  onPointerUp={endPress}
                  onPointerCancel={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                    if (pressRef.current?.longFired) setIsPaused(false);
                    pressRef.current = null;
                  }}
                />

                {current.media ? (
                  current.media.media_type === "image" ? (
                    <img
                      src={current.media.media_url}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      key={current.id}
                      src={current.media.media_url}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      playsInline
                      muted
                      autoPlay
                      loop={isBoomerang}
                      preload="auto"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 px-6 text-center">
                    <p className="text-sm font-medium text-white/80">{current.session?.title ?? "Story"}</p>
                    {metaLine ? <p className="mt-2 text-xs text-white/45">{metaLine}</p> : null}
                  </div>
                )}

                {/* Secondary metadata on top of media (subtle) */}
                {current.media && metaLine ? (
                  <div className="pointer-events-none absolute bottom-28 left-0 right-0 z-20 px-4 text-center">
                    <p className="text-[12px] text-white/70 drop-shadow-md line-clamp-2">{metaLine}</p>
                  </div>
                ) : null}
              </div>

              {/* Bottom bar */}
              <div
                className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 flex items-end justify-between gap-3 bg-gradient-to-t from-black/55 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-10"
              >
                <button
                  type="button"
                  onClick={() => void toggleLike()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform active:scale-95"
                  aria-label={likedByMe ? "Retirer le j'aime" : "J'aime"}
                >
                  <Heart
                    className={cn("h-7 w-7", likedByMe ? "fill-red-500 text-red-500" : "text-white")}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setActionsOpen(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform active:scale-95"
                  aria-label="Plus d'actions"
                >
                  <MoreHorizontal className="h-6 w-6 text-white" />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom sheet actions (above dialog stacking) */}
      {open && actionsOpen && current && (
        <div className={cn("fixed inset-0", sheetZ)} role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Fermer le menu"
            onClick={() => setActionsOpen(false)}
          />
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 max-h-[78vh] overflow-y-auto rounded-t-2xl bg-card p-4 text-foreground shadow-xl",
              "pb-[max(env(safe-area-inset-bottom),16px)]"
            )}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <p className="mb-3 text-center text-sm font-semibold">Actions</p>

            {isOwnStory && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vues ({viewers.length})</p>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                  {viewers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune vue pour le moment.</p>
                  ) : (
                    viewers.map((v) => (
                      <div key={`${v.viewer_id}-${v.created_at}`} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={v.profile?.avatar_url ?? ""} />
                          <AvatarFallback>{(v.profile?.username ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{v.profile?.display_name || v.profile?.username || "Membre"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {isOwnStory && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  J&apos;aime ({likesCount})
                </p>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                  {likers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun j&apos;aime pour le moment.</p>
                  ) : (
                    likers.map((like) => (
                      <div key={`${like.user_id}-${like.created_at}`} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={like.profile?.avatar_url ?? ""} />
                          <AvatarFallback>{(like.profile?.username ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{like.profile?.display_name || like.profile?.username || "Membre"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {!isOwnStory && viewerUserId && (
              <div className="mb-4 flex gap-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Repondre en message..."
                  className="flex-1"
                />
                <Button size="icon" variant="secondary" onClick={() => void sendReplyAsMessage()} disabled={!replyText.trim()}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            )}

            {onOpenFeed && current.session_id && (
              <Button
                variant="outline"
                className="mb-2 w-full gap-2"
                onClick={() => {
                  setActionsOpen(false);
                  onOpenFeed(current.session_id!);
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Voir dans le feed
              </Button>
            )}

            <Button variant="outline" className="mb-2 w-full gap-2" onClick={() => void shareStory()}>
              <Share2 className="h-4 w-4" />
              Partager
            </Button>

            {isOwnStory && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => {
                  setActionsOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer la story
              </Button>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="z-[175]" overlayClassName="z-[175]">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette story ?</AlertDialogTitle>
            <AlertDialogDescription>Elle sera retiree pour tout le monde. Cette action est definitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteStory()}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
