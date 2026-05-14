import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const Z_OVERLAY = 10100;
const Z_PANEL = 10101;

type DiscoverMaquetteSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  titleId: string;
  /** Feuille haute (liste longue) */
  variant?: "default" | "tall";
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Bottom sheet Découvrir alignée maquette RunConnect (6) : fond #F2F2F7, titre 28px/800, pill close #E5E5EA.
 */
export function DiscoverMaquetteSheet({
  open,
  onClose,
  title,
  subtitle,
  titleId,
  variant = "default",
  footer,
  children,
}: DiscoverMaquetteSheetProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: Z_OVERLAY }} data-discover-maquette-sheet="1">
          <motion.button
            type="button"
            key="discover-mqt-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 border-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            aria-label="Fermer"
            onClick={onClose}
          />

          <motion.div
            key="discover-mqt-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[24px] shadow-[0_-8px_32px_rgba(0,0,0,0.2)]"
            style={{
              zIndex: Z_PANEL,
              backgroundColor: "#F2F2F7",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              paddingBottom: footer ? undefined : "max(20px, env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-col bg-[#F2F2F7]">
              <div
                className="mx-auto mb-0 mt-3 h-1 w-10 shrink-0 rounded-full"
                style={{ backgroundColor: "#D1D1D6" }}
                aria-hidden
              />
              <div
                className="flex items-start justify-between gap-3 px-5 pb-4 pt-1"
                style={{ paddingTop: "12px" }}
              >
                <div className="min-w-0 flex-1">
                  <h2
                    id={titleId}
                    className="leading-[1.15] text-[#0A0F1F]"
                    style={{
                      fontSize: "28px",
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      margin: 0,
                    }}
                  >
                    {title}
                  </h2>
                  {subtitle ? (
                    <p
                      className="mt-1 text-[15px] text-[#8E8E93]"
                      style={{ margin: "4px 0 0 0" }}
                    >
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-0"
                  style={{ backgroundColor: "#E5E5EA", cursor: "pointer" }}
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4 text-[#0A0F1F]" strokeWidth={2.8} />
                </button>
              </div>
              <div className="h-px bg-black/[0.06]" />
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 [-webkit-overflow-scrolling:touch]"
              style={{
                paddingTop: "16px",
                paddingBottom: variant === "tall" ? "12px" : "20px",
                maxHeight: variant === "tall" ? "min(72vh, 640px)" : undefined,
              }}
            >
              {children}
            </div>

            {footer ? (
              <div
                className="shrink-0 border-t border-black/[0.06] bg-[#F2F2F7] px-5 pt-2"
                style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
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
