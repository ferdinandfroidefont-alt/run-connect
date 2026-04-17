import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AthleteConflictBanner({
  message,
  onView,
  onMessageCoach,
  className,
}: {
  message: string;
  onView?: () => void;
  onMessageCoach?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-violet-950 shadow-sm dark:text-violet-50",
        className
      )}
    >
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
        <p className="text-[13px] font-medium leading-snug">{message}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onView ? (
          <Button type="button" variant="secondary" size="sm" className="h-9 rounded-xl" onClick={onView}>
            Voir le conflit
          </Button>
        ) : null}
        {onMessageCoach ? (
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border-violet-400/40" onClick={onMessageCoach}>
            Message coach
          </Button>
        ) : null}
      </div>
    </div>
  );
}
