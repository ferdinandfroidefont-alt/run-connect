import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, Plus, Search } from "lucide-react";
import { CoachingRolePill } from "@/components/coaching/handoff/CoachingRolePill";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionStatus = "draft" | "pending" | "validated";

export interface PlanCalendarSession {
  id: string;
  title: string;
  sport: "running" | "cycling" | "swimming" | "strength";
  assignedDate: string;
  time?: string;
  athleteName?: string;
  status: SessionStatus;
}

export interface PlanCalendarAthlete {
  id: string;
  name: string;
  avatarUrl?: string;
  /** Couleur du badge de statut sur l'avatar */
  statusColor?: "orange" | "red" | "green" | "gray";
}

interface Props {
  sessions: PlanCalendarSession[];
  athletes: PlanCalendarAthlete[];
  onCreateSession: (date: Date) => void;
  onOpenSession: (sessionId: string) => void;
  onSelectAthlete?: (athleteId: string) => void;
  currentView?: "athlete" | "coach";
  onViewChange?: (view: "athlete" | "coach") => void;
  /** Avatar / initial de l'utilisateur (fallback si pas de club) */
  userInitial?: string;
  /** Photo du club — remplace l'avatar lettre */
  clubAvatarUrl?: string | null;
  clubName?: string | null;
  onPressClubAvatar?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<SessionStatus, string> = {
  draft: "#FF9500",
  pending: "#FF3B30",
  validated: "#34C759",
};

const SPORT_EMOJI: Record<string, string> = {
  running: "🏃",
  cycling: "🚴",
  swimming: "🏊",
  strength: "💪",
};

function statusLabel(status: SessionStatus) {
  if (status === "draft") return "Brouillon";
  if (status === "pending") return "En attente";
  return "Validée";
}

function avatarHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CoachPlanificationMonthCalendar({
  sessions,
  athletes,
  onCreateSession,
  onOpenSession,
  onSelectAthlete,
  currentView = "coach",
  onViewChange,
  userInitial = "C",
  clubAvatarUrl,
  clubName,
  onPressClubAvatar,
}: Props) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // ── Session dots per day ───────────────────────────────────────────────────
  const dotsByDate = useMemo(() => {
    const map: Record<string, SessionStatus[]> = {};
    for (const s of sessions) {
      const key = s.assignedDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s.status);
    }
    return map;
  }, [sessions]);

  // ── Selected day sessions ──────────────────────────────────────────────────
  const selectedDaySessions = useMemo(
    () => sessions.filter((s) => isSameDay(new Date(s.assignedDate), selectedDay)),
    [sessions, selectedDay]
  );

  const selectedDayLabel = format(selectedDay, "EEEE d", { locale: fr });
  const selectedDayCapitalized =
    selectedDayLabel.charAt(0).toUpperCase() + selectedDayLabel.slice(1);

  const selectedDayBtnLabel = format(selectedDay, "EEEE", { locale: fr }).toLowerCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between px-5 pb-[14px] pt-3">
        <h1
          className="text-[32px] font-extrabold leading-none tracking-[-0.025em]"
          style={{ color: "#1d1d1f" }}
        >
          Planification
        </h1>
        {onPressClubAvatar ? (
          <button
            type="button"
            onClick={onPressClubAvatar}
            className="mb-1 overflow-hidden rounded-[10px] transition-opacity active:opacity-70"
            aria-label="Fiche du club"
            style={{ width: 36, height: 36 }}
          >
            {clubAvatarUrl ? (
              <img
                src={clubAvatarUrl}
                alt={clubName ?? "Club"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[14px] font-semibold text-white"
                style={{ background: "#0066cc" }}
              >
                {(clubName ?? "C")[0].toUpperCase()}
              </div>
            )}
          </button>
        ) : (
          <div
            className="mb-1 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold"
            style={{ background: "rgba(0,102,204,0.1)", color: "#0066cc" }}
          >
            {userInitial}
          </div>
        )}
      </div>

      {/* ── Même segmented que l’ancien header (CoachingRolePill) ─────────── */}
      <CoachingRolePill
        active={currentView === "athlete" ? "athlete" : "coach"}
        onSelect={(role) => onViewChange?.(role)}
        className="px-5 pb-[18px] pt-0"
      />

      {/* ── Sub-header: mois + actions ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pb-3">
        <button
          type="button"
          className="flex items-center gap-1"
          style={{ color: "#0066cc" }}
          onClick={() => {
            /* month picker — could open a popover */
          }}
        >
          <span className="text-[22px] font-bold leading-none tracking-[-0.01em]">
            {format(currentMonth, "MMMM yyyy", { locale: fr }).replace(/^\w/, (c) =>
              c.toUpperCase()
            )}
          </span>
          <ChevronDown className="mt-0.5 h-4 w-4" />
        </button>
        <div className="flex items-center gap-[18px]">
          <button
            type="button"
            aria-label="Rechercher"
            className="h-6 w-6 transition-opacity active:opacity-60"
            style={{ color: "#0066cc" }}
          >
            <Search className="h-full w-full" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="Nouvelle séance"
            className="h-6 w-6 transition-opacity active:opacity-60"
            style={{ color: "#0066cc" }}
            onClick={() => onCreateSession(selectedDay)}
          >
            <Plus className="h-full w-full" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      <div className="px-3">
        {/* Day-of-week labels */}
        <div
          className="mb-2 grid grid-cols-7 border-b pb-2"
          style={{ borderColor: "#E5E5EA" }}
        >
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span
              key={i}
              className="text-center text-[11px] font-medium tracking-[0.04em]"
              style={{ color: "#8E8E93" }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const dateKey = format(day, "yyyy-MM-dd");
            const dots = dotsByDate[dateKey] ?? [];

            return (
              <button
                key={day.toISOString()}
                type="button"
                className="relative flex flex-col items-center pb-[14px] pt-2"
                onClick={() => setSelectedDay(day)}
              >
                {/* Day number */}
                <span
                  className={cn(
                    "flex h-[30px] w-[30px] items-center justify-center rounded-full text-[17px] font-medium transition-all",
                    isToday && "font-semibold text-white",
                    isSelected && !isToday && "font-semibold text-white",
                    !isCurrentMonth && !isToday && !isSelected && "font-normal"
                  )}
                  style={{
                    backgroundColor: isToday
                      ? "#0066cc"
                      : isSelected
                        ? "#0A1628"
                        : "transparent",
                    color: isToday || isSelected
                      ? "#fff"
                      : isCurrentMonth
                        ? "#0A1628"
                        : "#C7C7CC",
                  }}
                >
                  {format(day, "d")}
                </span>

                {/* Status dots */}
                {dots.length > 0 && (
                  <div className="absolute bottom-[2px] flex items-center gap-[3px]">
                    {dots.slice(0, 3).map((status, i) => (
                      <span
                        key={i}
                        className="h-[5px] w-[5px] rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[status] }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Day detail panel ─────────────────────────────────────────────── */}
      <div
        className="mt-2 flex-1 border-t px-5 pb-[18px] pt-4"
        style={{ background: "#F2F2F7", borderColor: "#E5E5EA" }}
      >
        {/* Panel header */}
        <div className="mb-3 flex items-baseline gap-2">
          <span
            className="text-[22px] font-extrabold leading-none tracking-[-0.01em]"
            style={{ color: "#0A1628" }}
          >
            {selectedDayCapitalized}
          </span>
          <span className="text-[14px] font-medium" style={{ color: "#8E8E93" }}>
            {selectedDaySessions.length === 0
              ? "Aucune séance"
              : `${selectedDaySessions.length} séance${selectedDaySessions.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Session cards */}
        <div className="space-y-2">
          {selectedDaySessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 rounded-[14px] bg-white p-3"
            >
              {/* Sport icon */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-[24px] leading-none"
                style={{ background: STATUS_COLOR[session.status] }}
              >
                {SPORT_EMOJI[session.sport] ?? "🏃"}
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[14px] font-semibold"
                  style={{ color: "#0A1628" }}
                >
                  {session.title}
                </p>
                <div
                  className="mt-0.5 flex items-center gap-1 text-[12px]"
                  style={{ color: "#8E8E93" }}
                >
                  {session.athleteName && (
                    <span
                      className="flex items-center gap-1 font-medium"
                      style={{ color: "#0A1628" }}
                    >
                      <span
                        className="inline-block h-4 w-4 rounded-full"
                        style={{
                          background: `hsl(${avatarHue(session.athleteName)},60%,55%)`,
                        }}
                      />
                      {session.athleteName}
                    </span>
                  )}
                  {session.time && <span>· {session.time}</span>}
                  <span
                    className="ml-auto flex items-center gap-1 font-semibold before:h-[6px] before:w-[6px] before:rounded-full before:content-['']"
                    style={{
                      color: STATUS_COLOR[session.status],
                      ["--dot-color" as string]: STATUS_COLOR[session.status],
                    }}
                  >
                    <span
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ background: STATUS_COLOR[session.status] }}
                    />
                    {statusLabel(session.status)}
                  </span>
                </div>
              </div>

              {/* Open button */}
              <button
                type="button"
                className="shrink-0 rounded-full px-[14px] py-[7px] text-[13px] font-semibold transition-opacity active:opacity-70"
                style={{ background: "#F2F2F7", color: "#0066cc" }}
                onClick={() => onOpenSession(session.id)}
              >
                ›
              </button>
            </div>
          ))}
        </div>

        {/* CTA — Créer une séance */}
        <button
          type="button"
          className="mt-[10px] flex w-full items-center justify-center gap-1.5 rounded-[14px] py-[13px] text-[14px] font-semibold text-white transition-all active:scale-[0.98]"
          style={{
            background: "#0066cc",
            boxShadow: "0 4px 14px -4px rgba(0,122,255,0.45), 0 1px 2px rgba(0,0,0,0.04)",
          }}
          onClick={() => onCreateSession(selectedDay)}
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          Créer une séance
        </button>
      </div>

      {/* ── Mes athlètes ─────────────────────────────────────────────────── */}
      {athletes.length > 0 && (
        <div className="px-5 pb-5 pt-4" style={{ background: "#F2F2F7" }}>
          <p
            className="mb-[10px] text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "#8E8E93" }}
          >
            Mes athlètes · {athletes.length}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {athletes.slice(0, 6).map((athlete) => (
              <button
                key={athlete.id}
                type="button"
                className="flex flex-col items-center gap-1.5 rounded-[14px] bg-white px-2 pb-[10px] pt-3 transition-opacity active:opacity-70"
                onClick={() => onSelectAthlete?.(athlete.id)}
              >
                {/* Avatar */}
                <div className="relative">
                  {athlete.avatarUrl ? (
                    <img
                      src={athlete.avatarUrl}
                      alt={athlete.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-[17px] font-semibold text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${avatarHue(athlete.name)},55%,58%), hsl(${avatarHue(athlete.name)},65%,40%))`,
                      }}
                    >
                      {initials(athlete.name)}
                    </div>
                  )}
                  {/* Status dot */}
                  {athlete.statusColor && (
                    <span
                      className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-white"
                      style={{
                        background:
                          athlete.statusColor === "orange"
                            ? "#FF9500"
                            : athlete.statusColor === "red"
                              ? "#FF3B30"
                              : athlete.statusColor === "green"
                                ? "#34C759"
                                : "#C7C7CC",
                      }}
                    />
                  )}
                </div>
                <span
                  className="w-full truncate text-center text-[13px] font-semibold"
                  style={{ color: "#0A1628" }}
                >
                  {athlete.name.split(" ")[0]}
                </span>
                <span className="text-[11px]" style={{ color: "#8E8E93" }}>
                  Athlète
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
