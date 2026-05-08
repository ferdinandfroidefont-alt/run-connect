import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SessionBlockBuilder } from '../SessionBlockBuilder';
import { SessionFormData, SelectedLocation } from '../types';
import { cn } from '@/lib/utils';
import { normalizeBlocksForStorage, resolveSessionTotals } from '@/lib/sessionBlockCalculations';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import { computeBlocksDistanceKm, formatDistanceForInput } from '../utils/computeBlocksDistance';
import { AppleStepFooter } from './AppleStepChrome';
import { useState } from 'react';

interface DetailsStepProps {
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  imagePreview: string | null;
  isPremium: boolean;
  onFormDataChange: (updates: Partial<SessionFormData>) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  onNext: () => void;
  onBack: () => void;
  /** Masque les boutons Retour / Aperçu (cas avancé) */
  hideNavigation?: boolean;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  formData,
  selectedLocation,
  imagePreview: _imagePreview,
  isPremium: _isPremium,
  onFormDataChange,
  onImageSelect: _onImageSelect,
  onImageRemove: _onImageRemove,
  onNext,
  onBack,
  hideNavigation = false,
}) => {
  const [builderTab, setBuilderTab] = useState<'build' | 'templates'>('build');

  // Auto-generate title suggestion
  useEffect(() => {
    if (!formData.title && formData.activity_type && selectedLocation) {
      onFormDataChange({
        title: resolveSessionTitle({
          title: '',
          activity_type: formData.activity_type,
          locationName: selectedLocation.name,
        }),
      });
    }
  }, [formData.activity_type, formData.title, onFormDataChange, selectedLocation]);

  // Keep structured mode for the visual builder.
  useEffect(() => {
    if (formData.session_mode !== 'structured') {
      onFormDataChange({ session_mode: 'structured' });
    }
  }, [formData.session_mode, onFormDataChange]);

  // Auto-compute distance from structured blocks
  const resolvedBlocks = React.useMemo(
    () => normalizeBlocksForStorage(formData.blocks),
    [formData.blocks]
  );
  const computedDistanceKm = React.useMemo(
    () => computeBlocksDistanceKm(resolvedBlocks),
    [resolvedBlocks]
  );
  useEffect(() => {
    if (computedDistanceKm == null) return;
    const formatted = formatDistanceForInput(computedDistanceKm);
    if (formatted !== formData.distance_km) {
      onFormDataChange({ distance_km: formatted });
    }
  }, [computedDistanceKm, formData.distance_km, onFormDataChange]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn('flex min-h-0 w-full flex-col', !hideNavigation && 'flex-1')}
    >
      <div
        className={cn(
          'space-y-4 px-0',
          hideNavigation ? 'pb-0' : 'flex-1 overflow-y-auto pb-4'
        )}
      >
        {/* Titre inline — même style que la page coaching */}
        <div className="px-1">
          <input
            className="w-full bg-transparent font-display text-[42px] font-semibold tracking-[-0.8px] text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:outline-none"
            placeholder="Nom de la séance"
            value={formData.title}
            onChange={(e) => onFormDataChange({ title: e.target.value })}
          />
        </div>

        {/* Tabs coaching-style */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={cn(
              'h-8 rounded-full border text-center text-[13px] font-semibold transition-colors',
              builderTab === 'build'
                ? 'border-[#0066cc] bg-[#0066cc] text-white'
                : 'border-[#e0e0e0] bg-white text-[#1d1d1f]'
            )}
            onClick={() => setBuilderTab('build')}
          >
            Construire
          </button>
          <button
            type="button"
            className={cn(
              'h-8 rounded-full border text-center text-[13px] font-semibold transition-colors',
              builderTab === 'templates'
                ? 'border-[#0066cc] bg-[#0066cc] text-white'
                : 'border-[#e0e0e0] bg-white text-[#1d1d1f]'
            )}
            onClick={() => setBuilderTab('templates')}
          >
            Modèles
          </button>
        </div>

        {builderTab === 'build' ? (
          <SessionBlockBuilder
            blocks={formData.blocks}
            activityType={formData.activity_type || 'course'}
            onBlocksChange={(blocks) => onFormDataChange({ blocks })}
          />
        ) : (
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-4 text-[14px] text-[#7a7a7a]">
            Modèles prédéfinis bientôt disponibles.
          </div>
        )}
      </div>

      {!hideNavigation && (
        <AppleStepFooter
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!formData.activity_type || !selectedLocation}
          nextLabel="Aperçu"
        />
      )}
    </motion.div>
  );
};
