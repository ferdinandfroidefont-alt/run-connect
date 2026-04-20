import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Heart,
  MoreHorizontal,
  ChevronLeft,
  Share2,
  MessageCircle,
  ExternalLink,
  Eye,
  Pin,
  UserX,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { buildPreferredProfileShareLink } from "@/lib/appLinks";
import { cn } from "@/lib/utils";
import { useStoryMediaUrl } from "@/hooks/useStoryMediaUrl";

type StoryItem = {
  id: string;
  author_id: string;
  session_id: string | null;
  created_at: string;
  expires_at: string;
  hide_from?: string[];
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

type FollowerRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
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

type StoryActionMode = null | "menu" | "insights" | "highlight" | "hide";

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
/** Laisse la zone des boutons bas hors du layer de gestes (tap / pause). */
const GESTURE_BOTTOM_CLEAR = "calc(5.75rem + env(safe-area-inset-bottom, 0px))";

export function SessionStoryDialog({
  open,
  onOpenChange,
  authorId,
  viewerUserId,
  storyId = null,
  onOpenFeed,
  stackNested = false,
}: SessionStoryDialogProps) {
  const navigate = useNavigate();
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
  const [actionMode, setActionMode] = useState<StoryActionMode>(null);
  const [highlightTitle, setHighlightTitle] = useState("À la une");
  const [followers, setFollowers] = useState<FollowerRow[]>([]);
  const [hideSelection, setHideSelection] = useState<Set<string>>(new Set());
  const [followersLoading, setFollowersLoading] = useState(false);
  const [highlightSaving, setHighlightSaving] = useState(false);
  const [hideSaving, setHideSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [viewers, setViewers] = useState<ViewerItem[]>([]);
  const [likers, setLikers] = useState<LikeRow[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef = useRef<{ t: number; x: number; y: number; longFired: boolean } | null>(null);
  const swipeRef = useRef<{ y0: number } | null>(null);
  const progressRaf = useRef<number | null>(null);

  const current = stories[index];
  const isOwnStory = !!current && current.author_id === viewerUserId;
  const resolvedMediaUrl = useStoryMediaUrl(current?.media?.media_url ?? null);

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

  const triggerTapHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  }, []);

  useEffect(() => {
    if (!open || (!authorId && !storyId)) return;
    void (async () => {
      let query = (supabase as any)
        .from("session_stories")
        .select("id, author_id, session_id, created_at, expires_at, hide_from");
      if (storyId) {
        query = query.eq("id", storyId);
      } else {
        query = query.eq("author_id", authorId).gt("expires_at", new Date().toISOString());
      }
      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) {
        console.warn("[SessionStoryDialog] session_stories", error);
      }

      const storiesData = (data ?? []) as StoryItem[];
      if (storiesData.length === 0) {
        setStories([]);
        return;
      }

      const sessionIds = storiesData.map((s) => s.session_id).filter((id): id is string => !!id);
      const storyIds = storiesData.map((s) => s.id);

      const [{ data: sessions }, { data: mediasRaw }] = await Promise.all([
        sessionIds.length
          ? supabase
              .from("sessions")
              .select("id, title, activity_type, location_name, scheduled_at")
              .in("id", sessionIds)
          : Promise.resolve({ data: [] as { id: string; title: string; activity_type: string; location_name: string; scheduled_at: string }[] }),
        storyIds.length
          ? ((supabase as any)
              .from("story_media")
              .select("story_id, media_url, media_type, created_at")
              .in("story_id", storyIds)
              .order("created_at", { ascending: true }) as Promise<{ data: unknown }>)
          : Promise.resolve({ data: [] }),
      ]);

      const medias = (mediasRaw ?? []) as Array<{
        story_id: string;
        media_url: string;
        media_type: "image" | "video" | "boomerang";
        created_at?: string;
      }>;

      const byId = new Map((sessions ?? []).map((s) => [s.id, s]));
      const mediaByStoryId = new Map<string, { media_url: string; media_type: "image" | "video" | "boomerang" }>();
      for (const m of medias) {
        if (!mediaByStoryId.has(m.story_id)) {
          mediaByStoryId.set(m.story_id, { media_url: m.media_url, media_type: m.media_type });
        }
      }

      setStories(
        storiesData.map((s) => ({
          ...s,
          hide_from: Array.isArray(s.hide_from) ? s.hide_from : [],
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

  const loadViewers = useCallback(async () => {
    if (!current?.id || !isOwnStory) {
      setViewers([]);
      return;
    }
    const { data: views } = await (supabase as any)
      .from("session_story_views")
      .select("viewer_id, created_at")
      .eq("story_id", current.id)
      .order("created_at", { ascending: false });
    const rawRows = (views ?? []) as Array<{ viewer_id: string; created_at: string }>;
    const seen = new Set<string>();
    const rows = rawRows.filter((v) => {
      if (seen.has(v.viewer_id)) return false;
      seen.add(v.viewer_id);
      return true;
    });
    if (rows.length === 0) {
      setViewers([]);
      return;
    }
    const ids = rows.map((v) => v.viewer_id);
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
  }, [current?.id, isOwnStory]);

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
    const rawRows = (likes ?? []) as Array<{ user_id: string; created_at: string }>;
    const seen = new Set<string>();
    const rows = rawRows.filter((r) => {
      if (seen.has(r.user_id)) return false;
      seen.add(r.user_id);
      return true;
    });
    if (rows.length === 0) {
      setLikers([]);
      return;
    }
    const ids = rows.map((r) => r.user_id);
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
    if (open && actionMode === "insights" && isOwnStory) {
      void Promise.all([loadViewers(), loadLikers()]);
    }
  }, [open, actionMode, isOwnStory, loadViewers, loadLikers]);

  const loadFollowersForHide = useCallback(async () => {
    if (!current?.author_id || !viewerUserId || current.author_id !== viewerUserId) return;
    setFollowersLoading(true);
    try {
      const { data: follows } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", current.author_id)
        .eq("status", "accepted");
      const ids = [...new Set((follows ?? []).map((f: { follower_id: string }) => f.follower_id))];
      if (ids.length === 0) {
        setFollowers([]);
        setHideSelection(new Set(current.hide_from ?? []));
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", ids);
      setFollowers((profiles ?? []) as FollowerRow[]);
      setHideSelection(new Set(current.hide_from ?? []));
    } catch {
      setFollowers([]);
    } finally {
      setFollowersLoading(false);
    }
  }, [current?.author_id, current?.hide_from, viewerUserId]);

  useEffect(() => {
    if (open && actionMode === "hide" && isOwnStory) void loadFollowersForHide();
  }, [open, actionMode, isOwnStory, loadFollowersForHide]);

  useEffect(() => {
    if (actionMode) setIsPaused(true);
  }, [actionMode]);

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
    setIsTransitioning(true);
    const id = window.setTimeout(() => setIsTransitioning(false), 140);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    }
    return () => window.clearTimeout(id);
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
    if (current.author_id === viewerUserId) return;
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
    setActionMode(null);
    toast({ title: "Envoye", description: "Reponse envoyee en conversation." });
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

  const addToHighlights = async () => {
    if (!current?.id || !viewerUserId || !isOwnStory) return;
    const title = highlightTitle.trim() || "À la une";
    setHighlightSaving(true);
    try {
      const { data: lastRow } = await (supabase as any)
        .from("profile_story_highlights")
        .select("position")
        .eq("owner_id", viewerUserId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const position = typeof lastRow?.position === "number" ? lastRow.position + 1 : 0;

      const { error } = await (supabase as any).from("profile_story_highlights").insert({
        owner_id: viewerUserId,
        story_id: current.id,
        title,
        position,
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Déjà à la une", description: "Cette story est déjà dans tes éléments à la une." });
        } else {
          throw error;
        }
        return;
      }
      toast({ title: "Ajouté à la une" });
      setActionMode(null);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible d’ajouter.", variant: "destructive" });
    } finally {
      setHighlightSaving(false);
    }
  };

  const saveHideFrom = async () => {
    if (!current?.id || !viewerUserId || !isOwnStory) return;
    setHideSaving(true);
    try {
      const hide_from = Array.from(hideSelection);
      const { error } = await (supabase as any)
        .from("session_stories")
        .update({ hide_from })
        .eq("id", current.id)
        .eq("author_id", viewerUserId);
      if (error) throw error;
      setStories((prev) => prev.map((s) => (s.id === current.id ? { ...s, hide_from } : s)));
      toast({ title: "Visibilité mise à jour" });
      setActionMode(null);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Mise à jour impossible.", variant: "destructive" });
    } finally {
      setHideSaving(false);
    }
  };

  const openDeletePage = () => {
    if (!current?.id) return;
    const id = current.id;
    setActionMode(null);
    onOpenChange(false);
    navigate(`/stories/${id}/delete`);
  };

  const closeActionPanel = () => {
    setActionMode(null);
    setIsPaused(false);
  };

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (actionMode) return;
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
    if (!p || actionMode) return;
    if (p.longFired) {
      setIsPaused(false);
      return;
    }
    const dt = Date.now() - p.t;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dt > 450 || Math.abs(dx) > 20 || Math.abs(dy) > 20) return;
    const w = typeof window !== "undefined" ? window.innerWidth : 400;
    if (e.clientX < w * TAP_EDGE) {
      triggerTapHaptic();
      goPrev();
    } else if (e.clientX > w * (1 - TAP_EDGE)) {
      triggerTapHaptic();
      goNext();
    }
  };

  const onTouchStartSwipe = (e: React.TouchEvent) => {
    if (actionMode) return;
    swipeRef.current = { y0: e.touches[0].clientY };
  };

  const onTouchEndSwipe = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || actionMode) return;
    const y = e.changedTouches[0].clientY;
    if (y - s.y0 > SWIPE_CLOSE_PX) onOpenChange(false);
  };

  const displayName = authorProfile?.display_name?.trim() || authorProfile?.username || "Membre";
  const relativeStoryTime = useMemo(() => {
    if (!current?.created_at) return "";
    const raw = formatDistanceToNowStrict(new Date(current.created_at), { addSuffix: false, locale: fr });
    return raw
      .replace(" secondes", " s")
      .replace(" seconde", " s")
      .replace(" minutes", " min")
      .replace(" minute", " min")
      .replace(" heures", " h")
      .replace(" heure", " h")
      .replace(" jours", " j")
      .replace(" jour", " j");
  }, [current?.created_at]);
  const likersByUserId = useMemo(() => new Map(likers.map((l) => [l.user_id, l])), [likers]);
  const insightRows = useMemo(() => {
    const rows = viewers.map((v) => {
      const like = likersByUserId.get(v.viewer_id);
      return {
        viewer_id: v.viewer_id,
        created_at: v.created_at,
        profile: v.profile,
        liked: !!like,
        liked_at: like?.created_at ?? null,
      };
    });
    rows.sort((a, b) => {
      if (a.liked !== b.liked) return a.liked ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [viewers, likersByUserId]);

  useEffect(() => {
    if (!open) {
      setActionMode(null);
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

  const portalZ = "z-[220]";
  const displayUrl = resolvedMediaUrl ?? current?.media?.media_url ?? null;

  const actionsPortal =
    open &&
    actionMode &&
    typeof document !== "undefined" &&
    createPortal(
      <div className={cn("fixed inset-0", portalZ)} role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-black/55"
          aria-label="Fermer"
          onClick={closeActionPanel}
        />
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-4 text-foreground shadow-xl",
            "pb-[max(env(safe-area-inset-bottom),16px)]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {actionMode === "menu" && (
            <>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <p className="mb-3 text-center text-sm font-semibold">Options</p>
              <div className="flex flex-col gap-1">
                {isOwnStory && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[16px] active:bg-secondary"
                    onClick={() => {
                      void Promise.all([loadViewers(), loadLikers()]);
                      setActionMode("insights");
                    }}
                  >
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    Voir les vues
                  </button>
                )}
                {isOwnStory && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[16px] active:bg-secondary"
                    onClick={() => setActionMode("highlight")}
                  >
                    <Pin className="h-5 w-5 text-muted-foreground" />
                    Ajouter aux éléments à la une
                  </button>
                )}
                {isOwnStory && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[16px] active:bg-secondary"
                    onClick={() => setActionMode("hide")}
                  >
                    <UserX className="h-5 w-5 text-muted-foreground" />
                    Masquer pour quelqu&apos;un
                  </button>
                )}
                {isOwnStory && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[16px] text-destructive active:bg-destructive/10"
                    onClick={openDeletePage}
                  >
                    <Trash2 className="h-5 w-5" />
                    Supprimer la story…
                  </button>
                )}
                {onOpenFeed && current?.session_id && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[16px] active:bg-secondary"
                    onClick={() => {
                      closeActionPanel();
                      onOpenFeed(current.session_id!);
                    }}
                  >
                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    Voir dans le feed
                  </button>
                )}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[16px] active:bg-secondary"
                  onClick={() => void shareStory()}
                >
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                  Partager
                </button>
                {!isOwnStory && viewerUserId && (
                  <div className="mt-2 border-t border-border pt-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Répondre</p>
                    <div className="flex gap-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Message…"
                        className="flex-1"
                      />
                      <Button size="icon" variant="secondary" onClick={() => void sendReplyAsMessage()} disabled={!replyText.trim()}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {actionMode === "insights" && isOwnStory && (
            <>
              <button
                type="button"
                className="mb-3 flex items-center gap-2 text-[15px] font-medium text-primary"
                onClick={() => setActionMode("menu")}
              >
                <ChevronLeft className="h-5 w-5" />
                Retour
              </button>
              <p className="mb-1 text-lg font-semibold">Vues ({viewers.length})</p>
              <p className="mb-3 text-sm text-muted-foreground">
                Les personnes qui ont aimé apparaissent en premier ({likers.length} j&apos;aime).
              </p>
              <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                {insightRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune vue pour le moment.</p>
                ) : (
                  insightRows.map((v) => (
                    <div key={`${v.viewer_id}-${v.created_at}`} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={v.profile?.avatar_url ?? ""} />
                        <AvatarFallback>{(v.profile?.username ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{v.profile?.display_name || v.profile?.username || "Membre"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(v.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
                        </p>
                      </div>
                      {v.liked ? <Heart className="h-4 w-4 shrink-0 fill-red-500 text-red-500" aria-hidden /> : null}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {actionMode === "highlight" && isOwnStory && (
            <>
              <button
                type="button"
                className="mb-3 flex items-center gap-2 text-[15px] font-medium text-primary"
                onClick={() => setActionMode("menu")}
              >
                <ChevronLeft className="h-5 w-5" />
                Retour
              </button>
              <p className="mb-2 text-lg font-semibold">Élément à la une</p>
              <p className="mb-3 text-sm text-muted-foreground">Titre affiché sur ton profil (section à la une).</p>
              <Input value={highlightTitle} onChange={(e) => setHighlightTitle(e.target.value)} placeholder="Titre" className="mb-3" />
              <Button className="w-full" disabled={highlightSaving} onClick={() => void addToHighlights()}>
                {highlightSaving ? "Ajout…" : "Ajouter"}
              </Button>
            </>
          )}

          {actionMode === "hide" && isOwnStory && (
            <>
              <button
                type="button"
                className="mb-3 flex items-center gap-2 text-[15px] font-medium text-primary"
                onClick={() => setActionMode("menu")}
              >
                <ChevronLeft className="h-5 w-5" />
                Retour
              </button>
              <p className="mb-2 text-lg font-semibold">Masquer pour…</p>
              <p className="mb-3 text-sm text-muted-foreground">
                Les personnes cochées ne verront plus cette story (abonnés uniquement).
              </p>
              {followersLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : followers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun abonné pour masquer la story.</p>
              ) : (
                <div className="mb-4 max-h-[45vh] space-y-1 overflow-y-auto">
                  {followers.map((f) => {
                    const checked = hideSelection.has(f.user_id);
                    return (
                      <label
                        key={f.user_id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setHideSelection((prev) => {
                              const next = new Set(prev);
                              if (next.has(f.user_id)) next.delete(f.user_id);
                              else next.add(f.user_id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded"
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={f.avatar_url ?? ""} />
                          <AvatarFallback>{(f.username ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{f.display_name || f.username || "Membre"}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <Button className="w-full" disabled={hideSaving || followersLoading} onClick={() => void saveHideFrom()}>
                {hideSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </>
          )}
        </div>
      </div>,
      document.body
    );

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
          /* Le menu ⋯ est en portal sur document.body : sans ça, Radix traite les clics comme « outside » et ferme la story avant l’action. */
          onPointerDownOutside={(e) => {
            if (actionMode) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (actionMode) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            if (actionMode) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (actionMode) {
              e.preventDefault();
              closeActionPanel();
            }
          }}
        >
          <DialogTitle className="sr-only">Stories</DialogTitle>
          {!current ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/60">Aucune story active.</div>
          ) : (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-28 bg-gradient-to-b from-black/58 via-black/22 to-transparent" />
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex gap-1 px-3 pt-[calc(env(safe-area-inset-top,0px)+6px)]">
                {stories.map((story, i) => (
                  <div key={story.id} className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
                      style={{
                        width: i < index ? "100%" : i > index ? "0%" : `${storyProgress}%`,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-0 right-0 top-0 z-30 flex items-center gap-2.5 px-3 pt-[calc(env(safe-area-inset-top,0px)+18px)]">
                <button
                  type="button"
                  className="pointer-events-auto rounded-full"
                  aria-label="Ouvrir le profil"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (authorProfile?.username) {
                      onOpenChange(false);
                      navigate(`/p/${authorProfile.username}`);
                    }
                  }}
                >
                  <Avatar className="h-9 w-9 shrink-0 border border-white/25">
                    <AvatarImage src={authorProfile?.avatar_url ?? ""} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-xs text-white">
                      {(authorProfile?.username ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight">{displayName}</p>
                  <p className="truncate text-[11px] text-white/70">
                    {(relativeStoryTime || format(new Date(current.created_at), "HH:mm", { locale: fr }))} · {index + 1}/{stories.length}
                  </p>
                </div>
                <button
                  type="button"
                  className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/25 text-white/90 backdrop-blur-sm transition-opacity active:opacity-70"
                  aria-label="Options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMode("menu");
                  }}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/25 text-white/95 backdrop-blur-sm transition-opacity active:opacity-70"
                    aria-label="Fermer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
              </div>

              <div
                className="relative min-h-0 flex-1 bg-black"
                onTouchStart={onTouchStartSwipe}
                onTouchEnd={onTouchEndSwipe}
              >
                <div
                  className="absolute inset-x-0 top-0 z-10"
                  style={{ bottom: GESTURE_BOTTOM_CLEAR }}
                  onPointerDown={onPointerDownCapture}
                  onPointerUp={endPress}
                  onPointerCancel={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                    if (pressRef.current?.longFired) setIsPaused(false);
                    pressRef.current = null;
                  }}
                />

                {current.media && displayUrl ? (
                  current.media.media_type === "image" ? (
                    <img
                      src={displayUrl}
                      alt=""
                      draggable={false}
                      className={cn(
                        "pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-200",
                        isTransitioning ? "opacity-70" : "opacity-100"
                      )}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      key={`${current.id}-${displayUrl}`}
                      src={displayUrl}
                      className={cn(
                        "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
                        isTransitioning ? "opacity-70" : "opacity-100"
                      )}
                      playsInline
                      muted
                      autoPlay
                      loop={isBoomerang}
                      preload="auto"
                    />
                  )
                ) : current.media && !displayUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 px-6 text-center">
                    <p className="text-sm font-medium text-white/80">{current.session?.title ?? "Story sans média"}</p>
                    <p className="mt-2 text-xs text-white/45">Aucune image ou vidéo sur cette story.</p>
                    {metaLine ? <p className="mt-2 text-xs text-white/35">{metaLine}</p> : null}
                  </div>
                )}

                {current.media && displayUrl && metaLine ? (
                  <div className="pointer-events-none absolute bottom-28 left-0 right-0 z-20 px-4 text-center">
                    <p className="line-clamp-2 text-[12px] text-white/70 drop-shadow-md">{metaLine}</p>
                  </div>
                ) : null}
              </div>

              <div
                className="pointer-events-auto absolute bottom-0 left-0 right-0 z-40 flex items-end justify-between gap-3 bg-gradient-to-t from-black/55 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-10"
              >
                {isOwnStory ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void Promise.all([loadViewers(), loadLikers()]);
                      setActionMode("insights");
                    }}
                    className="flex h-12 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 backdrop-blur-sm transition-transform active:scale-95"
                    aria-label={`J'aime reçus, ${likesCount}`}
                  >
                    <Heart className="h-6 w-6 text-white" strokeWidth={1.75} />
                    <span className="text-[15px] font-semibold tabular-nums text-white">{likesCount}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleLike();
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform active:scale-95"
                    aria-label={likedByMe ? "Retirer le j'aime" : "J'aime"}
                  >
                    <Heart className={cn("h-7 w-7", likedByMe ? "fill-red-500 text-red-500" : "text-white")} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMode("menu");
                  }}
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

      {actionsPortal}
    </>
  );
}
