import React, { useCallback, useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, Zap, Activity, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionBlock, BlockType, BLOCK_TYPES } from './types';
import { SessionBlockComponent } from './SessionBlock';
import { cn } from '@/lib/utils';

interface SessionBlockBuilderProps {
  blocks: SessionBlock[];
  activityType: string;
  onBlocksChange: (blocks: SessionBlock[]) => void;
}

const generateBlockId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `block-${crypto.randomUUID()}`;
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  warmup: Flame,
  interval: Zap,
  steady: Activity,
  cooldown: Snowflake,
};

const BLOCK_COLORS: Record<BlockType, string> = {
  warmup: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
  interval: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
  steady: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
  cooldown: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
};

export const SessionBlockBuilder: React.FC<SessionBlockBuilderProps> = ({
  blocks,
  activityType,
  onBlocksChange,
}) => {
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const addMenuId = useId();

  const closeMenu = useCallback(() => setShowAddMenu(false), []);

  useEffect(() => {
    if (!showAddMenu) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el || el.contains(e.target as Node)) return;
      closeMenu();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showAddMenu, closeMenu]);

  const addBlock = (type: BlockType) => {
    const newBlock: SessionBlock = {
      id: generateBlockId(),
      type,
      ...(type === 'warmup' && { duration: '15', intensity: 'z2', rpe: 3 }),
      ...(type === 'cooldown' && { duration: '10', intensity: 'z1', rpe: 2 }),
      ...(type === 'interval' && {
        repetitions: 10,
        effortDuration: '400',
        effortIntensity: 'z5',
        recoveryDuration: '90',
        recoveryType: 'trot' as const,
        rpe: 8,
        recoveryRpe: 3,
      }),
      ...(type === 'steady' && { duration: '20', intensity: 'z3', rpe: 5 }),
    };
    onBlocksChange([...blocks, newBlock]);
    setShowAddMenu(false);
  };

  const updateBlock = (id: string, updates: Partial<SessionBlock>) => {
    onBlocksChange(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const removeBlock = (id: string) => {
    onBlocksChange(blocks.filter(block => block.id !== id));
  };

  const getQuickAddSuggestions = (): BlockType[] => {
    if (blocks.length === 0) return ['warmup'];
    const hasWarmup = blocks.some(b => b.type === 'warmup');
    const hasCooldown = blocks.some(b => b.type === 'cooldown');
    
    if (!hasWarmup) return ['warmup', 'interval'];
    if (!hasCooldown && blocks.length > 1) return ['interval', 'cooldown'];
    return ['interval', 'steady'];
  };

  const quickSuggestions = getQuickAddSuggestions();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">Structure de la séance</span>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums" aria-live="polite">
          {blocks.length} bloc{blocks.length !== 1 ? 's' : ''}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {blocks.map((block, index) => (
          <SessionBlockComponent
            key={block.id}
            block={block}
            activityType={activityType}
            onUpdate={(updates) => updateBlock(block.id, updates)}
            onRemove={() => removeBlock(block.id)}
            index={index}
          />
        ))}
      </AnimatePresence>

      {blocks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border-2 border-dashed border-border p-6 text-center"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Construisez votre séance bloc par bloc
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => addBlock('warmup')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium hover:bg-green-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Flame className="w-4 h-4 shrink-0" aria-hidden />
              Échauffement
            </button>
          </div>
        </motion.div>
      )}

      {blocks.length > 0 && (
        <div ref={rootRef} className="relative">
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                id={addMenuId}
                role="menu"
                aria-label="Types de blocs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-card rounded-xl border border-border shadow-lg z-20"
              >
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPES.map((blockType) => {
                    const IconComponent = BLOCK_ICONS[blockType.value as BlockType];
                    return (
                      <button
                        key={blockType.value}
                        type="button"
                        role="menuitem"
                        onClick={() => addBlock(blockType.value as BlockType)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          BLOCK_COLORS[blockType.value as BlockType]
                        )}
                      >
                        <IconComponent className="w-4 h-4 shrink-0" aria-hidden />
                        {blockType.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddMenu(!showAddMenu)}
            aria-expanded={showAddMenu}
            aria-controls={addMenuId}
            aria-haspopup="menu"
            className="w-full h-12 border-dashed"
          >
            <Plus className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            Ajouter un bloc
          </Button>
        </div>
      )}

      {blocks.length > 0 && blocks.length < 5 && !showAddMenu && (
        <div className="flex gap-2 justify-center flex-wrap" role="group" aria-label="Ajouts rapides">
          {quickSuggestions.map((type) => {
            const IconComponent = BLOCK_ICONS[type];
            const blockInfo = BLOCK_TYPES.find(b => b.value === type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  BLOCK_COLORS[type]
                )}
              >
                <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden />
                + {blockInfo?.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
