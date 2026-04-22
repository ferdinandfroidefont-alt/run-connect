import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStatusActionProps {
  mode: "add" | "sent";
  onAdd?: () => void;
  onSentClick?: () => void;
}

export function SessionStatusAction({ mode, onAdd, onSentClick }: SessionStatusActionProps) {
  if (mode === "sent") {
    return (
      <button
        type="button"
        onClick={onSentClick}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-[12px] font-semibold text-foreground transition-transform active:scale-95"
        aria-label="Annuler l'envoi"
      >
        <Check className="h-4.5 w-4.5" />
        <span>Annuler l&apos;envoi</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white",
        "transition-transform active:scale-95"
      )}
      aria-label="Ajouter une séance"
    >
      <Plus className="h-4.5 w-4.5" />
    </button>
  );
}

