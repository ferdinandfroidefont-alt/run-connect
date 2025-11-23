import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Target, Users, Calendar, Award, Trophy, UserPlus, 
  MessageCircle, Mic, Image, Heart, Flag 
} from "lucide-react";
import { useWeeklyChallenges } from "@/hooks/useWeeklyChallenges";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, any> = {
  Target,
  Users,
  Calendar,
  Award,
  Trophy,
  UserPlus,
  MessageCircle,
  Mic,
  Image,
  Heart,
  Flag
};

export const WeeklyChallengesCard = () => {
  const { challenges, loading } = useWeeklyChallenges();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Défis de la semaine
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Défis de la semaine
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {challenges.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Aucun défi actif pour le moment
          </div>
        ) : (
          challenges.map((challenge) => {
            const Icon = iconMap[challenge.icon] || Target;
            const progressPercentage = (challenge.progress / challenge.target) * 100;
            const isCompleted = challenge.progress >= challenge.target;

            return (
              <div 
                key={challenge.id}
                className={`bg-card/50 rounded-lg p-3 border transition-all ${
                  isCompleted 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : 'border-border/50 hover:border-primary/30'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${
                    isCompleted ? 'text-green-500' : 'text-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      isCompleted ? 'text-green-500' : ''
                    }`}>
                      {challenge.title}
                    </p>
                    {challenge.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {challenge.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      +{challenge.reward} points
                    </p>
                  </div>
                  {isCompleted && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                      ✓ Terminé
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={Math.min(progressPercentage, 100)} 
                    className={`h-1.5 ${isCompleted ? '[&>div]:bg-green-500' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {challenge.progress}/{challenge.target}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
