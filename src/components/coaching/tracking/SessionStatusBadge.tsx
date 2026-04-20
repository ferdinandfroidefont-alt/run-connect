import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

type SessionStatus = "pending" | "done" | "missed";

interface SessionStatusBadgeProps {
  status: SessionStatus;
}

const STATUS_UI: Record<
  SessionStatus,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  done: {
    label: "Réalisée",
    icon: CheckCircle2,
    className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  missed: {
    label: "Non réalisée",
    icon: XCircle,
    className: "bg-red-500/12 text-red-700 dark:text-red-300",
  },
  pending: {
    label: "En attente",
    icon: Clock3,
    className: "bg-zinc-500/12 text-zinc-700 dark:text-zinc-300",
  },
};

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const conf = STATUS_UI[status];
  const Icon = conf.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", conf.className)}>
      <Icon className="h-3.5 w-3.5" />
      {conf.label}
    </span>
  );
}

