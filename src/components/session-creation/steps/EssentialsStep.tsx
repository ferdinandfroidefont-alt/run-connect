import React from 'react';
import { motion } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationStep } from './LocationStep';
import { DateTimeStep } from './DateTimeStep';
import { ActivityStep } from './ActivityStep';
import type { SessionFormData, SelectedLocation } from '../types';
import { cn } from '@/lib/utils';

interface EssentialsStepProps {
  map: MapboxMap | null;
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  onLocationSelect: (location: SelectedLocation) => void;
  onFormDataChange: (updates: Partial<SessionFormData>) => void;
  onNext: () => void;
  canProceed: boolean;
}

const noop = () => {};

/**
 * Étape 1 création rapide : lieu + date/heure + activité sur une seule vue scrollable.
 */
export const EssentialsStep: React.FC<EssentialsStepProps> = ({
  map,
  formData,
  selectedLocation,
  onLocationSelect,
  onFormDataChange,
  onNext,
  canProceed,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      <p className="mb-3 shrink-0 text-[13px] font-medium text-muted-foreground">
        Étape 1 · Lieu, horaire et sport
      </p>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pb-2 [-webkit-overflow-scrolling:touch]">
        <section>
          <h3 className="mb-2 text-[15px] font-semibold text-foreground">Lieu de rendez-vous</h3>
          <LocationStep
            map={map}
            selectedLocation={selectedLocation}
            onLocationSelect={onLocationSelect}
            onNext={noop}
            hideFooter
          />
        </section>

        <div className="h-px bg-border/70" role="presentation" />

        <section>
          <DateTimeStep
            scheduledAt={formData.scheduled_at}
            onScheduledAtChange={(v) => onFormDataChange({ scheduled_at: v })}
            onNext={noop}
            onBack={noop}
            hideNavigation
          />
        </section>

        <div className="h-px bg-border/70" role="presentation" />

        <section>
          <ActivityStep
            activityType={formData.activity_type}
            sessionType={formData.session_type}
            onActivityChange={(a) => onFormDataChange({ activity_type: a })}
            onSessionTypeChange={(t) => onFormDataChange({ session_type: t })}
            onNext={noop}
            onBack={noop}
            hideNavigation
          />
        </section>
      </div>

      <div
        className={cn(
          'relative z-10 -mx-4 shrink-0 border-t border-border/60 bg-secondary/95 px-4 pt-4',
          'backdrop-blur-md supports-[backdrop-filter]:bg-secondary/90',
          'pb-[max(1rem,env(safe-area-inset-bottom,1rem))]'
        )}
      >
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="h-14 w-full text-lg font-semibold"
        >
          Détails et publication
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
};
