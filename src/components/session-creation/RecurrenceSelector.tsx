import React from 'react';
import { Switch } from '@/components/ui/switch';
import { RecurrenceType } from './types';
import { EmojiBadge } from '@/components/apple';

interface RecurrenceSelectorProps {
  recurrenceType: RecurrenceType;
  recurrenceCount: number;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  onRecurrenceCountChange: (count: number) => void;
}

const RECURRENCE_WEEKS = [2, 3, 4, 6, 8, 12];

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  recurrenceType,
  recurrenceCount,
  onRecurrenceTypeChange,
  onRecurrenceCountChange,
}) => {
  const isRecurring = recurrenceType === 'weekly';

  return (
    <div className="space-y-3">
      {/* Toggle récurrence */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium tracking-tight text-foreground">Séance récurrente</p>
          <p className="text-[13px] text-muted-foreground">Répéter chaque semaine</p>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={(checked) => onRecurrenceTypeChange(checked ? 'weekly' : 'none')}
        />
      </div>

      {/* Nombre de semaines */}
      {isRecurring && (
        <div className="pt-3 border-t border-border">
          <p className="text-[13px] text-muted-foreground mb-3">Pendant combien de semaines ?</p>
          <div className="flex flex-wrap gap-2">
            {RECURRENCE_WEEKS.map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => onRecurrenceCountChange(weeks)}
                className={`
                  px-4 py-2 rounded-full text-[15px] font-medium transition-all
                  ${recurrenceCount === weeks
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }
                `}
              >
                {weeks} sem.
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
            <EmojiBadge emoji="📅" className="bg-[#0A66D0]" />
            <p className="min-w-0 text-[13px] leading-snug text-muted-foreground">
              {recurrenceCount} séances seront créées automatiquement, une chaque semaine au même jour et heure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};