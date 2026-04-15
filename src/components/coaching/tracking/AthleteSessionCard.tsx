import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { SessionStatusBadge } from "@/components/coaching/tracking/SessionStatusBadge";
import { SessionFeedback } from "@/components/coaching/tracking/SessionFeedback";

interface AthleteSessionCardProps {
  dayLabel: string;
  dateLabel: string;
  title: string;
  details: string;
  status: "pending" | "done" | "missed";
  note: string | null;
  rpeLabel?: string;
  objective?: string | null;
  onReply: () => void;
}

export function AthleteSessionCard({
  dayLabel,
  dateLabel,
  title,
  details,
  status,
  note,
  rpeLabel,
  objective,
  onReply,
}: AthleteSessionCardProps) {
  return (
    <div className="ios-card border border-border/60 bg-card px-3 py-2.5">
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-2.5">
        <div>
          <p className="text-[12px] font-semibold text-foreground uppercase">{dayLabel}</p>
          <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
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
        <SessionStatusBadge status={status} />
      </div>

      <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2.5">
        <SessionFeedback note={note} rpeLabel={rpeLabel} />
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-[12px] font-semibold" onClick={onReply}>
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Répondre
        </Button>
      </div>
    </div>
  );
}

