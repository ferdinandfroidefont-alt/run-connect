import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { cn } from "@/lib/utils";
import type { MiniProfileBlock } from "@/lib/workoutVisualization";

export interface SessionSummaryView {
  title: string;
  duration?: string;
  distance?: string;
  intensityLabel?: string;
  subtitle?: string;
  sportHint?: "running" | "cycling" | "swimming" | "strength" | "other";
  isRestDay?: boolean;
  miniProfile?: MiniProfileBlock[];
}

interface DaySessionSummaryProps {
  summary: SessionSummaryView;
  accentColor: string;
}

export function DaySessionSummary({ summary, accentColor }: DaySessionSummaryProps) {
  const details = [summary.duration, summary.distance, summary.intensityLabel].filter(Boolean).join(" • ");

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-foreground">
          <span aria-hidden="true" className="shrink-0 text-[13px] leading-none" style={{ color: accentColor }}>
            👟
          </span>
          <span className="truncate">{summary.title}</span>
        </p>
        <div className="mt-2">
          <MiniWorkoutProfile
            blocks={summary.miniProfile}
            isRestDay={summary.isRestDay}
            compact
            variant="premiumCompact"
            zoneBandMode
            className="h-7 rounded-none border-0 bg-transparent px-0 py-0"
          />
        </div>
        <p className={cn("mt-1 truncate text-[12px] text-muted-foreground", !details && "opacity-0")}>{details || "Aucune donnée"}</p>
      </div>
    </div>
  );
}

