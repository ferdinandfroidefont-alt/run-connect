import { Copy, EllipsisVertical, Send, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface SessionActionMenuProps {
  onEdit: () => void;
  onSend: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SessionActionMenu({ onEdit, onSend, onDuplicate, onDelete }: SessionActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <EllipsisVertical className="h-4.5 w-4.5 text-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Modifier</DropdownMenuItem>
        <DropdownMenuItem onClick={onSend}>
          <Send className="mr-2 h-4 w-4" />
          Envoyer à l'athlète
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Dupliquer
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

