import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

interface Badge {
  icon: string;
  name: string;
  remaining: string;
}

interface BadgesToUnlockCardProps {
  badges?: Badge[];
}

export const BadgesToUnlockCard = ({ badges }: BadgesToUnlockCardProps) => {
  // Badges par défaut pour la démo
  const defaultBadges: Badge[] = [
    { icon: "🔥", name: "Streak Master", remaining: "Reste 2 sessions" },
    { icon: "💪", name: "Iron Man", remaining: "Reste 5 sessions" },
    { icon: "🎖️", name: "Hero", remaining: "Reste 10 points" },
    { icon: "👑", name: "Legend", remaining: "Reste 25 badges" }
  ];

  const activeBadges = badges || defaultBadges;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Badges à débloquer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-4 gap-2">
          {activeBadges.map((badge, index) => (
            <div 
              key={index}
              className="bg-card/50 rounded-lg p-2 flex flex-col items-center justify-center border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
            >
              <span className="text-2xl mb-1">{badge.icon}</span>
              <p className="text-xs font-medium text-center line-clamp-1">{badge.name}</p>
              <p className="text-[10px] text-muted-foreground text-center mt-0.5">{badge.remaining}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
