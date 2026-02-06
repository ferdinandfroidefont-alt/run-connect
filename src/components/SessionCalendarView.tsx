import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";

interface SessionItem {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string;
  current_participants: number;
  location_name: string;
}

interface SessionCalendarViewProps {
  sessions: SessionItem[];
  onSessionClick: (session: SessionItem) => void;
}

export const SessionCalendarView = ({ sessions, onSessionClick }: SessionCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    sessions.forEach(session => {
      const dateKey = format(new Date(session.scheduled_at), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      existing.push(session);
      map.set(dateKey, existing);
    });
    return map;
  }, [sessions]);

  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return sessionsByDate.get(dateKey) || [];
  }, [selectedDate, sessionsByDate]);

  const today = new Date();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="space-y-3">
      {/* Month Navigation */}
      <div className="bg-card rounded-[10px] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded-lg active:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>
          <span className="text-[17px] font-semibold text-foreground capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded-lg active:bg-secondary"
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        </div>

        {/* Week Day Headers */}
        <div className="grid grid-cols-7 px-2">
          {weekDays.map(day => (
            <div key={day} className="text-center py-1">
              <span className="text-[11px] font-medium text-muted-foreground">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 px-2 pb-3">
          {days.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySessions = sessionsByDate.get(dateKey) || [];
            const hasSession = daySessions.length > 0;
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const hasPastSession = daySessions.some(s => new Date(s.scheduled_at) < today);
            const hasFutureSession = daySessions.some(s => new Date(s.scheduled_at) >= today);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative h-10 flex flex-col items-center justify-center rounded-lg transition-colors",
                  !isCurrentMonth && "opacity-30",
                  isSelected && "bg-primary text-primary-foreground",
                  isToday && !isSelected && "bg-secondary",
                  !isSelected && "active:bg-secondary/50"
                )}
              >
                <span className={cn(
                  "text-[15px]",
                  isSelected ? "font-bold" : "font-normal",
                  !isSelected && isToday && "font-semibold text-primary"
                )}>
                  {format(day, 'd')}
                </span>
                {hasSession && (
                  <div className="flex gap-0.5 absolute bottom-0.5">
                    {hasFutureSession && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
                      )} />
                    )}
                    {hasPastSession && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground/60" : "bg-muted-foreground"
                      )} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Sessions */}
      {selectedDate && (
        <div>
          <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-1 mb-2">
            {format(selectedDate, "EEEE d MMMM", { locale: fr })}
          </p>
          {selectedDaySessions.length === 0 ? (
            <div className="bg-card rounded-[10px] p-6 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-[15px] text-muted-foreground">Aucune séance ce jour</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDaySessions.map(session => {
                const isUpcoming = new Date(session.scheduled_at) >= today;
                return (
                  <div
                    key={session.id}
                    onClick={() => onSessionClick(session)}
                    className="bg-card rounded-[10px] p-3 cursor-pointer active:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ActivityIcon activityType={session.activity_type} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={isUpcoming ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {isUpcoming ? "À venir" : "Terminée"}
                          </Badge>
                        </div>
                        <p className="text-[15px] font-semibold truncate">{session.title}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {format(new Date(session.scheduled_at), 'HH:mm', { locale: fr })} · {session.current_participants || 0} participant{(session.current_participants || 0) > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
