import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Activity, Snowflake } from 'lucide-react';
import { SessionBlock, BlockType, BLOCK_TYPES } from './types';
import { SessionBlockComponent } from './SessionBlock';
import { SessionStructurePreview } from './SessionStructurePreview';
import { BlockInsertSeparator } from './BlockInsertSeparator';
import { cn } from '@/lib/utils';
import { resolveSessionBlocks } from '@/lib/sessionBlockCalculations';

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
  const [menuAnchor, setMenuAnchor] = React.useState<number | null>(null);
  const [selectedPreset, setSelectedPreset] = React.useState<'continu' | 'intervalle' | 'pyramide' | 'variation'>('pyramide');
  const rootRef = useRef<HTMLDivElement>(null);
  const showAddMenu = menuAnchor !== null;

  const closeMenu = useCallback(() => setMenuAnchor(null), []);

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

  const openInsertMenu = (insertIndex: number) => {
    setMenuAnchor((current) => (current === insertIndex ? null : insertIndex));
  };

  const addBlock = (type: BlockType, insertIndex?: number) => {
    const newBlock: SessionBlock = {
      id: generateBlockId(),
      type,
      ...(type === 'interval' && {
        recoveryType: 'trot' as const,
        blockRecoveryType: 'marche' as const,
      }),
    };
    const nextBlocks = [...blocks];
    if (typeof insertIndex === 'number') nextBlocks.splice(insertIndex, 0, newBlock);
    else nextBlocks.push(newBlock);
    onBlocksChange(resolveSessionBlocks(nextBlocks));
    closeMenu();
  };

  const updateBlock = (id: string, updates: Partial<SessionBlock>) => {
    onBlocksChange(resolveSessionBlocks(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    )));
  };

  const removeBlock = (id: string) => {
    onBlocksChange(resolveSessionBlocks(blocks.filter(block => block.id !== id)));
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
  const presetCards: Array<{
    key: 'continu' | 'intervalle' | 'pyramide' | 'variation';
    label: string;
    type: BlockType;
  }> = [
    { key: 'continu', label: 'Continu', type: 'steady' },
    { key: 'intervalle', label: 'Intervalle', type: 'interval' },
    { key: 'pyramide', label: 'Pyramide', type: 'interval' },
    { key: 'variation', label: 'Variation', type: 'interval' },
  ];

  const renderAddMenu = (insertIndex?: number) => (
    <motion.div
      role="menu"
      aria-label="Types de blocs"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className="rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-md)] backdrop-blur-sm"
    >
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_TYPES.map((blockType) => {
          const IconComponent = BLOCK_ICONS[blockType.value as BlockType];
          return (
            <button
              key={`${blockType.value}-${insertIndex ?? 'end'}`}
              type="button"
              role="menuitem"
              onClick={() => addBlock(blockType.value as BlockType, insertIndex)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                BLOCK_COLORS[blockType.value as BlockType]
              )}
            >
              <IconComponent className="h-4 w-4 shrink-0" aria-hidden />
              {blockType.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">Structure de la séance</span>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums" aria-live="polite">
          {blocks.length} bloc{blocks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {blocks.length > 0 && (
        <div className="relative">
          <SessionStructurePreview blocks={blocks} />
          <div className="mt-4 space-y-2">
            <p className="text-base font-semibold text-foreground">Ajouter un bloc</p>
            <div className="grid grid-cols-4 gap-2">
              {presetCards.map((preset) => {
                const selected = selectedPreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.key);
                      addBlock(preset.type);
                    }}
                    className={cn(
                      "min-w-0 rounded-2xl px-2 py-3 text-center transition-colors",
                      selected
                        ? "border-2 border-[#007AFF] bg-[#e8f0ff]"
                        : "border border-transparent bg-secondary/50 hover:bg-secondary"
                    )}
                  >
                    <div className="mx-auto mb-2 flex h-7 items-end justify-center gap-1">
                      {preset.key === 'continu' && (
                        <span className="h-2.5 w-11 rounded-t-[3px] bg-[#4fa3ff]" />
                      )}
                      {preset.key === 'intervalle' && (
                        <>
                          <span className="h-5 w-2.5 rounded-t-[3px] bg-[#30d158]" />
                          <span className="h-2.5 w-2.5 rounded-t-[3px] bg-[#4fa3ff]" />
                          <span className="h-5 w-2.5 rounded-t-[3px] bg-[#30d158]" />
                          <span className="h-2.5 w-2.5 rounded-t-[3px] bg-[#4fa3ff]" />
                        </>
                      )}
                      {preset.key === 'pyramide' && (
                        <>
                          <span className="h-2 w-1.5 rounded-t-[3px] bg-[#4fa3ff]" />
                          <span className="h-4 w-1.5 rounded-t-[3px] bg-[#ffd60a]" />
                          <span className="h-6.5 w-1.5 rounded-t-[3px] bg-[#ff453a]" />
                          <span className="h-4 w-1.5 rounded-t-[3px] bg-[#ffd60a]" />
                          <span className="h-2 w-1.5 rounded-t-[3px] bg-[#4fa3ff]" />
                        </>
                      )}
                      {preset.key === 'variation' && (
                        <>
                          <span className="h-2 w-1.5 rounded-t-[3px] bg-[#4fa3ff]" />
                          <span className="h-5 w-1.5 rounded-t-[3px] bg-[#ff9f0a]" />
                          <span className="h-3 w-1.5 rounded-t-[3px] bg-[#30d158]" />
                          <span className="h-6.5 w-1.5 rounded-t-[3px] bg-[#ff453a]" />
                          <span className="h-4 w-1.5 rounded-t-[3px] bg-[#ffd60a]" />
                        </>
                      )}
                    </div>
                    <span className={cn("block truncate text-sm font-semibold", selected ? "text-[#007AFF]" : "text-foreground")}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="space-y-3">
          <SessionStructurePreview blocks={blocks} />
          <div className="mt-1 space-y-2">
            <p className="text-base font-semibold text-foreground">Ajouter un bloc</p>
            <div className="grid grid-cols-4 gap-2">
              {presetCards.map((preset) => {
                const selected = selectedPreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.key);
                      addBlock(preset.type);
                    }}
                    className={cn(
                      "min-w-0 rounded-2xl px-2 py-3 text-center transition-colors",
                      selected
                        ? "border-2 border-[#007AFF] bg-[#e8f0ff]"
                        : "border border-transparent bg-secondary/50 hover:bg-secondary"
                    )}
                  >
                    <div className="mx-auto mb-2 flex h-7 items-end justify-center gap-1">
                      {preset.key === 'continu' && (
                        <span className="h-2.5 w-11 rounded-t-[3px] bg-[#4fa3ff]" />
                      )}
                      {preset.key === 'intervalle' && (
                        <>
                          <span className="h-5 w-2.5 rounded-t-[3px] bg-[#30d158]" />
                          <span className="h-2.5 w-2.5 rounded-t-[3px] bg-[#4fa3ff]" />
                          <span className="h-5 w-2.5 rounded-t-[3px] bg-[#30d158]" />
                          <span className="h-2.5 w-2.5 rounded-t-[3px] bg-[#4fa3ff]" />
                        </>
                      )}
                      {preset.key === 'pyramide' && (
                        <>
                          <span className="h-2 w-1.5 rounded-t-[3px] bg-[#4fa3ff]" />
                          <span className="h-4 w-1.5 rounded-t-[3px] bg-[#ffd60a]" />
                          <span className="h-6.5 w-1.5 rounded-t-[3px] bg-[#ff453a]" />
                          <span className="h-4 w-1.5 rounded-t-[3px] bg-[#ffd60a]" />
                          <span className="h-2 w-1.5 rounded-t-[3px] bg-[#4fa3ff]" />
                        </>
                      )}
                      {preset.key === 'variation' && (
                        <>
                          <span className="h-2 w-1.5 rounded-t-[3px] bg-[#4fa3ff]" />
                          <span className="h-5 w-1.5 rounded-t-[3px] bg-[#ff9f0a]" />
                          <span className="h-3 w-1.5 rounded-t-[3px] bg-[#30d158]" />
                          <span className="h-6.5 w-1.5 rounded-t-[3px] bg-[#ff453a]" />
                          <span className="h-4 w-1.5 rounded-t-[3px] bg-[#ffd60a]" />
                        </>
                      )}
                    </div>
                    <span className={cn("block truncate text-sm font-semibold", selected ? "text-[#007AFF]" : "text-foreground")}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {blocks.map((block, index) => (
          <React.Fragment key={block.id}>
            <SessionBlockComponent
              block={block}
              activityType={activityType}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onRemove={() => removeBlock(block.id)}
              index={index}
            />

            {index < blocks.length - 1 && (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="py-2"
              >
                <div className="space-y-2">
                  <BlockInsertSeparator
                    onClick={() => openInsertMenu(index + 1)}
                    ariaLabel="Ajouter un bloc ici"
                  />

                  <AnimatePresence>
                    {menuAnchor === index + 1 && (
                      <motion.div layout className="px-1">
                        {renderAddMenu(index + 1)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </AnimatePresence>

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
