import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";

interface CoachBadgeProps {
  className?: string;
}

export const CoachBadge = ({ className }: CoachBadgeProps) => (
  <Badge variant="secondary" className={`text-xs px-1.5 py-0 gap-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 ${className || ''}`}>
    <GraduationCap className="h-3 w-3" />
    Coach
  </Badge>
);
