import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStatusActionProps {
  mode: "add" | "sent";
  onAdd?: () => void;
  onSentClick?: () => void;
}

/** CTA droite des lignes jour : + 30×30 bleu iOS ; envoyé 24×24 vert système (maquette DayPlanRow). */
export function SessionStatusAction({ mode, onAdd, onSentClick }: SessionStatusActionProps) {
  if (mode === "sent") {
    return (
      <button
        type="button"
        onClick={onSentClick}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white transition-transform active:scale-95"
        style={{ backgroundColor: "#34C759" }}
        aria-label="Séance envoyée"
      >
        <Check className="h-3 w-3" strokeWidth={2.8} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "inline-flex h-[30px] w-[30px] items-center justify-center rounded-full text-[18px] font-light leading-none text-white transition-transform active:scale-95"
      )}
      style={{ backgroundColor: "#0a84ff" }}
      aria-label="Ajouter une séance"
    >
      <Plus className="h-[18px] w-[18px] stroke-[2.2px]" stroke="currentColor" />
    </button>
  );
}
