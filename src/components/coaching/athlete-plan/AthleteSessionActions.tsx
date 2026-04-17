import { Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  primary: "confirm" | "complete" | "none";
  onConfirm?: () => void;
  onComplete?: () => void;
  /** Si prévue : permet quand même de sauter à « faite ». */
  showCompleteWhenPlanned?: boolean;
  onComment?: () => void;
  onMessageCoach?: () => void;
  disabled?: boolean;
  className?: string;
};

export function AthleteSessionActions({
  primary,
  onConfirm,
  onComplete,
  showCompleteWhenPlanned,
  onComment,
  onMessageCoach,
  disabled,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {primary === "confirm" && onConfirm ? (
        <Button
          type="button"
          size="sm"
          className="h-9 flex-1 rounded-xl text-[13px] font-semibold sm:flex-none"
          onClick={onConfirm}
          disabled={disabled}
        >
          Confirmer
        </Button>
      ) : null}
      {primary === "confirm" && showCompleteWhenPlanned && onComplete ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1.5 rounded-xl text-[13px] font-semibold sm:flex-none"
          onClick={onComplete}
          disabled={disabled}
        >
          <Check className="h-3.5 w-3.5" />
          Faite
        </Button>
      ) : null}
      {primary === "complete" && onComplete ? (
        <Button
          type="button"
          size="sm"
          className="h-9 flex-1 gap-1.5 rounded-xl text-[13px] font-semibold sm:flex-none"
          onClick={onComplete}
          disabled={disabled}
        >
          <Check className="h-3.5 w-3.5" />
          Marquer faite
        </Button>
      ) : null}
      {onComment ? (
        <Button type="button" variant="secondary" size="sm" className="h-9 rounded-xl text-[13px]" onClick={onComment} disabled={disabled}>
          Commentaire
        </Button>
      ) : null}
      {onMessageCoach ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1 rounded-xl border-border text-[13px]"
          onClick={onMessageCoach}
          disabled={disabled}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Coach
        </Button>
      ) : null}
    </div>
  );
}
