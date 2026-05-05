import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ACTIVITY_TYPES, SESSION_TYPES } from '../types';
import { cn } from '@/lib/utils';
import { AppleStepHeader, AppleStepFooter, AppleGroup } from './AppleStepChrome';
import { SportIcon } from '@/components/ui/SportIcon';

interface ActivityStepProps {
  activityType: string;
  sessionType: string;
  onActivityChange: (activity: string) => void;
  onSessionTypeChange: (type: string) => void;
  onNext: () => void;
  onBack: () => void;
  hideNavigation?: boolean;
}

const ACTIVITY_BG: Record<string, string> = {
  course: 'bg-primary',
  trail: 'bg-amber-600',
  velo: 'bg-orange-500',
  vtt: 'bg-orange-600',
  bmx: 'bg-orange-500',
  gravel: 'bg-amber-700',
  marche: 'bg-emerald-600',
  natation: 'bg-sky-500',
  randonnee: 'bg-emerald-700',
  ski: 'bg-purple-500',
  snowboard: 'bg-purple-600',
  yoga: 'bg-rose-500',
  fitness: 'bg-rose-600',
  musculation: 'bg-zinc-700',
  crossfit: 'bg-orange-600',
  boxe: 'bg-rose-700',
  arts_martiaux: 'bg-zinc-800',
  football: 'bg-emerald-700',
  basket: 'bg-orange-600',
  volley: 'bg-amber-500',
  badminton: 'bg-lime-600',
  pingpong: 'bg-rose-500',
  tennis: 'bg-yellow-500',
  escalade: 'bg-stone-600',
  petanque: 'bg-stone-500',
  rugby: 'bg-emerald-800',
  handball: 'bg-blue-600',
  golf: 'bg-emerald-600',
  kayak: 'bg-cyan-600',
  surf: 'bg-cyan-500',
};

export const ActivityStep: React.FC<ActivityStepProps> = ({
  activityType,
  sessionType,
  onActivityChange,
  onSessionTypeChange,
  onNext,
  onBack,
  hideNavigation = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActivities = ACTIVITY_TYPES.filter((activity) =>
    activity.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularActivities = filteredActivities.slice(0, 8);
  const otherActivities = filteredActivities.slice(8);

  const showSessionType = ['course', 'trail', 'velo', 'vtt', 'gravel', 'marche'].includes(activityType);

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
            step={2}
            title="Quel sport ?"
            subtitle="On adapte les blocs et l'allure en conséquence."
          />
        )}

        {hideNavigation && (
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">Activité</h3>
        )}

        {/* Search bar — pill */}
        <div className="relative px-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un sport..."
            className="h-12 w-full rounded-full border-border/60 bg-card pl-11 pr-4 text-[17px] tracking-tight placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="mt-5 space-y-5">
          {/* Popular activities — list group */}
          <AppleGroup title="Populaires">
            {popularActivities.map((activity, idx) => {
              const selected = activityType === activity.value;
              return (
                <button
                  key={activity.value}
                  type="button"
                  onClick={() => onActivityChange(activity.value)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    'active:bg-secondary/80',
                    idx < popularActivities.length - 1 && 'border-b border-border/40'
                  )}
                >
                  <SportIcon sport={activity.value} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-normal tracking-tight text-foreground">
                      {activity.label.replace(/^[^\s]+\s/, '')}
                    </div>
                  </div>
                  {selected ? (
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })}
          </AppleGroup>

          {/* Other activities */}
          {otherActivities.length > 0 && (
            <AppleGroup title="Autres sports">
              {otherActivities.map((activity, idx) => {
                const selected = activityType === activity.value;
                return (
                  <button
                    key={activity.value}
                    type="button"
                    onClick={() => onActivityChange(activity.value)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      'active:bg-secondary/80',
                      idx < otherActivities.length - 1 && 'border-b border-border/40'
                    )}
                  >
                    <SportIcon sport={activity.value} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[17px] font-normal tracking-tight text-foreground">
                        {activity.label.replace(/^[^\s]+\s/, '')}
                      </div>
                    </div>
                    {selected ? (
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </AppleGroup>
          )}

          {/* Session type — chips */}
          {showSessionType && (
            <div className="space-y-2">
              <div className="px-4 text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground/85">
                Type de sortie
              </div>
              <div className="flex flex-wrap gap-2 px-1">
                {SESSION_TYPES.map((type) => {
                  const selected = sessionType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => onSessionTypeChange(type.value)}
                      className={cn(
                        'inline-flex h-9 items-center rounded-full px-4 text-[14px] tracking-tight transition-transform',
                        'active:scale-[0.96]',
                        selected
                          ? 'bg-primary text-white'
                          : 'border border-border/60 bg-card text-foreground'
                      )}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {!hideNavigation && (
        <AppleStepFooter
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!activityType}
          nextLabel="Continuer"
        />
      )}
    </motion.div>
  );
};
