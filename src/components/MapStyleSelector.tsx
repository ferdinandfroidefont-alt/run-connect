import React, { useState } from 'react';
import { Box, Map, Moon, Mountain, Palette, Satellite } from 'lucide-react';
import { MapIosColoredFab } from '@/components/map/MapIosColoredFab';
import { cn } from '@/lib/utils';

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
  /**
   * `viewport-left` : panneau fixé à gauche (création d’itinéraire, évite le débordement à droite).
   * `fab` : sous le bouton palette (carte accueil).
   */
  panelAnchor?: 'fab' | 'viewport-left';
}

/** Vignettes très compactes — 5 styles sans déborder. */
const previewFrame =
  'relative flex h-[18px] w-full min-h-0 shrink-0 overflow-hidden rounded-[4px] border shadow-inner';

function PreviewStandard() {
  return (
    <div className={`${previewFrame} border-black/10 bg-gradient-to-br from-[#f4f4f2] via-[#eceae6] to-[#e2dfd8]`}>
      <div className="absolute inset-0 opacity-90">
        <div className="absolute left-0 top-0.5 h-px w-[78%] bg-neutral-400/35" />
        <div className="absolute left-0 top-0.5 h-[calc(100%-3px)] w-px bg-neutral-400/30" />
        <div className="absolute left-[34%] top-0 bottom-0.5 w-px bg-neutral-400/22" />
        <div className="absolute left-0 top-[55%] h-px w-full bg-neutral-400/25" />
        <div className="absolute right-0 top-0.5 h-1 w-1 rounded-[1px] bg-amber-200/80" />
        <div className="absolute bottom-0 left-0.5 h-0.5 w-3 rounded-[1px] bg-sky-200/70" />
      </div>
    </div>
  );
}

function PreviewSatellite() {
  return (
    <div className={`${previewFrame} border-black/15`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d5016] via-[#4a7c23] to-[#1e3a5f]" />
      <div className="absolute right-0 top-0 h-2 w-2 rounded-bl-[3px] bg-white/12" />
      <div className="absolute bottom-0 left-0 h-0.5 w-5 rounded-[1px] bg-[#3d2914]/60" />
    </div>
  );
}

function PreviewRelief() {
  return (
    <div className={`${previewFrame} border-emerald-900/20`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#d4e4c8] via-[#8fb88a] to-[#4a7350]" />
      <svg className="absolute inset-0 block h-full w-full opacity-55" viewBox="0 0 80 28" preserveAspectRatio="none">
        <path
          d="M0 20 Q20 14 40 16 T80 12 V28 H0 Z"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M0 23 Q25 17 48 19 T80 15 V28 H0 Z"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function PreviewDark() {
  return (
    <div className={`${previewFrame} border-white/10 bg-gradient-to-b from-[#1a1d24] to-[#0d0f14]`}>
      <div className="absolute inset-0 opacity-45">
        <div className="absolute left-0 top-0.5 h-px w-[70%] bg-slate-500/40" />
        <div className="absolute left-0 top-0.5 h-[calc(100%-3px)] w-px bg-slate-500/35" />
        <div className="absolute right-0.5 bottom-0 h-0.5 w-0.5 rounded-full bg-cyan-400/85" />
      </div>
    </div>
  );
}

function Preview3D() {
  return (
    <div className={`${previewFrame} border-slate-600/30 bg-gradient-to-b from-[#94a3b8] to-[#475569]`}>
      <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center pb-px">
        <div className="flex translate-y-px items-end gap-px">
          <div className="h-1.5 w-1 rounded-t-[1px] bg-slate-200/95 shadow-sm" style={{ transform: 'skewX(-6deg)' }} />
          <div className="h-2 w-1 rounded-t-[1px] bg-white shadow-sm" style={{ transform: 'skewX(-4deg)' }} />
          <div className="h-1.5 w-0.5 rounded-t-[1px] bg-slate-100/90" style={{ transform: 'skewX(5deg)' }} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/15" />
    </div>
  );
}

const MAP_STYLE_OPTIONS: {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  Preview: () => React.ReactElement;
}[] = [
  {
    id: 'roadmap',
    label: 'Standard',
    description: 'Rues et POI',
    icon: Map,
    Preview: PreviewStandard,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Vue aérienne',
    icon: Satellite,
    Preview: PreviewSatellite,
  },
  {
    id: 'terrain',
    label: 'Relief',
    description: 'Outdoor & relief',
    icon: Mountain,
    Preview: PreviewRelief,
  },
  {
    id: 'dark',
    label: 'Sombre',
    description: 'Carte nuit',
    icon: Moon,
    Preview: PreviewDark,
  },
  {
    id: 'standard3d',
    label: '3D',
    description: 'Bâtiments 3D',
    icon: Box,
    Preview: Preview3D,
  },
];

export const MapStyleSelector: React.FC<MapStyleSelectorProps> = ({
  currentStyle,
  onStyleChange,
  panelAnchor = 'fab',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const leftPanel = panelAnchor === 'viewport-left';

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
          <div
            className="fixed inset-0 z-[118] bg-black/25"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              'z-[120] rounded-xl border border-border/80 bg-card/96 p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/92',
              leftPanel
                ? 'fixed left-3 right-auto top-[calc(env(safe-area-inset-top,0px)+4.75rem)] w-[min(13.75rem,calc(100vw-1.5rem))] max-h-[min(68vh,calc(100dvh-6.5rem))] overflow-y-auto'
                : 'absolute bottom-[46px] left-0 w-[min(calc(100vw-2rem),240px)]',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-0 px-0.5 text-[11px] font-semibold leading-tight text-foreground">Style de carte</p>
            <p className="mb-1.5 px-0.5 text-[9px] leading-snug text-muted-foreground">
              Standard, satellite, relief, sombre ou 3D
            </p>
            <div className="grid grid-cols-2 gap-1">
              {MAP_STYLE_OPTIONS.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentStyle === item.id;
                const Preview = item.Preview;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onStyleChange(item.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'group flex min-w-0 flex-col overflow-hidden rounded-md border text-left transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      index === MAP_STYLE_OPTIONS.length - 1 &&
                        'col-span-2 mx-auto w-[calc(50%-0.125rem)] max-w-[140px] justify-self-center',
                      isActive
                        ? 'border-primary bg-primary/8 shadow-sm ring-1 ring-primary/20'
                        : 'border-transparent bg-secondary/45 hover:border-border hover:bg-secondary/70',
                    )}
                  >
                    <div className="min-h-0 px-0.5 pb-0 pt-0.5">
                      <Preview />
                    </div>
                    <div className="flex min-h-0 min-w-0 items-start gap-0.5 px-1 pb-0.5 pt-px">
                      <div
                        className={cn(
                          'mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px]',
                          isActive ? 'bg-primary/15 text-primary' : 'bg-background/80 text-muted-foreground',
                        )}
                      >
                        <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1 py-px">
                        <span className="block truncate text-[10px] font-semibold leading-tight text-foreground">
                          {item.label}
                        </span>
                        <span className="mt-px block truncate text-[8px] leading-tight text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
