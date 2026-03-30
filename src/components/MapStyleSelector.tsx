import React, { useState } from 'react';
import { Box, Map, Moon, Mountain, Palette, Satellite } from 'lucide-react';
import { MapIosColoredFab } from '@/components/map/MapIosColoredFab';
import { cn } from '@/lib/utils';

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
}

/** Mini-aperçus : hauteur fixe, tout le contenu reste clippé dans le cadre (évite débordements sur iOS). */
const previewFrame =
  'relative flex h-7 w-full min-h-0 shrink-0 overflow-hidden rounded-md border shadow-inner';

/** Vignettes compactes : ~32px de hauteur pour ne pas surcharger le panneau. */
function PreviewStandard() {
  return (
    <div className={`${previewFrame} border-black/10 bg-gradient-to-br from-[#f4f4f2] via-[#eceae6] to-[#e2dfd8]`}>
      <div className="absolute inset-0 opacity-90">
        <div className="absolute left-0.5 top-1 h-px w-[78%] bg-neutral-400/35" />
        <div className="absolute left-0.5 top-1 h-[calc(100%-5px)] w-px bg-neutral-400/30" />
        <div className="absolute left-[34%] top-0.5 bottom-1 w-px bg-neutral-400/22" />
        <div className="absolute left-0 top-[55%] h-px w-full bg-neutral-400/25" />
        <div className="absolute right-0.5 top-1 h-2 w-2 rounded-[2px] bg-amber-200/80" />
        <div className="absolute bottom-0.5 left-1 h-1.5 w-4 rounded-[1px] bg-sky-200/70" />
      </div>
    </div>
  );
}

function PreviewSatellite() {
  return (
    <div className={`${previewFrame} border-black/15`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d5016] via-[#4a7c23] to-[#1e3a5f]" />
      <div className="absolute right-0 top-0 h-3 w-3 rounded-bl-md bg-white/12" />
      <div className="absolute bottom-0.5 left-0.5 h-1.5 w-8 rounded-[1px] bg-[#3d2914]/60" />
      <div className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-white/45 ring-1 ring-white/20" />
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
      <div className="absolute left-0.5 top-0.5 h-0.5 w-4 rounded-full bg-white/30" />
    </div>
  );
}

function PreviewDark() {
  return (
    <div className={`${previewFrame} border-white/10 bg-gradient-to-b from-[#1a1d24] to-[#0d0f14]`}>
      <div className="absolute inset-0 opacity-45">
        <div className="absolute left-0.5 top-1 h-px w-[70%] bg-slate-500/40" />
        <div className="absolute left-0.5 top-1 h-[calc(100%-5px)] w-px bg-slate-500/35" />
        <div className="absolute right-1 bottom-0.5 h-1 w-1 rounded-full bg-cyan-400/85 shadow-[0_0_2px_rgba(34,211,238,0.6)]" />
        <div className="absolute left-3 top-1 h-0.5 w-0.5 rounded-full bg-amber-400/75" />
      </div>
    </div>
  );
}

function Preview3D() {
  return (
    <div className={`${previewFrame} border-slate-600/30 bg-gradient-to-b from-[#94a3b8] to-[#475569]`}>
      <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center pb-0.5">
        <div className="flex translate-y-px items-end gap-px [perspective:80px]">
          <div
            className="h-2.5 w-1.5 rounded-t-[1px] bg-slate-200/95 shadow-sm"
            style={{ transform: 'skewX(-6deg)' }}
          />
          <div
            className="h-3 w-1.5 rounded-t-[2px] bg-white shadow-sm"
            style={{ transform: 'skewX(-4deg)' }}
          />
          <div
            className="h-2.5 w-1 rounded-t-[1px] bg-slate-100/90"
            style={{ transform: 'skewX(5deg)' }}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/15" />
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

export const MapStyleSelector: React.FC<MapStyleSelectorProps> = ({ currentStyle, onStyleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-[21]">
      <MapIosColoredFab
        type="button"
        tone="gray"
        title="Styles de carte"
        active={isOpen}
        className="bg-white text-black shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] [&_span]:text-black [&_span_svg]:stroke-black [&_span_svg]:text-black"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <Palette className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </MapIosColoredFab>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10 bg-black/25"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute bottom-[52px] left-0 z-20 w-[min(calc(100vw-2rem),252px)] rounded-xl border border-border/80 bg-card/96 p-2.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/92"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-0.5 px-0.5 text-[12px] font-semibold text-foreground">Style de carte</p>
            <p className="mb-2 px-0.5 text-[10px] leading-snug text-muted-foreground">Standard, satellite, relief, sombre ou 3D</p>
            <div className="grid grid-cols-2 gap-1.5">
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
                      'group flex min-w-0 flex-col overflow-hidden rounded-lg border text-left transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      index === MAP_STYLE_OPTIONS.length - 1 &&
                        'col-span-2 w-[calc((100%-0.375rem)/2)] max-w-full justify-self-center',
                      isActive
                        ? 'border-primary bg-primary/8 shadow-sm ring-1 ring-primary/20'
                        : 'border-transparent bg-secondary/45 hover:border-border hover:bg-secondary/70',
                    )}
                  >
                    <div className="min-h-0 px-1 pb-0 pt-1">
                      <Preview />
                    </div>
                    <div className="flex min-h-0 min-w-0 items-start gap-1 px-1.5 pb-1 pt-0.5">
                      <div
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                          isActive ? 'bg-primary/15 text-primary' : 'bg-background/80 text-muted-foreground',
                        )}
                      >
                        <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <span className="block truncate text-[11px] font-semibold leading-tight text-foreground">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] leading-snug text-muted-foreground">
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
