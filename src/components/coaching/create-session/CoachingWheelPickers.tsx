import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const COACHING_ACTION_BLUE = "#007AFF";

export type TimeWheelValue = { h: number; m: number; s: number };
export type PaceWheelValue = { m: number; s: number };
export type DistanceWheelValue = { km: number; m: number };

export function parsePaceWheel(str: string | undefined | null): PaceWheelValue {
  if (!str) return { m: 5, s: 0 };
  const match = String(str).match(/(\d+)['′](\d+)/);
  if (match) return { m: +match[1], s: +match[2] };
  const m2 = String(str).match(/^(\d+)$/);
  if (m2) return { m: +m2[1], s: 0 };
  return { m: 5, s: 0 };
}

/** Affichage type maquette `5'30` */
export function formatPaceWheel(v: PaceWheelValue): string {
  return `${v.m}'${String(v.s).padStart(2, "0")}`;
}

export function paceColonToWheel(paceColon: string | undefined | null): PaceWheelValue {
  if (!paceColon) return { m: 5, s: 0 };
  const [mm, ss = "0"] = paceColon.split(":").map((x) => x.trim());
  return { m: Number.parseInt(mm, 10) || 0, s: Number.parseInt(ss, 10) || 0 };
}

export function wheelToColon(v: PaceWheelValue): string {
  return `${v.m}:${String(v.s).padStart(2, "0")}`;
}

export function parseDistanceWheel(str: string | undefined | null): DistanceWheelValue {
  if (!str) return { km: 0, m: 0 };
  const s = String(str).trim().toLowerCase();

  const mOnly = s.match(/^(\d+)\s*m\s*$/);
  if (mOnly) {
    const totalM = +mOnly[1];
    return { km: Math.floor(totalM / 1000), m: totalM % 1000 };
  }

  const kmMatch = s.match(/^(\d+)(?:[.,](\d+))?\s*km/);
  if (kmMatch) {
    const km = +kmMatch[1];
    const decStr = kmMatch[2] ? (kmMatch[2] + "00").substring(0, 3) : "0";
    return { km, m: parseInt(decStr, 10) };
  }

  const num = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (num) {
    const val = parseFloat(num[1].replace(",", "."));
    const km = Math.floor(val);
    const m = Math.round((val - km) * 1000);
    return { km, m };
  }

  return { km: 0, m: 0 };
}

export function formatDistanceWheel(v: DistanceWheelValue): string {
  if (v.km === 0 && v.m === 0) return "";
  if (v.km === 0) return `${v.m} m`;
  if (v.m === 0) return `${v.km} km`;
  const trimmed = String(v.m).padStart(3, "0").replace(/0+$/, "");
  return `${v.km},${trimmed} km`;
}

function WheelModalChrome({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div
      className="relative fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}
    >
      {children}
      <style>{`
        .coaching-wheel-scroll::-webkit-scrollbar { display: none; }
        .coaching-wheel-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes coachingWheelFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
}

function WheelColumn({
  unit,
  value,
  max,
  onChange,
  formatValue,
}: {
  unit: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
  formatValue?: (n: number) => string;
}) {
  const ITEM_HEIGHT = 44;
  const VISIBLE = 5;
  const PADDING = ((VISIBLE - 1) / 2) * ITEM_HEIGHT;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const target = value * ITEM_HEIGHT;
    if (Math.abs(containerRef.current.scrollTop - target) > 2) {
      syncingRef.current = true;
      containerRef.current.scrollTop = target;
      setTimeout(() => {
        syncingRef.current = false;
      }, 60);
    }
  }, [value, max]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (syncingRef.current) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const idx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(max, idx));
      if (clamped !== value) onChange(clamped);
    }, 80);
  };

  const defaultPad = unit === "h" ? 1 : 2;
  const format = formatValue ?? ((n: number) => String(n).padStart(defaultPad, "0"));

  return (
    <div className="relative" style={{ height: VISIBLE * ITEM_HEIGHT }}>
      <div
        className="pointer-events-none absolute"
        style={{
          left: 0,
          right: 0,
          top: PADDING,
          height: ITEM_HEIGHT,
          background: `${COACHING_ACTION_BLUE}0D`,
          borderRadius: 12,
          border: `1.5px solid ${COACHING_ACTION_BLUE}55`,
        }}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="coaching-wheel-scroll box-border h-full overflow-y-scroll"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          paddingTop: PADDING,
          paddingBottom: PADDING,
        }}
      >
        {Array.from({ length: max + 1 }, (_, i) => {
          const isSelected = i === value;
          const dist = Math.abs(i - value);
          const opacity = isSelected ? 1 : Math.max(0.25, 1 - dist * 0.3);
          const scale = isSelected ? 1 : Math.max(0.78, 1 - dist * 0.08);
          return (
            <div
              key={i}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? "#0A0F1F" : "#8E8E93",
                  opacity,
                  transform: `scale(${scale})`,
                  transformOrigin: "center",
                  transition: "transform 0.15s ease-out, font-weight 0.15s, color 0.15s, opacity 0.15s",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {format(i)}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isSelected ? "#0A0F1F" : "#8E8E93",
                  opacity,
                }}
              >
                {unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimeWheelPicker({
  title,
  value,
  onClose,
  onConfirm,
}: {
  title: string;
  value: TimeWheelValue;
  onClose: () => void;
  onConfirm: (v: TimeWheelValue) => void;
}) {
  const [h, setH] = useState(value.h || 0);
  const [m, setM] = useState(value.m || 0);
  const [s, setS] = useState(value.s || 0);

  return (
    <WheelModalChrome>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/40" style={{ animation: "coachingWheelFadeIn 0.2s ease-out" }} onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[360px] overflow-hidden bg-white"
        style={{
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div className="pb-3 pt-5 text-center">
          <p className="text-[18px] font-extrabold text-[#0A0F1F]">{title}</p>
        </div>

        <div className="px-3 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <WheelColumn unit="h" value={h} max={23} onChange={setH} />
            <WheelColumn unit="m" value={m} max={59} onChange={setM} />
            <WheelColumn unit="s" value={s} max={59} onChange={setS} />
          </div>
        </div>

        <div className="flex border-t border-[#E5E5EA]">
          <button type="button" onClick={onClose} className="flex-1 py-3.5 text-[16px] font-semibold text-[#0A0F1F]">
            Annuler
          </button>
          <div className="w-px bg-[#E5E5EA]" />
          <button
            type="button"
            onClick={() => onConfirm({ h, m, s })}
            className="flex-1 py-3.5 text-[16px] font-bold"
            style={{ color: COACHING_ACTION_BLUE }}
          >
            OK
          </button>
        </div>
      </div>
    </WheelModalChrome>
  );
}

export function PaceWheelPicker({
  title,
  value,
  onClose,
  onConfirm,
}: {
  title: string;
  value: PaceWheelValue;
  onClose: () => void;
  onConfirm: (v: PaceWheelValue) => void;
}) {
  const [m, setM] = useState(value.m ?? 5);
  const [s, setS] = useState(value.s ?? 0);

  return (
    <WheelModalChrome>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/40" style={{ animation: "coachingWheelFadeIn 0.2s ease-out" }} onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[320px] overflow-hidden bg-white"
        style={{
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div className="pb-1 pt-5 text-center">
          <p className="text-[18px] font-extrabold text-[#0A0F1F]">{title}</p>
          <p className="mt-0.5 text-[13px] text-[#8E8E93]">par kilomètre</p>
        </div>

        <div className="px-3 pb-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <WheelColumn unit="'" value={m} max={15} onChange={setM} />
            <WheelColumn unit="''" value={s} max={59} onChange={setS} />
          </div>
        </div>

        <div className="flex border-t border-[#E5E5EA]">
          <button type="button" onClick={onClose} className="flex-1 py-3.5 text-[16px] font-semibold text-[#0A0F1F]">
            Annuler
          </button>
          <div className="w-px bg-[#E5E5EA]" />
          <button
            type="button"
            onClick={() => onConfirm({ m, s })}
            className="flex-1 py-3.5 text-[16px] font-bold"
            style={{ color: COACHING_ACTION_BLUE }}
          >
            OK
          </button>
        </div>
      </div>
    </WheelModalChrome>
  );
}

export function DistanceWheelPicker({
  title,
  value,
  onClose,
  onConfirm,
}: {
  title: string;
  value: DistanceWheelValue;
  onClose: () => void;
  onConfirm: (v: DistanceWheelValue) => void;
}) {
  const initialKm = value.km ?? 0;
  const initialMIdx = Math.round((value.m ?? 0) / 50);

  const [km, setKm] = useState(initialKm);
  const [mIdx, setMIdx] = useState(Math.min(19, Math.max(0, initialMIdx)));

  return (
    <WheelModalChrome>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/40" style={{ animation: "coachingWheelFadeIn 0.2s ease-out" }} onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[320px] overflow-hidden bg-white"
        style={{
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div className="pb-3 pt-5 text-center">
          <p className="text-[18px] font-extrabold text-[#0A0F1F]">{title}</p>
        </div>

        <div className="px-3 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <WheelColumn unit="km" value={km} max={50} onChange={setKm} />
            <WheelColumn
              unit="m"
              value={mIdx}
              max={19}
              onChange={setMIdx}
              formatValue={(n) => String(n * 50).padStart(3, "0")}
            />
          </div>
        </div>

        <div className="flex border-t border-[#E5E5EA]">
          <button type="button" onClick={onClose} className="flex-1 py-3.5 text-[16px] font-semibold text-[#0A0F1F]">
            Annuler
          </button>
          <div className="w-px bg-[#E5E5EA]" />
          <button
            type="button"
            onClick={() => onConfirm({ km, m: mIdx * 50 })}
            className="flex-1 py-3.5 text-[16px] font-bold"
            style={{ color: COACHING_ACTION_BLUE }}
          >
            OK
          </button>
        </div>
      </div>
    </WheelModalChrome>
  );
}
