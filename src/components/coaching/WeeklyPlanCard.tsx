import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, CheckCircle2, Clock, ChevronRight } from "lucide-react";
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

function getActivityEmoji(activityType?: string): string {
  switch (activityType) {
    case "trail": return "⛰️";
    case "cycling": return "🚴";
    case "swimming": return "🏊";
    case "walking": return "🚶";
    default: return "🏃";
  }
}

function getActivityColor(title: string, activityType?: string): string {
  const t = (title + " " + (activityType || "")).toLowerCase();
  if (t.includes("vma") || t.includes("interval") || t.includes("fractionné")) return "bg-red-500";
  if (t.includes("seuil") || t.includes("tempo") || t.includes("threshold")) return "bg-orange-500";
  if (t.includes("récup") || t.includes("recup") || t.includes("recovery")) return "bg-emerald-400";
  if (t.includes("ppg") || t.includes("renforcement") || t.includes("musculation")) return "bg-purple-500";
  if (t.includes("spécifique") || t.includes("specific") || t.includes("compétition")) return "bg-purple-500";
  return "bg-green-500";
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
  const dayLabel = format(new Date(session.scheduled_at), "EEE d", { locale: fr });
  const colorClass = getActivityColor(session.title, session.activity_type);

  const { detail, estimatedDuration, estimatedDistance } = useMemo(() => {
    if (session.rcc_code) {
      const { blocks } = parseRCC(session.rcc_code);
      if (blocks.length > 0) {
        const summary = computeRCCSummary(blocks);
        return {
          detail: formatRCCHumanReadable(blocks),
          estimatedDuration: summary.totalDurationMin,
          estimatedDistance: summary.totalDistanceKm,
        };
      }
    }
    let fallback = "";
    if (session.distance_km) fallback += `${session.distance_km} km`;
    if (session.pace_target) fallback += (fallback ? " @ " : "") + session.pace_target;
    if (session.objective && !fallback) fallback = session.objective;
    return { detail: fallback, estimatedDuration: 0, estimatedDistance: session.distance_km || 0 };
  }, [session.rcc_code, session.distance_km, session.pace_target, session.objective]);

  return (
    <div
      className={`bg-card rounded-2xl overflow-hidden transition-all border border-border/30 ${
        onClick ? "cursor-pointer active:scale-[0.98]" : ""
      } ${isDone ? "opacity-80" : ""}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox or status */}
          {showCheckbox && onCheck ? (
            <button
              onClick={(e) => { e.stopPropagation(); onCheck(); }}
              disabled={disabled}
              className={`mt-0.5 h-7 w-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isDone
                  ? "bg-green-500 border-green-500"
                  : "border-muted-foreground/30 hover:border-primary"
              }`}
            >
              {isDone && <CheckCircle2 className="h-5 w-5 text-white" />}
            </button>
          ) : isDone ? (
            <div className="mt-0.5 h-7 w-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className={`mt-0.5 h-7 w-7 rounded-xl ${colorClass}/15 flex items-center justify-center flex-shrink-0`}>
              <span className="text-[14px]">{getActivityEmoji(session.activity_type)}</span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {dayLabel}
                </p>
                <p className={`text-[16px] font-semibold leading-tight mt-0.5 ${
                  isDone ? "line-through text-muted-foreground" : "text-foreground"
                }`}>
                  {session.title}
                </p>
              </div>

              {/* Duration / distance badges */}
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                {estimatedDuration > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground bg-secondary rounded-lg px-2 py-1">
                    <Clock className="h-3 w-3" />
                    {estimatedDuration}'
                  </span>
                )}
                {estimatedDistance > 0 && (
                  <span className="text-[12px] font-semibold text-primary bg-primary/10 rounded-lg px-2 py-1">
                    {Math.round(estimatedDistance * 10) / 10} km
                  </span>
                )}
              </div>
            </div>

            {/* Detail */}
            {detail && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`h-2.5 w-2.5 rounded-full ${colorClass} flex-shrink-0`} />
                <p className={`text-[13px] leading-snug ${
                  isDone ? "text-muted-foreground/50" : "text-muted-foreground"
                }`}>
                  {detail}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Note area or note button */}
        {(noteValue || onNoteClick) && (
          <div className="mt-3 ml-10">
            {noteValue ? (
              <div
                className="bg-secondary/50 rounded-xl px-3 py-2.5 cursor-pointer active:bg-secondary transition-colors"
                onClick={(e) => { e.stopPropagation(); onNoteClick?.(); }}
              >
                <p className="text-[12px] text-muted-foreground italic leading-snug">
                  💬 {noteValue}
                </p>
              </div>
            ) : onNoteClick ? (
              <button
                onClick={(e) => { e.stopPropagation(); onNoteClick(); }}
                className="flex items-center gap-1.5 text-[13px] text-muted-foreground/60 hover:text-primary transition-colors py-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                Ajouter une note
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
