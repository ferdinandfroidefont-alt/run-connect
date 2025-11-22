import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy, Clock, Award, Target } from "lucide-react";

interface SeasonStatsCardProps {
  totalActivities: number;
  totalPoints: number;
  totalTime?: string;
  badgesWon: number;
  bestPerformance?: string;
}

export const SeasonStatsCard = ({ 
  totalActivities, 
  totalPoints, 
  totalTime = "18h", 
  badgesWon,
  bestPerformance = "10km"
}: SeasonStatsCardProps) => {
  const stats = [
    { icon: Trophy, label: "Sessions", value: totalActivities, color: "text-blue-500" },
    { icon: Target, label: "Points", value: totalPoints.toLocaleString(), color: "text-purple-500" },
    { icon: Clock, label: "Temps", value: totalTime, color: "text-green-500" },
    { icon: Award, label: "Badges", value: badgesWon, color: "text-yellow-500" },
    { icon: Calendar, label: "Record", value: bestPerformance, color: "text-pink-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Ma Saison
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                className="bg-card/50 rounded-lg p-2 flex flex-col items-center justify-center border border-border/50 hover:border-primary/30 transition-all"
              >
                <Icon className={`h-5 w-5 ${stat.color} mb-1`} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
