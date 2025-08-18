import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Medal } from "lucide-react";

const Leaderboard = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-foreground">Classement</h1>
          <Badge variant="secondary" className="mt-2">
            Premium 2,99€/mois
          </Badge>
        </div>

        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Fonctionnalité Premium</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Crown className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-sm">+10 points créer une séance</span>
              </div>
              <div className="flex items-center">
                <Medal className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-sm">+30 points rejoindre une séance</span>
              </div>
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm">+50 points quand quelqu'un rejoint votre séance</span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Filtres : amis uniquement, classement mondial
              </p>
              <p className="text-xs text-muted-foreground">
                Options : tout le temps, cette semaine
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;