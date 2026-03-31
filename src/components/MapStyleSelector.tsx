import React, { useEffect, useState } from 'react';
import { Check, Map, Moon, Box, Mountain, Palette, Satellite, X } from 'lucide-react';
import { MapIosColoredFab } from '@/components/map/MapIosColoredFab';
import { cn } from '@/lib/utils';

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
  /**
   * `viewport-left` : panneau carte flottant (création d’itinéraire).
   * `fab` : feuille basse type app premium (accueil).
   */
  panelAnchor?: 'fab' | 'viewport-left';
}

/** Tuiles d’aperçu — proportions type fiche Komoot / Apple Maps */
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
    <div className="flex max-h-[min(78dvh,640px)] flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 px-1 pb-2 pt-0.5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-[20px] font-semibold tracking-tight text-foreground">
            Style de carte
          </h2>
          <p className="mt-1 text-[15px] leading-snug text-muted-foreground">
            Choisissez un fond clair, satellite ou relief selon votre sortie.
          </p>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-foreground transition-colors active:bg-black/[0.08] dark:bg-white/[0.08] dark:active:bg-white/[0.12]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="scrollbar-thin mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-[env(safe-area-bottom,0px)]">
        <div className="space-y-8 pb-4">
          {MAP_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {section.title}
              </h3>
              {section.subtitle && (
                <p className="mt-1 text-[14px] text-muted-foreground/90">{section.subtitle}</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
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
                        'group flex min-w-0 flex-col rounded-2xl border bg-background p-2.5 text-left transition-[box-shadow,transform,border-color] duration-200',
                        'active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        isActive
                          ? 'border-primary shadow-[0_8px_28px_-12px_rgba(0,0,0,0.25)] ring-2 ring-primary/35 dark:shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5)]'
                          : 'border-border/50 shadow-[0_2px_16px_-8px_rgba(0,0,0,0.12)] hover:border-border hover:shadow-md dark:border-white/[0.08]'
                      )}
                    >
                      <div className="relative">
                        <Preview />
                        {isActive && (
                          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-start gap-2 px-0.5">
                        <div
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                            isActive ? 'bg-primary/12 text-primary' : 'bg-muted/80 text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1 pb-0.5">
                          <span className="block text-[16px] font-semibold leading-tight text-foreground">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
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
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <Palette className="h-[15px] w-[15px]" strokeWidth={2} />
      </MapIosColoredFab>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[118] border-0 bg-black/35 backdrop-blur-[2px] transition-opacity motion-reduce:backdrop-blur-none"
            aria-label="Fermer le sélecteur de carte"
            onClick={() => setIsOpen(false)}
          />

          {leftPanel ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="map-style-picker-title"
              className={cn(
                'fixed z-[120] max-h-[min(78dvh,calc(100dvh-5rem))] w-[min(calc(100vw-1.5rem),21rem)] overflow-hidden rounded-[1.35rem]',
                'left-[max(0.75rem,env(safe-area-inset-left,0px))]',
                'top-[calc(env(safe-area-inset-top,0px)+4.5rem)]',
                'border border-black/[0.06] bg-[#FAFAFA] shadow-[0_24px_64px_-20px_rgba(0,0,0,0.35)] dark:border-white/[0.1] dark:bg-[#1C1C1E]'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[inherit] overflow-y-auto p-4 sm:p-5">
                <MapStylePickerContent
                  titleId="map-style-picker-title"
                  currentStyle={currentStyle}
                  onSelect={commit}
                  showClose
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </div>
          ) : (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="map-style-picker-title-main"
              className={cn(
                'fixed inset-x-0 bottom-0 z-[120] flex max-h-[min(88dvh,720px)] flex-col rounded-t-[1.35rem]',
                'border border-b-0 border-black/[0.06] bg-[#FAFAFA] shadow-[0_-8px_48px_-12px_rgba(0,0,0,0.28)] dark:border-white/[0.1] dark:bg-[#1C1C1E]'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 flex-col items-center pt-3 pb-1">
                <div className="h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
                <MapStylePickerContent
                  titleId="map-style-picker-title-main"
                  currentStyle={currentStyle}
                  onSelect={commit}
                  showClose
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
