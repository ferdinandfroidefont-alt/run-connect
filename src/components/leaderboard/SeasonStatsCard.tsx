import { Trophy, Calendar, Target, Award, UserPlus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeasonStatsCardProps {
  sessionsJoined: number;
  sessionsCreated: number;
  totalPoints: number;
  badgesWon: number;
  friendsReferred: number;
}

export const SeasonStatsCard = ({ 
  sessionsJoined, 
  sessionsCreated, 
  totalPoints, 
  badgesWon,
  friendsReferred
}: SeasonStatsCardProps) => {
  const stats = [
    { 
      icon: Trophy, 
      label: "Séances rejointes", 
      value: sessionsJoined,
      iconBg: "bg-blue-500",
      onClick: () => {}
    },
    { 
      icon: Calendar, 
      label: "Séances créées", 
      value: sessionsCreated,
      iconBg: "bg-green-500",
      onClick: () => {}
    },
    { 
      icon: Target, 
      label: "Points saison", 
      value: totalPoints.toLocaleString(),
      iconBg: "bg-purple-500",
      onClick: () => {}
    },
    { 
      icon: Award, 
      label: "Badges gagnés", 
      value: badgesWon,
      iconBg: "bg-yellow-500",
      onClick: () => {}
    },
    { 
      icon: UserPlus, 
      label: "Amis parrainés", 
      value: friendsReferred,
      iconBg: "bg-pink-500",
      onClick: () => {}
    },
  ];

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-orange-500 flex items-center justify-center">
          <Calendar className="h-[18px] w-[18px] text-white" />
        </div>
        <span className="text-[17px] font-semibold text-foreground">Ma Saison</span>
      </div>

      {/* Stats List */}
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isLast = index === stats.length - 1;
        
        return (
          <div key={index}>
            <div
              className="flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center", stat.iconBg)}>
                <Icon className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-[17px] text-foreground">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-semibold text-foreground">{stat.value}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>
            </div>
            {!isLast && <div className="h-px bg-border ml-[54px]" />}
          </div>
        );
      })}
    </div>
  );
};
