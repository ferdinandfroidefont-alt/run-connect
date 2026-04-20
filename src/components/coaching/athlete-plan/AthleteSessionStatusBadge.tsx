import { cn } from "@/lib/utils";
import type { AthleteSessionUiStatus } from "./types";

const CONFIG: Record<
  AthleteSessionUiStatus,
  { label: string; className: string }
> = {
  planned: {
    label: "Prévue",
    className: "border-sky-400/40 bg-sky-500/12 text-sky-900 dark:text-sky-100",
  },
  confirmed: {
    label: "Confirmée",
    className: "border-amber-400/40 bg-amber-500/12 text-amber-950 dark:text-amber-100",
  },
  done: {
    label: "Réalisée",
    className: "border-emerald-400/40 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100",
  },
  missed: {
    label: "Non faite",
    className: "border-red-400/40 bg-red-500/12 text-red-950 dark:text-red-100",
  },
  conflict: {
    label: "Conflit",
    className: "border-violet-400/40 bg-violet-500/14 text-violet-950 dark:text-violet-100",
  },
};

export function AthleteSessionStatusBadge({
  status,
  className,
}: {
  status: AthleteSessionUiStatus;
  className?: string;
}) {
  const c = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        c.className,
        className
      )}
    >
      {c.label}
    </span>
  );
}
