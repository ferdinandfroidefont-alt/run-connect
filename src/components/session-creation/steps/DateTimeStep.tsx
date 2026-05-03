import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AppleStepHeader, AppleStepFooter, AppleGroup } from './AppleStepChrome';

interface DateTimeStepProps {
  scheduledAt: string;
  estimatedEndTimeLabel?: string | null;
  isEstimatedEndTimeProvisional?: boolean;
  onScheduledAtChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  /** Masque en-tête large + navigation (création rapide) */
  hideNavigation?: boolean;
}

const QUICK_TIMES = ['07:00', '12:00', '18:30', '20:00'];
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isoDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  scheduledAt,
  estimatedEndTimeLabel = null,
  isEstimatedEndTimeProvisional = false,
  onScheduledAtChange,
  onNext,
  onBack,
  hideNavigation = false,
}) => {
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const initialMonthAnchor = useMemo(() => {
    if (scheduledAt) {
      const parsed = new Date(scheduledAt);
      if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }
    return new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  }, [scheduledAt, todayStart]);

  const [monthAnchor, setMonthAnchor] = useState<Date>(initialMonthAnchor);

  const selectedDate = scheduledAt ? scheduledAt.split('T')[0] : '';
  const selectedTime = scheduledAt ? scheduledAt.split('T')[1] || '' : '';

  const handleDateChange = (date: string) => {
    const time = selectedTime || '09:00';
    onScheduledAtChange(`${date}T${time}`);
  };

  const handleTimeChange = (time: string) => {
    const date = selectedDate || isoDate(todayStart);
    onScheduledAtChange(`${date}T${time}`);
  };

  // Calendar grid — 6 weeks anchored on `monthAnchor`
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(1 - startWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [monthAnchor]);

  const goPrevMonth = () => {
    setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  const monthAnchorIso = isoDate(monthAnchor);
  const todayIso = isoDate(todayStart);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn('flex w-full flex-col', hideNavigation ? '' : 'min-h-0 flex-1')}
    >
      <div className={cn('px-1', hideNavigation ? '' : 'min-h-0 flex-1 overflow-y-auto pb-4')}>
        {!hideNavigation && (
          <AppleStepHeader
            step={3}
            title="Quand ?"
            subtitle="Choisis une date et une heure de départ."
          />
        )}

        {hideNavigation && (
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">Date et heure</h3>
        )}

        <div className="space-y-5">
          {/* Calendar card */}
          <div className="overflow-hidden rounded-[18px] border border-border/60 bg-card">
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <div className="text-[17px] font-semibold tracking-tight text-foreground">
                {MONTH_NAMES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  aria-label="Mois précédent"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-primary active:scale-[0.95]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  aria-label="Mois suivant"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-primary active:scale-[0.95]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1 px-3 pb-3">
              {WEEKDAY_LABELS.map((label, idx) => (
                <div
                  key={`${label}-${idx}`}
                  className="pb-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80"
                >
                  {label}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                const iso = isoDate(day);
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const isPast = startOfDay(day) < todayStart;
                const isSelected = iso === selectedDate;
                const isToday = iso === todayIso;
                return (
                  <button
                    key={`${monthAnchorIso}-${idx}`}
                    type="button"
                    disabled={isPast}
                    onClick={() => !isPast && handleDateChange(iso)}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-full text-[15px] tracking-tight transition-colors',
                      'active:scale-[0.95] disabled:cursor-not-allowed',
                      !inMonth && 'text-muted-foreground/35',
                      inMonth && !isSelected && !isPast && 'text-foreground',
                      isPast && 'text-muted-foreground/35',
                      isToday && !isSelected && 'text-primary font-semibold',
                      isSelected && 'bg-primary font-semibold text-white shadow-sm'
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker — Apple grouped cell with native time input */}
          <AppleGroup
            title="Heure de départ"
            footer={
              estimatedEndTimeLabel ? (
                <>
                  Fin estimée à {estimatedEndTimeLabel}
                  {isEstimatedEndTimeProvisional ? ' (estimation provisoire)' : ''} — basé sur tes
                  records.
                </>
              ) : null
            }
          >
            <label className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-[17px] tracking-tight text-foreground">Heure</span>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className={cn(
                  'h-9 w-auto rounded-md border-border/40 bg-secondary/50 px-3 text-right text-[17px] font-medium tracking-tight text-foreground',
                  'focus-visible:ring-1'
                )}
              />
            </label>
          </AppleGroup>

          {/* Quick times — pill chips */}
          <div className="flex flex-wrap gap-2 px-1">
            {QUICK_TIMES.map((t) => {
              const selected = selectedTime === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTimeChange(t)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-full px-4 text-[14px] tracking-tight transition-transform',
                    'active:scale-[0.96]',
                    selected
                      ? 'bg-primary text-white'
                      : 'border border-border/60 bg-card text-foreground'
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!hideNavigation && (
        <AppleStepFooter
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!scheduledAt}
          nextLabel="Continuer"
        />
      )}
    </motion.div>
  );
};
