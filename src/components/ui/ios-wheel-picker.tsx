import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

interface IosWheelColumnProps {
  items: string[];
  value: number;
  onChange: (index: number) => void;
  suffix?: string;
  className?: string;
}

export function IosWheelColumn({ items, value, onChange, suffix, className }: IosWheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const animFrame = useRef(0);

  const [offset, setOffset] = useState(-value * ITEM_HEIGHT);

  useEffect(() => {
    if (!isDragging.current) {
      setOffset(-value * ITEM_HEIGHT);
    }
  }, [value]);

  const clampIndex = useCallback((idx: number) => Math.max(0, Math.min(items.length - 1, idx)), [items.length]);

  const snapTo = useCallback((rawOffset: number) => {
    const idx = clampIndex(Math.round(-rawOffset / ITEM_HEIGHT));
    setOffset(-idx * ITEM_HEIGHT);
    onChange(idx);
  }, [clampIndex, onChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    cancelAnimationFrame(animFrame.current);
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    startOffset.current = offset;
    lastY.current = e.touches[0].clientY;
    lastTime.current = Date.now();
    velocity.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) velocity.current = (y - lastY.current) / dt;
    lastY.current = y;
    lastTime.current = now;
    const delta = y - startY.current;
    setOffset(startOffset.current + delta);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    const v = velocity.current * 150;
    snapTo(offset - v);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const newIdx = clampIndex(Math.round(-offset / ITEM_HEIGHT) + delta);
    setOffset(-newIdx * ITEM_HEIGHT);
    onChange(newIdx);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative flex-1 overflow-hidden select-none", className)}
      style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Selection indicator */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-y border-border/60 bg-secondary/30"
        style={{ top: CENTER_INDEX * ITEM_HEIGHT, height: ITEM_HEIGHT }}
      />
      {/* Fade top/bottom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-card to-transparent" />

      <div
        className="transition-transform"
        style={{
          transform: `translateY(${offset + CENTER_INDEX * ITEM_HEIGHT}px)`,
          transitionDuration: isDragging.current ? "0ms" : "300ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {items.map((item, idx) => {
          const selected = idx === Math.round(-offset / ITEM_HEIGHT);
          return (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-center tabular-nums transition-colors",
                selected ? "text-foreground font-semibold text-[22px]" : "text-muted-foreground/60 text-[18px]"
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => {
                setOffset(-idx * ITEM_HEIGHT);
                onChange(idx);
              }}
            >
              {item}{suffix && <span className="ml-1 text-[14px] font-normal text-muted-foreground">{suffix}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Time Picker Modal ─── */
interface TimePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (formatted: string, totalSeconds: number) => void;
  initialSeconds?: number;
  showHours?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const SECONDS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function TimePickerModal({ open, onClose, onConfirm, initialSeconds = 0, showHours = true }: TimePickerModalProps) {
  const total = Math.max(0, Math.round(initialSeconds));
  const [h, setH] = useState(Math.floor(total / 3600));
  const [m, setM] = useState(Math.floor((total % 3600) / 60));
  const [s, setS] = useState(total % 60);

  useEffect(() => {
    if (open) {
      const t = Math.max(0, Math.round(initialSeconds));
      setH(Math.floor(t / 3600));
      setM(Math.floor((t % 3600) / 60));
      setS(t % 60);
    }
  }, [open, initialSeconds]);

  if (!open) return null;

  const handleConfirm = () => {
    const totalSec = h * 3600 + m * 60 + s;
    let formatted: string;
    if (showHours && h > 0) {
      formatted = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    } else {
      formatted = `${m}:${String(s).padStart(2, "0")}`;
    }
    onConfirm(formatted, totalSec);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md animate-in slide-in-from-bottom-4 duration-300 rounded-t-2xl bg-card pb-[var(--safe-area-bottom)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <button
            onClick={onClose}
            className="text-[17px] text-muted-foreground active:opacity-60"
          >
            Annuler
          </button>
          <span className="text-[17px] font-semibold text-foreground">Temps</span>
          <button
            onClick={handleConfirm}
            className="text-[17px] font-semibold text-primary active:opacity-60"
          >
            OK
          </button>
        </div>
        {/* Wheels */}
        <div className="flex items-center gap-0 px-4 py-2">
          {showHours && (
            <>
              <IosWheelColumn items={HOURS} value={h} onChange={setH} suffix="h" />
              <span className="text-muted-foreground/40 text-lg font-medium">:</span>
            </>
          )}
          <IosWheelColumn items={MINUTES} value={m} onChange={setM} suffix="min" />
          <span className="text-muted-foreground/40 text-lg font-medium">:</span>
          <IosWheelColumn items={SECONDS} value={s} onChange={setS} suffix="s" />
        </div>
      </div>
    </div>
  );
}

/* ─── Pace Picker Modal ─── */
interface PacePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (formatted: string, secondsPerKm: number) => void;
  initialSecondsPerKm?: number;
}

const PACE_MIN = Array.from({ length: 30 }, (_, i) => String(i).padStart(2, "0"));
const PACE_SEC = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function PacePickerModal({ open, onClose, onConfirm, initialSecondsPerKm = 300 }: PacePickerModalProps) {
  const total = Math.max(0, Math.round(initialSecondsPerKm));
  const [m, setM] = useState(Math.floor(total / 60));
  const [s, setS] = useState(total % 60);

  useEffect(() => {
    if (open) {
      const t = Math.max(0, Math.round(initialSecondsPerKm));
      setM(Math.min(29, Math.floor(t / 60)));
      setS(t % 60);
    }
  }, [open, initialSecondsPerKm]);

  if (!open) return null;

  const handleConfirm = () => {
    const totalSec = m * 60 + s;
    const formatted = `${m}:${String(s).padStart(2, "0")}/km`;
    onConfirm(formatted, totalSec);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md animate-in slide-in-from-bottom-4 duration-300 rounded-t-2xl bg-card pb-[var(--safe-area-bottom)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <button onClick={onClose} className="text-[17px] text-muted-foreground active:opacity-60">
            Annuler
          </button>
          <span className="text-[17px] font-semibold text-foreground">Allure</span>
          <button onClick={handleConfirm} className="text-[17px] font-semibold text-primary active:opacity-60">
            OK
          </button>
        </div>
        <div className="flex items-center gap-0 px-4 py-2">
          <IosWheelColumn items={PACE_MIN} value={m} onChange={setM} suffix="min" />
          <span className="text-muted-foreground/40 text-lg font-medium">:</span>
          <IosWheelColumn items={PACE_SEC} value={s} onChange={setS} suffix="s" />
          <div className="flex items-center justify-center px-3">
            <span className="text-[17px] font-medium text-muted-foreground">/km</span>
          </div>
        </div>
      </div>
    </div>
  );
}
