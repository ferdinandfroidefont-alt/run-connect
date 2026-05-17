import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { addDays, startOfWeek } from 'date-fns';
import { SessionFormData, SelectedLocation, type SessionBlock, ACTIVITY_TYPES } from '../types';
import { cn } from '@/lib/utils';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import { AppleStepFooter, AppleStepHeader } from './AppleStepChrome';
import { WIZARD_ACTION_BLUE, WIZARD_TITLE } from '../wizardVisualTokens';
import { CoachingBlockEditorPanel, type CoachingSessionBlock } from '@/components/coaching/CoachingBlockEditorPanel';
import { ModelsPage } from '@/components/coaching/models/ModelsPage';
import { CreateModelPage } from '@/components/coaching/models/CreateModelPage';
import { defaultWizardSportIdForDraftSport } from '@/components/coaching/create-session/CoachingSessionCreateWizardSteps';
import type { SessionModelItem } from '@/components/coaching/models/types';
import { parseRCC, rccToSessionBlocks } from '@/lib/rccParser';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeBlocksForStorage,
  parseDurationSeconds,
  parseDistanceMeters,
  parsePaceToSecondsPerKm,
  formatDurationSeconds,
  formatDistanceMeters,
} from '@/lib/sessionBlockCalculations';

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

function isCoachingPositive(value?: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function paceSecPerKmToRunPaceString(sec?: number): string {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function blockIntensityToZone(intensity?: string | null): NonNullable<CoachingSessionBlock['zone']> {
  const z = intensity?.trim().toLowerCase();
  if (z === 'z1') return 'Z1';
  if (z === 'z2') return 'Z2';
  if (z === 'z3') return 'Z3';
  if (z === 'z4') return 'Z4';
  if (z === 'z5') return 'Z5';
  if (z === 'z6') return 'Z6';
  return 'Z2';
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

function coachingBlocksToSessionBlocks(blocks: CoachingSessionBlock[]): SessionBlock[] {
  return blocks.map((block) => {
    if (block.type === 'interval') {
      const pace = paceSecPerKmToRunPaceString(block.paceSecPerKm);
      const hasDistance = isCoachingPositive(block.distanceM);
      return {
        id: block.id,
        type: 'interval',
        repetitions: Math.max(1, block.repetitions ?? 1),
        blockRepetitions: Math.max(1, block.blockRepetitions ?? 1),
        effortType: hasDistance ? 'distance' : 'time',
        effortDistance: hasDistance ? formatDistanceMeters(block.distanceM) : '',
        effortDuration: hasDistance ? '' : formatDurationSeconds(block.durationSec),
        effortPace: pace,
        recoveryDuration: formatDurationSeconds(block.recoveryDurationSec),
        recoveryType: 'trot',
        effortIntensity: block.zone ? block.zone.toLowerCase() : undefined,
      };
    }
    const sessionType: 'warmup' | 'steady' | 'cooldown' =
      block.type === 'warmup' ? 'warmup' : block.type === 'cooldown' ? 'cooldown' : 'steady';
    const pace = paceSecPerKmToRunPaceString(block.paceSecPerKm);
    return {
      id: block.id,
      type: sessionType,
      durationType: isCoachingPositive(block.distanceM) && !isCoachingPositive(block.durationSec) ? 'distance' : 'time',
      duration: formatDurationSeconds(block.durationSec),
      distance: formatDistanceMeters(block.distanceM),
      pace,
      intensity: block.zone?.toLowerCase(),
    };
  });
}

function sessionBlocksToCoachingBlocks(blocks: SessionBlock[]): CoachingSessionBlock[] {
  return blocks.map((b, index) => {
    if (b.type === 'interval') {
      const effortDuration = parseDurationSeconds(b.effortDuration);
      const effortDistance = parseDistanceMeters(b.effortDistance);
      const recoveryDuration = parseDurationSeconds(b.recoveryDuration);
      return {
        id: b.id || uid(),
        order: index + 1,
        type: 'interval',
        durationSec: b.effortType === 'distance' ? undefined : effortDuration ?? undefined,
        distanceM: effortDistance ?? undefined,
        paceSecPerKm: parsePaceToSecondsPerKm(b.effortPace) ?? undefined,
        repetitions: b.repetitions,
        blockRepetitions: b.blockRepetitions,
        recoveryDurationSec: recoveryDuration ?? undefined,
        intensityMode: 'zones',
        zone: blockIntensityToZone(b.effortIntensity),
      };
    }
    const durationSec = parseDurationSeconds(b.duration);
    const distanceM = parseDistanceMeters(b.distance);
    const mapType = (): CoachingSessionBlock['type'] => {
      if (b.type === 'warmup') return 'warmup';
      if (b.type === 'cooldown') return 'cooldown';
      return 'steady';
    };
    return {
      id: b.id || uid(),
      order: index + 1,
      type: mapType(),
      durationSec: durationSec ?? undefined,
      distanceM: distanceM ?? undefined,
      paceSecPerKm: parsePaceToSecondsPerKm(b.pace) ?? undefined,
      intensityMode: 'zones',
      zone: blockIntensityToZone(b.intensity),
    };
  });
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
  wizardShellFooter?: boolean;
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
  wizardShellFooter = false,
}) => {
  const { user } = useAuth();
  const [builderTab, setBuilderTab] = useState<'build' | 'templates'>('build');
  const [coachingBlocks, setCoachingBlocks] = useState<CoachingSessionBlock[]>([]);
  const [myModels, setMyModels] = useState<SessionModelItem[]>([]);
  const [createModelOpen, setCreateModelOpen] = useState(false);
  const [schemaEditorKey, setSchemaEditorKey] = useState(0);
  const hydratedStructuredRef = useRef(false);

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

  useEffect(() => {
    if (formData.session_mode === 'structured' && formData.blocks?.length) {
      if (!hydratedStructuredRef.current) {
        setCoachingBlocks(sessionBlocksToCoachingBlocks(formData.blocks));
        setSchemaEditorKey((k) => k + 1);
        hydratedStructuredRef.current = true;
      }
      return;
    }
    if (formData.session_mode === 'simple' && (!formData.blocks || formData.blocks.length === 0)) {
      hydratedStructuredRef.current = false;
      setCoachingBlocks([]);
    }
  }, [formData.session_mode, formData.blocks]);

  // Charger les modèles de l'utilisateur depuis Supabase
  useEffect(() => {
    if (!user) return;
    supabase
      .from('coaching_templates')
      .select('id, name, activity_type, objective, rcc_code')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setMyModels(
          data.map((row) => ({
            id: row.id,
            source: 'mine' as const,
            title: row.name || '',
            activityType: row.activity_type || 'running',
            objective: row.objective || '',
            rccCode: row.rcc_code || '',
          }))
        );
      });
  }, [user]);

  // Jours de la semaine courante (requis par ModelsPage côté planning ; inutilisé en flux séance)
  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  const handleCoachingBlocksChange = (next: CoachingSessionBlock[]) => {
    setCoachingBlocks(next);
    const sessionBlocks = normalizeBlocksForStorage(coachingBlocksToSessionBlocks(next));
    onFormDataChange({
      blocks: sessionBlocks,
      session_mode: sessionBlocks.length ? 'structured' : 'simple',
    });
  };

  const applyModelToSession = (model: SessionModelItem) => {
    hydratedStructuredRef.current = true;
    const parsed = parseRCC(model.rccCode);
    const raw = rccToSessionBlocks(parsed.blocks) as SessionBlock[];
    const blocks = normalizeBlocksForStorage(raw);

    const obj = model.objective?.trim();
    const desc = formData.description?.trim();
    let description = formData.description;
    if (obj && (!desc || !desc.includes(obj))) {
      description = desc ? `${desc}\n\nObjectif : ${obj}` : `Objectif : ${obj}`;
    }

    onFormDataChange({
      blocks,
      session_mode: blocks.length ? 'structured' : 'simple',
      title: model.title?.trim() || formData.title,
      ...(description !== formData.description ? { description } : {}),
    });
    setCoachingBlocks(parsedRccToCoachingBlocks(model.rccCode));
    setSchemaEditorKey((k) => k + 1);
    setBuilderTab('build');
  };

  const sportProp = useMemo((): 'running' | 'cycling' | 'swimming' | 'strength' => {
    const t = formData.activity_type;
    if (t === 'cycling' || t === 'velo') return 'cycling';
    if (t === 'swimming' || t === 'natation') return 'swimming';
    if (t === 'strength' || t === 'renforcement') return 'strength';
    return 'running';
  }, [formData.activity_type]);

  const suppressFooter = hideNavigation || wizardShellFooter;

  const activityShort =
    ACTIVITY_TYPES.find((a) => a.value === formData.activity_type)?.label.replace(/^[^\s]+\s/, '').trim() ??
    'Séance';
  const locationHeadline = selectedLocation?.name?.split(',')[0]?.trim() ?? '';
  const headline =
    locationHeadline && activityShort ? `${activityShort} à ${locationHeadline}` : activityShort || 'Séance';

  const scrollInStep = !hideNavigation && !wizardShellFooter;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden',
        !hideNavigation && 'flex-1'
      )}
    >
      <div
        className={cn(
          'min-w-0 max-w-full space-y-4 overflow-x-hidden px-0 overscroll-x-none',
          hideNavigation ? 'pb-0' : scrollInStep ? 'flex-1 overflow-y-auto overscroll-contain pb-4' : 'pb-4'
        )}
      >
        {!hideNavigation && wizardShellFooter && (
          <AppleStepHeader titleVariant="compact" title={headline} className="pb-4" />
        )}

        {!hideNavigation && !wizardShellFooter && (
          <div className="px-1">
            <input
              className="w-full bg-transparent font-display text-[42px] font-semibold tracking-[-0.8px] text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:outline-none"
              placeholder="Nom de la séance"
              value={formData.title}
              onChange={(e) => onFormDataChange({ title: e.target.value })}
            />
          </div>
        )}

        <div className={cn('flex gap-2', wizardShellFooter && 'mt-4')}>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-full py-3 text-center text-[16px] font-bold transition-transform active:scale-[0.98]'
            )}
            style={
              builderTab === 'build'
                ? { background: WIZARD_ACTION_BLUE, color: '#fff' }
                : { background: '#fff', color: WIZARD_TITLE, border: '1px solid #E5E5EA' }
            }
            onClick={() => setBuilderTab('build')}
          >
            Construire
          </button>
          <button
            type="button"
            className={cn('flex-1 rounded-full py-3 text-center text-[16px] font-bold transition-transform active:scale-[0.98]')}
            style={
              builderTab === 'templates'
                ? { background: WIZARD_ACTION_BLUE, color: '#fff' }
                : { background: '#fff', color: WIZARD_TITLE, border: '1px solid #E5E5EA' }
            }
            onClick={() => setBuilderTab('templates')}
          >
            Modèles
          </button>
        </div>

        {builderTab === 'build' ? (
          <div className="min-w-0 max-w-full overflow-x-hidden">
            <CoachingBlockEditorPanel
              key={schemaEditorKey}
              sport={sportProp}
              initialBlocks={coachingBlocks.length ? coachingBlocks : undefined}
              onChange={handleCoachingBlocksChange}
            />
          </div>
        ) : (
          <div className="min-w-0 max-w-full overflow-x-hidden">
          <ModelsPage
            weekDays={weekDays}
            existingSessionsByDay={{}}
            myModels={myModels}
            baseModels={BASE_MODELS}
            onCreateModel={() => setCreateModelOpen(true)}
            onApplyToSession={(model) => applyModelToSession(model)}
            onEditModel={(model) => applyModelToSession(model)}
            onDuplicateModel={() => {
              /* non applicable dans ce contexte */
            }}
            onDeleteModel={async (model) => {
              if (model.source !== 'mine') return;
              await supabase.from('coaching_templates').delete().eq('id', model.id);
              setMyModels((prev) => prev.filter((m) => m.id !== model.id));
            }}
          />
          </div>
        )}
      </div>

      {!suppressFooter && (
        <AppleStepFooter
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!formData.activity_type || !selectedLocation}
          nextLabel="Aperçu"
        />
      )}

      {createModelOpen ? (
        <CreateModelPage
          defaultWizardSportId={defaultWizardSportIdForDraftSport(sportProp)}
          defaultSport={sportProp}
          onClose={() => setCreateModelOpen(false)}
          onSaved={(model) => {
            setMyModels((prev) => [model, ...prev]);
            setCreateModelOpen(false);
            setBuilderTab('templates');
          }}
        />
      ) : null}
    </motion.div>
  );
};
