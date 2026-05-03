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
  startOfMonth,
  startOfWeek,
  subMonths,
  getISODay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ChevronRightIcon } from "lucide-react";
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
}: SessionCalendarViewProps) => {
  const today = new Date();

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionCalendarSession[]>();
    for (const session of sessions) {
      const dateKey = format(new Date(session.scheduled_at), "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(session);
      map.set(dateKey, existing);
    }
    return map;
  }, [sessions]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDaySessions = useMemo(() => {
    const list = sessionsByDate.get(selectedKey) ?? [];
    return [...list].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [sessionsByDate, selectedKey]);

  const isToday = isSameDay(selectedDate, today);
  const sessionCount = selectedDaySessions.length;
  const countLabel = sessionCount === 0 ? "Aucune séance" : sessionCount === 1 ? "1 séance" : `${sessionCount} séances`;

  return (
    <div className="space-y-0">
      <div className="ios-card overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <button
            type="button"
            onClick={() => onVisibleMonthChange(subMonths(visibleMonth, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-6 w-6 text-primary" strokeWidth={2.2} />
          </button>
          <span className="font-display text-[17px] font-semibold capitalize tracking-[-0.3px] text-foreground">
            {format(visibleMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <button
            type="button"
            onClick={() => onVisibleMonthChange(addMonths(visibleMonth, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-6 w-6 text-primary" strokeWidth={2.2} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b-[0.5px] border-border px-1">
          {WEEK_LABELS.map((label, i) => (
            <div
              key={`${label}-${i}`}
              className={cn(
                "py-2 text-center",
                (i === 5 || i === 6) && "opacity-70"
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.02em] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-0 pb-1">
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
                  "relative flex min-h-[52px] flex-col items-center justify-start border-border/60 pt-1.5 transition-colors",
                  idx >= 7 && "border-t-[0.5px]",
                  !inMonth && "opacity-[0.38]",
                  isSelected && !dayIsToday && "bg-primary/[0.08]",
                  isSelected && dayIsToday && "bg-transparent"
                )}
              >
                <span
                  className={cn(
                    "flex h-[26px] w-[26px] items-center justify-center rounded-full text-[15px] font-medium leading-none",
                    isWeekendDate(day) && !dayIsToday && inMonth && "text-muted-foreground",
                    !isWeekendDate(day) && inMonth && !dayIsToday && !isSelected && "text-foreground",
                    dayIsToday &&
                      "bg-[#FF3B30] font-semibold text-white shadow-sm dark:bg-[#FF453A]",
                    !dayIsToday && isSelected && "font-semibold text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 flex h-2.5 items-end justify-center gap-0.5 px-0.5">
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
      </div>

      <div className="ios-card mt-3 overflow-hidden border-t-[0.5px] border-border">
        <div className="border-b-[0.5px] border-border px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-display text-[20px] font-bold capitalize tracking-[-0.4px] text-foreground">
              {format(selectedDate, "EEEE d", { locale: fr })}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {isToday ? `aujourd'hui · ${countLabel}` : `${countLabel}`}
            </span>
          </div>
        </div>

        {selectedDaySessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[15px] text-muted-foreground">Aucune séance ce jour</p>
          </div>
        ) : (
          <div className="divide-y-[0.5px] divide-border">
            {selectedDaySessions.map((session) => {
              const org =
                session.organizer_id &&
                currentUserId &&
                session.organizer_id !== currentUserId
                  ? organizerProfiles?.get(session.organizer_id)
                  : null;
              const friends =
                Math.max(0, (session.current_participants ?? 0) - 1);
              const friendsLabel =
                friends <= 0 ? "" : friends === 1 ? "· 1 ami" : `· ${friends} amis`;

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
                  className="flex cursor-pointer items-center gap-3 bg-card px-4 py-3 text-left transition-colors active:bg-secondary/60"
                >
                  <ActivityIcon activityType={session.activity_type} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[17px] font-semibold leading-tight tracking-[-0.3px]">
                      {session.title}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                      {format(new Date(session.scheduled_at), "HH:mm", { locale: fr })} ·{" "}
                      {getActivityLabel(session.activity_type)}
                      {session.location_name ? ` · ${session.location_name}` : ""}{" "}
                      {friendsLabel}
                      {org
                        ? ` · ${org.display_name || org.username}`
                        : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" aria-hidden />
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
