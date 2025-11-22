import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Users, Calendar, Award } from "lucide-react";

interface Challenge {
  icon: any;
  title: string;
  progress: number;
  total: number;
  reward: number;
}

interface WeeklyChallengesCardProps {
  challenges?: Challenge[];
}

export const WeeklyChallengesCard = ({ challenges }: WeeklyChallengesCardProps) => {
  // Défis par défaut pour la démo
  const defaultChallenges: Challenge[] = [
    {
      icon: Calendar,
      title: "Participer à 3 sessions",
      progress: 2,
      total: 3,
      reward: 50
    },
    {
      icon: Award,
      title: "Organiser 1 session",
      progress: 0,
      total: 1,
      reward: 100
    },
    {
      icon: Users,
      title: "Inviter un ami",
      progress: 0,
      total: 1,
      reward: 100
    },
    {
      icon: Target,
      title: "100% présence GPS",
      progress: 1,
      total: 1,
      reward: 75
    }
  ];

  const activeChallenges = challenges || defaultChallenges.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Défis de la semaine
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {activeChallenges.map((challenge, index) => {
          const Icon = challenge.icon;
          const progressPercentage = (challenge.progress / challenge.total) * 100;

          return (
            <div 
              key={index}
              className="bg-card/50 rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{challenge.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    +{challenge.reward} points
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={progressPercentage} className="h-1.5" />
                <p className="text-xs text-muted-foreground text-right">
                  {challenge.progress}/{challenge.total}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
