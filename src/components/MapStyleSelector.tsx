import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { Check, Map, Moon, Box, Mountain, Palette, Satellite, X } from 'lucide-react';
import { MapIosColoredFab } from '@/components/map/MapIosColoredFab';
import { cn } from '@/lib/utils';

/** Au-dessus nav (z-100), FAB (105), modales — hors contexte z-20 de la pile carte */
const SHEET_OVERLAY_Z = 10060;
const SHEET_PANEL_Z = 10061;

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
  /**
   * `viewport-left` : carte flottante (création d’itinéraire).
   * `fab` : bottom sheet léger (accueil).
   */
  panelAnchor?: 'fab' | 'viewport-left';
}

/** Tuiles d’aperçu */
const tilePreview =
  'relative w-full overflow-hidden rounded-xl bg-muted/40 ring-1 ring-black/[0.06] dark:ring-white/[0.08]';

function PreviewStandard() {
  return (
    <div className={cn('aspect-[5/4]', tilePreview)}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#f6f5f2] via-[#ebe8e2] to-[#ddd9d2]" />
      <div className="absolute inset-[12%] rounded-md bg-white/35 shadow-inner opacity-90" />
      <div className="absolute bottom-[18%] left-[10%] right-[25%] h-px bg-neutral-500/20" />
      <div className="absolute bottom-[38%] left-[10%] right-[40%] h-px bg-neutral-500/15" />
    </div>
  );
}

function PreviewSatellite() {
  return (
    <div className={cn('aspect-[5/4]', tilePreview)}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d4a1c] via-[#5a8c3a] to-[#1a3d5c]" />
      <div className="absolute right-[12%] top-[15%] h-[22%] w-[28%] rounded-md bg-[#f4e6c8]/25" />
      <div className="absolute bottom-[20%] left-[10%] right-[35%] h-0.5 rounded-full bg-[#2a1810]/40" />
    </div>
  );
}

function PreviewRelief() {
  return (
    <div className={cn('aspect-[5/4]', tilePreview)}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#e2edd8] via-[#9bc4a3] to-[#3d6b4a]" />
      <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 100 80" preserveAspectRatio="none">
        <path
          d="M0 58 Q28 42 52 48 T100 38 V80 H0 Z"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.2"
        />
        <path
          d="M0 65 Q35 50 62 56 T100 46 V80 H0 Z"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.9"
        />
      </svg>
    </div>
  );
}

function PreviewDark() {
  return (
    <div className={cn('aspect-[5/4]', tilePreview)}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#252830] to-[#12141a]" />
      <div className="absolute left-[12%] top-[22%] h-[12%] w-[40%] rounded-sm bg-slate-600/35" />
      <div className="absolute bottom-[28%] right-[15%] h-1.5 w-1.5 rounded-full bg-cyan-400/90 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
    </div>
  );
}

function Preview3D() {
  return (
    <div className={cn('aspect-[5/4]', tilePreview)}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#a8b4c4] to-[#4a5668]" />
      <div className="absolute inset-x-[18%] bottom-[22%] top-[28%] flex items-end justify-center gap-0.5">
        <div className="h-[28%] w-[18%] rounded-t-md bg-white/92 shadow-md" style={{ transform: 'skewX(-4deg)' }} />
        <div className="h-[40%] w-[22%] rounded-t-md bg-white shadow-lg" style={{ transform: 'skewX(-2deg)' }} />
        <div className="h-[32%] w-[16%] rounded-t-md bg-slate-100/95" style={{ transform: 'skewX(4deg)' }} />
      </div>
    </div>
  );
}

const MAP_SECTIONS: {
  title: string;
  subtitle?: string;
  items: {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    Preview: () => React.ReactElement;
  }[];
}[] = [
  {
    title: 'Vue cartographique',
    subtitle: 'Plans adaptés au terrain et à la ville',
    items: [
      { id: 'roadmap', label: 'Standard', description: 'Rues & lieux', icon: Map, Preview: PreviewStandard },
      { id: 'satellite', label: 'Satellite', description: 'Vue aérienne', icon: Satellite, Preview: PreviewSatellite },
      { id: 'terrain', label: 'Relief', description: 'Outdoor & sentiers', icon: Mountain, Preview: PreviewRelief },
    ],
  },
  {
    title: 'Affichage',
    subtitle: 'Ambiance et immersion',
    items: [
      { id: 'dark', label: 'Sombre', description: 'Confort de nuit', icon: Moon, Preview: PreviewDark },
      { id: 'standard3d', label: '3D', description: 'Bâtiments', icon: Box, Preview: Preview3D },
    ],
  },
];

function MapStylePickerContent({
  currentStyle,
  onSelect,
  showClose,
  onClose,
  titleId,
}: {
  currentStyle: string;
  onSelect: (id: string) => void;
  showClose?: boolean;
  onClose?: () => void;
  titleId?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 pb-2 pt-0.5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-[19px] font-semibold tracking-tight text-foreground">
            Style de carte
          </h2>
          <p className="mt-1 text-[14px] leading-snug text-muted-foreground">
            Fonds adaptés à la ville, l’outdoor ou la nuit — la carte reste visible derrière.
          </p>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-foreground transition-colors active:bg-black/[0.1] dark:bg-[#111111] dark:active:bg-[#1a1a1a]"
            aria-label="Fermer"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
        <div className="space-y-7 pb-1 pt-3">
          {MAP_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {section.title}
              </h3>
              {section.subtitle && (
                <p className="mt-1 text-[13px] text-muted-foreground/90">{section.subtitle}</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentStyle === item.id;
                  const Preview = item.Preview;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        'group flex min-w-0 flex-col rounded-2xl border bg-card/80 p-2 text-left transition-[box-shadow,transform,border-color] duration-200',
                        'active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        isActive
                          ? 'border-primary shadow-md ring-2 ring-primary/30'
                          : 'border-border/50 shadow-sm hover:border-border hover:shadow-md dark:border-white/[0.08]'
                      )}
                    >
                      <div className="relative">
                        <Preview />
                        {isActive && (
                          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-start gap-2 px-0.5">
                        <div
                          className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            isActive ? 'bg-primary/12 text-primary' : 'bg-muted/80 text-muted-foreground'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1 pb-0.5">
                          <span className="block text-[15px] font-semibold leading-tight text-foreground">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                            {item.description}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomStyleSheet({
  isOpen,
  onClose,
  currentStyle,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: string;
  onSelect: (id: string) => void;
}) {
  const dragControls = useDragControls();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            key="map-style-overlay"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 border-0 bg-black/25 backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
            style={{ zIndex: SHEET_OVERLAY_Z }}
            aria-label="Fermer le sélecteur de carte"
            onClick={onClose}
          />

          <motion.div
            key="map-style-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-style-picker-title-main"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.85 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 420) {
                onClose();
              }
            }}
            className={cn(
              'fixed inset-x-0 bottom-0 flex max-h-[min(65dvh,560px)] flex-col overflow-hidden',
              'rounded-t-[1.35rem] border border-b-0 border-black/[0.07]',
              'bg-[rgba(252,252,252,0.97)] shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.22)] supports-[backdrop-filter]:bg-[rgba(252,252,252,0.92)] supports-[backdrop-filter]:backdrop-blur-xl',
              'dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:shadow-[0_-16px_48px_-20px_rgba(0,0,0,0.65)] dark:supports-[backdrop-filter]:bg-[#0a0a0a]'
            )}
            style={{ zIndex: SHEET_PANEL_Z, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle — zone de drag (style Komoot / iOS) */}
            <div
              className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-3 pb-2 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div
                className="h-1 w-10 shrink-0 rounded-full bg-foreground/20 dark:bg-foreground/30"
                aria-hidden
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-5">
              <MapStylePickerContent
                titleId="map-style-picker-title-main"
                currentStyle={currentStyle}
                onSelect={onSelect}
                showClose
                onClose={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function LeftStylePanel({
  isOpen,
  onClose,
  currentStyle,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: string;
  onSelect: (id: string) => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            key="map-style-overlay-left"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 border-0 bg-black/25 backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
            style={{ zIndex: SHEET_OVERLAY_Z }}
            aria-label="Fermer le sélecteur de carte"
            onClick={onClose}
          />

          <motion.div
            key="map-style-panel-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-style-picker-title"
            initial={{ opacity: 0, x: -12, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -12, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'fixed max-h-[min(65dvh,calc(100dvh-5rem))] w-[min(calc(100vw-1.25rem),20.5rem)] overflow-hidden rounded-[1.35rem]',
              'left-[max(0.625rem,env(safe-area-inset-left,0px))]',
              'top-[calc(env(safe-area-inset-top,0px)+4.25rem)]',
              'border border-black/[0.07] bg-[rgba(252,252,252,0.97)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] supports-[backdrop-filter]:backdrop-blur-xl',
              'dark:border-[#1f1f1f] dark:bg-[#0a0a0a]'
            )}
            style={{ zIndex: SHEET_PANEL_Z }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[min(65dvh,calc(100dvh-5rem))] min-h-0 flex-col overflow-hidden p-4 sm:p-5">
              <MapStylePickerContent
                titleId="map-style-picker-title"
                currentStyle={currentStyle}
                onSelect={onSelect}
                showClose
                onClose={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export const MapStyleSelector: React.FC<MapStyleSelectorProps> = ({
  currentStyle,
  onStyleChange,
  panelAnchor = 'fab',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const leftPanel = panelAnchor === 'viewport-left';

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const commit = (id: string) => {
    onStyleChange(id);
    setIsOpen(false);
  };

  return (
    <div className="relative z-[21]">
      <MapIosColoredFab
        type="button"
        tone="gray"
        title="Styles de carte"
        active={isOpen}
        className={cn(
          'h-9 w-9 bg-white text-black shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] [&_span]:text-black [&_span_svg]:stroke-black [&_span_svg]:text-black',
          'dark:bg-[#0a0a0a] dark:text-foreground dark:border dark:border-[#1f1f1f] dark:[&_span]:text-foreground dark:[&_span_svg]:stroke-foreground dark:[&_span_svg]:text-foreground',
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <Palette className="h-[15px] w-[15px]" strokeWidth={2} />
      </MapIosColoredFab>

      {leftPanel ? (
        <LeftStylePanel isOpen={isOpen} onClose={() => setIsOpen(false)} currentStyle={currentStyle} onSelect={commit} />
      ) : (
        <BottomStyleSheet isOpen={isOpen} onClose={() => setIsOpen(false)} currentStyle={currentStyle} onSelect={commit} />
      )}
    </div>
  );
};
