import React from 'react';
import { motion } from 'framer-motion';
import { X, Flame, Snowflake, Zap, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionBlock as SessionBlockType, BlockType, RECOVERY_TYPES, getPacePlaceholder, isRunningActivity } from './types';
import { cn } from '@/lib/utils';
import { WheelValuePickerModal } from '@/components/ui/ios-wheel-picker';

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

type PickerKind =
  | 'repetitions'
  | 'blockRepetitions'
  | 'distance'
  | 'effortPace'
  | 'recovery'
  | 'blockRecovery'
  | 'duration'
  | 'pace';

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
  const [openPicker, setOpenPicker] = React.useState<null | PickerKind>(null);
  const [draftA, setDraftA] = React.useState("0");
  const [draftB, setDraftB] = React.useState("0");
  const [draftC, setDraftC] = React.useState("0");
  const [draftUnit, setDraftUnit] = React.useState("km");

  const intOptions = (max: number, start = 0) => Array.from({ length: max - start + 1 }, (_, i) => ({ value: String(i + start), label: String(i + start) }));
  const secOptions = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));
  const hourOptions = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));
  const distanceUnitOptions = [
    { value: "km", label: "km" },
    { value: "m", label: "m" },
    { value: "mi", label: "mi" },
  ];
  const paceUnitOptions = [
    { value: "min/km", label: "min/km" },
    { value: "min/mi", label: "min/mi" },
    { value: "s/100", label: "s/100" },
    { value: "km/h", label: "km/h" },
    { value: "mi/h", label: "mi/h" },
  ];

  const openIntPicker = (kind: Exclude<PickerKind, 'effortPace' | 'pace'>, current: string | number | undefined, fallback = 0) => {
    setDraftA(String(Number.parseInt(String(current ?? fallback), 10) || fallback));
    setOpenPicker(kind);
  };

  const openPacePicker = (kind: 'effortPace' | 'pace', current: string | undefined) => {
    const raw = (current || "").trim();
    if (raw.includes("km/h")) {
      const n = Number.parseFloat(raw.replace("km/h", "").trim()) || 12;
      setDraftUnit("km/h");
      setDraftA(String(Math.floor(n)));
      setDraftB(String(Math.round((n - Math.floor(n)) * 10)));
    } else if (raw.includes("mi/h")) {
      const n = Number.parseFloat(raw.replace("mi/h", "").trim()) || 8;
      setDraftUnit("mi/h");
      setDraftA(String(Math.floor(n)));
      setDraftB(String(Math.round((n - Math.floor(n)) * 10)));
    } else if (raw.includes("/100")) {
      const n = Number.parseInt(raw, 10) || 90;
      setDraftUnit("s/100");
      setDraftA(String(n));
      setDraftB("0");
    } else if (raw.includes("/mi")) {
      const mmss = raw.match(/(\d{1,2}):(\d{2})/);
      setDraftUnit("min/mi");
      setDraftA(String(mmss ? Number.parseInt(mmss[1], 10) : 8));
      setDraftB(String(mmss ? Number.parseInt(mmss[2], 10) : 0));
    } else {
      const mmss = raw.match(/(\d{1,2}):(\d{2})/);
      setDraftUnit("min/km");
      setDraftA(String(mmss ? Number.parseInt(mmss[1], 10) : 5));
      setDraftB(String(mmss ? Number.parseInt(mmss[2], 10) : 0));
    }
    setOpenPicker(kind);
  };

  const openHmsPicker = (kind: 'duration' | 'recovery' | 'blockRecovery', current: string | undefined, fallbackSec: number) => {
    const total = Number.parseInt(String(current ?? fallbackSec), 10) || fallbackSec;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    setDraftA(String(h));
    setDraftB(String(m));
    setDraftC(String(s));
    setOpenPicker(kind);
  };

  const openDistancePicker = (meters: string | undefined, fallback = 400) => {
    const m = Number.parseInt(String(meters ?? fallback), 10) || fallback;
    if (m >= 1000 && m % 10 === 0) {
      setDraftUnit("km");
      setDraftA(String(Math.floor(m / 1000)));
      setDraftB(String(m % 1000));
    } else {
      setDraftUnit("m");
      setDraftA(String(m));
      setDraftB("0");
    }
    setOpenPicker("distance");
  };

  const blockReps = block.blockRepetitions ?? 1;

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
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Blocs</Label>
                <Input
                  value={block.blockRepetitions || ''}
                  readOnly
                  onClick={() => openIntPicker('blockRepetitions', block.blockRepetitions, 1)}
                  placeholder="1"
                  className="h-10 cursor-pointer text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Séries</Label>
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
                  onClick={() => openDistancePicker(block.effortDuration, 400)}
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

            {/* Aperçu format ex: 2×3×400 */}
            {(block.repetitions || block.effortDuration) && (
              <div className="text-xs text-muted-foreground tabular-nums">
                {blockReps > 1 ? `${blockReps}×` : ''}
                {block.repetitions || '?'}×{block.effortDuration || '?'}m
                {block.effortPace ? ` @ ${block.effortPace}` : ''}
              </div>
            )}

            {/* Recovery between series */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-xs text-muted-foreground mb-2 block">Récup entre séries</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Durée (sec)</Label>
                  <Input
                    value={block.recoveryDuration || ''}
                    readOnly
                    onClick={() => openHmsPicker('recovery', block.recoveryDuration, 90)}
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

            {/* Recovery between blocks (only if blocks > 1) */}
            {blockReps > 1 && (
              <div className="pt-2 border-t border-border/50">
                <Label className="text-xs text-muted-foreground mb-2 block">Récup entre blocs</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Durée (sec)</Label>
                    <Input
                      value={block.blockRecoveryDuration || ''}
                      readOnly
                      onClick={() => openHmsPicker('blockRecovery', block.blockRecoveryDuration, 180)}
                      placeholder="180"
                      className="h-10 cursor-pointer text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select value={block.blockRecoveryType || 'marche'} onValueChange={(v) => onUpdate({ blockRecoveryType: v as 'trot' | 'marche' | 'statique' })}>
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
            )}
          </>
        ) : (
          /* Warmup / Cooldown / Steady Block */
          <div className="grid grid-cols-2 gap-2">
            <div>
                <Label className="text-xs text-muted-foreground">Durée</Label>
              <Input
                value={block.duration || ''}
                readOnly
                onClick={() => openHmsPicker('duration', block.duration, 15 * 60)}
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
        )}
      </div>
      <WheelValuePickerModal
        open={openPicker === 'repetitions'}
        onClose={() => setOpenPicker(null)}
        title="Séries"
        columns={[{ items: intOptions(100, 1), value: draftA, onChange: setDraftA, suffix: 'x' }]}
        onConfirm={() => {
          onUpdate({ repetitions: Number.parseInt(draftA, 10) || undefined });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'blockRepetitions'}
        onClose={() => setOpenPicker(null)}
        title="Blocs"
        columns={[{ items: intOptions(10, 1), value: draftA, onChange: setDraftA, suffix: 'x' }]}
        onConfirm={() => {
          onUpdate({ blockRepetitions: Number.parseInt(draftA, 10) || 1 });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'distance'}
        onClose={() => setOpenPicker(null)}
        title="Distance effort"
        columns={draftUnit === "m" ? [
          { items: Array.from({ length: 2000 }, (_, i) => ({ value: String(i * 5), label: String(i * 5) })), value: draftA, onChange: setDraftA, suffix: 'm' },
          { items: distanceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ] : [
          { items: Array.from({ length: 80 }, (_, i) => ({ value: String(i), label: String(i) })), value: draftA, onChange: setDraftA, suffix: draftUnit },
          { items: Array.from({ length: 100 }, (_, i) => ({ value: String(i * 10), label: String(i * 10).padStart(3, '0') })), value: draftB, onChange: setDraftB, suffix: 'm' },
          { items: distanceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ]}
        onConfirm={() => {
          const meters = draftUnit === "m"
            ? (Number.parseInt(draftA, 10) || 0)
            : draftUnit === "km"
            ? ((Number.parseInt(draftA, 10) || 0) * 1000 + (Number.parseInt(draftB, 10) || 0))
            : Math.round((((Number.parseInt(draftA, 10) || 0) + ((Number.parseInt(draftB, 10) || 0) / 1000)) * 1609.344));
          onUpdate({ effortDuration: String(meters), effortType: 'distance' });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'recovery'}
        onClose={() => setOpenPicker(null)}
        title="Récup entre séries"
        columns={[
          { items: hourOptions, value: draftA, onChange: setDraftA, suffix: 'h' },
          { items: minuteOptions, value: draftB, onChange: setDraftB, suffix: 'm' },
          { items: secOptions, value: draftC, onChange: setDraftC, suffix: 's' },
        ]}
        onConfirm={() => {
          const sec = (Number.parseInt(draftA, 10) || 0) * 3600 + (Number.parseInt(draftB, 10) || 0) * 60 + (Number.parseInt(draftC, 10) || 0);
          onUpdate({ recoveryDuration: String(sec) });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'blockRecovery'}
        onClose={() => setOpenPicker(null)}
        title="Récup entre blocs"
        columns={[
          { items: hourOptions, value: draftA, onChange: setDraftA, suffix: 'h' },
          { items: minuteOptions, value: draftB, onChange: setDraftB, suffix: 'm' },
          { items: secOptions, value: draftC, onChange: setDraftC, suffix: 's' },
        ]}
        onConfirm={() => {
          const sec = (Number.parseInt(draftA, 10) || 0) * 3600 + (Number.parseInt(draftB, 10) || 0) * 60 + (Number.parseInt(draftC, 10) || 0);
          onUpdate({ blockRecoveryDuration: String(sec) });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'duration'}
        onClose={() => setOpenPicker(null)}
        title="Durée du bloc"
        columns={[
          { items: hourOptions, value: draftA, onChange: setDraftA, suffix: 'h' },
          { items: minuteOptions, value: draftB, onChange: setDraftB, suffix: 'm' },
          { items: secOptions, value: draftC, onChange: setDraftC, suffix: 's' },
        ]}
        onConfirm={() => {
          const sec = (Number.parseInt(draftA, 10) || 0) * 3600 + (Number.parseInt(draftB, 10) || 0) * 60 + (Number.parseInt(draftC, 10) || 0);
          onUpdate({ duration: String(sec), durationType: 'time' });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'effortPace'}
        onClose={() => setOpenPicker(null)}
        title="Allure effort"
        columns={draftUnit === "s/100" ? [
          { items: Array.from({ length: 141 }, (_, i) => ({ value: String(i + 10), label: String(i + 10) })), value: draftA, onChange: setDraftA, suffix: 's' },
          { items: paceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ] : draftUnit === "km/h" || draftUnit === "mi/h" ? [
          { items: Array.from({ length: 40 }, (_, i) => ({ value: String(i + 2), label: String(i + 2) })), value: draftA, onChange: setDraftA },
          { items: Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: String(i) })), value: draftB, onChange: setDraftB, suffix: '.' },
          { items: paceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ] : [
          { items: intOptions(59, 0).map((it) => ({ ...it, label: it.label.padStart(2, '0') })), value: draftA, onChange: setDraftA, suffix: 'min' },
          { items: secOptions, value: draftB, onChange: setDraftB, suffix: 's' },
          { items: paceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ]}
        onConfirm={() => {
          const value = draftUnit === "s/100"
            ? `${draftA} s/100`
            : draftUnit === "km/h" || draftUnit === "mi/h"
            ? `${draftA}.${draftB} ${draftUnit}`
            : `${draftA}:${draftB.padStart(2, '0')} ${draftUnit}`;
          onUpdate({ effortPace: value });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'pace'}
        onClose={() => setOpenPicker(null)}
        title="Allure du bloc"
        columns={draftUnit === "s/100" ? [
          { items: Array.from({ length: 141 }, (_, i) => ({ value: String(i + 10), label: String(i + 10) })), value: draftA, onChange: setDraftA, suffix: 's' },
          { items: paceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ] : draftUnit === "km/h" || draftUnit === "mi/h" ? [
          { items: Array.from({ length: 40 }, (_, i) => ({ value: String(i + 2), label: String(i + 2) })), value: draftA, onChange: setDraftA },
          { items: Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: String(i) })), value: draftB, onChange: setDraftB, suffix: '.' },
          { items: paceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ] : [
          { items: intOptions(59, 0).map((it) => ({ ...it, label: it.label.padStart(2, '0') })), value: draftA, onChange: setDraftA, suffix: 'min' },
          { items: secOptions, value: draftB, onChange: setDraftB, suffix: 's' },
          { items: paceUnitOptions, value: draftUnit, onChange: setDraftUnit },
        ]}
        onConfirm={() => {
          const value = draftUnit === "s/100"
            ? `${draftA} s/100`
            : draftUnit === "km/h" || draftUnit === "mi/h"
            ? `${draftA}.${draftB} ${draftUnit}`
            : `${draftA}:${draftB.padStart(2, '0')} ${draftUnit}`;
          onUpdate({ pace: value });
          setOpenPicker(null);
        }}
      />
    </motion.div>
  );
};
