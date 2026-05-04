import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

type StoryAuthor = {
  author_id: string;
  latest_story_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  viewed: boolean;
};

interface SessionStoriesStripProps {
  currentUserId: string | null;
  onOpenStory: (authorId: string) => void;
  onCreateStory: () => void;
  /** Incremente pour forcer un rechargement (ex: apres creation story). */
  refreshToken?: number;
  /** Classes sur le conteneur horizontal (maquette 17 : fond crème, padding 20px). */
  className?: string;
}

export function SessionStoriesStrip({
  currentUserId,
  onOpenStory,
  onCreateStory,
  refreshToken = 0,
  className,
}: SessionStoriesStripProps) {
  const [authors, setAuthors] = useState<StoryAuthor[]>([]);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setMyAvatarUrl(null);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", currentUserId)
        .maybeSingle();
      setMyAvatarUrl((data?.avatar_url as string | null) ?? null);
    })();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    void (async () => {
      const nowIso = new Date().toISOString();
      const { data: stories } = await (supabase as any)
        .from("session_stories")
        .select("id, author_id, created_at")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });
      const rows = (stories ?? []) as Array<{ id: string; author_id: string; created_at: string }>;
      if (!rows.length) {
        setAuthors([]);
        return;
      }

      const latestByAuthor = new Map<string, { storyId: string; createdAt: string }>();
      rows.forEach((r) => {
        if (!latestByAuthor.has(r.author_id)) {
          latestByAuthor.set(r.author_id, { storyId: r.id, createdAt: r.created_at });
        }
      });

      const authorIds = [...latestByAuthor.keys()];
      const storyIds = [...latestByAuthor.values()].map((x) => x.storyId);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", authorIds);
      const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      const { data: viewedRows } = await (supabase as any)
        .from("session_story_views")
        .select("story_id")
        .eq("viewer_id", currentUserId)
        .in("story_id", storyIds);
      const viewed = new Set(((viewedRows ?? []) as Array<{ story_id: string }>).map((v) => v.story_id));

      const result: StoryAuthor[] = authorIds.map((authorId) => {
        const meta = latestByAuthor.get(authorId)!;
        const p = pMap.get(authorId);
        return {
          author_id: authorId,
          latest_story_id: meta.storyId,
          username: p?.username ?? null,
          display_name: p?.display_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          viewed: viewed.has(meta.storyId),
        };
      });

      result.sort((a, b) => {
        if (a.author_id === currentUserId) return -1;
        if (b.author_id === currentUserId) return 1;
        if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
        return 0;
      });
      setAuthors(result);
    })();
  }, [currentUserId, refreshToken]);

  const hasMyStory = useMemo(() => authors.some((a) => a.author_id === currentUserId), [authors, currentUserId]);
  const myStoryAuthor = useMemo(
    () => authors.find((a) => a.author_id === currentUserId) ?? null,
    [authors, currentUserId],
  );
  const myStoryAvatarUrl = myStoryAuthor?.avatar_url ?? myAvatarUrl;

  // Maquette 17 : anneau dégradé feu RunConnect (#FF4D1A · #FFB199), « Toi » + pastille +
  return (
    <div
      className={cn(
        "overflow-x-auto px-5 pb-1 pt-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <div className="flex min-w-max items-start gap-3.5">
        <button
          type="button"
          onClick={hasMyStory ? () => onOpenStory(currentUserId!) : onCreateStory}
          className="flex min-w-[70px] flex-col items-center gap-1.5"
        >
          <div
            className="relative h-16 w-16 rounded-full p-[2.5px]"
            style={{ background: "#E2DBD0" }}
          >
            <div className="h-full w-full rounded-full bg-[#F6F2EC] p-[2px] dark:bg-background">
              <Avatar className="h-full w-full">
                <AvatarImage src={myStoryAvatarUrl ?? ""} />
                <AvatarFallback className="bg-[hsl(var(--muted))] text-[18px] font-semibold text-foreground/70">
                  {hasMyStory ? "MOI" : "+"}
                </AvatarFallback>
              </Avatar>
            </div>
            {!hasMyStory && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2.5px] border-[#F6F2EC] bg-[#FF4D1A] text-white dark:border-background dark:bg-orange-500">
                <Plus className="h-3 w-3" strokeWidth={2.4} />
              </span>
            )}
          </div>
          <span className="max-w-[70px] truncate text-center text-[11px] font-semibold text-[#7A7771] dark:text-muted-foreground">
            Toi
          </span>
        </button>

        {authors
          .filter((a) => a.author_id !== currentUserId)
          .map((author) => (
            <button
              key={author.author_id}
              type="button"
              onClick={() => onOpenStory(author.author_id)}
              className="flex min-w-[70px] flex-col items-center gap-1.5"
            >
              <div
                className="h-16 w-16 rounded-full p-[2.5px]"
                style={{
                  background: author.viewed
                    ? "#E2DBD0"
                    : "conic-gradient(from 200deg, #FF4D1A 0%, #FFB199 50%, #FF4D1A 100%)",
                }}
              >
                <div className="h-full w-full rounded-full bg-[#F6F2EC] p-[2px] dark:bg-background">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={author.avatar_url ?? ""} />
                    <AvatarFallback className="bg-[hsl(var(--muted))] text-[18px] font-semibold text-foreground">
                      {(author.username ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="max-w-[70px] truncate text-center text-[11px] font-semibold text-[#0E0E0F] dark:text-foreground">
                {author.display_name || author.username || "Membre"}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
