import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type StoryItem = {
  id: string;
  author_id: string;
  session_id: string;
  created_at: string;
  expires_at: string;
  session?: {
    title: string;
    activity_type: string;
    location_name: string;
    scheduled_at: string;
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

interface SessionStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string | null;
  viewerUserId: string | null;
  storyId?: string | null;
}

export function SessionStoryDialog({
  open,
  onOpenChange,
  authorId,
  viewerUserId,
  storyId = null,
}: SessionStoryDialogProps) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [viewers, setViewers] = useState<ViewerItem[]>([]);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const current = stories[index];
  const isOwnStory = !!current && current.author_id === viewerUserId;

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

      const sessionIds = storiesData.map((s) => s.session_id);
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, title, activity_type, location_name, scheduled_at")
        .in("id", sessionIds);

      const byId = new Map((sessions ?? []).map((s) => [s.id, s]));
      setStories(
        storiesData.map((s) => ({
          ...s,
          session: (byId.get(s.session_id) as StoryItem["session"]) ?? null,
        }))
      );
      setIndex(0);
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
    if (!open || stories.length === 0) return;
    setStoryProgress(0);
    const durationMs = 5000;
    const tickMs = 100;
    const step = 100 / (durationMs / tickMs);
    const interval = window.setInterval(() => {
      if (isPaused) return;
      setStoryProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          if (index < stories.length - 1) {
            setIndex((i) => Math.min(stories.length - 1, i + 1));
            return 0;
          }
          onOpenChange(false);
          return 100;
        }
        return next;
      });
    }, tickMs);
    return () => window.clearInterval(interval);
  }, [open, index, stories.length, onOpenChange, isPaused]);

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

  const progressText = useMemo(() => {
    if (!stories.length) return "";
    return `${index + 1}/${stories.length}`;
  }, [stories.length, index]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {!current ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Aucune story active.</div>
        ) : (
          <div
            className="bg-card"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onTouchCancel={() => setIsPaused(false)}
          >
            <div className="flex gap-1 px-3 pt-3">
              {stories.map((story, i) => (
                <div key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-100"
                    style={{
                      width: i < index ? "100%" : i > index ? "0%" : `${storyProgress}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <p className="text-sm font-semibold">Story seance</p>
              <p className="text-xs text-muted-foreground">{progressText}</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded-ios-lg border p-4">
                <p className="text-base font-semibold">{current.session?.title ?? "Seance"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{current.session?.location_name ?? "Lieu non defini"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {current.session?.scheduled_at
                    ? format(new Date(current.session.scheduled_at), "EEEE d MMMM 'a' HH:mm", { locale: fr })
                    : ""}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" disabled={index <= 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Precedent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index >= stories.length - 1}
                  onClick={() => setIndex((i) => Math.min(stories.length - 1, i + 1))}
                >
                  Suivant <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              {isOwnStory && (
                <div className="rounded-ios-lg border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Eye className="h-4 w-4" />
                    {viewers.length} vue(s)
                  </div>
                  <div className="max-h-40 space-y-2 overflow-auto">
                    {viewers.map((v) => (
                      <div key={`${v.viewer_id}-${v.created_at}`} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={v.profile?.avatar_url ?? ""} />
                          <AvatarFallback>{(v.profile?.username ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm">
                          {v.profile?.display_name || v.profile?.username || "Utilisateur"}
                        </p>
                      </div>
                    ))}
                    {viewers.length === 0 && <p className="text-xs text-muted-foreground">Aucune vue pour le moment.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
