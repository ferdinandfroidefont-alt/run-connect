import { useEffect, useMemo, useState } from "react";
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
}

export function SessionStoriesStrip({
  currentUserId,
  onOpenStory,
  onCreateStory,
  refreshToken = 0,
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

  return (
    <div className="overflow-x-auto px-4 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-start gap-3.5">
        <button
          type="button"
          onClick={hasMyStory ? () => onOpenStory(currentUserId!) : onCreateStory}
          className="flex min-w-[74px] flex-col items-center gap-1.5"
        >
          <div className="relative rounded-full bg-white p-[3px] shadow-[0_10px_22px_-14px_rgba(15,23,42,0.45)]">
            <Avatar className="h-[66px] w-[66px] border-2 border-[#DBEAFE]">
              <AvatarImage src={myStoryAvatarUrl ?? ""} />
              <AvatarFallback className="bg-[#DBEAFE] text-[#2563EB]">MOI</AvatarFallback>
            </Avatar>
            {!hasMyStory && (
              <span className="absolute bottom-0.5 right-0.5 rounded-full bg-[#2563EB] p-1 text-white shadow-sm">
                <Plus className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <span className="max-w-[74px] truncate text-[12px] font-medium text-[#0F172A]">Votre story</span>
        </button>

        {authors
          .filter((a) => a.author_id !== currentUserId)
          .map((author) => (
            <button
              key={author.author_id}
              type="button"
              onClick={() => onOpenStory(author.author_id)}
              className="flex min-w-[74px] flex-col items-center gap-1.5"
            >
              <div
                className={
                  author.viewed
                    ? "rounded-full bg-[#E2E8F0] p-[2.5px] shadow-[0_10px_22px_-14px_rgba(15,23,42,0.45)]"
                    : "rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#60A5FA_52%,#93C5FD_100%)] p-[2.5px] shadow-[0_10px_22px_-14px_rgba(15,23,42,0.45)]"
                }
              >
                <Avatar className="h-16 w-16 border-2 border-white">
                  <AvatarImage src={author.avatar_url ?? ""} />
                  <AvatarFallback className="bg-[#E2E8F0] text-[#334155]">
                    {(author.username ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="max-w-[74px] truncate text-[12px] font-medium text-[#0F172A]">
                {author.display_name || author.username || "Membre"}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
