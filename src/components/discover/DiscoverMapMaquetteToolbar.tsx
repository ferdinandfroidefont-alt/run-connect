import { Maximize2, Minimize2, Layers, SlidersHorizontal } from "lucide-react";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

type DiscoverMapMaquetteToolbarProps = {
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenStyleSheet: () => void;
  onOpenFiltersSheet: () => void;
};

const BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-transform active:scale-95";

/**
 * Boutons flottants carte Découvrir — maquette RunConnect (6) : colonne, Lucide, filtres en bleu.
 */
export function DiscoverMapMaquetteToolbar({
  fullscreen,
  onToggleFullscreen,
  onOpenStyleSheet,
  onOpenFiltersSheet,
}: DiscoverMapMaquetteToolbarProps) {
  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"}
        className={BTN}
      >
        {fullscreen ? (
          <Minimize2 className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.4} aria-hidden />
        ) : (
          <Maximize2 className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.4} aria-hidden />
        )}
      </button>
      <button type="button" onClick={onOpenStyleSheet} aria-label="Style de carte" className={BTN}>
        <Layers className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.2} aria-hidden />
      </button>
      <button type="button" onClick={onOpenFiltersSheet} aria-label="Filtres" className={BTN}>
        <SlidersHorizontal className="h-5 w-5" color={ACTION_BLUE} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
