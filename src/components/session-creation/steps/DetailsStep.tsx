import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { SessionBlockBuilder } from '../SessionBlockBuilder';
import { SessionFormData, SelectedLocation } from '../types';
import { cn } from '@/lib/utils';
import { estimateSessionDurationMinutes } from '@/lib/estimateSessionDurationMinutes';
import { normalizeBlocksForStorage, resolveSessionTotals } from '@/lib/sessionBlockCalculations';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import { computeBlocksDistanceKm, formatDistanceForInput } from '../utils/computeBlocksDistance';
import { AppleStepFooter } from './AppleStepChrome';

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
  const isStructured = true;
  const resolvedBlocks = React.useMemo(
    () => normalizeBlocksForStorage(formData.blocks),
    [formData.blocks]
  );
  const computedDistanceKm = React.useMemo(
    () => (isStructured ? computeBlocksDistanceKm(resolvedBlocks) : null),
    [isStructured, resolvedBlocks]
  );
  useEffect(() => {
    if (!isStructured || computedDistanceKm == null) return;
    const formatted = formatDistanceForInput(computedDistanceKm);
    if (formatted !== formData.distance_km) {
      onFormDataChange({ distance_km: formatted });
    }
  }, [isStructured, computedDistanceKm, formData.distance_km, onFormDataChange]);

  const resolvedTotals = useMemo(
    () => resolveSessionTotals(normalizeBlocksForStorage(formData.blocks)),
    [formData.blocks]
  );
  const estimatedDurationMin = useMemo(
    () =>
      estimateSessionDurationMinutes({
        session_blocks: formData.blocks,
        distance_km:
          resolvedTotals.distanceKm ??
          (formData.distance_km ? Number.parseFloat(formData.distance_km) : null),
        interval_distance: formData.interval_distance
          ? Number.parseFloat(formData.interval_distance)
          : null,
        interval_count: formData.interval_count ? Number.parseInt(formData.interval_count, 10) : null,
        interval_pace: formData.interval_pace || null,
        pace_general: formData.pace_general || null,
      }),
    [
      formData.blocks,
      formData.distance_km,
      formData.interval_count,
      formData.interval_distance,
      formData.interval_pace,
      formData.pace_general,
      resolvedTotals.distanceKm,
    ]
  );

  const distanceLabel = useMemo(() => {
    const km = resolvedTotals.distanceKm ?? (formData.distance_km ? Number.parseFloat(formData.distance_km) : null);
    if (!km || Number.isNaN(km)) return null;
    return `${km.toFixed(km >= 10 ? 0 : 1).replace('.', ',')} km`;
  }, [formData.distance_km, resolvedTotals.distanceKm]);

  const durationLabel = useMemo(() => {
    if (!estimatedDurationMin || estimatedDurationMin <= 0) return null;
    return `~${Math.round(estimatedDurationMin)} min`;
  }, [estimatedDurationMin]);

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
        <div className="px-1">
          <div className="grid grid-cols-2 gap-2 rounded-full border border-[#d8d8dd] bg-white p-1">
            <button
              type="button"
              className={cn(
                'h-10 rounded-full text-[15px] font-semibold tracking-[-0.2px]',
                builderTab === 'build' ? 'bg-[#0066cc] text-white' : 'text-[#1d1d1f]'
              )}
              onClick={() => setBuilderTab('build')}
            >
              Construire
            </button>
            <button
              type="button"
              className={cn(
                'h-10 rounded-full text-[15px] font-semibold tracking-[-0.2px]',
                builderTab === 'templates' ? 'bg-[#0066cc] text-white' : 'text-[#1d1d1f]'
              )}
              onClick={() => setBuilderTab('templates')}
            >
              Modèles
            </button>
          </div>
        </div>

        <div className="px-1">
          <input
            className="w-full bg-transparent font-display text-[42px] font-semibold tracking-[-0.8px] text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:outline-none"
            placeholder="Nom de la séance"
            value={formData.title}
            onChange={(e) => onFormDataChange({ title: e.target.value })}
          />
          <p className="mt-1 text-[14px] text-[#7a7a7a]">
            {[distanceLabel, durationLabel].filter(Boolean).join(' · ') || 'Ajoute des blocs pour estimer la séance'}
          </p>
        </div>

        {builderTab === 'build' ? (
          <>
            <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-3 py-3">
              <SessionBlockBuilder
                blocks={formData.blocks}
                activityType={formData.activity_type || 'course'}
                onBlocksChange={(blocks) => onFormDataChange({ blocks })}
              />
            </div>

            <div className="space-y-2 px-1">
              <p className="px-1 text-[14px] font-semibold text-[#333333]">Description</p>
              <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-3">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => onFormDataChange({ description: e.target.value })}
                  placeholder="27' à 5'30/km + 2 × 2 km à 3'30/km..."
                  rows={3}
                  className="resize-none border-none bg-transparent px-0 py-0 text-[14px] leading-[1.4] text-[#333333] shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </>
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
