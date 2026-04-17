import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { lightHaptic } from "@/lib/haptics";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PAD_ROWS = Math.floor(VISIBLE_ITEMS / 2);
const MODAL_ROOT_CLASS =
  "fixed inset-0 z-[1200] flex items-end justify-center overscroll-none pb-[max(4.75rem,calc(var(--safe-area-bottom)+3.5rem))]";
const MODAL_PANEL_CLASS =
  "relative z-10 w-full max-w-md animate-in slide-in-from-bottom-4 duration-300 rounded-t-3xl bg-card pb-[max(0.5rem,var(--safe-area-bottom))] shadow-2xl";

type WheelOption = { value: string; label: string };

interface PickerColumnProps {
  items: WheelOption[];
  value: string;
  onChange: (next: string) => void;
  suffix?: string;
  disabled?: boolean;
}

interface PickerHeaderProps {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  accentColor: string;
}

interface PickerOverlayProps {
  accentColor: string;
}

interface SmartPerformancePickerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: Array<{
    items: WheelOption[];
    value: string;
    onChange: (next: string) => void;
    suffix?: string;
  }>;
  onConfirm: () => void;
}

interface WheelValuePickerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: Array<{
    items: WheelOption[];
    value: string;
    onChange: (next: string) => void;
    suffix?: string;
  }>;
  onConfirm: () => void;
}

interface TimePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (formatted: string, totalSeconds: number) => void;
  initialSeconds?: number;
  showHours?: boolean;
}

interface PacePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (formatted: string, secondsPerKm: number) => void;
  initialSecondsPerKm?: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.touchAction = prev.bodyTouchAction;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function eventFromWheelColumn(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest("[data-wheel-column='true']");
}

function eventFromPickerPanel(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest("[data-wheel-panel='true']");
}

function resolveAccentColor(title: string) {
  const key = title.toLowerCase();
  if (key.includes("allure")) return "#8B5CF6";
  if (key.includes("vitesse")) return "#3B82F6";
  if (key.includes("puissance")) return "#EAB308";
  if (key.includes("récup")) return "#22C55E";
  return "#2563EB";
}

function PickerValue({ active, label, suffix }: { active: boolean; label: string; suffix?: string }) {
  return (
    <div
      className={cn(
        "flex h-11 items-center justify-center tabular-nums transition-all",
        active ? "text-[23px] font-semibold text-foreground" : "text-[17px] font-medium text-muted-foreground/55"
      )}
    >
      <span>{label}</span>
      {suffix ? <span className="ml-1 text-[12px] font-medium text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}

export function PickerOverlay({ accentColor }: PickerOverlayProps) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 z-10 rounded-lg border-y bg-primary/5"
        style={{ top: PAD_ROWS * ITEM_HEIGHT, height: ITEM_HEIGHT, borderColor: `${accentColor}66` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-card via-card/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-card via-card/85 to-transparent" />
    </>
  );
}

export function PickerColumn({ items, value, onChange, suffix, disabled = false }: PickerColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const snapTimerRef = useRef<number | null>(null);
  const lastHapticValue = useRef<string>(value);
  const selectedIndex = useMemo(() => Math.max(0, items.findIndex((item) => item.value === value)), [items, value]);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * ITEM_HEIGHT, behavior });
  }, []);

  const applyNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = clamp(Math.round(el.scrollTop / ITEM_HEIGHT), 0, items.length - 1);
    const next = items[idx]?.value ?? value;
    scrollToIndex(idx, "smooth");
    if (next !== value) {
      onChange(next);
    }
  }, [items, onChange, scrollToIndex, value]);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const idx = clamp(Math.round(el.scrollTop / ITEM_HEIGHT), 0, items.length - 1);
      const next = items[idx]?.value;
      if (next && next !== value) {
        onChange(next);
      }
      if (next && next !== lastHapticValue.current) {
        lastHapticValue.current = next;
        void lightHaptic();
      }
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => applyNearest(), 120);
    });
  }, [applyNearest, items, onChange, value]);

  useEffect(() => {
    scrollToIndex(selectedIndex, "auto");
  }, [scrollToIndex, selectedIndex]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, []);

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={containerRef}
        className={cn("no-scrollbar relative py-[88px]", disabled ? "overflow-hidden" : "overflow-y-auto overscroll-contain")}
        onScroll={disabled ? undefined : handleScroll}
        onTouchEnd={disabled ? undefined : applyNearest}
        onMouseUp={disabled ? undefined : applyNearest}
        onWheel={disabled ? undefined : handleScroll}
        onTouchMove={(e) => e.stopPropagation()}
        onWheelCapture={(e) => e.stopPropagation()}
        data-wheel-column="true"
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          touchAction: disabled ? "none" : "pan-y",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((item) => (
          <button
            type="button"
            key={item.value}
            onClick={() => !disabled && onChange(item.value)}
            className={cn("block w-full", disabled && "cursor-default")}
            style={{ touchAction: "manipulation" }}
          >
            <PickerValue active={item.value === value} label={item.label} suffix={suffix} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PickerHeader({ title, onCancel, onConfirm, accentColor }: PickerHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
      <button onClick={onCancel} className="text-[17px] text-muted-foreground active:opacity-70">
        Annuler
      </button>
      <span className="text-[17px] font-semibold text-foreground" style={{ textShadow: `0 0 18px ${accentColor}22` }}>
        {title}
      </span>
      <button onClick={onConfirm} className="text-[17px] font-semibold active:opacity-70" style={{ color: accentColor }}>
        OK
      </button>
    </div>
  );
}

export function SmartPerformancePicker({
  open,
  onClose,
  title,
  columns,
  onConfirm,
}: SmartPerformancePickerProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    // Force-scroll lock at document level to prevent any underlying page scroll,
    // while keeping wheel columns scrollable.
    const blockBackgroundScroll = (event: TouchEvent | WheelEvent) => {
      if (eventFromPickerPanel(event.target) || eventFromWheelColumn(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("touchmove", blockBackgroundScroll, { passive: false, capture: true });
    document.addEventListener("wheel", blockBackgroundScroll, { passive: false, capture: true });

    return () => {
      document.removeEventListener("touchmove", blockBackgroundScroll, { capture: true } as EventListenerOptions);
      document.removeEventListener("wheel", blockBackgroundScroll, { capture: true } as EventListenerOptions);
    };
  }, [open]);

  if (!open) return null;

  const accentColor = resolveAccentColor(title);
  const modal = (
    <div
      className={MODAL_ROOT_CLASS}
      onTouchMoveCapture={(event) => {
        if (!eventFromPickerPanel(event.target) && !eventFromWheelColumn(event.target)) {
          event.preventDefault();
        }
      }}
      onWheelCapture={(event) => {
        if (!eventFromPickerPanel(event.target) && !eventFromWheelColumn(event.target)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm dark:bg-black/65"
        onClick={onClose}
      />
      <div
        data-wheel-panel="true"
        className={cn(MODAL_PANEL_CLASS, "border border-border/60 dark:bg-[#0a0a0a]")}
        onClick={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onTouchStartCapture={(e) => e.stopPropagation()}
      >
        <PickerHeader title={title} onCancel={onClose} onConfirm={onConfirm} accentColor={accentColor} />
        <div className="relative px-4 py-3">
          <PickerOverlay accentColor={accentColor} />
          <div className="relative z-0 flex items-center gap-1">
            {columns.map((column, idx) => (
              <PickerColumn
                key={`${title}-${idx}`}
                items={column.items}
                value={column.value}
                onChange={column.onChange}
                suffix={column.suffix}
                disabled={column.items.length <= 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export function WheelValuePickerModal({ open, onClose, title, columns, onConfirm }: WheelValuePickerModalProps) {
  return (
    <SmartPerformancePicker
      open={open}
      onClose={onClose}
      title={title}
      columns={columns}
      onConfirm={onConfirm}
    />
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const SECONDS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PACE_MIN = Array.from({ length: 30 }, (_, i) => String(i).padStart(2, "0"));
const PACE_SEC = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function TimePickerModal({ open, onClose, onConfirm, initialSeconds = 0, showHours = true }: TimePickerModalProps) {
  const total = Math.max(0, Math.round(initialSeconds));
  const [h, setH] = useState(Math.floor(total / 3600));
  const [m, setM] = useState(Math.floor((total % 3600) / 60));
  const [s, setS] = useState(total % 60);

  useEffect(() => {
    if (!open) return;
    const t = Math.max(0, Math.round(initialSeconds));
    setH(Math.floor(t / 3600));
    setM(Math.floor((t % 3600) / 60));
    setS(t % 60);
  }, [open, initialSeconds]);

  const columns = [
    ...(showHours
      ? [{ items: HOURS.map((x) => ({ value: x, label: x })), value: HOURS[h] ?? "00", onChange: (next: string) => setH(Number(next)), suffix: "h" }]
      : []),
    { items: MINUTES.map((x) => ({ value: x, label: x })), value: MINUTES[m] ?? "00", onChange: (next: string) => setM(Number(next)), suffix: "min" },
    { items: SECONDS.map((x) => ({ value: x, label: x })), value: SECONDS[s] ?? "00", onChange: (next: string) => setS(Number(next)), suffix: "s" },
  ];

  return (
    <SmartPerformancePicker
      open={open}
      onClose={onClose}
      title="Durée"
      columns={columns}
      onConfirm={() => {
        const totalSec = h * 3600 + m * 60 + s;
        const formatted = showHours && h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
        onConfirm(formatted, totalSec);
      }}
    />
  );
}

export function PacePickerModal({ open, onClose, onConfirm, initialSecondsPerKm = 300 }: PacePickerModalProps) {
  const total = Math.max(0, Math.round(initialSecondsPerKm));
  const [m, setM] = useState(Math.floor(total / 60));
  const [s, setS] = useState(total % 60);

  useEffect(() => {
    if (!open) return;
    const t = Math.max(0, Math.round(initialSecondsPerKm));
    setM(Math.min(29, Math.floor(t / 60)));
    setS(t % 60);
  }, [open, initialSecondsPerKm]);

  const columns = [
    { items: PACE_MIN.map((x) => ({ value: x, label: x })), value: PACE_MIN[m] ?? "00", onChange: (next: string) => setM(Number(next)), suffix: "min" },
    { items: PACE_SEC.map((x) => ({ value: x, label: x })), value: PACE_SEC[s] ?? "00", onChange: (next: string) => setS(Number(next)), suffix: "s" },
    { items: [{ value: "/km", label: "/km" }], value: "/km", onChange: () => undefined },
  ];

  return (
    <SmartPerformancePicker
      open={open}
      onClose={onClose}
      title="Allure"
      columns={columns}
      onConfirm={() => {
        const totalSec = m * 60 + s;
        onConfirm(`${m}:${String(s).padStart(2, "0")}/km`, totalSec);
      }}
    />
  );
}
