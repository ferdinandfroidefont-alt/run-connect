import { DayEmptyStateInline } from "@/components/coaching/planning/DayEmptyStateInline";
import { DaySessionSummary, type SessionSummaryView } from "@/components/coaching/planning/DaySessionSummary";
import { SessionActionMenu } from "@/components/coaching/planning/SessionActionMenu";
import { SessionStatusAction } from "@/components/coaching/planning/SessionStatusAction";
import { cn } from "@/lib/utils";

interface DayPlanningRowProps {
  dayLabel: string;
  dateLabel: string;
  isSelected?: boolean;
  session?: SessionSummaryView;
  isSent?: boolean;
  accentColor?: string;
  emptyLabel?: string;
  onAdd: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onSend?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onUnsend?: () => void;
  allowSessionActions?: boolean;
  hideActionSlot?: boolean;
}

export function DayPlanningRow({
  dayLabel,
  dateLabel,
  isSelected = false,
  session,
  isSent = false,
  accentColor = "#9CA3AF",
  emptyLabel,
  onAdd,
  onOpen,
  onEdit,
  onSend,
  onDuplicate,
  onDelete,
  onUnsend,
  allowSessionActions = true,
  hideActionSlot = false,
}: DayPlanningRowProps) {
  return (
    <div
      className={cn(
        "border-b border-border bg-card px-4 py-3 transition-colors",
        isSelected && "bg-secondary/40"
      )}
    >
      <div className="grid grid-cols-[80px_minmax(0,1fr)_44px] items-center gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold capitalize text-foreground">{dayLabel}</p>
          <p className="truncate text-[11px] text-muted-foreground">{dateLabel}</p>
        </div>

        {session ? (
          <button type="button" onClick={onOpen} className="min-w-0 text-left">
            <DaySessionSummary summary={session} accentColor={accentColor} />
          </button>
        ) : (
          <DayEmptyStateInline label={emptyLabel} />
        )}

        <div className="flex items-center justify-end">
          {hideActionSlot ? null : !session ? (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionStatusAction mode="add" onAdd={onAdd} />
            </div>
          ) : isSent ? (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionStatusAction mode="sent" onSentClick={onUnsend} />
            </div>
          ) : (
            <div className={!allowSessionActions ? "pointer-events-none opacity-45" : undefined}>
              <SessionActionMenu
                onEdit={onEdit || onOpen || onAdd}
                onSend={onSend || onAdd}
                onDuplicate={onDuplicate || onAdd}
                onDelete={onDelete || onAdd}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

