import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Eye, Heart, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

interface SessionStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string | null;
  viewerUserId: string | null;
  storyId?: string | null;
  onOpenFeed?: (sessionId: string) => void;
  stackNested?: boolean;
}

export function SessionStoryDialog({
  open,
  onOpenChange,
  authorId,
  viewerUserId,
  storyId = null,
  onOpenFeed,
  stackNested = false,
}: SessionStoryDialogProps) {
...
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent stackNested={stackNested} className="max-w-md p-0 overflow-hidden">
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
              <p className="text-sm font-semibold">Story</p>
              <p className="text-xs text-muted-foreground">{progressText}</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded-ios-lg border p-4">
                {current.media ? (
                  current.media.media_type === "image" ? (
                    <img src={current.media.media_url} alt="" className="mb-3 h-48 w-full rounded-ios-md object-cover" />
                  ) : (
                    <video src={current.media.media_url} className="mb-3 h-48 w-full rounded-ios-md object-cover" controls playsInline />
                  )
                ) : null}
                <p className="text-base font-semibold">{current.session?.title ?? "Story"}</p>
                {current.session ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">{current.session.location_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {current.session.scheduled_at
                        ? format(new Date(current.session.scheduled_at), "EEEE d MMMM 'a' HH:mm", { locale: fr })
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Story sans seance associee.</p>
                )}
                {onOpenFeed && current.session_id && current.session && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => onOpenFeed(current.session_id)}
                  >
                    Voir dans le feed
                  </Button>
                )}
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
              <div className="rounded-ios-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => void toggleLike()}
                    className="inline-flex items-center gap-2 text-sm font-medium"
                  >
                    <Heart className={`h-4 w-4 ${likedByMe ? "fill-current text-red-500" : ""}`} />
                    J'aime
                  </button>
                  <p className="text-xs text-muted-foreground">{likesCount} like(s)</p>
                </div>
                {!isOwnStory && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Repondre a la story..."
                    />
                    <Button size="icon" onClick={() => void sendReplyAsMessage()} disabled={!replyText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
