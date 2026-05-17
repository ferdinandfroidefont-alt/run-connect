import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const SESSION_DETAIL_BG = "#F2F2F7";
export const SESSION_DETAIL_ACTION_BLUE = "#007AFF";

const AVATAR_GRADIENT_PALETTE = [
  "linear-gradient(135deg, #007AFF, #5AC8FA)",
  "linear-gradient(135deg, #34C759, #5AC8FA)",
  "linear-gradient(135deg, #FF9500, #FF3B30)",
  "linear-gradient(135deg, #AF52DE, #5856D6)",
  "linear-gradient(135deg, #FF2D55, #FF9500)",
  "linear-gradient(135deg, #FFCC00, #FF9500)",
  "linear-gradient(135deg, #5856D6, #AF52DE)",
  "linear-gradient(135deg, #34C759, #30D158)",
  "linear-gradient(135deg, #FF3B30, #FF2D55)",
  "linear-gradient(135deg, #00C7BE, #5AC8FA)",
];

export function gradientForLetter(letter: string): string {
  const code = (letter || "?").toUpperCase().charCodeAt(0) || 0;
  return AVATAR_GRADIENT_PALETTE[code % AVATAR_GRADIENT_PALETTE.length];
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export type MaquetteChartBlock = {
  id?: string;
  type: "continu" | "intervalle" | "pyramide";
  label?: string;
  zone?: string;
  repetitions?: number;
  blocs?: number;
  paliers?: { zone: string }[];
};

export function SessionDetailSectionTitle({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-5">
      <p className="m-0 text-[13px] font-black tracking-[-0.01em] text-[#0A0F1F]">{label}</p>
      {right}
    </div>
  );
}

export function BigActionButton({
  icon: Icon,
  label,
  primary,
  danger,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const bg = primary ? SESSION_DETAIL_ACTION_BLUE : danger ? "#FF3B3015" : "white";
  const fg = primary ? "white" : danger ? "#FF3B30" : "#0A0F1F";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-transform active:scale-[0.96] disabled:opacity-50"
      style={{
        padding: "14px 6px",
        background: bg,
        color: fg,
        boxShadow: primary
          ? "0 4px 14px rgba(0,122,255,0.3)"
          : danger
            ? "none"
            : "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)",
      }}
    >
      <Icon className="h-5 w-5" strokeWidth={2.4} />
      <span className="text-[13px] font-extrabold tracking-[-0.01em]">{label}</span>
    </button>
  );
}

export function SessionSchemaChart({ blocks }: { blocks: MaquetteChartBlock[] }) {
  if (!blocks.length) {
    return (
      <div
        className="flex items-center justify-center text-[13px] font-semibold text-[#C7C7CC]"
        style={{ height: 100 }}
      >
        Aucun schéma défini
      </div>
    );
  }

  const zoneHeight: Record<string, number> = { Z1: 22, Z2: 36, Z3: 52, Z4: 72, Z5: 92 };
  const zoneColor: Record<string, string> = {
    Z1: "#34C759",
    Z2: "#5AC8FA",
    Z3: "#FFCC00",
    Z4: "#FF9500",
    Z5: "#FF3B30",
  };

  const segments: { height: number; width: number; color: string; id: string }[] = [];

  blocks.forEach((b, bi) => {
    if (b.type === "continu") {
      segments.push({
        height: zoneHeight[b.zone ?? "Z2"] ?? 40,
        width: 4,
        color: zoneColor[b.zone ?? "Z2"] ?? SESSION_DETAIL_ACTION_BLUE,
        id: `${bi}-c`,
      });
    } else if (b.type === "intervalle") {
      const reps = b.repetitions ?? b.blocs ?? 6;
      for (let r = 0; r < reps; r++) {
        segments.push({ height: 90, width: 2.5, color: "#FF3B30", id: `${bi}-e${r}` });
        segments.push({ height: 20, width: 1.5, color: "#34C759", id: `${bi}-r${r}` });
      }
    } else if (b.type === "pyramide") {
      const paliers = b.paliers ?? [
        { zone: "Z3" },
        { zone: "Z4" },
        { zone: "Z5" },
        { zone: "Z4" },
        { zone: "Z3" },
      ];
      paliers.forEach((p, i) => {
        segments.push({
          height: zoneHeight[p.zone] ?? 50,
          width: 2.5,
          color: zoneColor[p.zone] ?? "#FF9500",
          id: `${bi}-p${i}`,
        });
        if (i < paliers.length - 1) {
          segments.push({ height: 20, width: 1, color: "#34C759", id: `${bi}-pr${i}` });
        }
      });
    } else {
      segments.push({ height: 55, width: 4, color: "#AF52DE", id: `${bi}-v` });
    }
  });

  const totalWidth = segments.reduce((s, x) => s + x.width, 0) || 1;
  const chartHeight = 110;
  const gap = 0.7;

  let cursor = 0;
  const placed = segments.map((s) => {
    const left = (cursor / totalWidth) * 100;
    const width = (s.width / totalWidth) * 100;
    cursor += s.width;
    return { ...s, left, width };
  });

  return (
    <div style={{ position: "relative", height: chartHeight + 24 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: chartHeight }}>
        {[20, 40, 60, 80].map((h) => (
          <div
            key={h}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: (h / 100) * chartHeight,
              borderTop: "1px dashed #E5E5EA",
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 24,
          height: chartHeight,
        }}
      >
        {placed.map((s) => (
          <div
            key={s.id}
            style={{
              position: "absolute",
              left: `calc(${s.left}% + ${gap / 2}px)`,
              width: `calc(${s.width}% - ${gap}px)`,
              bottom: 0,
              height: `${(s.height / 100) * chartHeight}px`,
              background: s.color,
              borderRadius: "4px 4px 2px 2px",
              boxShadow: `0 2px 6px ${s.color}40`,
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        <span className="text-[10.5px] font-bold tracking-[0.04em] text-[#8E8E93]">Début</span>
        <span className="text-[10.5px] font-bold tracking-[0.04em] text-[#8E8E93]">Fin</span>
      </div>
    </div>
  );
}
