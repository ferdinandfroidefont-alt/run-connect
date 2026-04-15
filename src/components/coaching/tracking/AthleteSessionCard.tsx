import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, MessageSquare, MessageCircleMore } from "lucide-react";
import { SessionStatusBadge } from "@/components/coaching/tracking/SessionStatusBadge";
import { SessionFeedback } from "@/components/coaching/tracking/SessionFeedback";
import { cn } from "@/lib/utils";

interface AthleteSessionCardProps {
  dayLabel: string;
  dayNumber: string;
  title: string;
  details: string;
  status: "pending" | "done" | "missed";
  note: string | null;
  rpeLabel?: string;
  objective?: string | null;
  onReply: () => void;
  onOpen?: () => void;
}

const STATUS_ACCENT: Record<AthleteSessionCardProps["status"], string> = {
  done: "bg-emerald-500",
  missed: "bg-red-500",
  pending: "bg-orange-400",
};

export function AthleteSessionCard({
  dayLabel,
  dayNumber,
  title,
  details,
  status,
  note,
  rpeLabel,
  objective,
  onReply,
  onOpen,
}: AthleteSessionCardProps) {
  return (
    <div className="ios-card overflow-hidden border border-border/60 bg-card shadow-[var(--shadow-card)]">
      <div className="flex">
        <div className={cn("w-1.5 shrink-0", STATUS_ACCENT[status])} />
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-2.5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">{dayLabel}</p>
              <p className="text-[18px] font-semibold leading-tight text-foreground">{dayNumber}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-foreground">{title}</p>
              <p className="truncate text-[12px] text-muted-foreground">{details}</p>
              {objective ? (
                <Badge variant="secondary" className="mt-1 rounded-md px-1.5 py-0 text-[10px] font-medium">
                  {objective}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <SessionStatusBadge status={status} />
              {onOpen ? (
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  onClick={onOpen}
                  aria-label="Ouvrir la séance"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2.5">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageCircleMore className="h-3.5 w-3.5" />
                Commentaire athlète
              </p>
              {rpeLabel ? (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">{rpeLabel}</span>
              ) : null}
            </div>
            <SessionFeedback note={note} />
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-[12px] font-semibold" onClick={onReply}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Répondre
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

