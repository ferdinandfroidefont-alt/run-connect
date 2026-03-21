import { rpeChipColor } from "@/lib/sessionBlockRpe";

interface Block {
  id?: string;
  type: string;
  duration?: string;
  intensity?: string;
  pace?: string;
  repetitions?: number;
  effortDuration?: string;
  effortType?: string;
  effortPace?: string;
  recoveryDuration?: string;
  recoveryType?: string;
  rpe?: number;
  recoveryRpe?: number;
}

const TYPE_LABELS: Record<string, string> = {
  warmup: "Échauffement",
  interval: "Fractionné",
  steady: "Bloc constant",
  cooldown: "Retour au calme",
  recovery: "Récupération",
};

function parseRecoverySeconds(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const n = parseInt(s.replace(/\D/g, ""), 10);
  if (Number.isNaN(n)) return null;
  if (/m/i.test(s) && !/s/i.test(s)) return n * 60;
  if (s.endsWith("s") || /^\d+$/.test(s)) return n;
  return n;
}

function formatStoredBlock(block: Block): string {
  if (block.type === "interval") {
    const reps = block.repetitions ?? "?";
    const ed = block.effortDuration ?? "?";
    const pace = block.effortPace ? ` @ ${block.effortPace}` : "";
    let rec = "";
    const rs = parseRecoverySeconds(block.recoveryDuration);
    if (rs != null) {
      const m = Math.floor(rs / 60);
      const sec = rs % 60;
      rec =
        m > 0
          ? ` — récup ${m}'${String(sec).padStart(2, "0")} ${block.recoveryType || "trot"}`
          : ` — récup ${rs}s ${block.recoveryType || "trot"}`;
    }
    return `${reps}×${ed}${pace}${rec}`;
  }
  const dur = block.duration != null ? `${block.duration} min` : "—";
  const pace = block.pace ? ` — ${block.pace}` : "";
  return `${dur}${pace}`;
}

export const CoachingBlocksPreview = ({ blocks }: { blocks: Block[] }) => {
  if (!blocks?.length) return null;

  return (
    <div className="space-y-ios-2">
      <p className="text-ios-footnote font-semibold text-muted-foreground uppercase tracking-wide">Structure</p>
      <div className="rounded-ios-lg border border-border divide-y divide-border overflow-hidden bg-card">
        {blocks.map((block, i) => {
          const typeLabel = TYPE_LABELS[block.type] || "Segment";
          const line = formatStoredBlock(block);
          return (
            <div key={block.id || i} className="px-ios-3 py-ios-3">
              <div className="flex flex-wrap items-baseline gap-x-ios-2 gap-y-0.5">
                <span className="text-ios-footnote font-semibold text-foreground">{typeLabel}</span>
                {typeof block.rpe === "number" && (
                  <span
                    className="text-ios-caption1 font-bold text-white rounded-ios-sm px-ios-1.5 py-0.5 tabular-nums"
                    style={{ backgroundColor: rpeChipColor(block.rpe) }}
                  >
                    RPE {block.rpe}
                  </span>
                )}
              </div>
              <p className="text-ios-subheadline text-foreground leading-snug mt-0.5">{line}</p>
              {block.type === "interval" && block.recoveryDuration && typeof block.recoveryRpe === "number" && (
                <p className="text-ios-caption1 text-muted-foreground mt-ios-1">
                  Récup entre reps —{" "}
                  <span className="font-semibold text-foreground tabular-nums">RPE {block.recoveryRpe}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
