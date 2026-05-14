import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';
import { ACTIVITY_TYPES, ACTIVITY_CARD_SUBTITLE, SESSION_TYPES } from '../types';
import { cn } from '@/lib/utils';
import { AppleStepHeader, AppleStepFooter, WizardInsetCard } from './AppleStepChrome';
import {
  WIZARD_ACTION_BLUE,
  WIZARD_MUTED,
  WIZARD_SOFT_SHADOW,
  WIZARD_TITLE,
} from '../wizardVisualTokens';

const ACTIVITY_TILE_HEX: Record<string, string> = {
  course: '#007AFF',
  trail: '#AF52DE',
  velo: '#FF3B30',
  vtt: '#8E6E53',
  bmx: '#FF9500',
  gravel: '#FFCC00',
  natation: '#5AC8FA',
  marche: '#34C759',
  randonnee: '#34C759',
  ski: '#AF52DE',
  snowboard: '#AF52DE',
  yoga: '#FF3B30',
  football: '#34C759',
  basket: '#FF9500',
  volley: '#FFCC00',
  badminton: '#34C759',
  pingpong: '#FF6B7C',
  tennis: '#FF9500',
  escalade: '#8E8E93',
  petanque: '#C7C7CC',
  rugby: '#2D7A33',
  handball: '#007AFF',
  fitness: '#FF3B30',
  musculation: '#1C1C1E',
  crossfit: '#FF9500',
  boxe: '#FF3B30',
  arts_martiaux: '#1C1C1E',
  golf: '#34C759',
  kayak: '#5AC8FA',
  surf: '#5AC8FA',
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
  wizardShellFooter?: boolean;
}

function SportListBlock({
  sports,
  activityType,
  onActivityChange,
}: {
  sports: (typeof ACTIVITY_TYPES)[number][];
  activityType: string;
  onActivityChange: (activity: string) => void;
}) {
  return (
    <WizardInsetCard>
      {sports.map((activity, idx) => {
        const selected = activityType === activity.value;
        const tileBg = ACTIVITY_TILE_HEX[activity.value] ?? '#8E8E93';
        return (
          <div key={activity.value}>
            {idx > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
            <button
              type="button"
              onClick={() => onActivityChange(activity.value)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F2F2F7]"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px] leading-none"
                style={{ background: tileBg }}
                aria-hidden
              >
                {activity.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[18px] font-extrabold tracking-[-0.01em]" style={{ color: WIZARD_TITLE }}>
                  {ACTIVITY_TITLE_OVERRIDE[activity.value] ?? activity.label.replace(/^[^\s]+\s/, '')}
                </p>
                <p className="mt-px truncate text-[14px]" style={{ color: WIZARD_MUTED }}>
                  {ACTIVITY_CARD_SUBTITLE[activity.value] ?? 'Sport'}
                </p>
              </div>
              {selected ? <Check className="h-5 w-5 shrink-0" color={WIZARD_ACTION_BLUE} strokeWidth={3} /> : null}
            </button>
          </div>
        );
      })}
    </WizardInsetCard>
  );
}

export const ActivityStep: React.FC<ActivityStepProps> = ({
  activityType,
  sessionType,
  onActivityChange,
  onSessionTypeChange,
  onNext,
  onBack,
  hideNavigation = false,
  wizardShellFooter = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const suppressFooter = hideNavigation || wizardShellFooter;

  const filteredActivities = ACTIVITY_TYPES.filter((activity) =>
    activity.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularActivities = filteredActivities.slice(0, 7);
  const otherActivities = filteredActivities.slice(7);

  const showSessionType = ['course', 'trail', 'velo', 'vtt', 'gravel', 'marche'].includes(activityType);

  const sectionEyebrow = (label: string) => (
    <p
      className="mb-2.5 mt-[22px] text-[13px] font-extrabold uppercase"
      style={{ color: WIZARD_MUTED, letterSpacing: '0.12em' }}
    >
      {label}
    </p>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn('flex w-full flex-col', hideNavigation ? '' : 'min-h-0 flex-1')}
    >
      <div className={cn('px-0', hideNavigation ? '' : 'min-h-0 flex-1 overflow-y-auto pb-4')}>
        {!hideNavigation && (
          <AppleStepHeader title="Quel sport ?" subtitle="On adapte les blocs et l'allure en conséquence." />
        )}

        {hideNavigation && <h3 className="mb-3 text-[15px] font-semibold text-foreground">Activité</h3>}

        <div
          className="mt-5 flex items-center gap-2 rounded-full bg-white py-[13px] pl-[18px] pr-[18px]"
          style={{ boxShadow: WIZARD_SOFT_SHADOW }}
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2.4} style={{ color: WIZARD_MUTED }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un sport..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] font-medium outline-none placeholder:text-[#8E8E93] focus:ring-0"
            style={{ color: WIZARD_TITLE }}
          />
        </div>

        {popularActivities.length > 0 && (
          <>
            {sectionEyebrow('POPULAIRES')}
            <SportListBlock
              sports={popularActivities}
              activityType={activityType}
              onActivityChange={onActivityChange}
            />
          </>
        )}

        {otherActivities.length > 0 && (
          <>
            {sectionEyebrow('AUTRES SPORTS')}
            <SportListBlock
              sports={otherActivities}
              activityType={activityType}
              onActivityChange={onActivityChange}
            />
          </>
        )}

        {popularActivities.length === 0 && otherActivities.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-[15px]" style={{ color: WIZARD_MUTED }}>
              Aucun sport trouvé
            </p>
          </div>
        )}

        {showSessionType && (
          <div className="mt-6 space-y-2">
            <p
              className="px-0 text-[13px] font-extrabold uppercase"
              style={{ color: WIZARD_MUTED, letterSpacing: '0.12em' }}
            >
              Type de sortie
            </p>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPES.map((type) => {
                const selected = sessionType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onSessionTypeChange(type.value)}
                    className={cn(
                      'rounded-full px-4 py-2 text-[14px] font-bold transition-transform active:scale-[0.96]',
                      selected ? 'text-white' : 'border border-[#E5E5EA] bg-white'
                    )}
                    style={
                      selected
                        ? { background: WIZARD_ACTION_BLUE, boxShadow: '0 2px 8px rgba(0,122,255,0.25)' }
                        : { color: WIZARD_TITLE }
                    }
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!suppressFooter && (
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
