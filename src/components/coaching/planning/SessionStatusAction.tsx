import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStatusActionProps {
  mode: "add" | "sent";
  onAdd?: () => void;
}

export function SessionStatusAction({ mode, onAdd }: SessionStatusActionProps) {
  if (mode === "sent") {
    return (
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <Check className="h-4.5 w-4.5" />
      </div>
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

