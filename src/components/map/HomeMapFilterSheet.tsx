import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sous le sélecteur de fond de carte (10060/10061) mais au-dessus de la carte. */
const FILTER_SHEET_OVERLAY_Z = 10054;
const FILTER_SHEET_PANEL_Z = 10055;

/** Sélecteur pour ignorer le pointerdown « extérieur » (fermeture ancien panneau). */
export const HOME_MAP_FILTER_PORTAL_SELECTOR = '[data-home-map-filters-portal="1"]';

type HomeMapFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  titleId: string;
  /** Liste longue (clubs…) : feuille plus haute */
  variant?: "default" | "tall";
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Feuille iOS pour les filtres carte accueil : overlay, ancrage bas, poignée, scroll interne.
 * Même esprit que le sélecteur de pays / réglages système (liste verticale, lisible).
 */
export function HomeMapFilterSheet({
  open,
  onClose,
  title,
  description,
  titleId,
  variant = "default",
  footer,
  children,
}: HomeMapFilterSheetProps) {
  const dragControls = useDragControls();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0"
          data-home-map-filters-portal="1"
          style={{ zIndex: FILTER_SHEET_OVERLAY_Z }}
        >
          <motion.button
            type="button"
            key="home-map-filter-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 border-0 bg-black/28 backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
            aria-label="Fermer les filtres"
            onClick={onClose}
          />

          <motion.div
            key="home-map-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380, mass: 0.85 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.32 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 420) {
                onClose();
              }
            }}
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col overflow-hidden border border-b-0 border-black/[0.08] bg-[rgba(252,252,252,0.98)] shadow-[0_-16px_48px_-20px_rgba(0,0,0,0.2)] supports-[backdrop-filter]:bg-[rgba(252,252,252,0.94)] supports-[backdrop-filter]:backdrop-blur-xl dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:shadow-[0_-20px_56px_-24px_rgba(0,0,0,0.65)] dark:supports-[backdrop-filter]:bg-[#0a0a0a]",
              variant === "tall"
                ? "max-h-[min(85dvh,720px)] rounded-t-[1.35rem]"
                : "max-h-[min(72dvh,620px)] rounded-t-[1.35rem]"
            )}
            style={{
              zIndex: FILTER_SHEET_PANEL_Z,
              paddingBottom: footer ? undefined : "max(0.75rem, env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-3 pb-1.5 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div
                className="h-1 w-10 shrink-0 rounded-full bg-foreground/22 dark:bg-foreground/30"
                aria-hidden
              />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-4 pb-3 pt-0.5 dark:border-white/[0.08] sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[19px] font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-foreground transition-colors active:bg-black/[0.1] dark:bg-[#111111] dark:active:bg-[#1a1a1a]"
                aria-label="Fermer"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>

            <div
              className={cn(
                "scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:px-5",
                footer && "pb-2"
              )}
            >
              {children}
            </div>

            {footer ? (
              <div
                className="shrink-0 border-t border-black/[0.06] bg-[rgba(252,252,252,0.96)] px-4 py-3 dark:border-[#1f1f1f] dark:bg-[#0a0a0a] sm:px-5"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Conteneur type Réglages iOS : bords arrondis, séparateurs entre lignes. */
export function HomeMapFilterGroupedList({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="listbox"
      className="mt-1 divide-y divide-border/70 overflow-hidden rounded-[12px] border border-border/60 bg-card shadow-sm dark:divide-[#1f1f1f] dark:border-[#1f1f1f] dark:bg-[#0a0a0a]"
    >
      {children}
    </div>
  );
}

type HomeMapFilterRowProps = {
  label: string;
  /** Sous-texte optionnel (ex. plage horaire) */
  hint?: string;
  selected: boolean;
  onClick: () => void;
  leading?: React.ReactNode;
  /** Slot à droite (ex. compteur club) — masque la coche si défini */
  trailing?: React.ReactNode;
};

export function HomeMapFilterRow({
  label,
  hint,
  selected,
  onClick,
  leading,
  trailing,
}: HomeMapFilterRowProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
        "active:bg-black/[0.045] dark:active:bg-[#111111]"
      )}
    >
      {leading ? <span className="flex h-9 w-9 shrink-0 items-center justify-center">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-snug text-foreground">{label}</span>
        {hint ? <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{hint}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {trailing != null ? (
          <span className="text-[15px] tabular-nums text-muted-foreground">{trailing}</span>
        ) : null}
        {selected ? (
          <Check className="h-5 w-5 text-primary" strokeWidth={2.25} aria-hidden />
        ) : (
          <span className="h-5 w-5" aria-hidden />
        )}
      </span>
    </button>
  );
}
