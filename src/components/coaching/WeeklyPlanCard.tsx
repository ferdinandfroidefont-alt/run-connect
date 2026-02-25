import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, CheckCircle2 } from "lucide-react";
import { parseRCC, computeRCCSummary, type ParsedBlock } from "@/lib/rccParser";

interface SessionData {
  title: string;
  scheduled_at: string;
  rcc_code?: string | null;
  distance_km?: number | null;
  objective?: string | null;
  activity_type?: string;
  pace_target?: string | null;
}

interface WeeklyPlanCardProps {
  session: SessionData;
  isDone?: boolean;
  onCheck?: () => void;
  onNoteClick?: () => void;
  noteValue?: string;
  onClick?: () => void;
  showCheckbox?: boolean;
  disabled?: boolean;
}

function getActivityColor(title: string, activityType?: string): string {
  const t = (title + " " + (activityType || "")).toLowerCase();
  if (t.includes("vma") || t.includes("interval") || t.includes("fractionné")) return "bg-red-500";
  if (t.includes("seuil") || t.includes("tempo") || t.includes("threshold")) return "bg-orange-500";
  if (t.includes("récup") || t.includes("recup") || t.includes("recovery")) return "bg-emerald-400";
  if (t.includes("ppg") || t.includes("renforcement") || t.includes("musculation")) return "bg-purple-500";
  if (t.includes("spécifique") || t.includes("specific") || t.includes("compétition")) return "bg-purple-500";
  return "bg-green-500"; // EF / footing / default
}

function formatRCCHumanReadable(blocks: ParsedBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "interval" && b.repetitions) {
      const effort = b.distance ? `${b.distance}m` : b.duration ? `${b.duration}'` : "";
      const pace = b.pace || "";
      let recovery = "";
      if (b.recoveryDuration) {
        const min = Math.floor(b.recoveryDuration / 60);
        const sec = b.recoveryDuration % 60;
        recovery = min > 0 ? ` (r${min}'${sec.toString().padStart(2, "0")})` : ` (r${b.recoveryDuration}")`;
      }
      parts.push(`${b.repetitions}×${effort} @ ${pace}${recovery}`);
    } else if (b.duration) {
      if (b.pace) {
        parts.push(`${b.duration}' @ ${b.pace}`);
      } else {
        parts.push(`${b.duration}'`);
      }
    }
  }
  return parts.join(" + ");
}

export const WeeklyPlanCard = ({
  session,
  isDone = false,
  onCheck,
  onNoteClick,
  noteValue,
  onClick,
  showCheckbox = true,
  disabled = false,
}: WeeklyPlanCardProps) => {
  const dayLabel = format(new Date(session.scheduled_at), "EEE", { locale: fr }).toUpperCase().replace(".", "");
  const colorClass = getActivityColor(session.title, session.activity_type);

  const { detail, estimatedDuration } = useMemo(() => {
    if (session.rcc_code) {
      const { blocks } = parseRCC(session.rcc_code);
      if (blocks.length > 0) {
        const summary = computeRCCSummary(blocks);
        return {
          detail: formatRCCHumanReadable(blocks),
          estimatedDuration: summary.totalDurationMin,
        };
      }
    }
    // Fallback
    let fallback = "";
    if (session.distance_km) fallback += `${session.distance_km} km`;
    if (session.pace_target) fallback += (fallback ? " @ " : "") + session.pace_target;
    if (session.objective && !fallback) fallback = session.objective;
    return { detail: fallback, estimatedDuration: 0 };
  }, [session.rcc_code, session.distance_km, session.pace_target, session.objective]);

  return (
    <div
      className={`bg-card rounded-xl px-3 py-3 transition-colors ${onClick ? "cursor-pointer active:bg-secondary" : ""} ${isDone ? "opacity-75" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {showCheckbox && onCheck && (
          <div className="pt-0.5">
            <Checkbox
              checked={isDone}
              onCheckedChange={() => onCheck()}
              className="h-5 w-5 rounded-full"
              disabled={disabled}
            />
          </div>
        )}

        {/* Day label */}
        <div className="w-9 flex-shrink-0 pt-0.5">
          <span className="text-[13px] font-bold text-muted-foreground">{dayLabel}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`text-[15px] font-semibold leading-tight ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {session.title}
            </p>
            {estimatedDuration > 0 && (
              <span className="text-[13px] font-medium text-muted-foreground flex-shrink-0 ml-2">
                {estimatedDuration}'
              </span>
            )}
          </div>
          {detail && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`h-2 w-2 rounded-full ${colorClass} flex-shrink-0`} />
              <p className={`text-[13px] leading-tight ${isDone ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                {detail}
              </p>
            </div>
          )}
        </div>

        {/* Note button or done badge */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isDone && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {onNoteClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onNoteClick(); }}
              className="p-1 rounded-md hover:bg-secondary transition-colors"
            >
              <Pencil className={`h-3.5 w-3.5 ${noteValue ? "text-primary" : "text-muted-foreground/40"}`} />
            </button>
          )}
        </div>
      </div>

      {/* Inline note preview */}
      {noteValue && !isDone && (
        <p
          className="text-[12px] text-muted-foreground italic mt-1.5 ml-12 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onNoteClick?.(); }}
        >
          "{noteValue}"
        </p>
      )}
    </div>
  );
};
