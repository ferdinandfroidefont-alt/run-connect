import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Bike, Calendar, FileText, Check } from 'lucide-react';
import { WizardStep, WIZARD_STEPS } from './types';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentStep: WizardStep;
  progress: number;
}

const STEP_ICONS: Record<WizardStep, React.ElementType> = {
  location: MapPin,
  activity: Bike,
  datetime: Calendar,
  details: FileText,
  confirm: Check,
};

const STEP_LABELS: Record<WizardStep, string> = {
  location: 'Lieu',
  activity: 'Sport',
  datetime: 'Date',
  details: 'Détails',
  confirm: 'Confirmer',
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, progress }) => {
  const currentIndex = WIZARD_STEPS.indexOf(currentStep);

  return (
    <div className="w-full px-4 py-1">
      {/* Progress bar */}
      <div className="relative h-1 bg-white/10 rounded-full overflow-hidden mb-4">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between items-center">
        {WIZARD_STEPS.map((step, index) => {
          const Icon = STEP_ICONS[step];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step} className="flex flex-col items-center gap-1">
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary/20 border-2 border-primary text-primary",
                  !isCompleted && !isCurrent && "bg-white/5 text-muted-foreground"
                )}
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isCurrent ? "text-primary" : "text-muted-foreground"
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
