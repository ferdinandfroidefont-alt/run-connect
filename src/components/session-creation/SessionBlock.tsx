import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Flame, Snowflake, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WheelValuePickerModal } from '@/components/ui/ios-wheel-picker';
import { cn } from '@/lib/utils';
import type { SessionBlock as SessionBlockType, BlockType } from './types';
import {
  formatDistanceLabel,
  formatDurationLabel,
  formatPaceLabel,
  getBlockSummary,
  resolveStructuredBlock,
  zoneLabel,
} from '@/lib/sessionBlockCalculations';

interface SessionBlockProps {
  block: SessionBlockType;
  activityType: string;
  onUpdate: (updates: Partial<SessionBlockType>) => void;
  onRemove: () => void;
  index: number;
}

type PickerKind =
  | 'simpleDistance'
  | 'simpleDuration'
  | 'simplePace'
  | 'effortDistance'
  | 'effortDuration'
  | 'effortPace'
  | 'repetitions'
  | 'series'
  | 'recoveryDuration'
  | 'recoveryDistance'
  | 'recoveryPace'
  | 'blockRecoveryDuration'
  | 'blockRecoveryDistance'
  | 'rpe'
  | 'recoveryRpe';

const BLOCK_CONFIG: Record<BlockType, { icon: React.ElementType; label: string }> = {
  warmup: { icon: Flame, label: 'Échauffement' },
  interval: { icon: Zap, label: 'Intervalle' },
  steady: { icon: Activity, label: 'Bloc continu' },
  cooldown: { icon: Snowflake, label: 'Retour au calme' },
};

const minuteItems = Array.from({ length: 91 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));
const secondItems = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));
const repsItems = Array.from({ length: 40 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const rpeItems = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const meterItems = Array.from({ length: 121 }, (_, i) => ({ value: String(i * 50), label: String(i * 50) }));
const kmItems = Array.from({ length: 31 }, (_, i) => ({ value: String(i), label: String(i) }));
const paceMinuteItems = Array.from({ length: 11 }, (_, i) => ({ value: String(i + 2), label: String(i + 2) }));

function MetricPill({ label, value, onClick, emphasized = false }: { label: string; value: string; onClick: () => void; emphasized?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[64px] flex-1 flex-col justify-center rounded-[20px] border border-border px-4 py-3 text-left shadow-[var(--shadow-2xs)] transition-transform active:scale-[0.98]',
        emphasized ? 'bg-secondary' : 'bg-background',
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="mt-1 text-[18px] font-semibold text-foreground">{value}</span>
    </button>
  );
}

function SectionCard({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="rounded-[22px] border border-border bg-secondary/60 p-3">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export const SessionBlockComponent: React.FC<SessionBlockProps> = ({ block, onUpdate, onRemove, index }) => {
  const resolvedBlock = React.useMemo(() => resolveStructuredBlock(block), [block]);
  const config = BLOCK_CONFIG[resolvedBlock.type];
  const Icon = config.icon;
  const [picker, setPicker] = React.useState<PickerKind | null>(null);
  const [draftA, setDraftA] = React.useState('0');
  const [draftB, setDraftB] = React.useState('0');

  const commit = React.useCallback((updates: Partial<SessionBlockType>) => {
    const next = resolveStructuredBlock({ ...resolvedBlock, ...updates });
    onUpdate(next);
  }, [onUpdate, resolvedBlock]);

  const openDuration = (kind: PickerKind, current?: string) => {
    const total = Number.parseInt(current || '0', 10) || 0;
    setDraftA(String(Math.floor(total / 60)));
    setDraftB(String(total % 60));
    setPicker(kind);
  };

  const openDistance = (kind: PickerKind, current?: string) => {
    const meters = Number.parseInt(current || '0', 10) || 0;
    setDraftA(String(Math.floor(meters / 1000)));
    setDraftB(String(meters % 1000));
    setPicker(kind);
  };

  const openPace = (kind: PickerKind, current?: string) => {
    const match = (current || '').match(/(\d{1,2})[:'](\d{2})/);
    setDraftA(String(match ? Number.parseInt(match[1], 10) : 4));
    setDraftB(String(match ? Number.parseInt(match[2], 10) : 30));
    setPicker(kind);
  };

  const summary = getBlockSummary(resolvedBlock);
  const autoZone = resolvedBlock.type === 'interval' ? resolvedBlock.effortIntensity : resolvedBlock.intensity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ delay: index * 0.04 }}
      className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[var(--shadow-card)]"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-secondary text-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">{config.label}</p>
                <p className="truncate text-[12px] text-muted-foreground">{summary}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground">
              {zoneLabel(autoZone)}
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {resolvedBlock.type === 'interval' ? (
          <>
            <SectionCard title="Structure">
              <div className="flex gap-2">
                <MetricPill label="Répétitions" value={`${resolvedBlock.repetitions ?? 1} reps`} onClick={() => { setDraftA(String(resolvedBlock.repetitions ?? 1)); setPicker('repetitions'); }} emphasized />
                <MetricPill label="Séries" value={`${resolvedBlock.blockRepetitions ?? 1} séries`} onClick={() => { setDraftA(String(resolvedBlock.blockRepetitions ?? 1)); setPicker('series'); }} emphasized />
              </div>
              {(resolvedBlock.blockRepetitions ?? 1) > 1 && (
                <div className="flex gap-2">
                  <MetricPill label="Récup séries" value={formatDurationLabel(resolvedBlock.blockRecoveryDuration) || 'Temps'} onClick={() => openDuration('blockRecoveryDuration', resolvedBlock.blockRecoveryDuration)} />
                  <MetricPill label="Distance récup" value={formatDistanceLabel(resolvedBlock.blockRecoveryDistance)} onClick={() => openDistance('blockRecoveryDistance', resolvedBlock.blockRecoveryDistance)} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Effort">
              <div className="flex gap-2">
                <MetricPill label="Distance" value={formatDistanceLabel(resolvedBlock.effortDistance)} onClick={() => openDistance('effortDistance', resolvedBlock.effortDistance)} emphasized />
                <MetricPill label="Temps" value={formatDurationLabel(resolvedBlock.effortDuration)} onClick={() => openDuration('effortDuration', resolvedBlock.effortDuration)} emphasized />
                <MetricPill label="Allure" value={formatPaceLabel(resolvedBlock.effortPace)} onClick={() => openPace('effortPace', resolvedBlock.effortPace)} emphasized />
              </div>
              <div className="flex gap-2">
                <MetricPill label="RPE" value={resolvedBlock.rpe ? `${resolvedBlock.rpe}/10` : 'RPE'} onClick={() => { setDraftA(String(resolvedBlock.rpe ?? 8)); setPicker('rpe'); }} />
                <div className="flex flex-1 items-center rounded-[20px] border border-border bg-background px-4 py-3 text-[13px] text-muted-foreground">
                  Zone calculée automatiquement · {zoneLabel(resolvedBlock.effortIntensity)}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Récup">
              <div className="flex gap-2">
                <MetricPill label="Temps" value={formatDurationLabel(resolvedBlock.recoveryDuration)} onClick={() => openDuration('recoveryDuration', resolvedBlock.recoveryDuration)} />
                <MetricPill label="Distance" value={formatDistanceLabel(resolvedBlock.recoveryDistance)} onClick={() => openDistance('recoveryDistance', resolvedBlock.recoveryDistance)} />
                <MetricPill label="Allure" value={formatPaceLabel(resolvedBlock.recoveryPace)} onClick={() => openPace('recoveryPace', resolvedBlock.recoveryPace)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'trot', label: 'Trot' },
                  { value: 'marche', label: 'Marche' },
                  { value: 'statique', label: 'Statique' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => commit({ recoveryType: option.value as SessionBlockType['recoveryType'] })}
                    className={cn(
                      'rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors',
                      resolvedBlock.recoveryType === option.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </SectionCard>
          </>
        ) : (
          <SectionCard title="Bloc">
            <div className="flex gap-2">
              <MetricPill label="Allure" value={formatPaceLabel(resolvedBlock.pace)} onClick={() => openPace('simplePace', resolvedBlock.pace)} emphasized />
              <MetricPill label="Distance" value={formatDistanceLabel(resolvedBlock.distance)} onClick={() => openDistance('simpleDistance', resolvedBlock.distance)} emphasized />
              <MetricPill label="Temps" value={formatDurationLabel(resolvedBlock.duration)} onClick={() => openDuration('simpleDuration', resolvedBlock.duration)} emphasized />
            </div>
            <div className="rounded-[18px] border border-border bg-background px-4 py-3 text-[13px] text-muted-foreground">
              2 valeurs renseignées suffisent · la 3e se met à jour automatiquement.
            </div>
          </SectionCard>
        )}
      </div>

      <WheelValuePickerModal
        open={picker === 'simpleDuration' || picker === 'effortDuration' || picker === 'recoveryDuration' || picker === 'blockRecoveryDuration'}
        onClose={() => setPicker(null)}
        title="Temps"
        columns={[
          { items: minuteItems, value: draftA, onChange: setDraftA, suffix: 'min' },
          { items: secondItems, value: draftB, onChange: setDraftB, suffix: 's' },
        ]}
        onConfirm={() => {
          const value = String((Number.parseInt(draftA, 10) || 0) * 60 + (Number.parseInt(draftB, 10) || 0));
          if (picker === 'simpleDuration') commit({ duration: value, lastEditedMetric: 'duration' });
          if (picker === 'effortDuration') commit({ effortDuration: value, lastEditedMetric: 'effortDuration' });
          if (picker === 'recoveryDuration') commit({ recoveryDuration: value, lastEditedMetric: 'recoveryDuration' });
          if (picker === 'blockRecoveryDuration') commit({ blockRecoveryDuration: value, lastEditedMetric: 'blockRecoveryDuration' });
          setPicker(null);
        }}
      />

      <WheelValuePickerModal
        open={picker === 'simpleDistance' || picker === 'effortDistance' || picker === 'recoveryDistance' || picker === 'blockRecoveryDistance'}
        onClose={() => setPicker(null)}
        title="Distance"
        columns={[
          { items: kmItems, value: draftA, onChange: setDraftA, suffix: 'km' },
          { items: meterItems, value: draftB, onChange: setDraftB, suffix: 'm' },
        ]}
        onConfirm={() => {
          const value = String((Number.parseInt(draftA, 10) || 0) * 1000 + (Number.parseInt(draftB, 10) || 0));
          if (picker === 'simpleDistance') commit({ distance: value, lastEditedMetric: 'distance' });
          if (picker === 'effortDistance') commit({ effortDistance: value, lastEditedMetric: 'effortDistance' });
          if (picker === 'recoveryDistance') commit({ recoveryDistance: value, lastEditedMetric: 'recoveryDistance' });
          if (picker === 'blockRecoveryDistance') commit({ blockRecoveryDistance: value, lastEditedMetric: 'blockRecoveryDistance' });
          setPicker(null);
        }}
      />

      <WheelValuePickerModal
        open={picker === 'simplePace' || picker === 'effortPace' || picker === 'recoveryPace'}
        onClose={() => setPicker(null)}
        title="Allure"
        columns={[
          { items: paceMinuteItems, value: draftA, onChange: setDraftA, suffix: 'min' },
          { items: secondItems, value: draftB, onChange: setDraftB, suffix: 's' },
        ]}
        onConfirm={() => {
          const value = `${draftA}:${draftB.padStart(2, '0')}/km`;
          if (picker === 'simplePace') commit({ pace: value, lastEditedMetric: 'pace' });
          if (picker === 'effortPace') commit({ effortPace: value, lastEditedMetric: 'effortPace' });
          if (picker === 'recoveryPace') commit({ recoveryPace: value, lastEditedMetric: 'recoveryPace' });
          setPicker(null);
        }}
      />

      <WheelValuePickerModal
        open={picker === 'repetitions' || picker === 'series'}
        onClose={() => setPicker(null)}
        title={picker === 'series' ? 'Séries' : 'Répétitions'}
        columns={[{ items: repsItems, value: draftA, onChange: setDraftA }]}
        onConfirm={() => {
          const value = Number.parseInt(draftA, 10) || 1;
          if (picker === 'repetitions') commit({ repetitions: value });
          if (picker === 'series') commit({ blockRepetitions: value });
          setPicker(null);
        }}
      />

      <WheelValuePickerModal
        open={picker === 'rpe' || picker === 'recoveryRpe'}
        onClose={() => setPicker(null)}
        title="RPE"
        columns={[{ items: rpeItems, value: draftA, onChange: setDraftA }]}
        onConfirm={() => {
          const value = Number.parseInt(draftA, 10) || 1;
          if (picker === 'rpe') commit({ rpe: value });
          if (picker === 'recoveryRpe') commit({ recoveryRpe: value });
          setPicker(null);
        }}
      />
    </motion.div>
  );
};
