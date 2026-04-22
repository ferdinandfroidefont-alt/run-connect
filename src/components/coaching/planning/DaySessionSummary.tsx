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
        <p className="truncate text-[13px] text-muted-foreground">{summary.subtitle || summary.sportHint || "Séance"}</p>
        <p className="truncate text-[14px] font-semibold text-foreground">{summary.title}</p>
        <div className="mt-1.5">
          <MiniWorkoutProfile blocks={summary.miniProfile} isRestDay={summary.isRestDay} compact />
        </div>
        <p className={cn("mt-1 truncate text-[12px] text-muted-foreground", !details && "opacity-0")}>{details || "Aucune donnée"}</p>
      </div>
    </div>
  );
}

