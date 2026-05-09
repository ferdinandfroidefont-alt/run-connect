import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Aligné sur les pastilles emoji de l’étape sport (`ActivityStep`) : 32×32, rayon 7px. */
export const EMOJI_BADGE_BASE_CLASS =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[15px] leading-none";

type EmojiBadgeProps = {
  emoji: ReactNode;
  className?: string;
};

export function EmojiBadge({ emoji, className }: EmojiBadgeProps) {
  return (
    <span className={cn(EMOJI_BADGE_BASE_CLASS, className)} aria-hidden>
      {emoji}
    </span>
  );
}
