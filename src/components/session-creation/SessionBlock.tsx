import React from 'react';
import { motion } from 'framer-motion';
import { X, GripVertical, Flame, Snowflake, Zap, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionBlock as SessionBlockType, BlockType, INTENSITY_LEVELS, RECOVERY_TYPES, getPacePlaceholder, isRunningActivity, isCyclingActivity } from './types';
import { cn } from '@/lib/utils';

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
          <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
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
                  type="number"
                  value={block.repetitions || ''}
                  onChange={(e) => onUpdate({ repetitions: parseInt(e.target.value) || undefined })}
                  placeholder="10"
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Distance (m)</Label>
                <Input
                  type="number"
                  value={block.effortDuration || ''}
                  onChange={(e) => onUpdate({ effortDuration: e.target.value, effortType: 'distance' })}
                  placeholder="400"
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure</Label>
                <Input
                  value={block.effortPace || ''}
                  onChange={(e) => onUpdate({ effortPace: e.target.value })}
                  placeholder={isRunningActivity(activityType) ? "3:30" : "35"}
                  className="h-10 text-sm"
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
                    type="number"
                    value={block.recoveryDuration || ''}
                    onChange={(e) => onUpdate({ recoveryDuration: e.target.value })}
                    placeholder="90"
                    className="h-10 text-sm"
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
          </>
        ) : (
          /* Warmup / Cooldown / Steady Block */
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Durée (min)</Label>
                <Input
                  type="number"
                  value={block.duration || ''}
                  onChange={(e) => onUpdate({ duration: e.target.value, durationType: 'time' })}
                  placeholder={block.type === 'warmup' ? "15" : "10"}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure</Label>
                <Input
                  value={block.pace || ''}
                  onChange={(e) => onUpdate({ pace: e.target.value })}
                  placeholder={pacePlaceholder}
                  className="h-10 text-sm"
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
          </>
        )}
      </div>
    </motion.div>
  );
};
