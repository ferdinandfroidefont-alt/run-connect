import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ACTIVITY_TYPES, SESSION_TYPES } from '../types';
import { cn } from '@/lib/utils';
import { AppleStepHeader, AppleStepFooter, AppleGroup } from './AppleStepChrome';

const ACTIVITY_EMOJI_BG: Record<string, string> = {
  course: 'bg-[#0A66D0]',
  trail: 'bg-[#0A66D0]',
  velo: 'bg-[#FF9500]',
  vtt: 'bg-[#FF9500]',
  bmx: 'bg-[#FF9500]',
  gravel: 'bg-[#FF9500]',
  natation: 'bg-[#5AC8FA]',
  marche: 'bg-[#34C759]',
  randonnee: 'bg-[#34C759]',
  ski: 'bg-[#AF52DE]',
  snowboard: 'bg-[#AF52DE]',
  yoga: 'bg-[#FF2D55]',
  football: 'bg-[#34C759]',
  basket: 'bg-[#FF9500]',
  volley: 'bg-[#FFCC00]',
  badminton: 'bg-[#65A30D]',
  pingpong: 'bg-[#FB7185]',
  tennis: 'bg-[#F59E0B]',
  escalade: 'bg-[#8E8E93]',
  petanque: 'bg-[#8E8E93]',
  rugby: 'bg-[#15803D]',
  handball: 'bg-[#0A66D0]',
  fitness: 'bg-[#FF2D55]',
  musculation: 'bg-[#3F3F46]',
  crossfit: 'bg-[#F97316]',
  boxe: 'bg-[#DC2626]',
  arts_martiaux: 'bg-[#1F2937]',
  golf: 'bg-[#34C759]',
  kayak: 'bg-[#06B6D4]',
  surf: 'bg-[#06B6D4]',
};

const ACTIVITY_SUBTITLE: Record<string, string> = {
  course: 'Trail · route',
  trail: 'Trail · route',
  velo: 'Route · gravel · MTB',
  vtt: 'Route · gravel · MTB',
  bmx: 'Route · gravel · MTB',
  gravel: 'Route · gravel · MTB',
  natation: 'Piscine · open water',
  marche: 'Marche · trek',
  randonnee: 'Marche · trek',
  ski: 'Alpin · rando',
  snowboard: 'Alpin · rando',
  yoga: 'Étirements · mobilité',
  football: 'Match · entraînement',
  basket: 'Terrain · match',
  volley: 'Indoor · beach',
  badminton: 'Simple · double',
  pingpong: 'Loisir · compétition',
  tennis: 'Simple · double',
  escalade: 'Bloc · voie',
  petanque: 'Loisir · concours',
  rugby: 'XV · VII',
  handball: 'Indoor · match',
  fitness: 'Cardio · renfo',
  musculation: 'Force · hypertrophie',
  crossfit: 'WOD · force',
  boxe: 'Technique · sparring',
  arts_martiaux: 'Kata · combat',
  golf: 'Practice · parcours',
  kayak: 'Rivière · mer',
  surf: 'Vagues · technique',
};

const ACTIVITY_TITLE_OVERRIDE: Record<string, string> = {
  course: 'Course',
  velo: 'Vélo',
};

interface ActivityStepProps {
  activityType: string;
  sessionType: string;
  onActivityChange: (activity: string) => void;
  onSessionTypeChange: (type: string) => void;
  onNext: () => void;
  onBack: () => void;
  hideNavigation?: boolean;
}

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

        {/* Search bar — sticky like page header */}
        <div className="sticky top-0 z-20 -mx-1 bg-secondary/95 px-1 pb-3 pt-1 supports-[backdrop-filter]:bg-secondary/85 supports-[backdrop-filter]:backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un sport..."
              className="h-12 w-full rounded-full border-border/60 bg-card pl-11 pr-4 text-[17px] tracking-tight placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        <div className="mt-2 space-y-5">
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
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[15px] leading-none',
                      ACTIVITY_EMOJI_BG[activity.value] ?? 'bg-[#8E8E93]'
                    )}
                    aria-hidden="true"
                  >
                    {activity.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-normal tracking-tight text-foreground">
                      {ACTIVITY_TITLE_OVERRIDE[activity.value] ?? activity.label.replace(/^[^\s]+\s/, '')}
                    </div>
                    <div className="truncate text-[14px] leading-tight text-muted-foreground">
                      {ACTIVITY_SUBTITLE[activity.value] ?? 'Sport'}
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
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[15px] leading-none',
                        ACTIVITY_EMOJI_BG[activity.value] ?? 'bg-[#8E8E93]'
                      )}
                      aria-hidden="true"
                    >
                      {activity.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[17px] font-normal tracking-tight text-foreground">
                        {ACTIVITY_TITLE_OVERRIDE[activity.value] ?? activity.label.replace(/^[^\s]+\s/, '')}
                      </div>
                      <div className="truncate text-[14px] leading-tight text-muted-foreground">
                        {ACTIVITY_SUBTITLE[activity.value] ?? 'Sport'}
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
