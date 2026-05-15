import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

/** Maquette RunConnect.jsx */
const ACTION_BLUE = "#007AFF";
const MAQUETTE_TITLE = "#0A0F1F";

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<SessionStatus, string> = {
  draft: "#FF9500",
  pending: "#FF3B30",
  validated: "#34C759",
};

/** Pastilles sous les dates — teintes « sport » comme COACH_SESSIONS_BY_DAY (maquette). */
const SPORT_DOT_COLOR: Record<PlanCalendarSession["sport"], string> = {
  running: "#007AFF",
  cycling: "#FF9500",
  swimming: "#5AC8FA",
  strength: "#FF9500",
};

/** Tuile emoji séance — SEANCE_SPORTS (CreerSeancePage maquette). */
const SPORT_TILE_BG: Record<PlanCalendarSession["sport"], string> = {
  running: "#007AFF",
  cycling: "#FF3B30",
  swimming: "#5AC8FA",
  strength: "#FF9500",
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

  // ── Session dots per day (couleurs multi-sports, maquette CoachCalendar) ───
  const dotsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const s of sessions) {
      const key = s.assignedDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(SPORT_DOT_COLOR[s.sport] ?? "#007AFF");
    }
    return map;
  }, [sessions]);

  // ── Selected day sessions ──────────────────────────────────────────────────
  const selectedDaySessions = useMemo(
    () => sessions.filter((s) => isSameDay(new Date(s.assignedDate), selectedDay)),
    [sessions, selectedDay]
  );

  const selectedDayLabelShort = useMemo(() => {
    const w = format(selectedDay, "EEEE", { locale: fr });
    const cap = w.charAt(0).toUpperCase() + w.slice(1);
    return `${cap} ${format(selectedDay, "d")}`;
  }, [selectedDay]);

  const calendarWeeks = useMemo(() => {
    const chunks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      chunks.push(calendarDays.slice(i, i + 7));
    }
    return chunks;
  }, [calendarDays]);

  return (
    <div>
      {/* Maquette RunConnect (13).jsx · `CoachCalendar` (fragment dans `<main>` StickyPage). */}
      {/* ── Mois + actions · chevrons prev/next, libellé 22px bold ACTION_BLUE ── */}
      <div className="mt-5 mb-3 flex items-center justify-between px-5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mois précédent"
            className="-ml-1 flex h-8 w-8 items-center justify-center transition-opacity active:opacity-60"
            onClick={() => setCurrentMonth((m) => startOfMonth(subMonths(m, 1)))}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.6} style={{ color: ACTION_BLUE }} aria-hidden />
          </button>
          <span
            className="text-[22px] font-bold leading-none"
            style={{ color: ACTION_BLUE, letterSpacing: "-0.02em" }}
          >
            {format(currentMonth, "MMMM yyyy", { locale: fr }).replace(/^\w/, (c) =>
              c.toUpperCase()
            )}
          </span>
          <button
            type="button"
            aria-label="Mois suivant"
            className="flex h-8 w-8 items-center justify-center transition-opacity active:opacity-60"
            onClick={() => setCurrentMonth((m) => startOfMonth(addMonths(m, 1)))}
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.6} style={{ color: ACTION_BLUE }} aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Rechercher"
            className="h-6 w-6 transition-opacity active:opacity-60"
            style={{ color: ACTION_BLUE }}
          >
            <Search className="h-full w-full" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="Nouvelle séance"
            className="h-6 w-6 transition-opacity active:opacity-60"
            style={{ color: ACTION_BLUE }}
            onClick={() => onCreateSession(selectedDay)}
          >
            <Plus className="h-full w-full" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* ── Grille calendrier ─────────────────────────────────────────── */}
      <div className="px-5">
        {/* L … D */}
        <div className="mb-2 grid grid-cols-7">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i} className="text-center text-[13px] font-medium" style={{ color: "#8E8E93" }}>
              {d}
            </span>
          ))}
        </div>
        <div className="mb-2 h-px bg-[#E5E5EA]" />

        {/* Month grid — semaines espacées comme la maquette */}
        <div>
          {calendarWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-y-3 py-2">
              {week.map((day) => {
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const dateKey = format(day, "yyyy-MM-dd");
                const dots = dotsByDate[dateKey] ?? [];

                let bg = "transparent";
                let color = isCurrentMonth ? MAQUETTE_TITLE : "#C7C7CC";
                if (isToday) {
                  bg = ACTION_BLUE;
                  color = "white";
                } else if (isSelected) {
                  bg = "#0A0F1F";
                  color = "white";
                }

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className="flex flex-col items-center justify-start"
                    style={{ gap: 4 }}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-[19px] font-bold"
                      style={{
                        background: bg,
                        color,
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="flex h-[5px] items-center justify-center gap-[3px]">
                      {dots.slice(0, 3).map((dotColor, i) => (
                        <div
                          key={i}
                          className="h-[5px] w-[5px] rounded-full"
                          style={{ background: dotColor }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Détail jour (séquentiel · maquette `mt-5` sous le calendrier) ───── */}
      <div className="mt-5 px-5 pb-[18px] pt-0">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-[24px] font-bold leading-none" style={{ color: MAQUETTE_TITLE }}>
            {selectedDayLabelShort}
          </span>
          <span className="text-[15px]" style={{ color: "#8E8E93" }}>
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
                style={{ background: SPORT_TILE_BG[session.sport] ?? "#007AFF" }}
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
                style={{ background: "#F7F7F8", color: ACTION_BLUE }}
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-white transition-all active:scale-[0.99]"
          style={{
            background: ACTION_BLUE,
            boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)",
          }}
          onClick={() => onCreateSession(selectedDay)}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Créer une séance
        </button>
      </div>

      {/* ── Mes athlètes ─────────────────────────────────────────────────── */}
      {athletes.length > 0 && (
        <div className="mt-7">
          <p
            className="px-5 text-[13px] font-extrabold tracking-[0.08em]"
            style={{ color: "#8E8E93", marginBottom: 12 }}
          >
            MES ATHLÈTES · {athletes.length}
          </p>
          <div
            className="flex gap-3 overflow-x-auto pb-2 pl-5 pr-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: "x proximity" }}
          >
            {athletes.map((athlete) => (
              <button
                key={athlete.id}
                type="button"
                className="flex flex-shrink-0 flex-col items-center rounded-2xl bg-white text-left transition-transform active:scale-[0.97]"
                style={{
                  padding: "14px 12px 12px 12px",
                  width: 116,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                  scrollSnapAlign: "start",
                }}
                onClick={() => onSelectAthlete?.(athlete.id)}
              >
                <div className="relative mx-auto" style={{ width: 64, height: 64 }}>
                  {athlete.avatarUrl ? (
                    <img
                      src={athlete.avatarUrl}
                      alt={athlete.name}
                      className="h-full w-full rounded-full border-2 border-white object-cover shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-full border-2 border-white text-[20px] font-semibold text-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                      style={{
                        background: `linear-gradient(135deg, hsl(${avatarHue(athlete.name)},55%,58%), hsl(${avatarHue(athlete.name)},65%,40%))`,
                      }}
                    >
                      {initials(athlete.name).slice(0, 1)}
                    </div>
                  )}
                  {athlete.statusColor ? (
                    <span
                      className="absolute h-3 w-3 rounded-full border-2 border-white"
                      style={{
                        bottom: 2,
                        right: 4,
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
                  ) : null}
                </div>
                <p
                  className="w-full truncate text-center text-[15px] font-extrabold tracking-[-0.01em]"
                  style={{ color: MAQUETTE_TITLE, marginTop: 10 }}
                >
                  {athlete.name.split(" ")[0]}
                </p>
                <p
                  className="text-center text-[12px] text-[#8E8E93]"
                  style={{ marginTop: 2 }}
                >
                  Athlète
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
