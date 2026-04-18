import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DetailsStep } from './DetailsStep';
import { ConfirmStep } from './ConfirmStep';
import type { SessionFormData, SelectedLocation } from '../types';
import { cn } from '@/lib/utils';

interface FinalizeStepProps {
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  imagePreview: string | null;
  isPremium: boolean;
  loading: boolean;
  isCoachingMode: boolean;
  onFormDataChange: (updates: Partial<SessionFormData>) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * Étape 2 création rapide : détails + options de publication + création (sans étape « Aperçu » séparée).
 */
export const FinalizeStep: React.FC<FinalizeStepProps> = ({
  formData,
  selectedLocation,
  imagePreview,
  isPremium,
  loading,
  isCoachingMode,
  onFormDataChange,
  onImageSelect,
  onImageRemove,
  onSubmit,
  onBack,
}) => {
  const primaryLabel = isCoachingMode
    ? 'Programmer ma séance'
    : formData.recurrence_type === 'weekly'
      ? `Créer ${formData.recurrence_count} séances`
      : 'Créer la séance';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      <p className="mb-3 shrink-0 text-[13px] font-medium text-muted-foreground">
        Étape 2 · Contenu et visibilité
      </p>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-2 [-webkit-overflow-scrolling:touch]">
        <DetailsStep
          formData={formData}
          selectedLocation={selectedLocation}
          imagePreview={imagePreview}
          isPremium={isPremium}
          onFormDataChange={onFormDataChange}
          onImageSelect={onImageSelect}
          onImageRemove={onImageRemove}
          onNext={onSubmit}
          onBack={onBack}
          hideNavigation
        />

        <ConfirmStep
          formData={formData}
          selectedLocation={selectedLocation}
          imagePreview={imagePreview}
          loading={loading}
          isPremium={isPremium}
          onFormDataChange={onFormDataChange}
          onSubmit={onSubmit}
          onBack={onBack}
          isCoachingMode={isCoachingMode}
          embedInFinalize
          hideFooter
        />
      </div>

      <div
        className={cn(
          'relative z-10 -mx-4 mt-2 shrink-0 border-t border-border/60 bg-secondary/95 px-4 pt-4',
          'backdrop-blur-md supports-[backdrop-filter]:bg-secondary/90',
          'pb-[max(1rem,env(safe-area-inset-bottom,1rem))]'
        )}
      >
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack} className="h-14 px-5" disabled={loading}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="h-14 flex-1 text-lg font-semibold bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                {primaryLabel}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
