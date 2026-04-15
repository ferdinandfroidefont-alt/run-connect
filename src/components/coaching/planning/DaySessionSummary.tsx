import { cn } from "@/lib/utils";

export interface SessionSummaryView {
  title: string;
  duration?: string;
  distance?: string;
  intensityLabel?: string;
}

interface DaySessionSummaryProps {
  summary: SessionSummaryView;
  accentColor: string;
}

export function DaySessionSummary({ summary, accentColor }: DaySessionSummaryProps) {
  const details = [summary.duration, summary.distance, summary.intensityLabel].filter(Boolean).join(" • ");

  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-foreground">{summary.title}</p>
        <p className={cn("truncate text-[12px] text-muted-foreground", !details && "opacity-0")}>{details || "Aucune donnée"}</p>
      </div>
    </div>
  );
}

