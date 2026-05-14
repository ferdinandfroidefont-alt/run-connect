type DiscoverMapMaquetteToolbarProps = {
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenStyleSheet: () => void;
  onOpenFiltersSheet: () => void;
};

/** Emojis plein écran / palette / filtres — équivalent maquette RunConnect (4), taille ~20px comme les icônes w-5 h-5. */
const BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-transform active:scale-95";

/**
 * Boutons flottants carte « Découvrir » — même disposition que la maquette (haut-droite, pile verticale, 40×40, gap 8px).
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
        <span className="text-[20px] leading-none select-none" aria-hidden>
          {fullscreen ? "🔳" : "🔲"}
        </span>
      </button>
      <button type="button" onClick={onOpenStyleSheet} aria-label="Style de carte" className={BTN}>
        <span className="text-[20px] leading-none select-none" aria-hidden>
          🗺️
        </span>
      </button>
      <button
        type="button"
        onClick={onOpenFiltersSheet}
        aria-label="Filtres"
        className={`${BTN} ring-2 ring-[#007AFF]/28`}
      >
        <span className="text-[20px] leading-none select-none" aria-hidden>
          🎛️
        </span>
      </button>
    </div>
  );
}
