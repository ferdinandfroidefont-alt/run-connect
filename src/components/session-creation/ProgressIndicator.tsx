import React from 'react';
import { motion } from 'framer-motion';
import { WizardStep } from './types';
import { cn } from '@/lib/utils';

const STEP_LABELS: Record<WizardStep, string> = {
  location: 'Lieu',
  activity: 'Sport',
  datetime: 'Date',
  details: 'Détails',
  confirm: 'Booster',
  essentials: 'Plan',
  finalize: 'Publier',
};

interface ProgressIndicatorProps {
  currentStep: WizardStep;
  progress: number;
  steps: WizardStep[];
}

/**
 * Indicateur Apple : pastilles segmentées (rythme du wizard) + libellé serré
 * de l'étape en cours. Bleu Apple #0066CC pour les segments validés/actif.
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  steps,
}) => {
  const currentIndex = Math.max(0, steps.indexOf(currentStep));
  const total = steps.length;

  return (
    <div className="w-full px-4 pb-3 pt-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground/85">
          Étape {currentIndex + 1} / {total}
        </span>
        <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">
          {STEP_LABELS[currentStep]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {steps.map((step, index) => {
          const reached = index <= currentIndex;
          return (
            <motion.div
              key={step}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                reached ? 'bg-primary' : 'bg-muted'
              )}
              initial={false}
              animate={{ opacity: reached ? 1 : 0.55 }}
              transition={{ duration: 0.25 }}
            />
          );
        })}
      </div>
    </div>
  );
};
