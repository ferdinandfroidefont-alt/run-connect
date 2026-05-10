import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  MoreHorizontal,
  ChevronLeft,
  Share2,
  ExternalLink,
  Eye,
  Pin,
  UserX,
  Trash2,
  Pause,
  Play,
  Flag,
  MessageCircle,
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

const IMAGE_DURATION_MS = 6000;
const SWIPE_CLOSE_PX = 110;
const SWIPE_INSIGHTS_PX = 90;
const SWIPE_NAV_PX = 70;
const ACTION_PANEL_CLOSE_SWIPE_PX = 70;
/** Réserve la bottom bar (reply / actions) pour les tap zones gauche-droite. */
const TAP_ZONE_BOTTOM_OFFSET = "calc(5.75rem + env(safe-area-inset-bottom, 0px))";
/** Offset pour le sous-titre séance au-dessus de la bottom bar. */
const META_ABOVE_BOTTOM_OFFSET = "calc(6.25rem + env(safe-area-inset-bottom, 0px))";

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
  const [userPaused, setUserPaused] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [actionMode, setActionMode] = useState<StoryActionMode>(null);
  const [highlightTitle, setHighlightTitle] = useState("");
  const [followers, setFollowers] = useState<FollowerRow[]>([]);
  const [hideSelection, setHideSelection] = useState<Set<string>>(new Set());
  const [followersLoading, setFollowersLoading] = useState(false);
  const [highlightSaving, setHighlightSaving] = useState(false);
  const [hideSaving, setHideSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [viewers, setViewers] = useState<ViewerItem[]>([]);
  const [likers, setLikers] = useState<LikeRow[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const likeBtnRef = useRef<HTMLButtonElement>(null);
  const swipeRef = useRef<{ x0: number; y0: number } | null>(null);
  const actionPanelSwipeRef = useRef<{ y0: number; startScrollTop: number } | null>(null);
  const progressRaf = useRef<number | null>(null);

  const current = stories[index];
  const isOwnStory = !!current && current.author_id === viewerUserId;
  const resolvedMediaUrl = useStoryMediaUrl(current?.media?.media_url ?? null);
  const isPaused = userPaused || replyFocused || !!actionMode;

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
    const title = highlightTitle.trim();
    if (!title) {
      toast({ title: "Titre requis", description: "Donne un titre à ton groupe de stories à la une." });
      return;
    }
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
    setUserPaused(false);
  };

  const bumpLikePop = () => {
    const el = likeBtnRef.current;
    if (!el) return;
    el.classList.remove("rc-story-like-pop");
    void el.offsetWidth;
    el.classList.add("rc-story-like-pop");
  };

  const onActionPanelTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    actionPanelSwipeRef.current = {
      y0: e.touches[0].clientY,
      startScrollTop: target.scrollTop,
    };
  };

  const onActionPanelTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const swipe = actionPanelSwipeRef.current;
    actionPanelSwipeRef.current = null;
    if (!swipe) return;
    const deltaY = e.changedTouches[0].clientY - swipe.y0;
    // Ferme seulement si l'utilisateur tire vers le bas depuis le haut du sheet.
    if (swipe.startScrollTop <= 0 && deltaY > ACTION_PANEL_CLOSE_SWIPE_PX) {
      closeActionPanel();
    }
  };

  const onTouchStartSwipe = (e: React.TouchEvent) => {
    if (actionMode) return;
    swipeRef.current = {
      x0: e.touches[0].clientX,
      y0: e.touches[0].clientY,
    };
  };

  const onTouchEndSwipe = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || actionMode) return;
    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;
    const deltaX = x - s.x0;
    const deltaY = y - s.y0;
    const isHorizontalSwipe = Math.abs(deltaX) >= SWIPE_NAV_PX && Math.abs(deltaX) > Math.abs(deltaY);
    if (isHorizontalSwipe) {
      if (deltaX < 0) {
        triggerTapHaptic();
        goNext();
      } else {
        triggerTapHaptic();
        goPrev();
      }
      return;
    }
    if (deltaY > SWIPE_CLOSE_PX) {
      onOpenChange(false);
      return;
    }
    if (deltaY < -SWIPE_INSIGHTS_PX && isOwnStory) {
      void Promise.all([loadViewers(), loadLikers()]);
      setActionMode("insights");
    }
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
  const headerMetaLine = useMemo(() => {
    if (!relativeStoryTime) return "";
    return `il y a ${relativeStoryTime}`;
  }, [relativeStoryTime]);
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
      setUserPaused(false);
      setReplyFocused(false);
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

  const displayUrl = resolvedMediaUrl ?? current?.media?.media_url ?? null;

  /** Panneau d’actions : doit rester *dans* le `DialogContent` Radix. Avec `modal`, Radix met `pointer-events: none` sur `body` : un portal sur `document.body` hérite du `none` et ne reçoit aucun clic/touch. */
  const actionsOverlay =
    !!current &&
    actionMode &&
    open && (
      <div className="pointer-events-auto absolute inset-0 z-[200]" role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out"
          aria-label="Fermer"
          onClick={closeActionPanel}
        />
        <div
          role="dialog"
          aria-label="Options story"
          className={cn(
            "absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[20px]",
            "border-t border-white/10 bg-[rgb(20_20_22)]/[0.92] pb-[max(env(safe-area-inset-bottom),12px)] pt-2 text-white shadow-xl backdrop-blur-[40px] backdrop-saturate-[180%]",
            "[transition:transform_400ms_cubic-bezier(0.32,0.72,0,1)]"
          )}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onActionPanelTouchStart}
          onTouchEnd={onActionPanelTouchEnd}
        >
          {actionMode === "menu" && (
            <>
              <button
                type="button"
                className="mx-auto mb-3 block h-1 w-9 cursor-pointer rounded-full bg-white/30"
                aria-label="Fermer les options"
                onClick={closeActionPanel}
              />
              <div className="flex flex-col pb-1">
                {isOwnStory ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal transition-colors active:bg-white/[0.06]"
                      onClick={() => {
                        void Promise.all([loadViewers(), loadLikers()]);
                        setActionMode("insights");
                      }}
                    >
                      <Eye className="h-[22px] w-[22px] shrink-0 text-white/85" strokeWidth={2} />
                      Voir les vues
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal transition-colors active:bg-white/[0.06]"
                      onClick={() => void shareStory()}
                    >
                      <Share2 className="h-[22px] w-[22px] shrink-0 text-white/85" strokeWidth={2} />
                      Partager
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal transition-colors active:bg-white/[0.06]"
                      onClick={() => setActionMode("highlight")}
                    >
                      <Pin className="h-[22px] w-[22px] shrink-0 text-white/85" strokeWidth={2} />
                      Enregistrer à la une
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal transition-colors active:bg-white/[0.06]"
                      onClick={() => setActionMode("hide")}
                    >
                      <UserX className="h-[22px] w-[22px] shrink-0 text-white/85" strokeWidth={2} />
                      Masquer pour quelqu&apos;un
                    </button>
                    {onOpenFeed && current?.session_id ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal transition-colors active:bg-white/[0.06]"
                        onClick={() => {
                          closeActionPanel();
                          onOpenFeed(current.session_id!);
                        }}
                      >
                        <ExternalLink className="h-[22px] w-[22px] shrink-0 text-white/85" strokeWidth={2} />
                        Voir dans le feed
                      </button>
                    ) : null}
                    <div className="my-1 h-px bg-white/10" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal text-[#ff453a] transition-colors active:bg-white/[0.06]"
                      onClick={openDeletePage}
                    >
                      <Trash2 className="h-[22px] w-[22px] shrink-0 text-[#ff453a]" strokeWidth={2} />
                      Supprimer la story…
                    </button>
                  </>
                ) : (
                  <>
                    {viewerUserId ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal transition-colors active:bg-white/[0.06]"
                        onClick={() => {
                          closeActionPanel();
                          window.setTimeout(() => replyInputRef.current?.focus(), 0);
                        }}
                      >
                        <MessageCircle className="h-[22px] w-[22px] shrink-0 text-white/85" strokeWidth={2} />
                        Répondre
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal transition-colors active:bg-white/[0.06]"
                      onClick={() => void shareStory()}
                    >
                      <Share2 className="h-[22px] w-[22px] shrink-0 text-white/85" strokeWidth={2} />
                      Partager
                    </button>
                    <div className="my-1 h-px bg-white/10" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-base font-normal text-[#ff453a] transition-colors active:bg-white/[0.06]"
                      onClick={() => {
                        toast({
                          title: "Signalement",
                          description: "Cette option sera disponible prochainement.",
                        });
                      }}
                    >
                      <Flag className="h-[22px] w-[22px] shrink-0 text-[#ff453a]" strokeWidth={2} />
                      Signaler
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {actionMode === "insights" && isOwnStory && (
            <>
              <button
                type="button"
                className="mb-3 flex items-center gap-2 px-4 text-[15px] font-medium text-[hsl(var(--primary-on-dark))]"
                onClick={() => setActionMode("menu")}
              >
                <ChevronLeft className="h-5 w-5" />
                Retour
              </button>
              <div className="px-4 pb-4">
              <p className="mb-1 text-lg font-semibold">Vues ({viewers.length})</p>
              <p className="mb-3 text-sm text-white/65">
                Les personnes qui ont aimé apparaissent en premier ({likers.length} j&apos;aime).
              </p>
              <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                {insightRows.length === 0 ? (
                  <p className="text-sm text-white/55">Aucune vue pour le moment.</p>
                ) : (
                  insightRows.map((v) => (
                    <div key={`${v.viewer_id}-${v.created_at}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={v.profile?.avatar_url ?? ""} />
                        <AvatarFallback>{(v.profile?.username ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{v.profile?.display_name || v.profile?.username || "Membre"}</p>
                        <p className="text-xs text-white/55">
                          {format(new Date(v.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
                        </p>
                      </div>
                      {v.liked ? (
                        <Heart className="h-4 w-4 shrink-0 fill-[hsl(var(--primary-on-dark))] text-[hsl(var(--primary-on-dark))]" aria-hidden />
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              </div>
            </>
          )}

          {actionMode === "highlight" && isOwnStory && (
            <>
              <button
                type="button"
                className="mb-3 flex items-center gap-2 px-4 text-[15px] font-medium text-[hsl(var(--primary-on-dark))]"
                onClick={() => setActionMode("menu")}
              >
                <ChevronLeft className="h-5 w-5" />
                Retour
              </button>
              <div className="px-4 pb-4">
              <p className="mb-2 text-lg font-semibold">Élément à la une</p>
              <p className="mb-3 text-sm text-white/65">Titre affiché sur ton profil (section à la une).</p>
              <Input
                value={highlightTitle}
                onChange={(e) => setHighlightTitle(e.target.value)}
                placeholder="Titre"
                className="mb-3 border-white/15 bg-white/[0.08] text-white placeholder:text-white/45"
              />
              <Button className="w-full bg-[hsl(var(--primary-on-dark))] text-white hover:bg-[hsl(var(--primary-on-dark))]/90" disabled={highlightSaving} onClick={() => void addToHighlights()}>
                {highlightSaving ? "Ajout…" : "Ajouter"}
              </Button>
              </div>
            </>
          )}

          {actionMode === "hide" && isOwnStory && (
            <>
              <button
                type="button"
                className="mb-3 flex items-center gap-2 px-4 text-[15px] font-medium text-[hsl(var(--primary-on-dark))]"
                onClick={() => setActionMode("menu")}
              >
                <ChevronLeft className="h-5 w-5" />
                Retour
              </button>
              <div className="px-4 pb-4">
              <p className="mb-2 text-lg font-semibold">Masquer pour…</p>
              <p className="mb-3 text-sm text-white/65">
                Les personnes cochées ne verront plus cette story (abonnés uniquement).
              </p>
              {followersLoading ? (
                <p className="text-sm text-white/55">Chargement…</p>
              ) : followers.length === 0 ? (
                <p className="text-sm text-white/55">Aucun abonné pour masquer la story.</p>
              ) : (
                <div className="mb-4 max-h-[45vh] space-y-1 overflow-y-auto">
                  {followers.map((f) => {
                    const checked = hideSelection.has(f.user_id);
                    return (
                      <label
                        key={f.user_id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-2"
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
                          className="h-4 w-4 rounded border-white/25 bg-transparent"
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
              <Button className="w-full bg-[hsl(var(--primary-on-dark))] text-white hover:bg-[hsl(var(--primary-on-dark))]/90" disabled={hideSaving || followersLoading} onClick={() => void saveHideFrom()}>
                {hideSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );

  return (
    <>
      <style>{`
        @keyframes rc-story-like-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .rc-story-like-pop {
          animation: rc-story-like-pop 0.4s ease;
        }
      `}</style>
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
          /* Empêche la fermeture de la story par un « outside » tant que le panneau ⋯ est ouvert (le voile est dans le content). */
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
              <div className="pointer-events-none absolute left-[14px] right-[14px] top-[max(env(safe-area-inset-top),14px)] z-[40] flex gap-1">
                {stories.map((story, i) => (
                  <div key={story.id} className="h-[2.5px] min-w-0 flex-1 overflow-hidden rounded-[2px] bg-white/[0.28]">
                    <div
                      className="h-full rounded-[2px] bg-white transition-[width] duration-75 ease-linear"
                      style={{
                        width: i < index ? "100%" : i > index ? "0%" : `${storyProgress}%`,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-[14px] right-[14px] top-[calc(max(env(safe-area-inset-top),14px)+18px)] z-[40] flex items-center gap-2.5 font-sans">
                <button
                  type="button"
                  className="shrink-0 rounded-full active:bg-white/15"
                  aria-label="Ouvrir le profil"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (authorProfile?.username) {
                      onOpenChange(false);
                      navigate(`/p/${authorProfile.username}`);
                    }
                  }}
                >
                  <Avatar className="h-9 w-9 shrink-0 border-[1.5px] border-white/90">
                    <AvatarImage src={authorProfile?.avatar_url ?? ""} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-xs text-white">
                      {(authorProfile?.username ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                    {displayName}
                  </p>
                  <p className="mt-px truncate text-xs leading-snug text-white/[0.85] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                    {headerMetaLine || format(new Date(current.created_at), "HH:mm", { locale: fr })}
                    <span className="text-white/55"> · </span>
                    <span className="tabular-nums text-white/70">
                      {index + 1}/{stories.length}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors active:bg-white/[0.15]"
                    aria-label={userPaused ? "Reprendre" : "Pause"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserPaused((p) => !p);
                    }}
                  >
                    {userPaused ? (
                      <Play className="h-[22px] w-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" fill="currentColor" strokeWidth={0} />
                    ) : (
                      <Pause className="h-[22px] w-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors active:bg-white/[0.15]"
                    aria-label="Options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMode("menu");
                    }}
                  >
                    <MoreHorizontal className="h-[22px] w-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                  </button>
                </div>
              </div>

              <div
                className="relative min-h-0 flex-1 bg-black font-sans"
                onTouchStart={onTouchStartSwipe}
                onTouchEnd={onTouchEndSwipe}
              >
                <div
                  className={cn(
                    "absolute inset-0 overflow-hidden transition-[transform,filter] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
                    actionMode ? "scale-[0.98] brightness-[0.7]" : "scale-100 brightness-[1]"
                  )}
                >
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
                  <div
                    className="pointer-events-none absolute inset-0 z-[2]"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.7) 100%)",
                    }}
                  />
                </div>

                <div
                  className="absolute inset-x-0 top-0 z-[15] flex"
                  style={{ bottom: TAP_ZONE_BOTTOM_OFFSET }}
                  aria-hidden={!!actionMode}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className="h-full min-h-0 flex-1 cursor-default bg-transparent"
                    aria-label="Story précédente"
                    disabled={!!actionMode}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (actionMode) return;
                      triggerTapHaptic();
                      goPrev();
                    }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="h-full min-h-0 flex-1 cursor-default bg-transparent"
                    aria-label="Story suivante"
                    disabled={!!actionMode}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (actionMode) return;
                      triggerTapHaptic();
                      goNext();
                    }}
                  />
                </div>

                {current.media && displayUrl && metaLine ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-[20] px-4 text-center"
                    style={{ bottom: META_ABOVE_BOTTOM_OFFSET }}
                  >
                    <p className="line-clamp-2 text-[12px] text-white/70 drop-shadow-md">{metaLine}</p>
                  </div>
                ) : null}
              </div>

              <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-[40] flex items-center gap-2.5 px-[14px] pb-[max(env(safe-area-inset-bottom),16px)] pt-4 font-sans">
                {isOwnStory ? (
                  <>
                    <button
                      type="button"
                      className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[22px] border border-white/[0.18] bg-white/[0.12] px-4 text-[14px] font-medium text-white backdrop-blur-xl transition-transform active:scale-[0.98]"
                      onClick={(e) => {
                        e.stopPropagation();
                        void Promise.all([loadViewers(), loadLikers()]);
                        setActionMode("insights");
                      }}
                    >
                      <Eye className="h-[22px] w-[22px] shrink-0" strokeWidth={2} />
                      <span className="truncate">Statistiques</span>
                      <span className="text-white/35">·</span>
                      <Heart className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                      <span className="tabular-nums">{likesCount}</span>
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.12] text-white backdrop-blur-xl transition-transform active:scale-[0.92]"
                      aria-label="Partager"
                      onClick={(e) => {
                        e.stopPropagation();
                        void shareStory();
                      }}
                    >
                      <Share2 className="h-[22px] w-[22px]" strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      ref={replyInputRef}
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onFocus={() => setReplyFocused(true)}
                      onBlur={() => setReplyFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void sendReplyAsMessage();
                        }
                      }}
                      placeholder={`Répondre à ${displayName}…`}
                      disabled={!viewerUserId || viewerUserId === current.author_id}
                      className="h-11 min-w-0 flex-1 rounded-[22px] border border-white/[0.18] bg-white/[0.12] px-[18px] text-[14px] text-white outline-none placeholder:text-white/60 backdrop-blur-xl disabled:opacity-45"
                    />
                    <button
                      ref={likeBtnRef}
                      type="button"
                      disabled={!viewerUserId || viewerUserId === current.author_id}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.12] text-white backdrop-blur-xl transition-colors active:scale-[0.92]",
                        likedByMe && "border-transparent bg-[hsl(var(--primary-on-dark))] text-white"
                      )}
                      aria-label={likedByMe ? "Retirer le j'aime" : "J'aime"}
                      onClick={(e) => {
                        e.stopPropagation();
                        bumpLikePop();
                        void toggleLike();
                      }}
                    >
                      <Heart className={cn("h-[22px] w-[22px]", likedByMe && "fill-current")} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.12] text-white backdrop-blur-xl transition-transform active:scale-[0.92]"
                      aria-label="Partager"
                      onClick={(e) => {
                        e.stopPropagation();
                        void shareStory();
                      }}
                    >
                      <Share2 className="h-[22px] w-[22px]" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          {actionsOverlay}
        </DialogContent>
      </Dialog>
    </>
  );
}
