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
} from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { planifierMaquetteFontStackStyle } from "@/lib/coachingPlanifierMaquette";
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

/** Maquette CoachingPage / CoachCalendar */
const ACTION_BLUE = "#007AFF";
const MAQUETTE_TITLE = "#0A0F1F";

// ── Style helpers ─────────────────────────────────────────────────────────────

function statusDotHex(status: SessionStatus): string {
  if (status === "brouillon") return "#FF9500";
  if (status === "attente") return "#FF3B30";
  return "#34C759";
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

/** Pastille sous date — teintes sport maquette COACH_SESSIONS_BY_DAY */
function sessionDotColorFromEmoji(emoji: string): string {
  if (emoji.includes("🚴")) return "#FF9500";
  if (emoji.includes("🏊")) return "#5AC8FA";
  if (emoji.includes("🏃")) return "#007AFF";
  return "#FF9500";
}

function sessionTileBgFromEmoji(emoji: string): string {
  if (emoji.includes("🚴")) return "#FF3B30";
  if (emoji.includes("🏊")) return "#5AC8FA";
  if (emoji.includes("🏃")) return "#007AFF";
  return "#FF9500";
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

  const calendarWeeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [days]);

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
    <div className="flex h-full min-h-0 flex-col apple-grouped-bg">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <MainTopHeader
        title="Planification"
        disableScrollCollapse
        largeTitleOnly
        className="apple-grouped-bg"
        largeTitleClassName="text-[36px] font-black leading-none tracking-[-0.04em] text-[#0A0F1F]"
        largeTitleFlexClassName="items-end"
        largeTitleAccessoryWrapperClassName="pb-px"
        largeTitleRight={
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
            style={{ background: ACTION_BLUE }}
          >
            {userInitial}
          </div>
        }
      />

      {/* ── Corps (fond iOS groupé #F2F2F7, maquette StickyPage) ─────── */}
      <div
        className="ios-scroll-region flex-1 overflow-y-auto"
        style={{
          ...planifierMaquetteFontStackStyle,
          backgroundColor: "#F2F2F7",
        }}
      >

        {/* Segmented Athlète / Coach — maquette lignes 3262–3279 */}
        <div className="px-5 pb-[18px] pt-3">
          <div className="flex rounded-xl p-1" style={{ background: "#E5E5EA" }}>
            {(["athlete", "coach"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className="flex-1 rounded-lg py-2 text-[15px] font-semibold transition-all"
                style={{
                  background: viewMode === mode ? "white" : "transparent",
                  color: viewMode === mode ? MAQUETTE_TITLE : "#8E8E93",
                  boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {mode === "athlete" ? "Athlète" : "Coach"}
              </button>
            ))}
          </div>
        </div>

        {/* Mois + actions — mt-5 mb-3 maquette */}
        <div className="mt-5 mb-3 flex items-center justify-between px-5">
          <button
            type="button"
            className="flex items-center gap-1 text-[22px] font-bold leading-none"
            style={{ color: ACTION_BLUE }}
            onClick={() => {/* month picker TODO */}}
          >
            {capitalizedMonth}
            <span className="text-lg leading-none" style={{ color: ACTION_BLUE }}>
              ⌄
            </span>
          </button>
          <div className="flex items-center gap-3" style={{ color: ACTION_BLUE }}>
            <button type="button" aria-label="Rechercher" onClick={() => {}}>
              <Search className="h-6 w-6" strokeWidth={2.2} />
            </button>
            <button type="button" aria-label="Ajouter une séance" onClick={() => {}}>
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        <div className="px-5">
          <div className="mb-2 grid grid-cols-7">
            {WEEK_LABELS.map((l, i) => (
              <div
                key={i}
                className="text-center text-[13px] font-medium"
                style={{ color: "#8E8E93" }}
              >
                {l}
              </div>
            ))}
          </div>
          <div className="mb-2 h-px bg-[#E5E5EA]" />

          <div>
            {calendarWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-y-3 py-2">
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const daySessions = sessionsByDate[key] ?? [];
                  const inMonth = isSameMonth(day, visibleMonth);
                  const isToday = isSameDay(day, today);
                  const isSelected = isSameDay(day, selectedDate);
                  const dotsToShow = daySessions.slice(0, 3);

                  let bg = "transparent";
                  let color = inMonth ? MAQUETTE_TITLE : "#C7C7CC";
                  if (isToday) {
                    bg = ACTION_BLUE;
                    color = "white";
                  } else if (isSelected) {
                    bg = "#0A0F1F";
                    color = "white";
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      className="flex flex-col items-center justify-start"
                      style={{ gap: 4 }}
                      onClick={() => setSelectedDate(day)}
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
                        {dotsToShow.map((s) => (
                          <span
                            key={s.id}
                            className="h-[5px] w-[5px] rounded-full"
                            style={{ background: sessionDotColorFromEmoji(s.emoji) }}
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

        {/* Détail jour */}
        <div className="mt-5 px-5 pb-[18px] pt-0">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-[24px] font-bold leading-none" style={{ color: MAQUETTE_TITLE }}>
              {capitalizedDayLabel}
            </h2>
            <p className="text-[15px]" style={{ color: "#8E8E93" }}>
              {selectedSessions.length === 0
                ? "Aucune séance"
                : `${selectedSessions.length} séance${selectedSessions.length > 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="space-y-2">
            {selectedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-[14px] bg-white p-3"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-[24px] leading-none"
                  style={{ background: sessionTileBgFromEmoji(session.emoji) }}
                >
                  {session.emoji}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold" style={{ color: "#0A1628" }}>
                    {session.title}
                  </div>
                  <div
                    className="mt-0.5 flex items-center gap-1 text-[12px]"
                    style={{ color: "#8E8E93" }}
                  >
                    <span className="flex items-center gap-1 font-medium" style={{ color: "#0A1628" }}>
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

                <button
                  type="button"
                  className="shrink-0 rounded-full px-[14px] py-[7px] text-[13px] font-semibold transition-opacity active:opacity-70"
                  style={{ background: "#F7F7F8", color: ACTION_BLUE }}
                >
                  ›
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-white transition-all active:scale-[0.99]"
            style={{
              background: ACTION_BLUE,
              boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)",
            }}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Créer une séance
          </button>
        </div>

        {/* Mes athlètes — MesAthletesSection maquette */}
        <div className="mt-7">
          <p
            className="px-5 text-[13px] font-extrabold tracking-[0.08em]"
            style={{ color: "#8E8E93", marginBottom: 12 }}
          >
            MES ATHLÈTES · {MOCK_ATHLETES.length}
          </p>
          <div
            className="flex gap-3 overflow-x-auto pb-2 pl-5 pr-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: "x proximity" }}
          >
            {MOCK_ATHLETES.map((athlete) => (
              <button
                key={athlete.name}
                type="button"
                className="flex flex-shrink-0 flex-col items-center rounded-2xl bg-white text-left transition-transform active:scale-[0.97]"
                style={{
                  padding: "14px 12px 12px 12px",
                  width: 116,
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                  scrollSnapAlign: "start",
                }}
              >
                <div className="relative mx-auto" style={{ width: 64, height: 64 }}>
                  <div
                    className="h-full w-full rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                    style={{ background: avatarGradient(athlete.avatarClass) }}
                  />
                  <span
                    className="absolute h-3 w-3 rounded-full border-2 border-white"
                    style={{
                      bottom: 2,
                      right: 4,
                      background: dotBgHex(athlete.dotColor),
                    }}
                  />
                </div>
                <p
                  className="w-full truncate text-center text-[15px] font-extrabold tracking-[-0.01em]"
                  style={{ color: MAQUETTE_TITLE, marginTop: 10 }}
                >
                  {athlete.name}
                </p>
                <p className="text-center text-[12px] text-[#8E8E93]" style={{ marginTop: 2 }}>
                  {athlete.role}
                </p>
              </button>
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
