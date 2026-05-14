import type React from "react";
import { MiniMapPreview } from "@/components/feed/MiniMapPreview";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function toneHexForActivity(activityType: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel"))
    return "#ff375f";
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf")) return "#5ac8fa";
  if (t.includes("trail") || t.includes("rando") || t.includes("marche") || t.includes("walk")) return "#34c759";
  return "#0066cc";
}

export function sessionLikelyLive(scheduledAt: string) {
  const start = new Date(scheduledAt).getTime();
  const now = Date.now();
  const end = start + 3 * 60 * 60 * 1000;
  return now >= start && now <= end;
}

export function shortLocation(name: string | null | undefined) {
  if (!name?.trim()) return "";
  const cut = name.split(/[,·]/)[0]?.trim();
  return cut || name;
}

export function FeedSessionTile({
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
        {live ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#34c759]" aria-hidden /> : null}
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
        <div className="flex shrink-0 items-center gap-2">
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
