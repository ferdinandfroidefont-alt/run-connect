import { useEffect, useState } from "react";
import { CoachingWheelColumn, WheelPickerFooter, WheelPickerPortal } from "@/components/coaching/create-session/CoachingWheelPickers";

type WheelOption = { value: string; label: string };

interface SmartPerformancePickerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sous-titre type maquette (ex. « par kilomètre ») */
  subtitle?: string;
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
  subtitle?: string;
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

export function SmartPerformancePicker({
  open,
  onClose,
  title,
  subtitle,
  columns,
  onConfirm,
}: SmartPerformancePickerProps) {
  const maxWidth = columns.length >= 3 ? 360 : 320;

  if (!open) return null;

  return (
    <WheelPickerPortal onClose={onClose}>
      <div
        data-wheel-panel="true"
        className="relative z-10 w-full overflow-hidden bg-white"
        style={{
          maxWidth,
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={subtitle ? "pb-1 pt-5 text-center" : "pb-3 pt-5 text-center"}>
          <p className="text-[18px] font-extrabold text-[#0A0F1F]">{title}</p>
          {subtitle ? <p className="mt-0.5 text-[13px] text-[#8E8E93]">{subtitle}</p> : null}
        </div>

        <div className={subtitle ? "px-3 pb-4 pt-2" : "px-3 pb-4"}>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {columns.map((column, idx) => {
              const maxIdx = Math.max(0, column.items.length - 1);
              const selectedIdx = Math.max(0, column.items.findIndex((it) => it.value === column.value));
              return (
                <CoachingWheelColumn
                  key={`${title}-${idx}-${column.suffix ?? ""}`}
                  unit={column.suffix ?? ""}
                  value={Math.min(selectedIdx, maxIdx)}
                  max={maxIdx}
                  onChange={(i) => {
                    const v = column.items[i]?.value;
                    if (v != null) column.onChange(v);
                  }}
                  formatValue={(i) => column.items[i]?.label ?? String(i)}
                />
              );
            })}
          </div>
        </div>

        <WheelPickerFooter onCancel={onClose} onConfirm={onConfirm} />
      </div>
    </WheelPickerPortal>
  );
}

export function WheelValuePickerModal({ open, onClose, title, subtitle, columns, onConfirm }: WheelValuePickerModalProps) {
  return (
    <SmartPerformancePicker
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      columns={columns}
      onConfirm={onConfirm}
    />
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const SECONDS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PACE_MIN = Array.from({ length: 16 }, (_, i) => String(i).padStart(2, "0"));
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
        const formatted =
          showHours && h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
        onConfirm(formatted, totalSec);
      }}
    />
  );
}

export function PacePickerModal({ open, onClose, onConfirm, initialSecondsPerKm = 300 }: PacePickerModalProps) {
  const total = Math.max(0, Math.round(initialSecondsPerKm));
  const [m, setM] = useState(Math.min(15, Math.floor(total / 60)));
  const [s, setS] = useState(total % 60);

  useEffect(() => {
    if (!open) return;
    const t = Math.max(0, Math.round(initialSecondsPerKm));
    setM(Math.min(15, Math.floor(t / 60)));
    setS(t % 60);
  }, [open, initialSecondsPerKm]);

  const columns = [
    { items: PACE_MIN.map((x) => ({ value: x, label: x })), value: PACE_MIN[m] ?? "00", onChange: (next: string) => setM(Number(next)), suffix: "'" },
    { items: PACE_SEC.map((x) => ({ value: x, label: x })), value: PACE_SEC[s] ?? "00", onChange: (next: string) => setS(Number(next)), suffix: "''" },
    { items: [{ value: "/km", label: "/km" }], value: "/km", onChange: () => undefined },
  ];

  return (
    <SmartPerformancePicker
      open={open}
      onClose={onClose}
      title="Allure"
      subtitle="par kilomètre"
      columns={columns}
      onConfirm={() => {
        const totalSec = m * 60 + s;
        onConfirm(`${m}'${String(s).padStart(2, "0")}''/km`, totalSec);
      }}
    />
  );
}
