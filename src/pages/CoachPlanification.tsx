import { useState, useMemo } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MainTopHeader } from "@/components/layout/MainTopHeader";
import { useAuth } from "@/hooks/useAuth";

// ── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = "brouillon" | "attente" | "validee";

interface PlanSession {
  id: string;
  title: string;
  emoji: string;
  athleteName: string;
  avatarClass: "a1" | "a2" | "a3";
  time: string;
  status: SessionStatus;
  date: string; // "yyyy-MM-dd"
}

interface AthleteCard {
  name: string;
  role: string;
  avatarClass: "a1" | "a2" | "a3";
  dotColor: "red" | "orange" | "green" | "gray";
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SESSIONS: PlanSession[] = [
  {
    id: "s1",
    title: "Sortie tempo · 8 km",
    emoji: "🏃",
    athleteName: "Ferdinand",
    avatarClass: "a1",
    time: "18:00",
    status: "brouillon",
    date: "2026-05-08",
  },
  {
    id: "s2",
    title: "Fractionné 5×1000m",
    emoji: "🏃",
    athleteName: "Ferdinand",
    avatarClass: "a1",
    time: "18:30",
    status: "attente",
    date: "2026-05-06",
  },
  {
    id: "s3",
    title: "Sortie longue · 2h Z2",
    emoji: "🚴",
    athleteName: "Alix M",
    avatarClass: "a3",
    time: "09:00",
    status: "validee",
    date: "2026-05-06",
  },
  {
    id: "s4",
    title: "Récupération active · 30 min",
    emoji: "🏊",
    athleteName: "Griffon",
    avatarClass: "a2",
    time: "07:30",
    status: "validee",
    date: "2026-05-02",
  },
  {
    id: "s5",
    title: "Endurance fondamentale",
    emoji: "🏃",
    athleteName: "Griffon",
    avatarClass: "a2",
    time: "06:00",
    status: "brouillon",
    date: "2026-05-04",
  },
  {
    id: "s6",
    title: "Fractionné court · 8×400m",
    emoji: "🏃",
    athleteName: "Ferdinand",
    avatarClass: "a1",
    time: "19:00",
    status: "attente",
    date: "2026-05-11",
  },
  {
    id: "s7",
    title: "Sortie longue vélo · 3h",
    emoji: "🚴",
    athleteName: "Alix M",
    avatarClass: "a3",
    time: "08:00",
    status: "validee",
    date: "2026-05-14",
  },
  {
    id: "s8",
    title: "Tempo seuil · 6 km",
    emoji: "🏃",
    athleteName: "Ferdinand",
    avatarClass: "a1",
    time: "18:00",
    status: "attente",
    date: "2026-05-19",
  },
  {
    id: "s9",
    title: "Côtes · 6×300m dénivelé",
    emoji: "⛰️",
    athleteName: "Griffon",
    avatarClass: "a2",
    time: "17:30",
    status: "brouillon",
    date: "2026-05-22",
  },
];

const MOCK_ATHLETES: AthleteCard[] = [
  { name: "Ferdinand", role: "Athlète", avatarClass: "a1", dotColor: "red" },
  { name: "Griffon", role: "Athlète", avatarClass: "a2", dotColor: "gray" },
  { name: "Alix M", role: "Athlète", avatarClass: "a3", dotColor: "gray" },
];

const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// ── Style helpers ─────────────────────────────────────────────────────────────

function statusDotHex(status: SessionStatus): string {
  if (status === "brouillon") return "#FF9500";
  if (status === "attente") return "#FF3B30";
  return "#34C759";
}

function statusIconBg(status: SessionStatus): string {
  if (status === "brouillon") return "bg-[#FF9500]";
  if (status === "attente") return "bg-[#FF3B30]";
  return "bg-[#34C759]";
}

function statusLabel(status: SessionStatus): string {
  if (status === "brouillon") return "Brouillon";
  if (status === "attente") return "En attente";
  return "Validée";
}

function statusTextColor(status: SessionStatus): string {
  if (status === "brouillon") return "text-[#FF9500]";
  if (status === "attente") return "text-[#FF3B30]";
  return "text-[#34C759]";
}

function avatarGradient(avatarClass: "a1" | "a2" | "a3"): string {
  if (avatarClass === "a1") return "linear-gradient(135deg, #5b8ec4, #3d6da3)";
  if (avatarClass === "a2") return "linear-gradient(135deg, #c4a05b, #a37b3d)";
  return "linear-gradient(135deg, #5bc48e, #3da36d)";
}

function dotBgHex(color: AthleteCard["dotColor"]): string {
  if (color === "red") return "#FF3B30";
  if (color === "orange") return "#FF9500";
  if (color === "green") return "#34C759";
  return "#C7C7CC";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CoachPlanification() {
  const { user } = useAuth();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(today);
  const [viewMode, setViewMode] = useState<"athlete" | "coach">("coach");

  const userInitial =
    user?.user_metadata?.display_name?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "C";

  // Calendar grid (Mon-start)
  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Sessions indexed by date key
  const sessionsByDate = useMemo(() => {
    const map: Record<string, PlanSession[]> = {};
    for (const s of MOCK_SESSIONS) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, []);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedSessions = sessionsByDate[selectedKey] ?? [];

  // "Vendredi 8" style label
  const selectedDayLabel = format(selectedDate, "EEEE d", { locale: fr });
  const capitalizedDayLabel =
    selectedDayLabel.charAt(0).toUpperCase() + selectedDayLabel.slice(1);

  // "Mai 2026" style label
  const monthLabel = format(visibleMonth, "MMMM yyyy", { locale: fr });
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <MainTopHeader
        title="Planification"
        disableScrollCollapse
        largeTitleRight={
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
            style={{ background: "rgba(0,122,255,0.10)", color: "#007AFF" }}
          >
            {userInitial}
          </div>
        }
      />

      {/* ── Scroll body ────────────────────────────────────────────────── */}
      <div className="ios-scroll-region flex-1 overflow-y-auto bg-background">

        {/* Segmented control */}
        <div className="px-5 pb-[18px] pt-[6px]">
          <div className="flex rounded-[9px] p-[2px]" style={{ background: "#E5E5EA" }}>
            {(["athlete", "coach"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex-1 rounded-[7px] py-[8px] text-[13px] font-semibold text-foreground transition-all duration-150",
                  viewMode === mode
                    ? "bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                    : "bg-transparent"
                )}
              >
                {mode === "athlete" ? "Athlète" : "Coach"}
              </button>
            ))}
          </div>
        </div>

        {/* Month subheader */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <button
            type="button"
            className="flex items-center gap-1 text-[22px] font-bold leading-none tracking-[-0.01em] text-primary"
            onClick={() => {/* month picker TODO */}}
          >
            {capitalizedMonth}
            <ChevronDown className="mt-0.5 h-4 w-4" />
          </button>
          <div className="flex items-center gap-[18px] text-primary">
            <button
              type="button"
              aria-label="Rechercher"
              onClick={() => {}}
            >
              <Search className="h-6 w-6" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              aria-label="Ajouter une séance"
              onClick={() => {}}
            >
              <Plus className="h-6 w-6" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* ── Calendar ──────────────────────────────────────────────────── */}
        <div className="px-3">
          {/* Day-of-week labels */}
          <div
            className="grid grid-cols-7 pb-2"
            style={{ borderBottom: "0.5px solid #E5E5EA" }}
          >
            {WEEK_LABELS.map((l, i) => (
              <div
                key={i}
                className="text-center text-[11px] font-medium tracking-[0.04em]"
                style={{ color: "#8E8E93" }}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByDate[key] ?? [];
              const inMonth = isSameMonth(day, visibleMonth);
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              const dotsToShow = daySessions.slice(0, 3);

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDate(day)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedDate(day)}
                  className="relative flex cursor-pointer flex-col items-center pb-[14px] pt-2"
                >
                  <div
                    className={cn(
                      "flex h-[30px] w-[30px] items-center justify-center rounded-full text-[17px] font-medium leading-none transition-all duration-150",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : isSelected
                        ? "bg-foreground font-semibold text-background"
                        : inMonth
                        ? "text-foreground"
                        : "font-normal"
                    )}
                    style={
                      !isToday && !isSelected && !inMonth
                        ? { color: "#C7C7CC" }
                        : undefined
                    }
                  >
                    {format(day, "d")}
                  </div>

                  {dotsToShow.length > 0 && (
                    <div className="absolute bottom-[2px] flex items-center gap-[3px]">
                      {dotsToShow.map((s) => (
                        <span
                          key={s.id}
                          className="block h-[5px] w-[5px] rounded-full"
                          style={{ background: statusDotHex(s.status) }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail ────────────────────────────────────────────────── */}
        <div
          className="mt-2 px-5 pb-[18px] pt-4"
          style={{
            background: "#F2F2F7",
            borderTop: "0.5px solid #E5E5EA",
          }}
        >
          {/* Day title + session count */}
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-foreground">
              {capitalizedDayLabel}
            </span>
            <span className="text-[14px] font-medium" style={{ color: "#8E8E93" }}>
              {selectedSessions.length === 0
                ? "Aucune séance"
                : selectedSessions.length === 1
                ? "1 séance"
                : `${selectedSessions.length} séances`}
            </span>
          </div>

          {/* Session cards */}
          {selectedSessions.map((session) => (
            <div
              key={session.id}
              className="mb-2 flex items-center gap-3 rounded-[14px] bg-background p-3"
              style={{
                boxShadow:
                  "0 1px 0 rgba(0,0,0,0.04), 0 4px 12px -8px rgba(0,0,0,0.08)",
              }}
            >
              {/* Emoji icon tile */}
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-2xl leading-none",
                  statusIconBg(session.status)
                )}
              >
                {session.emoji}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="mb-[3px] truncate text-[14px] font-semibold text-foreground">
                  {session.title}
                </div>
                <div
                  className="flex items-center gap-[5px] text-[12px]"
                  style={{ color: "#8E8E93" }}
                >
                  <span
                    className="flex items-center gap-1 font-medium text-foreground"
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-full"
                      style={{ background: avatarGradient(session.avatarClass) }}
                    />
                    {session.athleteName}
                  </span>
                  <span>· {session.time}</span>
                  <span
                    className={cn(
                      "ml-auto flex items-center gap-1 text-[12px] font-semibold",
                      statusTextColor(session.status)
                    )}
                  >
                    <span
                      className="inline-block h-[6px] w-[6px] rounded-full"
                      style={{ background: statusDotHex(session.status) }}
                    />
                    {statusLabel(session.status)}
                  </span>
                </div>
              </div>

              {/* Arrow button */}
              <button
                type="button"
                className="shrink-0 rounded-full px-[14px] py-[7px] text-[13px] font-semibold text-primary"
                style={{ background: "#F2F2F7" }}
              >
                ›
              </button>
            </div>
          ))}

          {/* CTA — Créer une séance */}
          <button
            type="button"
            className="mt-[10px] flex w-full items-center justify-center gap-[6px] rounded-[14px] bg-primary py-[13px] text-[14px] font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            style={{
              boxShadow:
                "0 4px 14px -4px rgba(0,122,255,0.45), 0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            Créer une séance
          </button>
        </div>

        {/* ── Athletes section ──────────────────────────────────────────── */}
        <div
          className="px-5 pb-[18px] pt-4"
          style={{ background: "#F2F2F7" }}
        >
          <div
            className="mb-[10px] text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "#8E8E93" }}
          >
            Mes athlètes · {MOCK_ATHLETES.length}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MOCK_ATHLETES.map((athlete) => (
              <div
                key={athlete.name}
                className="flex flex-col items-center gap-[6px] rounded-[14px] bg-background px-2 pb-[10px] pt-3"
              >
                {/* Avatar + status dot */}
                <div className="relative">
                  <div
                    className="h-12 w-12 rounded-full"
                    style={{ background: avatarGradient(athlete.avatarClass) }}
                  />
                  <span
                    className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full"
                    style={{
                      background: dotBgHex(athlete.dotColor),
                      border: "2px solid white",
                    }}
                  />
                </div>
                <span className="text-[13px] font-semibold text-foreground">
                  {athlete.name}
                </span>
                <span className="text-[11px]" style={{ color: "#8E8E93" }}>
                  {athlete.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom spacing for tab bar */}
        <div
          className="shrink-0"
          style={{
            height:
              "calc(var(--tab-bar-ground-strip, 0px) + var(--nav-height, 56px) + 16px)",
          }}
        />
      </div>
    </div>
  );
}
