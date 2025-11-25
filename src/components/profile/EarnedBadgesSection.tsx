import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Badge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_icon: string | null;
  badge_description: string | null;
  unlocked_at: string | null;
}

interface EarnedBadgesSectionProps {
  userId: string;
}

export const EarnedBadgesSection = ({ userId }: EarnedBadgesSectionProps) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-yellow-500/5 to-background border-yellow-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Badges débloqués
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-16 h-16 rounded-full bg-yellow-500/10 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (badges.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-yellow-500/5 to-background border-yellow-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Badges débloqués
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Aucun badge débloqué</p>
            <p className="text-xs text-muted-foreground">Participez à des séances pour gagner vos premiers badges !</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-yellow-500/5 to-background border-yellow-500/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Badges débloqués ({badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex-shrink-0 group relative"
              title={badge.badge_description || badge.badge_name}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/30 flex items-center justify-center text-2xl hover:scale-110 transition-transform cursor-pointer shadow-lg hover:shadow-yellow-500/20">
                {badge.badge_icon || "🏅"}
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-popover border border-border rounded-lg p-2 shadow-xl whitespace-nowrap">
                  <p className="text-xs font-semibold">{badge.badge_name}</p>
                  {badge.badge_description && (
                    <p className="text-xs text-muted-foreground">{badge.badge_description}</p>
                  )}
                  {badge.unlocked_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(badge.unlocked_at), "d MMM yyyy", { locale: fr })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
