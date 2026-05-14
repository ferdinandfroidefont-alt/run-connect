import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  startOfMonth,
  startOfWeek,
  getISODay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivityLabel, getActivitySolidBgClass } from "@/lib/activityIcons";
import { getActivityEmoji, getDiscoverSportTileClass } from "@/lib/discoverSessionVisual";

export type SessionCalendarSession = {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string;
  current_participants: number;
  location_name: string;
  organizer_id?: string;
};

const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function isWeekendDate(d: Date): boolean {
  const iso = getISODay(d);
  return iso === 6 || iso === 7;
}

interface SessionCalendarViewProps {
  sessions: SessionCalendarSession[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  visibleMonth: Date;
  onVisibleMonthChange: (d: Date) => void;
  onSessionClick: (session: SessionCalendarSession) => void;
  /** Swipe « confirmer » (même comportement que la liste Mes séances) */
  onConfirmSession?: (session: SessionCalendarSession) => void;
  /** Swipe inverse « commenter » */
  onCommentSession?: (session: SessionCalendarSession) => void;
  organizerProfiles?: Map<
    string,
    { username: string; display_name: string; avatar_url: string | null }
  >;
  currentUserId?: string;
  /** Maquette 13 : + sur la rangée du mois (en plus du trailing NavBar) */
  onAddSession?: () => void;
}

function SwipeConfirmCard({
  onConfirm,
  onComment,
  children,
}: {
  onConfirm: () => void;
  onComment: () => void;
  children: React.ReactNode;
}) {
  const CARD_SWIPE_THRESHOLD = 80;
  const SWIPE_ACTION_WIDTH = 148;
  const [openedSide, setOpenedSide] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="relative overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 flex w-[148px] items-center justify-center bg-[#34C759] px-3 transition-opacity ${
          openedSide === "left" || isDragging ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onComment();
            setOpenedSide(null);
          }}
          className="h-10 w-full rounded-full bg-[#34C759] text-sm font-semibold text-white"
        >
          Commenter une séance
        </button>
      </div>

      <div
        className={`absolute inset-y-0 right-0 flex w-[148px] items-center justify-center bg-primary px-3 transition-opacity ${
          openedSide === "right" || isDragging ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onConfirm();
            setOpenedSide(null);
          }}
          className="h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          Confirmer cette séance
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_ACTION_WIDTH, right: SWIPE_ACTION_WIDTH }}
        dragElastic={0.08}
        animate={{
          x: openedSide === "right" ? -SWIPE_ACTION_WIDTH : openedSide === "left" ? SWIPE_ACTION_WIDTH : 0,
        }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          if (info.offset.x <= -CARD_SWIPE_THRESHOLD) {
            setOpenedSide("right");
            return;
          }
          if (info.offset.x >= CARD_SWIPE_THRESHOLD) {
            setOpenedSide("left");
            return;
          }
          setOpenedSide(null);
        }}
        onTap={() => {
          if (openedSide) setOpenedSide(null);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export const SessionCalendarView = ({
  sessions,
  selectedDate,
  onSelectDate,
  visibleMonth,
  onVisibleMonthChange,
  onSessionClick,
  onConfirmSession,
  onCommentSession,
  organizerProfiles,
  currentUserId,
  onAddSession,
}: SessionCalendarViewProps) => {
  const today = new Date();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);

  const sessionsFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        (s.title ?? "").toLowerCase().includes(q) ||
        (s.location_name && s.location_name.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionCalendarSession[]>();
    for (const session of sessionsFiltered) {
      const d = new Date(session.scheduled_at ?? "");
      if (!isValid(d)) continue;
      const dateKey = format(d, "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(session);
      map.set(dateKey, existing);
    }
    return map;
  }, [sessionsFiltered]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDaySessions = useMemo(() => {
    const list = sessionsByDate.get(selectedKey) ?? [];
    return [...list].sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  }, [sessionsByDate, selectedKey]);

  const isToday = isSameDay(selectedDate, today);
  const sessionCount = selectedDaySessions.length;
  const countLabel =
    sessionCount === 0
      ? "aucune séance"
      : sessionCount === 1
        ? "1 séance"
        : `${sessionCount} séances`;

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) =>
        startOfMonth(addMonths(visibleMonth, i - 12))
      ),
    [visibleMonth]
  );

  return (
    <div className="space-y-0">
      {/* Maquette 13 — rangée mois + ⌕ + (Apple Calendar) */}
      <div className="relative flex items-baseline justify-between px-4">
        <div className="relative">
          <button
            type="button"
            className="flex min-w-0 items-baseline gap-0.5 text-left text-primary active:opacity-70"
            onClick={() => setMonthMenuOpen((open) => !open)}
            aria-label="Choisir le mois"
            aria-expanded={monthMenuOpen}
          >
            <span className="font-display text-[22px] font-bold capitalize tracking-[-0.5px]">
              {format(visibleMonth, "MMMM yyyy", { locale: fr })}
            </span>
            <ChevronDown
              className={cn(
                "relative top-px h-[13px] w-[13px] shrink-0 transition-transform",
                monthMenuOpen && "rotate-180"
              )}
              strokeWidth={2.4}
              aria-hidden
            />
          </button>
          {monthMenuOpen ? (
            <div className="absolute left-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
              <div className="max-h-64 overflow-y-auto py-1">
                {monthOptions.map((monthDate) => {
                  const isCurrent = isSameMonth(monthDate, visibleMonth);
                  return (
                    <button
                      key={format(monthDate, "yyyy-MM")}
                      type="button"
                      onClick={() => {
                        onVisibleMonthChange(monthDate);
                        setMonthMenuOpen(false);
                      }}
                      className={cn(
                        "block w-full px-3 py-2 text-left text-[15px] capitalize transition-colors",
                        isCurrent
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-popover-foreground hover:bg-muted/60"
                      )}
                    >
                      {format(monthDate, "MMMM yyyy", { locale: fr })}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3.5 text-primary">
          <button
            type="button"
            className="tap-highlight-none flex h-10 w-9 items-center justify-center rounded-md active:bg-black/[0.04] dark:active:bg-white/[0.06]"
            aria-label={searchOpen ? "Fermer la recherche" : "Rechercher une séance"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </button>
          {onAddSession ? (
            <button
              type="button"
              className="tap-highlight-none flex h-10 w-9 items-center justify-center rounded-md active:bg-black/[0.04] dark:active:bg-white/[0.06]"
              aria-label="Créer une séance"
              onClick={onAddSession}
            >
              <Plus className="h-[23px] w-[23px]" strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      </div>

      {searchOpen ? (
        <div className="px-4 pb-2 pt-1">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une séance…"
            className="h-9 w-full rounded-[10px] border-[0.5px] border-border bg-card px-3 text-[15px] font-normal text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary/40"
          />
        </div>
      ) : null}

      {/* En-tête L M M J V S D — maquette: 11px / 500, WE atténués */}
      <div className="mx-4 mt-2.5 grid grid-cols-7">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className={cn(
              "py-1 text-center text-[11px] font-medium leading-none",
              i >= 5 ? "text-foreground/30" : "text-muted-foreground"
            )}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="mx-4 h-px bg-border" aria-hidden />

      {/* Grille mois — bordures horizontales entre semaines uniquement */}
      <div className="mx-4 grid grid-cols-7">
        {days.map((day, idx) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const daySessions = sessionsByDate.get(dateKey) ?? [];
          const dayIsToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, visibleMonth);
          const isSelected = isSameDay(day, selectedDate);
          const dotClasses = [
            ...new Set(daySessions.map((s) => getActivitySolidBgClass(s.activity_type))),
          ].slice(0, 3);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => {
                onSelectDate(day);
                if (!isSameMonth(day, visibleMonth)) {
                  onVisibleMonthChange(startOfMonth(day));
                }
              }}
              className={cn(
                "flex aspect-[1/1.05] flex-col items-center pt-1.5 gap-[3px] transition-colors",
                idx >= 7 && "border-t-[0.5px] border-border",
                !inMonth && "opacity-[0.38]",
                isSelected && !dayIsToday && "bg-muted/35 dark:bg-muted/25"
              )}
            >
              <span
                className={cn(
                  "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-display text-[16px] leading-none tracking-[-0.3px]",
                  isWeekendDate(day) && !dayIsToday && inMonth && "text-foreground/30",
                  !isWeekendDate(day) && inMonth && !dayIsToday && !isSelected && "text-foreground",
                  dayIsToday && "bg-[#FF3B30] font-semibold text-white dark:bg-[#FF453A]",
                  !dayIsToday && isSelected && "font-semibold text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex h-2.5 items-end justify-center gap-[2px]">
                {dotClasses.map((cls) => (
                  <span
                    key={cls}
                    className={cn("h-1 w-1 shrink-0 rounded-full", cls)}
                    aria-hidden
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* 8px — maquette */}
      <div className="h-2 shrink-0" aria-hidden />

      {/* Panneau jour — fond cellule iOS, pas de carte arrondie englobante */}
      <div className="border-t-[0.5px] border-border bg-card">
        <div className="px-4 pb-1.5 pt-3.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-[17px] font-bold capitalize tracking-[-0.4px] text-foreground">
              {format(selectedDate, "EEEE d", { locale: fr })}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {isToday ? `aujourd'hui · ${countLabel}` : countLabel}
            </span>
          </div>
        </div>

        {selectedDaySessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[15px] text-muted-foreground">Aucune séance ce jour</p>
          </div>
        ) : (
          <div>
            {selectedDaySessions.map((session, rowIdx) => {
              const org =
                session.organizer_id &&
                currentUserId &&
                session.organizer_id !== currentUserId
                  ? organizerProfiles?.get(session.organizer_id)
                  : null;
              const friends = Math.max(0, (session.current_participants ?? 0) - 1);
              const friendsLabel =
                friends <= 0 ? "" : friends === 1 ? "· 1 ami" : `· ${friends} amis`;
              const isLastRow = rowIdx === selectedDaySessions.length - 1;
              const schedAt = new Date(session.scheduled_at ?? "");
              const timeLabel = isValid(schedAt)
                ? format(schedAt, "HH:mm", { locale: fr })
                : "—";

              const rowInner = (
                <div
                  className={cn(
                    "flex w-full items-center gap-3 bg-card/80 px-3 py-2.5 text-left transition-colors active:bg-secondary/60",
                    !isLastRow && "border-b-[0.5px] border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSessionClick(session)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[22px] leading-none text-white shadow-sm",
                        getDiscoverSportTileClass(session.activity_type)
                      )}
                      aria-hidden
                    >
                      {getActivityEmoji(session.activity_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[16px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
                        {session.title}
                      </p>
                      <p className="mt-px truncate text-[13px] text-muted-foreground">
                        {timeLabel} ·{" "}
                        {getActivityLabel(session.activity_type)}
                        {session.location_name ? ` · ${session.location_name}` : ""} {friendsLabel}
                        {org ? ` · ${org.display_name || org.username}` : ""}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSessionClick(session);
                    }}
                    className="shrink-0 rounded-full bg-[rgba(118,118,128,0.12)] px-3.5 py-1.5 text-[13px] font-semibold tracking-[-0.2px] text-primary active:opacity-70 dark:bg-white/10"
                  >
                    Ouvrir
                  </button>
                </div>
              );

              if (onConfirmSession) {
                return (
                  <SwipeConfirmCard
                    key={session.id}
                    onConfirm={() => onConfirmSession(session)}
                    onComment={() => onCommentSession?.(session)}
                  >
                    {rowInner}
                  </SwipeConfirmCard>
                );
              }

              return <div key={session.id}>{rowInner}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
