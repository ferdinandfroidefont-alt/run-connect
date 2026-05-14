import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppleStepHeader, AppleStepFooter } from './AppleStepChrome';
import {
  WIZARD_ACTION_BLUE,
  WIZARD_CARD_SHADOW,
  WIZARD_MUTED,
  WIZARD_TITLE,
} from '../wizardVisualTokens';

interface DateTimeStepProps {
  scheduledAt: string;
  estimatedEndTimeLabel?: string | null;
  isEstimatedEndTimeProvisional?: boolean;
  onScheduledAtChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  hideNavigation?: boolean;
  wizardShellFooter?: boolean;
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
  wizardShellFooter = false,
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

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7;
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

  const suppressFooter = hideNavigation || wizardShellFooter;
  const showHero = !hideNavigation && !wizardShellFooter;

  const calendarCardStyle = { boxShadow: WIZARD_CARD_SHADOW };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn('flex w-full flex-col', hideNavigation ? '' : 'min-h-0 flex-1')}
    >
      <div className={cn('px-0', hideNavigation ? '' : 'min-h-0 flex-1 overflow-y-auto pb-4')}>
        {showHero && (
          <AppleStepHeader title="Quand ?" subtitle="Choisis une date et une heure de départ." />
        )}

        {hideNavigation && <h3 className="mb-3 text-[15px] font-semibold text-foreground">Date et heure</h3>}

        <div className="space-y-0">
          <div className="rounded-[18px] bg-white p-4" style={calendarCardStyle}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[22px] font-extrabold tracking-[-0.02em]" style={{ color: WIZARD_TITLE }}>
                {MONTH_NAMES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={goPrevMonth} aria-label="Mois précédent" className="p-1 active:opacity-70">
                  <ChevronLeft className="h-5 w-5 stroke-[2.6]" color={WIZARD_ACTION_BLUE} />
                </button>
                <button type="button" onClick={goNextMonth} aria-label="Mois suivant" className="p-1 active:opacity-70">
                  <ChevronRight className="h-5 w-5 stroke-[2.6]" color={WIZARD_ACTION_BLUE} />
                </button>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[12px] font-semibold" style={{ color: WIZARD_MUTED }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const iso = isoDate(day);
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const isPast = startOfDay(day) < todayStart;
                const isSelected = iso === selectedDate;
                const isOut = !inMonth;
                return (
                  <button
                    key={`${monthAnchorIso}-${idx}`}
                    type="button"
                    disabled={isPast}
                    onClick={() => !isPast && handleDateChange(iso)}
                    className="flex items-center justify-center py-1.5 active:opacity-80 disabled:cursor-not-allowed"
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[17px] font-bold tabular-nums"
                      style={{
                        background: isSelected ? WIZARD_ACTION_BLUE : 'transparent',
                        color: isSelected ? '#fff' : isPast ? '#C7C7CC' : isOut ? '#C7C7CC' : WIZARD_TITLE,
                      }}
                    >
                      {day.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p
            className="mb-2.5 mt-[22px] text-[13px] font-extrabold uppercase"
            style={{ color: WIZARD_MUTED, letterSpacing: '0.1em' }}
          >
            Heure de départ
          </p>

          <div className="flex items-center justify-between rounded-2xl bg-white p-4" style={calendarCardStyle}>
            <span className="text-[18px] font-bold" style={{ color: WIZARD_TITLE }}>
              Heure
            </span>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="border-0 bg-transparent p-0 text-[17px] font-bold tabular-nums outline-none focus:ring-0"
              style={{
                color: WIZARD_TITLE,
                background: '#F2F2F7',
                borderRadius: 9,
                padding: '8px 14px',
              }}
            />
          </div>

          {estimatedEndTimeLabel ? (
            <p className="mt-2.5 text-[13px] leading-[1.4]" style={{ color: WIZARD_MUTED }}>
              Fin estimée à {estimatedEndTimeLabel}
              {isEstimatedEndTimeProvisional ? ' (estimation provisoire)' : ''} — basé sur tes records.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_TIMES.map((t) => {
              const selected = selectedTime === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTimeChange(t)}
                  className="rounded-full px-5 py-2.5 text-[16px] font-bold tabular-nums transition-transform active:scale-[0.96]"
                  style={{
                    background: selected ? WIZARD_ACTION_BLUE : '#fff',
                    color: selected ? '#fff' : WIZARD_TITLE,
                    boxShadow: selected ? '0 2px 8px rgba(0,122,255,0.25)' : '0 1px 2px rgba(0,0,0,0.04)',
                    border: selected ? 'none' : undefined,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!suppressFooter && (
        <AppleStepFooter onBack={onBack} onNext={onNext} nextDisabled={!scheduledAt} nextLabel="Continuer" />
      )}
    </motion.div>
  );
};
