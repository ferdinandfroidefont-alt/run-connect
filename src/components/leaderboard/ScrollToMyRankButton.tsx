import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

interface ScrollToMyRankButtonProps {
  onClick: () => void;
  visible: boolean;
}

export const ScrollToMyRankButton = ({ onClick, visible }: ScrollToMyRankButtonProps) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <Button
        onClick={onClick}
        className="animate-pulse"
        size="sm"
      >
        <Target className="h-4 w-4 mr-2" />
        Voir ma position
      </Button>
    </div>
  );
};
