import React from 'react';
import { Switch } from '@/components/ui/switch';
import { RecurrenceType } from './types';
import { EmojiBadge } from '@/components/apple';
import { cn } from '@/lib/utils';

interface RecurrenceSelectorProps {
  recurrenceType: RecurrenceType;
  recurrenceCount: number;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  onRecurrenceCountChange: (count: number) => void;
  /** Même ligne visuelle que Live tracking dans l’étape confirmation (sans titre de section séparé). */
  variant?: 'default' | 'integrated';
}

const RECURRENCE_WEEKS = [2, 3, 4, 6, 8, 12];

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  recurrenceType,
  recurrenceCount,
  onRecurrenceTypeChange,
  onRecurrenceCountChange,
  variant = 'default',
}) => {
  const isRecurring = recurrenceType === 'weekly';

  const toggleRow = (
    <div
      className={cn(
        'flex justify-between gap-3',
        variant === 'integrated' ? 'items-center px-4 py-3' : 'items-center'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {variant === 'integrated' ? (
          <EmojiBadge emoji="🔁" className="bg-[#5E5CE6]" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              variant === 'integrated'
                ? 'text-[17px] font-normal leading-snug tracking-[-0.4px] text-foreground'
                : 'text-[15px] font-medium tracking-tight text-foreground'
            )}
          >
            Séance récurrente
          </p>
          <p className="text-[13px] text-muted-foreground">Répéter chaque semaine</p>
        </div>
      </div>
      <Switch
        className="shrink-0"
        checked={isRecurring}
        onCheckedChange={(checked) => onRecurrenceTypeChange(checked ? 'weekly' : 'none')}
      />
    </div>
  );

  return (
    <div className={variant === 'default' ? 'space-y-3' : ''}>
      {toggleRow}

      {isRecurring && (
        <div className={cn('border-t border-border pt-3', variant === 'integrated' && 'px-4 pb-4')}>
          <p className="mb-3 text-[13px] text-muted-foreground">Pendant combien de semaines ?</p>
          <div className="flex flex-wrap gap-2">
            {RECURRENCE_WEEKS.map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => onRecurrenceCountChange(weeks)}
                className={cn(
                  'rounded-full px-4 py-2 text-[15px] font-medium transition-all',
                  recurrenceCount === weeks
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                )}
              >
                {weeks} sem.
              </button>
            ))}
          </div>
          <div className={cn(
            'mt-3 flex items-start gap-3 p-3',
            variant === 'integrated' ? 'rounded-[12px] bg-secondary/40' : 'rounded-xl bg-secondary/50'
          )}>
            <EmojiBadge emoji="📅" className={variant === 'integrated' ? 'bg-[#FF6482]' : 'bg-[#0A66D0]'} />
            <p className="min-w-0 text-[13px] leading-snug text-muted-foreground">
              {recurrenceCount} séances seront créées automatiquement, une chaque semaine au même jour et heure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};