import React, { useState } from 'react';
import { Box, Map, Moon, Mountain, Palette, Satellite } from 'lucide-react';
import { MapIosColoredFab } from '@/components/map/MapIosColoredFab';
import { cn } from '@/lib/utils';

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
}

const previewFrame =
  'relative h-8 w-full overflow-hidden rounded-md border shadow-inner';

/** Vignettes compactes : ~32px de hauteur pour ne pas surcharger le panneau. */
function PreviewStandard() {
  return (
    <div className={`${previewFrame} border-black/10 bg-gradient-to-br from-[#f4f4f2] via-[#eceae6] to-[#e2dfd8]`}>
      <div className="absolute inset-0 opacity-90">
        <div className="absolute left-0.5 top-1.5 h-px w-[82%] bg-neutral-400/35" />
        <div className="absolute left-0.5 top-1.5 h-[calc(100%-6px)] w-px bg-neutral-400/30" />
        <div className="absolute left-[34%] top-0.5 bottom-0.5 w-px bg-neutral-400/22" />
        <div className="absolute left-0 top-[52%] h-px w-full bg-neutral-400/25" />
        <div className="absolute right-1 top-1.5 h-2.5 w-2 rounded-[2px] bg-amber-200/80" />
        <div className="absolute bottom-1 left-1.5 h-2 w-5 rounded-[1px] bg-sky-200/70" />
      </div>
    </div>
  );
}

function PreviewSatellite() {
  return (
    <div className={`${previewFrame} border-black/15`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d5016] via-[#4a7c23] to-[#1e3a5f]" />
      <div className="absolute -right-0.5 -top-0.5 h-5 w-6 rotate-12 rounded-full bg-white/15 blur-[1px]" />
      <div className="absolute bottom-0.5 left-1 h-2 w-9 skew-x-6 rounded-[2px] bg-[#3d2914]/55" />
      <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/40 ring-1 ring-white/25" />
    </div>
  );
}

function PreviewRelief() {
  return (
    <div className={`${previewFrame} border-emerald-900/20`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#d4e4c8] via-[#8fb88a] to-[#4a7350]" />
      <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 80 32" preserveAspectRatio="none">
        <path
          d="M0 22 Q20 16 40 18 T80 14 V32 H0 Z"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1"
        />
        <path
          d="M0 26 Q25 20 45 22 T80 18 V32 H0 Z"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="0.9"
        />
      </svg>
      <div className="absolute left-1 top-1 h-1 w-5 rounded-full bg-white/25" />
    </div>
  );
}

function PreviewDark() {
  return (
    <div className={`${previewFrame} border-white/10 bg-gradient-to-b from-[#1a1d24] to-[#0d0f14]`}>
      <div className="absolute inset-0 opacity-40">
        <div className="absolute left-1 top-1.5 h-px w-[72%] bg-slate-500/35" />
        <div className="absolute left-1 top-1.5 h-[calc(100%-8px)] w-px bg-slate-500/30" />
        <div className="absolute right-1.5 bottom-1 h-0.5 w-0.5 rounded-full bg-cyan-400/90 shadow-[0_0_3px_rgba(34,211,238,0.7)]" />
        <div className="absolute left-3.5 top-2 h-0.5 w-0.5 rounded-full bg-amber-400/70" />
      </div>
    </div>
  );
}

function Preview3D() {
  return (
    <div className={`${previewFrame} border-slate-600/30 bg-gradient-to-b from-[#94a3b8] to-[#475569]`}>
      <div className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 items-end gap-px [perspective:100px]">
        <div className="h-3 w-2 translate-y-px rounded-t-[1px] bg-slate-200/95 shadow-sm" style={{ transform: 'skewX(-6deg)' }} />
        <div className="h-4 w-2 rounded-t-[2px] bg-white shadow-md" style={{ transform: 'skewX(-4deg)' }} />
        <div className="h-3 w-1.5 translate-y-px rounded-t-[1px] bg-slate-100/90 shadow-sm" style={{ transform: 'skewX(5deg)' }} />
      </div>
      <div className="absolute -bottom-1 left-0 right-0 h-2 bg-black/18 blur-sm" />
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
            className="absolute bottom-[52px] left-0 z-20 w-[min(calc(100vw-2rem),280px)] rounded-2xl border border-border/80 bg-card/96 p-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/92"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 px-0.5 text-[13px] font-semibold text-foreground">Style de carte</p>
            <p className="mb-3 px-0.5 text-[11px] text-muted-foreground">Standard, satellite, relief, sombre ou 3D</p>
            <div className="grid grid-cols-2 gap-2.5">
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
                      'group flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all',
                      index === MAP_STYLE_OPTIONS.length - 1 && 'col-span-2 max-w-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      isActive
                        ? 'border-primary bg-primary/8 shadow-sm ring-1 ring-primary/20'
                        : 'border-transparent bg-secondary/40 hover:border-border hover:bg-secondary/70',
                    )}
                  >
                    <div className="px-1.5 pt-1.5 pb-0">
                      <Preview />
                    </div>
                    <div className="flex items-start gap-1.5 px-2 py-1.5 pt-1">
                      <div
                        className={cn(
                          'mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                          isActive ? 'bg-primary/15 text-primary' : 'bg-background/80 text-muted-foreground',
                        )}
                      >
                        <Icon className="h-3 w-3" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{item.description}</span>
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
