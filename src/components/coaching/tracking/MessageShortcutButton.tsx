import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageShortcutButtonProps {
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export function MessageShortcutButton({ onClick, variant = "secondary" }: MessageShortcutButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant === "primary" ? "default" : "secondary"}
      className={cn("h-9 rounded-full px-3 text-[12px] font-semibold", variant === "primary" && "bg-primary text-primary-foreground")}
      onClick={onClick}
    >
      <MessageCircle className="mr-1.5 h-4 w-4" />
      Message
    </Button>
  );
}

