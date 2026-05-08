import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addDays, startOfWeek } from 'date-fns';
import { SessionFormData, SelectedLocation } from '../types';
import { cn } from '@/lib/utils';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import { AppleStepFooter } from './AppleStepChrome';
import { CoachingBlockEditorPanel, type CoachingSessionBlock } from '@/components/coaching/CoachingBlockEditorPanel';
import { ModelsPage } from '@/components/coaching/models/ModelsPage';
import type { SessionModelItem } from '@/components/coaching/models/types';
import { parseRCC } from '@/lib/rccParser';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paceStringToSecPerKm(pace?: string) {
  if (!pace) return undefined;
  const [min, sec] = pace.split(':').map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(sec)) return undefined;
  return min * 60 + sec;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function parsedRccToCoachingBlocks(rccCode: string): CoachingSessionBlock[] {
  const parsed = parseRCC(rccCode);
  return parsed.blocks.map((block, index) => ({
    id: uid(),
    order: index + 1,
    type: block.type as CoachingSessionBlock['type'],
    durationSec: block.duration ? block.duration * 60 : undefined,
    distanceM: block.distance ?? undefined,
    paceSecPerKm: paceStringToSecPerKm(block.pace),
    repetitions: block.repetitions ?? undefined,
    recoveryDurationSec: block.recoveryDuration ?? undefined,
    intensityMode: 'zones' as const,
    zone: 'Z2' as const,
  }));
}

// ─── Modèles de base ──────────────────────────────────────────────────────────

const BASE_MODELS: SessionModelItem[] = [
  { id: 'base-endurance-40', source: 'base', title: 'Footing 40 min + 5 x 60m', activityType: 'running', objective: 'Z2 endurance', rccCode: "15'>5'45, 5x60>3'40 r45>trot, 10'>6'00", category: 'endurance' },
  { id: 'base-long-90', source: 'base', title: 'Sortie longue 1h30', activityType: 'running', objective: 'Endurance', rccCode: "90'>5'50", category: 'endurance' },
  { id: 'base-threshold-3x10', source: 'base', title: '3 x 10 min allure seuil', activityType: 'running', objective: 'Z4 seuil', rccCode: "20'>5'25, 3x10'>4'10 r2'00>trot, 10'>5'50", category: 'threshold' },
  { id: 'base-vo2-10x400', source: 'base', title: '10 x 400m', activityType: 'running', objective: 'VO2', rccCode: "15'>5'30, 10x400>3'30 r1'15>trot, 10'>5'55", category: 'vo2' },
  { id: 'base-recovery-30', source: 'base', title: 'Footing léger 30 min', activityType: 'running', objective: 'Récup', rccCode: "30'>6'05", category: 'recovery' },
];

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
  const { user } = useAuth();
  const [builderTab, setBuilderTab] = useState<'build' | 'templates'>('build');
  const [coachingBlocks, setCoachingBlocks] = useState<CoachingSessionBlock[]>([]);
  const [myModels, setMyModels] = useState<SessionModelItem[]>([]);

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

  // Charger les modèles de l'utilisateur depuis Supabase
  useEffect(() => {
    if (!user) return;
    supabase
      .from('coaching_templates')
      .select('id, title, activity_type, objective, rcc_code, category')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setMyModels(
          data.map((row) => ({
            id: row.id,
            source: 'mine' as const,
            title: row.title || '',
            activityType: row.activity_type || 'running',
            objective: row.objective || '',
            rccCode: row.rcc_code || '',
            category: row.category || 'endurance',
          }))
        );
      });
  }, [user]);

  // Jours de la semaine courante (requis par ModelsPage)
  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  // Applique un modèle au builder : charge ses blocs et bascule vers "Construire"
  const applyModel = (model: SessionModelItem) => {
    const blocks = parsedRccToCoachingBlocks(model.rccCode);
    if (blocks.length) setCoachingBlocks(blocks);
    if (model.title && !formData.title) onFormDataChange({ title: model.title });
    setBuilderTab('build');
  };

  const sportProp = useMemo((): "running" | "cycling" | "swimming" | "strength" => {
    const t = formData.activity_type;
    if (t === 'cycling' || t === 'velo') return 'cycling';
    if (t === 'swimming' || t === 'natation') return 'swimming';
    if (t === 'strength' || t === 'renforcement') return 'strength';
    return 'running';
  }, [formData.activity_type]);

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
          <CoachingBlockEditorPanel
            sport={sportProp}
            initialBlocks={coachingBlocks.length ? coachingBlocks : undefined}
            onChange={setCoachingBlocks}
          />
        ) : (
          <ModelsPage
            weekDays={weekDays}
            existingSessionsByDay={{}}
            myModels={myModels}
            baseModels={BASE_MODELS}
            onCreateModel={() => setBuilderTab('build')}
            onAddToPlanning={(model) => applyModel(model)}
            onEditModel={(model) => applyModel(model)}
            onDuplicateModel={() => {/* non applicable dans ce contexte */}}
            onDeleteModel={async (model) => {
              if (model.source !== 'mine') return;
              await supabase.from('coaching_templates').delete().eq('id', model.id);
              setMyModels((prev) => prev.filter((m) => m.id !== model.id));
            }}
          />
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
