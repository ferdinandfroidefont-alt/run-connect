import { Copy, Send, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface SessionActionMenuProps {
  onSend: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** Déclencheur « ··· » sur fond search-fill, 28×28 — comme DayPlanRow non envoyé maquette. */
export function SessionActionMenu({ onSend, onDuplicate, onDelete }: SessionActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[17px] font-medium leading-none tracking-[0.06em] text-muted-foreground"
          style={{ background: "rgba(118, 118, 128, 0.12)" }}
          aria-label="Actions séance"
        >
          ···
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onSend}>
          <Send className="mr-2 h-4 w-4" />
          Envoyer à l&apos;athlète
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Dupliquer
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
