import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
}

export function SessionStoriesStrip({
  currentUserId,
  onOpenStory,
  onCreateStory,
}: SessionStoriesStripProps) {
  const [authors, setAuthors] = useState<StoryAuthor[]>([]);

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
  }, [currentUserId]);

  const hasMyStory = useMemo(() => authors.some((a) => a.author_id === currentUserId), [authors, currentUserId]);

  return (
    <div className="overflow-x-auto px-3 pb-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={hasMyStory ? () => onOpenStory(currentUserId!) : onCreateStory}
          className="flex min-w-[72px] flex-col items-center gap-1"
        >
          <div className="relative">
            <Avatar className="h-14 w-14 border-2 border-primary/40">
              <AvatarFallback>MOI</AvatarFallback>
            </Avatar>
            {!hasMyStory && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground">
                <Plus className="h-3 w-3" />
              </span>
            )}
          </div>
          <span className="max-w-[70px] truncate text-[11px] text-muted-foreground">Votre story</span>
        </button>

        {authors
          .filter((a) => a.author_id !== currentUserId)
          .map((author) => (
            <button
              key={author.author_id}
              type="button"
              onClick={() => onOpenStory(author.author_id)}
              className="flex min-w-[72px] flex-col items-center gap-1"
            >
              <Avatar className={`h-14 w-14 border-2 ${author.viewed ? "border-border" : "border-primary"}`}>
                <AvatarImage src={author.avatar_url ?? ""} />
                <AvatarFallback>{(author.username ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="max-w-[70px] truncate text-[11px] text-muted-foreground">
                {author.display_name || author.username || "Membre"}
              </span>
            </button>
          ))}
      </div>
      {!authors.length && (
        <div className="mt-3 rounded-ios-md border p-3 text-center text-xs text-muted-foreground">
          Pas de stories pour le moment. Partage ta seance pour lancer la section.
        </div>
      )}
    </div>
  );
}
