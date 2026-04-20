import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Bike, Calendar, FileText, Check, ClipboardList, FileCheck } from 'lucide-react';
import { WizardStep } from './types';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<WizardStep, React.ElementType> = {
  location: MapPin,
  activity: Bike,
  datetime: Calendar,
  details: FileText,
  confirm: Check,
  essentials: ClipboardList,
  finalize: FileCheck,
};

const STEP_LABELS: Record<WizardStep, string> = {
  location: 'Lieu',
  activity: 'Sport',
  datetime: 'Date',
  details: 'Détails',
  confirm: 'Confirmer',
  essentials: 'Plan',
  finalize: 'Publier',
};

interface ProgressIndicatorProps {
  currentStep: WizardStep;
  progress: number;
  steps: WizardStep[];
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, progress, steps }) => {
  const currentIndex = Math.max(0, steps.indexOf(currentStep));

  return (
    <div className="w-full px-4 py-1">
      <div className="relative mb-4 h-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step} className="flex flex-col items-center gap-1">
              <motion.div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'border-2 border-primary bg-primary/20 text-primary',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </motion.div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors max-w-[4.5rem] text-center leading-tight',
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
