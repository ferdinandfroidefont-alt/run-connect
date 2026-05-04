import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
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
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";
import { getActivitySolidBgClass } from "@/lib/activityIcons";

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
  children,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const CARD_SWIPE_THRESHOLD = -80;
  const SWIPE_ACTION_WIDTH = 148;
  const [opened, setOpened] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="relative overflow-hidden">
      <div
        className={`absolute inset-y-0 right-0 flex w-[148px] items-center justify-center bg-primary px-3 transition-opacity ${
          opened || isDragging ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onConfirm();
            setOpened(false);
          }}
          className="h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          Confirmer cette séance
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_ACTION_WIDTH, right: 0 }}
        dragElastic={0.08}
        animate={{ x: opened ? -SWIPE_ACTION_WIDTH : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          if (info.offset.x < CARD_SWIPE_THRESHOLD) {
            setOpened(true);
            return;
          }
          if (info.offset.x > -24) {
            setOpened(false);
          }
        }}
        onTap={() => {
          if (opened) setOpened(false);
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
  organizerProfiles,
  currentUserId,
  onAddSession,
}: SessionCalendarViewProps) => {
  const today = new Date();
  const monthInputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const monthPickerValue = format(visibleMonth, "yyyy-MM");

  return (
    <div className="space-y-0">
      <input
        ref={monthInputRef}
        type="month"
        className="sr-only"
        value={monthPickerValue}
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) return;
          const [y, m] = raw.split("-").map(Number);
          if (y && m) onVisibleMonthChange(startOfMonth(new Date(y, m - 1, 1)));
        }}
      />

      {/* Maquette 13 — rangée mois + ⌕ + (Apple Calendar) */}
      <div className="flex items-baseline justify-between px-4">
        <button
          type="button"
          className="flex min-w-0 items-baseline gap-0.5 text-left text-primary active:opacity-70"
          onClick={() => monthInputRef.current?.showPicker?.() ?? monthInputRef.current?.click()}
          aria-label="Choisir le mois"
        >
          <span className="font-display text-[22px] font-bold capitalize tracking-[-0.5px]">
            {format(visibleMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <ChevronDown className="relative top-px h-[13px] w-[13px] shrink-0" strokeWidth={2.4} aria-hidden />
        </button>
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
                  role="button"
                  tabIndex={0}
                  onClick={() => onSessionClick(session)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSessionClick(session);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 bg-card px-4 py-[11px] text-left transition-colors active:bg-secondary/60",
                    !isLastRow && "border-b-[0.5px] border-border"
                  )}
                >
                  <ActivityIcon
                    activityType={session.activity_type}
                    size="md"
                    className="!h-11 !w-11 shrink-0 !rounded-[10px] [&>svg]:!h-[22px] [&>svg]:!w-[22px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold leading-[1.15] tracking-[-0.4px] text-foreground">
                      {session.title}
                    </p>
                    <p className="mt-px truncate text-[13px] text-muted-foreground">
                      {timeLabel} ·{" "}
                      {getActivityLabel(session.activity_type)}
                      {session.location_name ? ` · ${session.location_name}` : ""} {friendsLabel}
                      {org ? ` · ${org.display_name || org.username}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-[15px] w-[15px] shrink-0 text-muted-foreground/55" aria-hidden />
                </div>
              );

              if (onConfirmSession) {
                return (
                  <SwipeConfirmCard key={session.id} onConfirm={() => onConfirmSession(session)}>
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
