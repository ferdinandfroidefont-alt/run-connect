import React from 'react';
import { motion } from 'framer-motion';
import { X, Flame, Snowflake, Zap, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionBlock as SessionBlockType, BlockType, INTENSITY_LEVELS, RECOVERY_TYPES, getPacePlaceholder, isRunningActivity } from './types';
import { cn } from '@/lib/utils';
import { WheelValuePickerModal } from '@/components/ui/ios-wheel-picker';

function RpeTenPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value ?? 5));
  const rpeOptions = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

  return (
    <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <button
        type="button"
        onClick={() => {
          setDraft(String(value ?? 5));
          setOpen(true);
        }}
        className="h-10 rounded-lg border border-border bg-card px-3 text-left text-sm text-foreground"
      >
        RPE {value ?? "—"} / 10
      </button>
      <WheelValuePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        columns={[{ items: rpeOptions, value: draft, onChange: setDraft }]}
        onConfirm={() => {
          onChange(Number.parseInt(draft, 10) || undefined);
          setOpen(false);
        }}
      />
    </div>
  );
}

interface SessionBlockProps {
  block: SessionBlockType;
  activityType: string;
  onUpdate: (updates: Partial<SessionBlockType>) => void;
  onRemove: () => void;
  index: number;
}

const BLOCK_CONFIG: Record<BlockType, { icon: React.ElementType; label: string; bgColor: string; iconColor: string }> = {
  warmup: { icon: Flame, label: 'Échauffement', bgColor: 'bg-green-500/10', iconColor: 'text-green-500' },
  interval: { icon: Zap, label: 'Série / Fractionné', bgColor: 'bg-orange-500/10', iconColor: 'text-orange-500' },
  steady: { icon: Activity, label: 'Bloc constant', bgColor: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  cooldown: { icon: Snowflake, label: 'Retour au calme', bgColor: 'bg-purple-500/10', iconColor: 'text-purple-500' },
};

export const SessionBlockComponent: React.FC<SessionBlockProps> = ({
  block,
  activityType,
  onUpdate,
  onRemove,
  index,
}) => {
  const config = BLOCK_CONFIG[block.type];
  const IconComponent = config.icon;
  const pacePlaceholder = getPacePlaceholder(activityType);
  const [openPicker, setOpenPicker] = React.useState<null | 'repetitions' | 'distance' | 'effortPace' | 'recovery' | 'duration' | 'pace'>(null);
  const [draftA, setDraftA] = React.useState("0");
  const [draftB, setDraftB] = React.useState("0");

  const intOptions = (max: number, start = 0) => Array.from({ length: max - start + 1 }, (_, i) => ({ value: String(i + start), label: String(i + start) }));
  const secOptions = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));

  const openIntPicker = (kind: 'repetitions' | 'distance' | 'recovery' | 'duration', current: string | number | undefined, fallback = 0) => {
    setDraftA(String(Number.parseInt(String(current ?? fallback), 10) || fallback));
    setOpenPicker(kind);
  };

  const openPacePicker = (kind: 'effortPace' | 'pace', current: string | undefined) => {
    const mmss = (current || "").match(/(\d{1,2}):(\d{2})/);
    setDraftA(String(mmss ? Number.parseInt(mmss[1], 10) : 5));
    setDraftB(String(mmss ? Number.parseInt(mmss[2], 10) : 0));
    setOpenPicker(kind);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-xl border border-border/50 overflow-hidden",
        config.bgColor
      )}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-card/50">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bgColor)}>
            <IconComponent className={cn("w-4 h-4", config.iconColor)} />
          </div>
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Block Content */}
      <div className="p-3 space-y-3">
        {block.type === 'interval' ? (
          /* Interval Block */
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Répétitions</Label>
                <Input
                  value={block.repetitions || ''}
                  readOnly
                  onClick={() => openIntPicker('repetitions', block.repetitions, 10)}
                  placeholder="10"
                  className="h-10 cursor-pointer text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Distance (m)</Label>
                <Input
                  value={block.effortDuration || ''}
                  readOnly
                  onClick={() => openIntPicker('distance', block.effortDuration, 400)}
                  placeholder="400"
                  className="h-10 cursor-pointer text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure</Label>
                <Input
                  value={block.effortPace || ''}
                  readOnly
                  onClick={() => openPacePicker('effortPace', block.effortPace)}
                  placeholder={isRunningActivity(activityType) ? "3:30" : "35"}
                  className="h-10 cursor-pointer text-sm"
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Intensité</Label>
              <div className="grid grid-cols-5 gap-1">
                {INTENSITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => onUpdate({ effortIntensity: level.value })}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all text-center",
                      block.effortIntensity === level.value
                        ? `${level.color} text-white`
                        : "bg-card text-muted-foreground hover:bg-card/80"
                    )}
                  >
                    {level.label.split(' - ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Recovery */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-xs text-muted-foreground mb-2 block">Récupération</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Durée (sec)</Label>
                  <Input
                    value={block.recoveryDuration || ''}
                    readOnly
                    onClick={() => openIntPicker('recovery', block.recoveryDuration, 90)}
                    placeholder="90"
                    className="h-10 cursor-pointer text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={block.recoveryType || 'trot'} onValueChange={(v) => onUpdate({ recoveryType: v as 'trot' | 'marche' | 'statique' })}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECOVERY_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <RpeTenPicker
              label="RPE effort (série)"
              value={block.rpe}
              onChange={(rpe) => onUpdate({ rpe })}
            />
            <RpeTenPicker
              label="RPE récup (entre répétitions)"
              value={block.recoveryRpe}
              onChange={(recoveryRpe) => onUpdate({ recoveryRpe })}
            />
          </>
        ) : (
          /* Warmup / Cooldown / Steady Block */
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Durée (min)</Label>
                <Input
                  value={block.duration || ''}
                  readOnly
                  onClick={() => openIntPicker('duration', block.duration, 15)}
                  placeholder={block.type === 'warmup' ? "15" : "10"}
                  className="h-10 cursor-pointer text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure</Label>
                <Input
                  value={block.pace || ''}
                  readOnly
                  onClick={() => openPacePicker('pace', block.pace)}
                  placeholder={pacePlaceholder}
                  className="h-10 cursor-pointer text-sm"
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Intensité</Label>
              <div className="grid grid-cols-5 gap-1">
                {INTENSITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => onUpdate({ intensity: level.value })}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all text-center",
                      block.intensity === level.value
                        ? `${level.color} text-white`
                        : "bg-card text-muted-foreground hover:bg-card/80"
                    )}
                  >
                    {level.label.split(' - ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <RpeTenPicker label="RPE du bloc" value={block.rpe} onChange={(rpe) => onUpdate({ rpe })} />
          </>
        )}
      </div>
      <WheelValuePickerModal
        open={openPicker === 'repetitions'}
        onClose={() => setOpenPicker(null)}
        title="Répétitions"
        columns={[{ items: intOptions(100, 1), value: draftA, onChange: setDraftA, suffix: 'x' }]}
        onConfirm={() => {
          onUpdate({ repetitions: Number.parseInt(draftA, 10) || undefined });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'distance'}
        onClose={() => setOpenPicker(null)}
        title="Distance effort"
        columns={[{ items: intOptions(5000, 50), value: draftA, onChange: setDraftA, suffix: 'm' }]}
        onConfirm={() => {
          onUpdate({ effortDuration: draftA, effortType: 'distance' });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'recovery'}
        onClose={() => setOpenPicker(null)}
        title="Récupération"
        columns={[{ items: intOptions(1200, 0), value: draftA, onChange: setDraftA, suffix: 's' }]}
        onConfirm={() => {
          onUpdate({ recoveryDuration: draftA });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'duration'}
        onClose={() => setOpenPicker(null)}
        title="Durée du bloc"
        columns={[{ items: intOptions(240, 1), value: draftA, onChange: setDraftA, suffix: 'min' }]}
        onConfirm={() => {
          onUpdate({ duration: draftA, durationType: 'time' });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'effortPace'}
        onClose={() => setOpenPicker(null)}
        title="Allure effort"
        columns={[
          { items: intOptions(59, 0).map((it) => ({ ...it, label: it.label.padStart(2, '0') })), value: draftA, onChange: setDraftA, suffix: 'min' },
          { items: secOptions, value: draftB, onChange: setDraftB, suffix: 's' },
        ]}
        onConfirm={() => {
          onUpdate({ effortPace: `${draftA}:${draftB.padStart(2, '0')}` });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'pace'}
        onClose={() => setOpenPicker(null)}
        title="Allure du bloc"
        columns={[
          { items: intOptions(59, 0).map((it) => ({ ...it, label: it.label.padStart(2, '0') })), value: draftA, onChange: setDraftA, suffix: 'min' },
          { items: secOptions, value: draftB, onChange: setDraftB, suffix: 's' },
        ]}
        onConfirm={() => {
          onUpdate({ pace: `${draftA}:${draftB.padStart(2, '0')}` });
          setOpenPicker(null);
        }}
      />
    </motion.div>
  );
};
