import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Trophy, Award, Target, Users } from "lucide-react";

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
    { icon: Trophy, label: "Rejointes", value: sessionsJoined },
    { icon: Calendar, label: "Créées", value: sessionsCreated },
    { icon: Target, label: "Points", value: totalPoints.toLocaleString() },
    { icon: Award, label: "Badges", value: badgesWon },
    { icon: Users, label: "Parrainés", value: friendsReferred },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Ma Saison</h3>
        <div className="grid grid-cols-5 gap-2">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex flex-col items-center">
                <Icon className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
