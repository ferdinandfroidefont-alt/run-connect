import { cn } from "@/lib/utils";

/**
 * Styles des contrôles flottants sur la carte d’accueil — alignés sur ios-card / Mes séances / Paramètres
 * (rounded-ios-md, --shadow-card, border-border, pas de « verre » arbitraire).
 */
export const MAP_HOME_FAB_CLASS =
  "flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-ios-md border border-border bg-card p-0 text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-secondary active:scale-[0.97] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-[18px] [&_svg]:shrink-0";

export const MAP_HOME_FAB_ACTIVE_CLASS = "border-primary bg-primary/10 text-primary";

/** Boutons compacts « créneau horaire » sous la barre de recherche */
export function cnMapHomeTimeChip(active: boolean) {
  return cn(
    "flex min-h-10 min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-ios-md border px-2 py-1.5 shadow-[var(--shadow-card)] transition-colors",
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-border bg-card text-foreground hover:bg-secondary/80"
  );
}

/** Champ recherche carte — même famille que les listes iOS */
export const MAP_HOME_SEARCH_INPUT_CLASS =
  "h-11 rounded-ios-md border border-border bg-background pl-10 pr-3 text-[15px] shadow-[var(--shadow-card)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/25";

/** Panneau flottant (sélecteur de style, etc.) */
export const MAP_HOME_PANEL_CLASS =
  "rounded-ios-md border border-border bg-card p-3 shadow-[var(--shadow-map-panel)]";
