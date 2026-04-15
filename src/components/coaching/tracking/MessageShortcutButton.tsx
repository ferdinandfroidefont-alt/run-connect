import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageShortcutButtonProps {
  onClick: () => void;
}

export function MessageShortcutButton({ onClick }: MessageShortcutButtonProps) {
  return (
    <Button type="button" size="sm" variant="secondary" className="h-9 rounded-full px-3 text-[12px] font-semibold" onClick={onClick}>
      <MessageCircle className="mr-1.5 h-4 w-4" />
      Message
    </Button>
  );
}

