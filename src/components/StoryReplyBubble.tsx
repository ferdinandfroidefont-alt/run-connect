import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCheck, Reply } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useStoryReplyPreview } from "@/hooks/useStoryReplyPreview";
import { useStoryMediaUrl } from "@/hooks/useStoryMediaUrl";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type StoryReplyBubbleMessage = {
  id: string;
  created_at: string;
  session_id?: string | null;
  sender_id: string;
  read_at: string | null;
  deleted_at?: string | null;
  reply_to?: {
    id: string;
    content: string;
    sender: {
      username: string;
      display_name: string;
      avatar_url?: string | null;
    };
  } | null;
};

type StoryReplyBubbleProps = {
  message: StoryReplyBubbleMessage;
  replyText: string;
  isOwnMessage: boolean;
  currentUserId: string;
  storyAuthorId: string;
  onOpenStory: (authorId: string, storyId: string | null) => void;
};

function StoryReplyPreviewThumb({
  displayLabel,
  avatarUrl,
  metaLine,
  rawMediaUrl,
  mediaType,
  expired,
  unavailable,
  onPress,
}: {
  displayLabel: string;
  avatarUrl: string | null;
  metaLine: string | null;
  rawMediaUrl: string | null;
  mediaType: string | null;
  expired: boolean;
  unavailable: boolean;
  onPress: () => void;
}) {
  const signed = useStoryMediaUrl(rawMediaUrl);
  const showImage =
    !!signed && (!mediaType || ["image", "boomerang"].includes(mediaType.toLowerCase()));

  return (
    <button
      type="button"
      onClick={onPress}
      className="relative w-[180px] shrink-0 overflow-hidden rounded-[18px] shadow-sm outline-none transition-transform active:scale-[0.98]"
    >
      <div className="aspect-[9/16] w-full bg-[#2c2c2e]">
        {showImage ? (
          <img src={signed!} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e]" />
        )}
        <span
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {(expired || unavailable) && (
          <div className="absolute inset-0 z-[3] flex items-center justify-center bg-black/55 px-3">
            <p className="text-center text-[13px] font-semibold tracking-tight text-white">
              {unavailable ? "Story indisponible" : "Story expirée"}
            </p>
          </div>
        )}
        <div className="absolute left-3 right-3 top-3 z-[2] flex min-w-0 items-center gap-1.5 text-[13px] font-semibold leading-tight tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
          <Avatar className="h-[18px] w-[18px] shrink-0 border-[1.5px] border-white">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="object-cover" /> : null}
            <AvatarFallback className="bg-white/20 text-[9px] text-white">
              {displayLabel.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate">{displayLabel}</span>
        </div>
        {metaLine ? (
          <div className="absolute bottom-3 left-3 right-3 z-[3] text-[11px] font-medium leading-snug text-white/[0.95] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
            {metaLine}
          </div>
        ) : null}
      </div>
    </button>
  );
}

export function StoryReplyBubble({
  message,
  replyText,
  isOwnMessage,
  currentUserId,
  storyAuthorId,
  onOpenStory,
}: StoryReplyBubbleProps) {
  const { toast } = useToast();
  const { data: preview, isLoading } = useStoryReplyPreview({
    messageId: message.id,
    storyAuthorId,
    messageCreatedAt: message.created_at,
    sessionId: message.session_id,
    enabled: true,
  });

  const { data: authorProfile } = useQuery({
    queryKey: ["story-reply-author", storyAuthorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("user_id", storyAuthorId)
        .maybeSingle();
      return (
        data ?? {
          user_id: storyAuthorId,
          username: "",
          display_name: "",
          avatar_url: null as string | null,
        }
      );
    },
    enabled: !!storyAuthorId?.trim(),
    staleTime: 60_000,
  });

  const expired = useMemo(() => {
    if (!preview?.expiresAt) return false;
    return new Date(preview.expiresAt).getTime() <= Date.now();
  }, [preview?.expiresAt]);

  const unavailable = !isLoading && !preview;

  const displayLabel =
    storyAuthorId === currentUserId ? "Toi" : authorProfile?.username || authorProfile?.display_name || "Story";

  const avatarUrl = authorProfile?.avatar_url ?? null;

  const onPreviewPress = () => {
    if (unavailable) {
      toast({ title: "Story indisponible", description: "Impossible d’ouvrir cette story." });
      return;
    }
    if (expired) {
      toast({ title: "Story expirée", description: "Cette story n’est plus disponible." });
      return;
    }
    if (preview?.storyId) {
      onOpenStory(storyAuthorId, preview.storyId);
    } else {
      onOpenStory(storyAuthorId, null);
    }
  };

  return (
    <div className="flex max-w-[220px] min-w-0 flex-col gap-1.5 font-sans">
      {message.reply_to && !message.deleted_at && message.reply_to.sender && (
        <div className="mb-0.5 rounded-lg border-l-2 border-primary bg-muted/50 px-2.5 py-1.5 dark:bg-muted/30">
          <p className="truncate text-[11px] font-semibold text-foreground">
            {message.reply_to.sender.username || message.reply_to.sender.display_name || "Message"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{message.reply_to.content}</p>
        </div>
      )}

      <div
        className={cn(
          "flex items-center gap-1.5 px-1 text-[12px] font-medium text-muted-foreground",
          isOwnMessage && "justify-end",
        )}
      >
        <Reply className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        <span>{isOwnMessage ? "Tu as répondu à sa story" : "A répondu à ta story"}</span>
      </div>

      {isLoading ? (
        <div className="h-[320px] w-[180px] shrink-0 animate-pulse rounded-[18px] bg-muted" />
      ) : (
        <StoryReplyPreviewThumb
          displayLabel={displayLabel}
          avatarUrl={avatarUrl}
          metaLine={preview?.metaLine ?? null}
          rawMediaUrl={preview?.thumbMediaUrl ?? null}
          mediaType={preview?.thumbMediaType ?? null}
          expired={expired && !!preview}
          unavailable={unavailable}
          onPress={onPreviewPress}
        />
      )}

      <div className={cn("flex items-center gap-1.5", isOwnMessage && "justify-end")}>
        <div
          className={cn(
            "max-w-full rounded-[18px] px-[14px] py-[10px] text-[14px] leading-[1.4] tracking-normal break-words whitespace-pre-wrap",
            isOwnMessage
              ? "rounded-br-[6px] bg-[#1d1d1f] text-white dark:bg-primary dark:text-primary-foreground"
              : "rounded-bl-[6px] border border-[#e0e0e0] bg-white text-[#1d1d1f] dark:border-[#1f1f1f] dark:bg-[#2c2c2e] dark:text-foreground",
          )}
        >
          {replyText}
        </div>
      </div>

      {isOwnMessage && (
        <div className="flex justify-end px-1 text-white/60 dark:text-primary-foreground/70">
          {message.read_at ? (
            <CheckCheck className="h-3 w-3 text-[#5AC8FA]" aria-hidden />
          ) : (
            <Check className="h-3 w-3" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}
