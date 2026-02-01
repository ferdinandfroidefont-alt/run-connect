import { Award, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Badge {
  icon: string;
  name: string;
  remaining: string;
}

interface BadgesToUnlockCardProps {
  badges?: Badge[];
}

export const BadgesToUnlockCard = ({ badges }: BadgesToUnlockCardProps) => {
  const defaultBadges: Badge[] = [
    { icon: "🔥", name: "Streak Master", remaining: "2 sessions" },
    { icon: "💪", name: "Iron Man", remaining: "5 sessions" },
    { icon: "🎖️", name: "Hero", remaining: "10 points" },
    { icon: "👑", name: "Legend", remaining: "25 badges" }
  ];

  const activeBadges = badges || defaultBadges;

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-yellow-500 flex items-center justify-center">
          <Award className="h-[18px] w-[18px] text-white" />
        </div>
        <span className="text-[17px] font-semibold text-foreground">Badges à débloquer</span>
      </div>

      {/* Badges List */}
      {activeBadges.map((badge, index) => {
        const isLast = index === activeBadges.length - 1;
        
        return (
          <div key={index}>
            <div className="flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors cursor-pointer">
              <div className="h-[40px] w-[40px] rounded-[10px] bg-secondary/80 flex items-center justify-center relative">
                <span className="text-xl opacity-50">{badge.icon}</span>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground">{badge.name}</p>
                <p className="text-[13px] text-muted-foreground">Reste {badge.remaining}</p>
              </div>
              
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
            </div>
            {!isLast && <div className="h-px bg-border ml-[66px]" />}
          </div>
        );
      })}
    </div>
  );
};
