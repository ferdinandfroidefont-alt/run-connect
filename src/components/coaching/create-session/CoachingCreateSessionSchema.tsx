import { forwardRef, type ReactNode } from "react";
import { COACHING_ACTION_BLUE } from "./CoachingWheelPickers";

export const COACHING_PAGE_BG = "#F2F2F7";

export type PaletteBlockId = "continu" | "intervalle" | "pyramide" | "variation";

export const COACHING_SEANCE_SPORTS: Array<{ id: string; emoji: string; bg: string; activityValue: string }> = [
  { id: "course", emoji: "🏃", bg: COACHING_ACTION_BLUE, activityValue: "course" },
  { id: "velo", emoji: "🚴", bg: "#FF3B30", activityValue: "velo" },
  { id: "natation", emoji: "🏊", bg: "#5AC8FA", activityValue: "natation" },
  { id: "muscu", emoji: "💪", bg: "#FF9500", activityValue: "musculation" },
];

export const COACHING_BLOCK_PALETTE: Array<{
  id: PaletteBlockId;
  label: string;
  color: string;
  emoji: string;
  /** Fragment RCC ajouté au drag / clic maquette */
  rccInsert: string;
  icon: ReactNode;
}> = [
  {
    id: "continu",
    label: "Continu",
    color: "#34C759",
    emoji: "=",
    rccInsert: "27'>5'30",
    icon: (
      <svg width="44" height="20" viewBox="0 0 44 20" aria-hidden>
        <rect x="2" y="8" width="40" height="4" rx="2" fill="#007AFF" />
      </svg>
    ),
  },
  {
    id: "intervalle",
    label: "Intervalle",
    color: COACHING_ACTION_BLUE,
    emoji: "⚡",
    rccInsert: "3x1000>3'30 r1'15>trot",
    icon: (
      <svg width="44" height="24" viewBox="0 0 44 24" aria-hidden>
        <rect x="2" y="14" width="6" height="8" rx="1" fill="#FF9500" />
        <rect x="11" y="6" width="6" height="16" rx="1" fill="#FF9500" />
        <rect x="20" y="14" width="6" height="8" rx="1" fill="#8E8E93" />
        <rect x="29" y="6" width="6" height="16" rx="1" fill="#FF9500" />
        <rect x="38" y="14" width="4" height="8" rx="1" fill="#FF9500" />
      </svg>
    ),
  },
  {
    id: "pyramide",
    label: "Pyramide",
    color: "#FF9500",
    emoji: "▲",
    rccInsert: "200>5'30, 400>5'00, 600>4'40, 400>5'00, 200>5'30",
    icon: (
      <svg width="44" height="24" viewBox="0 0 44 24" aria-hidden>
        <rect x="2" y="18" width="6" height="4" rx="1" fill="#34C759" />
        <rect x="11" y="12" width="6" height="10" rx="1" fill="#FFCC00" />
        <rect x="20" y="4" width="6" height="18" rx="1" fill="#FF3B30" />
        <rect x="29" y="12" width="6" height="10" rx="1" fill="#FFCC00" />
        <rect x="38" y="18" width="4" height="4" rx="1" fill="#34C759" />
      </svg>
    ),
  },
  {
    id: "variation",
    label: "Variation",
    color: "#AF52DE",
    emoji: "📈",
    rccInsert: "30'>7'00",
    icon: (
      <svg width="44" height="24" viewBox="0 0 44 24" aria-hidden>
        <rect x="2" y="18" width="6" height="4" rx="1" fill="#8E8E93" />
        <rect x="11" y="14" width="6" height="8" rx="1" fill="#34C759" />
        <rect x="20" y="8" width="6" height="14" rx="1" fill="#007AFF" />
        <rect x="29" y="4" width="6" height="18" rx="1" fill="#FFCC00" />
        <rect x="38" y="2" width="4" height="20" rx="1" fill="#FF3B30" />
      </svg>
    ),
  },
];

const ZONE_COLOR: Record<number, string> = {
  1: "#8E8E93",
  2: "#007AFF",
  3: "#34C759",
  4: "#FFCC00",
  5: "#FF9500",
  6: "#FF3B30",
};

const zoneHeight = (z: number) => Math.max(4, ((z - 1) / 5) * 100);

export function blockBars(type: PaletteBlockId | string, _mode?: string) {
  switch (type) {
    case "continu":
      return [{ z: 3, w: 1 }];
    case "intervalle":
      return [
        { z: 2, w: 0.6 },
        { z: 5, w: 1 },
        { z: 2, w: 0.6 },
        { z: 5, w: 1 },
        { z: 2, w: 0.6 },
        { z: 5, w: 1 },
        { z: 2, w: 0.6 },
      ];
    case "pyramide":
      return [
        { z: 2, w: 1 },
        { z: 4, w: 1 },
        { z: 6, w: 1 },
        { z: 4, w: 1 },
        { z: 2, w: 1 },
      ];
    case "variation":
      return [
        { z: 1, w: 1 },
        { z: 2, w: 1 },
        { z: 3, w: 1 },
        { z: 4, w: 1 },
        { z: 5, w: 1 },
        { z: 6, w: 1 },
      ];
    default:
      return [];
  }
}

export function BlockPreviewBars({ type, size = "md" }: { type: PaletteBlockId | string; size?: "sm" | "md" | "lg" }) {
  const bars = blockBars(type);
  const dims =
    size === "sm"
      ? { w: 36, h: 22, gap: 1.5, radius: 2 }
      : size === "lg"
        ? { w: 60, h: 36, gap: 3, radius: 3 }
        : { w: 44, h: 28, gap: 2, radius: 2.5 };

  return (
    <div
      style={{
        width: dims.w,
        height: dims.h,
        display: "flex",
        gap: dims.gap,
        alignItems: "flex-end",
      }}
    >
      {bars.map((bar, i) => {
        const color = ZONE_COLOR[bar.z];
        const h = Math.max(14, ((bar.z - 1) / 5) * 100);
        return (
          <div
            key={i}
            style={{
              flex: bar.w,
              height: `${h}%`,
              background: `linear-gradient(180deg, ${color} 0%, ${color}E6 100%)`,
              borderTopLeftRadius: dims.radius,
              borderTopRightRadius: dims.radius,
              borderBottomLeftRadius: 1,
              borderBottomRightRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
}

export type SchemaChartBlock = { id: string; type: PaletteBlockId | string };

export const CoachingSchemaChart = forwardRef<HTMLDivElement, { blocks: SchemaChartBlock[]; dragOver?: boolean }>(
  function CoachingSchemaChart({ blocks, dragOver }, ref) {
    const zones = [6, 5, 4, 3, 2, 1];

    return (
      <div
        ref={ref}
        style={{
          background: dragOver ? "#E5F0FF" : "white",
          borderRadius: 20,
          boxShadow: dragOver ? `0 0 0 2px ${COACHING_ACTION_BLUE}` : "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
          transition: "background 0.2s ease-out, box-shadow 0.2s ease-out",
          padding: "18px 16px 14px 10px",
        }}
      >
        <div className="relative" style={{ height: 220 }}>
          {zones.map((zNum, i) => (
            <div
              key={zNum}
              className="absolute left-0 right-0 flex items-center gap-2.5"
              style={{
                top: `${(i / (zones.length - 1)) * 100}%`,
                transform: "translateY(-50%)",
              }}
            >
              <div className="flex w-9 flex-shrink-0 items-center gap-1.5 pl-1">
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: ZONE_COLOR[zNum],
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8E8E93",
                    letterSpacing: "0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Z{zNum}
                </span>
              </div>
              <div
                className="flex-1"
                style={{
                  borderTop: i === zones.length - 1 ? "1px solid #D1D1D6" : "1px dashed rgba(60, 60, 67, 0.12)",
                }}
              />
            </div>
          ))}

          {blocks.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: 44,
                right: 4,
                top: 0,
                bottom: 0,
                display: "flex",
                gap: 3,
                alignItems: "flex-end",
              }}
            >
              {blocks.map((b) => {
                const bars = blockBars(b.type as PaletteBlockId);
                const totalW = bars.reduce((s, x) => s + x.w, 0) || 1;
                return (
                  <div
                    key={b.id}
                    style={{
                      flex: totalW,
                      height: "100%",
                      display: "flex",
                      gap: 3,
                      alignItems: "flex-end",
                    }}
                  >
                    {bars.map((bar, i) => {
                      const color = ZONE_COLOR[bar.z];
                      return (
                        <div
                          key={i}
                          style={{
                            flex: bar.w,
                            height: `${zoneHeight(bar.z)}%`,
                            background: `linear-gradient(180deg, ${color} 0%, ${color} 60%, ${color}E6 100%)`,
                            borderTopLeftRadius: 5,
                            borderTopRightRadius: 5,
                            borderBottomLeftRadius: 2,
                            borderBottomRightRadius: 2,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 2px rgba(0,0,0,0.04)",
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {blocks.length === 0 && !dragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p style={{ fontSize: 13, fontWeight: 500, color: "#C7C7CC" }}>Glisse un bloc ici pour commencer</p>
            </div>
          )}

          {dragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                style={{
                  background: "white",
                  padding: "8px 16px",
                  borderRadius: 9999,
                  boxShadow: `0 2px 8px ${COACHING_ACTION_BLUE}40, 0 0 0 1.5px ${COACHING_ACTION_BLUE}`,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: COACHING_ACTION_BLUE }}>Relâche pour ajouter</p>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingLeft: 44,
            paddingRight: 4,
            marginTop: 6,
          }}
        >
          {["0:00", "0:15", "0:30", "0:45", "1:00"].map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#8E8E93",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.01em",
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <p
          style={{
            textAlign: "right",
            fontSize: 10,
            fontWeight: 700,
            color: "#C7C7CC",
            letterSpacing: "0.1em",
            marginTop: 4,
            paddingRight: 4,
          }}
        >
          TEMPS
        </p>
      </div>
    );
  }
);
