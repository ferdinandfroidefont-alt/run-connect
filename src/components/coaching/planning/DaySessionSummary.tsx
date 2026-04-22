import { cn } from "@/lib/utils";
import { Bike, Dumbbell, Footprints, Moon, Waves, Zap } from "lucide-react";

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
  const sessionType = detectSessionType(summary);
  const blocks = buildMiniSchema(sessionType);
  const SportIcon = iconForSession(summary);
  const isRest = sessionType === "rest";

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 h-10 w-1 shrink-0" style={{ backgroundColor: accentColor }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <SportIcon className="h-3.5 w-3.5 text-slate-500" />
          <p className="truncate text-[14px] font-semibold text-foreground">{summary.title}</p>
        </div>
        {isRest ? (
          <div className="mt-1.5 h-9 w-full border-b border-dashed border-slate-300" />
        ) : (
          <div className="mt-1.5 flex h-9 w-full items-end gap-1 px-1">
            {blocks.map((block, idx) => (
              <span
                key={`${block.color}-${idx}`}
                className="shrink-0"
                style={{
                  width: `${block.width}%`,
                  minWidth: "8px",
                  height: `${block.height}px`,
                  backgroundColor: block.color,
                  borderRadius: "6px",
                }}
              />
            ))}
          </div>
        )}
        <p className={cn("mt-1 truncate text-[12px] text-muted-foreground", !details && "opacity-0")}>
          {details || "Aucune donnée"}
        </p>
      </div>
    </div>
  );
}

type MiniBlock = { width: number; height: number; color: string };
type SessionType = "endurance" | "interval" | "tempo" | "recovery" | "progressive" | "rest";

function detectSessionType(summary: SessionSummaryView): SessionType {
  const text = `${summary.title} ${summary.intensityLabel || ""}`.toLowerCase();
  if (text.includes("repos")) return "rest";
  if (text.includes("fraction") || text.includes("interval")) return "interval";
  if (text.includes("tempo") || text.includes("seuil")) return "tempo";
  if (text.includes("progress")) return "progressive";
  if (text.includes("recup") || text.includes("récup")) return "recovery";
  return "endurance";
}

function buildMiniSchema(type: SessionType): MiniBlock[] {
  switch (type) {
    case "interval":
      return [
        { width: 10, height: 10, color: "#22C55E" },
        { width: 14, height: 30, color: "#F97316" },
        { width: 10, height: 10, color: "#22C55E" },
        { width: 14, height: 30, color: "#F97316" },
        { width: 10, height: 10, color: "#22C55E" },
        { width: 14, height: 30, color: "#F97316" },
      ];
    case "tempo":
      return [
        { width: 14, height: 10, color: "#9CA3AF" },
        { width: 52, height: 26, color: "#8B5CF6" },
        { width: 14, height: 10, color: "#9CA3AF" },
      ];
    case "progressive":
      return [
        { width: 12, height: 10, color: "#9CA3AF" },
        { width: 12, height: 14, color: "#60A5FA" },
        { width: 12, height: 18, color: "#60A5FA" },
        { width: 12, height: 22, color: "#8B5CF6" },
        { width: 12, height: 26, color: "#8B5CF6" },
        { width: 12, height: 30, color: "#F97316" },
      ];
    case "recovery":
      return [
        { width: 14, height: 8, color: "#9CA3AF" },
        { width: 46, height: 12, color: "#22C55E" },
        { width: 14, height: 8, color: "#9CA3AF" },
      ];
    case "rest":
      return [];
    default:
      return [
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
        { width: 12, height: 16, color: "#60A5FA" },
      ];
  }
}

function iconForSession(summary: SessionSummaryView) {
  const text = `${summary.title} ${summary.intensityLabel || ""}`.toLowerCase();
  if (text.includes("velo") || text.includes("vélo") || text.includes("cycling")) return Bike;
  if (text.includes("natation") || text.includes("swim")) return Waves;
  if (text.includes("renfo") || text.includes("muscu") || text.includes("strength")) return Dumbbell;
  if (text.includes("fraction") || text.includes("interval")) return Zap;
  if (text.includes("repos")) return Moon;
  return Footprints;
}

