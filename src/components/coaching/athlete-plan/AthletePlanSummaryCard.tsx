import { cn } from "@/lib/utils";
import type { AthleteWeekSummary } from "./types";

type Props = {
  summary: AthleteWeekSummary;
  className?: string;
};

export function AthletePlanSummaryCard({ summary, className }: Props) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-border/80 bg-card p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBlock label="Km prévus" value={`${summary.plannedKm}`} unit="km" />
        <StatBlock label="Km réalisés" value={`${summary.completedKm}`} unit="km" accent />
        <StatBlock label="Séances" value={`${summary.plannedSessions}`} />
        <StatBlock label="Confirmées" value={`${summary.confirmedSessions}`} />
        <StatBlock label="Coachs actifs" value={`${summary.activeCoaches}`} />
      </div>
      <p
        className={cn(
          "mt-4 text-center text-[12px] font-medium text-muted-foreground",
          summary.trendTone === "busy" && "text-amber-700 dark:text-amber-300",
          summary.trendTone === "light" && "text-emerald-700 dark:text-emerald-300",
          summary.trendTone === "up" && "text-sky-700 dark:text-sky-300",
          summary.trendTone === "down" && "text-muted-foreground"
        )}
      >
        {summary.trendLabel}
      </p>
      {summary.bySport.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Volume par sport</p>
          <div className="flex flex-col gap-1">
            {summary.bySport.map((row) => (
              <div key={row.sport} className="flex items-center justify-between text-[13px]">
                <span className="text-foreground">{row.label}</span>
                <span className="font-medium tabular-nums text-muted-foreground">{row.volumeText}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatBlock({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-secondary/40 px-3 py-2.5",
        accent && "border-primary/25 bg-primary/8"
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[22px] font-bold tabular-nums leading-none tracking-tight text-foreground">
        {value}
        {unit ? <span className="ml-0.5 text-[14px] font-semibold text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}
